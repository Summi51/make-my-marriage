import "server-only";
import { Types } from "mongoose";
import { Event } from "@/modules/events/models";
import { WeddingError } from "@/modules/wedding/errors";
import { consumeLimit } from "@/server/auth/rate-limit";
import { connectToDatabase } from "@/server/db";
import {
  copyObject,
  createObjectKey,
  deleteObject,
  inspectObject,
  objectExists,
  readSignature,
  signRead,
  signUpload,
} from "@/server/storage/r2";
import { Photo } from "./models";
import type {
  confirmPhotoSchema,
  listPhotosQuerySchema,
  uploadUrlSchema,
} from "./schemas";
import type { z } from "zod";

const CONFIRM_GRACE_MS = 24 * 60 * 60 * 1000;
const MAX_READY_PHOTOS = 2000;
const MAX_READY_BYTES = 5 * 1024 * 1024 * 1024;

const signatures: Record<string, (bytes: Buffer) => boolean> = {
  "image/jpeg": (bytes) =>
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/webp": (bytes) =>
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP",
};

function safeName(filename: string) {
  const base =
    filename
      .split(/[/\\]/)
      .pop()
      ?.replace(/[^\w.\- ]/g, "") || "photo";
  return base.slice(0, 120);
}

async function activeEvent(weddingId: string, eventId: string | null) {
  if (!eventId) return null;
  const event = await Event.findOne({
    _id: eventId,
    weddingId,
    archivedAt: null,
  })
    .select("_id")
    .lean();
  if (!event) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Choose a celebration from this wedding.",
      400,
    );
  }
  return event._id;
}

async function sweepExpiredStaging(weddingId: string) {
  const expired = await Photo.find({
    weddingId,
    status: "PENDING",
    expiresAt: { $lt: new Date(Date.now() - CONFIRM_GRACE_MS) },
  })
    .select("_id uploadKey")
    .limit(20)
    .lean();
  for (const row of expired) {
    try {
      await deleteObject(row.uploadKey);
    } catch {
      continue;
    }
    await Photo.updateOne(
      { _id: row._id, weddingId, status: "PENDING" },
      { $set: { status: "DELETED" } },
    );
  }
}

async function assertStorageRoom(weddingId: string, incomingBytes: number) {
  const [usage] = await Photo.aggregate<{
    photos: number;
    bytes: number;
  }>([
    { $match: { weddingId: new Types.ObjectId(weddingId), status: "READY" } },
    {
      $group: {
        _id: null,
        photos: { $sum: 1 },
        bytes: { $sum: "$sizeBytes" },
      },
    },
  ]);
  if (
    (usage?.photos ?? 0) >= MAX_READY_PHOTOS ||
    (usage?.bytes ?? 0) + incomingBytes > MAX_READY_BYTES
  ) {
    throw new WeddingError(
      "CONFLICT",
      "This wedding gallery is full. Delete some photos before uploading more.",
      409,
    );
  }
}

export async function reserveUpload(
  weddingId: string,
  membershipId: string,
  input: z.infer<typeof uploadUrlSchema>,
) {
  await connectToDatabase();
  const eventId = await activeEvent(weddingId, input.eventId);
  await sweepExpiredStaging(weddingId);
  await assertStorageRoom(weddingId, input.sizeBytes);
  await consumeLimit(`photos:member:${membershipId}`, 120);
  await consumeLimit(`photos:wedding:${weddingId}`, 600);
  const uploadKey = createObjectKey(weddingId, "staging");
  const signed = await signUpload(uploadKey, input.mimeType, input.sizeBytes);
  await Photo.create({
    weddingId,
    eventId,
    objectKey: uploadKey,
    uploadKey,
    originalFilename: safeName(input.filename),
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploaderType: "MEMBER",
    uploadedByMembershipId: membershipId,
    status: "PENDING",
    expiresAt: new Date(signed.expiresAt),
  });
  return {
    uploadUrl: signed.uploadUrl,
    objectKey: uploadKey,
    expiresAt: signed.expiresAt,
  };
}

