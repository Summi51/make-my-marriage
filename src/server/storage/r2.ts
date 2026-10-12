import "server-only";
import { randomBytes } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { WeddingError } from "@/modules/wedding/errors";

const PUT_SECONDS = 10 * 60;
const READ_SECONDS = 15 * 60;

export type StoredObject = {
  contentLength: number;
  contentType: string;
  etag: string;
};

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

let cached: { key: string; client: S3Client; bucket: string } | null = null;

function requireConfig(
  source: Record<string, string | undefined> = process.env,
): R2Config {
  const accountId = source.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = source.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = source.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = source.R2_BUCKET_NAME?.trim() ?? "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new WeddingError(
      "STORAGE_UNAVAILABLE",
      "Photo storage is not available right now. Please try again later.",
      503,
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function client() {
  const config = requireConfig();
  const key = `${config.accountId}:${config.accessKeyId}:${config.bucket}`;
  if (cached?.key === key) return cached;
  cached = {
    key,
    bucket: config.bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // A browser PUT cannot add the SDK's default checksum headers.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
  return cached;
}

function unavailable() {
  return new WeddingError(
    "STORAGE_UNAVAILABLE",
    "Photo storage is not available right now. Please try again later.",
    503,
  );
}

export function createObjectKey(weddingId: string, kind: "staging" | "final") {
  return `weddings/${weddingId}/photos/${kind}/${randomBytes(16).toString("hex")}`;
}

export async function signUpload(
  key: string,
  contentType: string,
  contentLength: number,
) {
  try {
    const { client: s3, bucket } = client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    });
    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: PUT_SECONDS,
      signableHeaders: new Set(["content-type", "content-length"]),
    });
    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + PUT_SECONDS * 1000).toISOString(),
    };
  } catch (error) {
    if (error instanceof WeddingError) throw error;
    throw unavailable();
  }
}

export async function inspectObject(key: string): Promise<StoredObject> {
  try {
    const { client: s3, bucket } = client();
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return {
      contentLength: head.ContentLength ?? 0,
      contentType: head.ContentType ?? "",
      etag: head.ETag ?? "",
    };
  } catch (error) {
    if (error instanceof WeddingError) throw error;
    throw unavailable();
  }
}

// Only a definite missing key is absence. Outages and permission errors must
// never remove a photo from the gallery.
export async function objectExists(key: string): Promise<boolean> {
  try {
    const { client: s3, bucket } = client();
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "$metadata" in error &&
      (error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 404
    )
      return false;
    if (error instanceof WeddingError) throw error;
    throw unavailable();
  }
}

export async function readSignature(key: string, etag: string) {
  try {
    const { client: s3, bucket } = client();
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: "bytes=0-15",
        IfMatch: etag,
      }),
    );
    const bytes = await object.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : Buffer.alloc(0);
  } catch (error) {
    if (error instanceof WeddingError) throw error;
    throw unavailable();
  }
}

export async function copyObject(
  sourceKey: string,
  targetKey: string,
  etag: string,
) {
  try {
    const { client: s3, bucket } = client();
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: targetKey,
        CopySource: `${bucket}/${sourceKey}`,
        CopySourceIfMatch: etag,
        MetadataDirective: "COPY",
      }),
    );
  } catch (error) {
    if (error instanceof WeddingError) throw error;
    throw unavailable();
  }
}

export async function deleteObject(key: string) {
  try {
    const { client: s3, bucket } = client();
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (error instanceof WeddingError) throw error;
    throw unavailable();
  }
}

export async function signRead(key: string, filename?: string) {
  try {
    const { client: s3, bucket } = client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(filename
        ? {
            ResponseContentDisposition: `attachment; filename="${filename.replace(/[^\w.\- ]/g, "").slice(0, 120) || "photo"}"`,
          }
        : {}),
    });
    return getSignedUrl(s3, command, { expiresIn: READ_SECONDS });
  } catch (error) {
    if (error instanceof WeddingError) throw error;
    throw unavailable();
  }
}