export async function confirmUpload(
  weddingId: string,
  membershipId: string,
  input: z.infer<typeof confirmPhotoSchema>,
) {
  await connectToDatabase();
  const pending = await Photo.findOne({
    weddingId,
    uploadKey: input.objectKey,
    uploadedByMembershipId: membershipId,
  });
  if (!pending || pending.status === "DELETED") {
    throw new WeddingError("NOT_FOUND", "That upload was not found.", 404);
  }
  if (pending.status === "READY") return toPhotoDto(pending);
  if (pending.expiresAt.getTime() + CONFIRM_GRACE_MS < Date.now()) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "That upload expired. Choose the photo again.",
      400,
    );
  }
  if (
    pending.mimeType !== input.mimeType ||
    pending.sizeBytes !== input.sizeBytes ||
    String(pending.eventId ?? "") !== (input.eventId ?? "")
  ) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "That upload does not match the photo you chose.",
      400,
    );
  }
  const stored = await inspectObject(pending.uploadKey);
  const signature = signatures[pending.mimeType];
  const bytes = await readSignature(pending.uploadKey, stored.etag);
  const storedType = stored.contentType.split(";")[0]?.trim().toLowerCase();
  const typeMatches =
    storedType === pending.mimeType ||
    storedType === "application/octet-stream" ||
    storedType === "binary/octet-stream";
  if (
    stored.contentLength !== pending.sizeBytes ||
    !typeMatches ||
    !signature?.(bytes)
  ) {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "That file is not a JPEG, PNG, or WebP photo.",
      400,
    );
  }
  const finalKey = createObjectKey(weddingId, "final");
  await copyObject(pending.uploadKey, finalKey, stored.etag);
  const published = await Photo.findOneAndUpdate(
    { _id: pending._id, weddingId, status: "PENDING" },
    { $set: { objectKey: finalKey, status: "READY" } },
    { returnDocument: "after" },
  );
  if (!published) {
    await deleteObject(finalKey).catch(() => undefined);
    const current = await Photo.findOne({ _id: pending._id, weddingId });
    if (current?.status === "READY") return toPhotoDto(current);
    throw new WeddingError("NOT_FOUND", "That upload was not found.", 404);
  }
  await deleteObject(pending.uploadKey).catch(() => undefined);
  return toPhotoDto(published);
}

function toPhotoDto(
  photo: {
    _id: Types.ObjectId;
    eventId?: Types.ObjectId | null;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    sizeBytes: number;
    uploaderType: string;
    createdAt?: Date;
  },
  url = "",
) {
  return {
    id: String(photo._id),
    eventId: photo.eventId ? String(photo.eventId) : null,
    url,
    originalFilename: photo.originalFilename ?? null,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    uploaderType: photo.uploaderType,
    createdAt: photo.createdAt?.toISOString() ?? null,
  };
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      typeof parsed.createdAt !== "string" ||
      !Types.ObjectId.isValid(parsed.id)
    ) {
      throw new Error("bad cursor");
    }
    return { createdAt: new Date(parsed.createdAt), id: parsed.id as string };
  } catch {
    throw new WeddingError(
      "VALIDATION_ERROR",
      "That page link is not valid.",
      400,
    );
  }
}

export async function listPhotos(
  weddingId: string,
  query: z.infer<typeof listPhotosQuerySchema>,
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { weddingId, status: "READY" };
  if (query.eventId === "other") filter.eventId = null;
  else if (query.eventId) filter.eventId = query.eventId;
  const cursor = decodeCursor(query.cursor);
  const pageFilter = cursor
    ? {
        ...filter,
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
        ],
      }
    : filter;
  const [rows] = await Promise.all([
    Photo.find(pageFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.limit + 1)
      .lean(),
  ]);
  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  const nextCursor =
    rows.length > query.limit && last?.createdAt
      ? Buffer.from(
          JSON.stringify({
            createdAt: last.createdAt.toISOString(),
            id: String(last._id),
          }),
        ).toString("base64url")
      : null;
  const data = [];
  // Bound storage concurrency to each page; don't trust Mongo metadata alone
  // when an operator may have removed an object directly in R2.
  for (let offset = 0; offset < page.length; offset += 6) {
    const checked = await Promise.all(
      page.slice(offset, offset + 6).map(async (photo) => ({
        photo,
        exists: await objectExists(photo.objectKey),
      })),
    );
    for (const { photo, exists } of checked) {
      if (exists) data.push(toPhotoDto(photo, await signRead(photo.objectKey)));
      else
        await Photo.updateOne(
          {
            _id: photo._id,
            weddingId,
            objectKey: photo.objectKey,
            status: "READY",
          },
          { $set: { status: "DELETED" } },
        );
    }
  }
  const total = await Photo.countDocuments(filter);
  return { data, pagination: { nextCursor, total } };
}

export async function downloadPhoto(weddingId: string, photoId: string) {
  await connectToDatabase();
  const photo = await Photo.findOne({
    _id: photoId,
    weddingId,
    status: "READY",
  }).lean();
  if (!photo) throw new WeddingError("NOT_FOUND", "Photo not found.", 404);
  if (!(await objectExists(photo.objectKey))) {
    await Photo.updateOne(
      { _id: photo._id, weddingId, status: "READY" },
      { $set: { status: "DELETED" } },
    );
    throw new WeddingError(
      "NOT_FOUND",
      "This photo was removed from storage. Refresh the gallery.",
      404,
    );
  }
  return {
    url: await signRead(photo.objectKey, photo.originalFilename ?? "photo"),
  };
}

export async function deletePhoto(weddingId: string, photoId: string) {
  await connectToDatabase();
  const photo = await Photo.findOne({
    _id: photoId,
    weddingId,
    status: "READY",
  });
  if (!photo) throw new WeddingError("NOT_FOUND", "Photo not found.", 404);
  await deleteObject(photo.objectKey);
  await Photo.updateOne(
    { _id: photo._id, weddingId, status: "READY" },
    { $set: { status: "DELETED" } },
  );
  return { success: true };
}
