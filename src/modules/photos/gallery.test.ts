import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/server/auth/rate-limit", () => ({ consumeLimit: vi.fn() }));
vi.mock("@/modules/events/models", () => ({
  Event: { findOne: vi.fn() },
}));
vi.mock("@/server/storage/r2", () => ({
  objectExists: vi.fn(),
  signRead: vi.fn(),
  deleteObject: vi.fn(),
  copyObject: vi.fn(),
  createObjectKey: vi.fn(),
  inspectObject: vi.fn(),
  readSignature: vi.fn(),
  signUpload: vi.fn(),
  uploadObjectDirect: vi.fn(),
}));
vi.mock("./models", () => ({
  Photo: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
  },
}));
import { Photo } from "./models";
import { Event } from "@/modules/events/models";
import {
  objectExists,
  signRead,
  deleteObject,
  copyObject,
  createObjectKey,
  inspectObject,
  readSignature,
  signUpload,
  uploadObjectDirect,
} from "@/server/storage/r2";
import { AuthError } from "@/modules/auth/errors";
import { consumeLimit } from "@/server/auth/rate-limit";
import {
  listPhotos,
  deletePhoto,
  downloadPhoto,
  reserveUpload,
  confirmUpload,
  uploadStagingFallback,
} from "./use-cases";

const weddingId = new Types.ObjectId().toString();
const eventId = new Types.ObjectId();
const row = {
  _id: new Types.ObjectId(),
  eventId,
  objectKey: "private-photo",
  mimeType: "image/png",
  sizeBytes: 50,
  createdAt: new Date(),
  status: "READY",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(Photo.find).mockReturnValue({
    sort: () => ({ limit: () => ({ lean: async () => [row] }) }),
  } as never);
  vi.mocked(Photo.countDocuments).mockResolvedValue(1);
  vi.mocked(objectExists).mockResolvedValue(true);
  vi.mocked(signRead).mockResolvedValue("signed-private-url");
});

describe("gallery storage reconciliation and tenant isolation", () => {
  it("keeps the exact event assignment and wedding scope", async () => {
    const result = await listPhotos(weddingId, {
      eventId: String(eventId),
      limit: 24,
    });
    expect(Photo.find).toHaveBeenCalledWith({
      weddingId,
      status: "READY",
      eventId: String(eventId),
    });
    expect(result.data[0].eventId).toBe(String(eventId));
  });
  it("signs gallery tiles from metadata without a storage existence check", async () => {
    const result = await listPhotos(weddingId, { limit: 24 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].url).toBe("signed-private-url");
    expect(objectExists).not.toHaveBeenCalled();
    expect(Photo.updateOne).not.toHaveBeenCalled();
    expect(signRead).toHaveBeenCalledWith(row.objectKey);
  });
  it("does not tombstone metadata when a gallery tile cannot be signed", async () => {
    vi.mocked(signRead).mockRejectedValue(new Error("unavailable"));
    await expect(listPhotos(weddingId, { limit: 24 })).rejects.toThrow();
    expect(objectExists).not.toHaveBeenCalled();
    expect(Photo.updateOne).not.toHaveBeenCalled();
  });
  it("keeps metadata when a requested deletion fails", async () => {
    vi.mocked(Photo.findOne).mockResolvedValue(row as never);
    vi.mocked(deleteObject).mockRejectedValue(new Error("unavailable"));
    await expect(deletePhoto(weddingId, String(row._id))).rejects.toThrow();
    expect(Photo.findOne).toHaveBeenCalledWith({
      _id: String(row._id),
      weddingId,
      status: "READY",
    });
    expect(Photo.updateOne).not.toHaveBeenCalled();
  });
  it("denies downloading a photo outside the wedding", async () => {
    vi.mocked(Photo.findOne).mockReturnValue({
      lean: async () => null,
    } as never);
    await expect(
      downloadPhoto(weddingId, String(row._id)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(signRead).not.toHaveBeenCalled();
  });
});

describe("photo upload confirmation", () => {
  const membershipId = new Types.ObjectId().toString();
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const pending = {
    _id: new Types.ObjectId(),
    weddingId,
    eventId: null,
    uploadKey: "weddings/one/photos/staging/abc",
    objectKey: "weddings/one/photos/staging/abc",
    mimeType: "image/png",
    sizeBytes: png.length,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(Photo.find).mockReturnValue({
      select: () => ({ limit: () => ({ lean: async () => [] }) }),
    } as never);
    vi.mocked(Photo.aggregate).mockResolvedValue([]);
    vi.mocked(createObjectKey).mockReturnValue("weddings/one/photos/final/new");
    vi.mocked(signUpload).mockResolvedValue({
      uploadUrl: "https://upload.example/private",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    vi.mocked(inspectObject).mockResolvedValue({
      contentLength: png.length,
      contentType: "image/png",
      etag: "etag-1",
    });
    vi.mocked(readSignature).mockResolvedValue(png);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(copyObject).mockResolvedValue(undefined);
  });

  it("publishes a matching photo and removes the staging object", async () => {
    vi.mocked(Photo.findOne).mockResolvedValue(pending as never);
    vi.mocked(Photo.findOneAndUpdate).mockResolvedValue({
      ...pending,
      status: "READY",
      objectKey: "weddings/one/photos/final/new",
    } as never);
    const photo = await confirmUpload(weddingId, membershipId, {
      objectKey: pending.uploadKey,
      filename: "guest.png",
      mimeType: "image/png",
      sizeBytes: png.length,
      eventId: null,
    });
    expect(copyObject).toHaveBeenCalledWith(
      pending.uploadKey,
      "weddings/one/photos/final/new",
      "etag-1",
    );
    expect(deleteObject).toHaveBeenCalledWith(pending.uploadKey);
    expect(photo.id).toBe(String(pending._id));
  });

  it("rejects a reserved file whose bytes are not a photo", async () => {
    vi.mocked(Photo.findOne).mockResolvedValue(pending as never);
    vi.mocked(readSignature).mockResolvedValue(Buffer.from("not-a-photo"));
    await expect(
      confirmUpload(weddingId, membershipId, {
        objectKey: pending.uploadKey,
        filename: "guest.png",
        mimeType: "image/png",
        sizeBytes: png.length,
        eventId: null,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("rejects a confirm that does not match the reserved photo", async () => {
    vi.mocked(Photo.findOne).mockResolvedValue(pending as never);
    await expect(
      confirmUpload(weddingId, membershipId, {
        objectKey: pending.uploadKey,
        filename: "guest.png",
        mimeType: "image/jpeg",
        sizeBytes: png.length,
        eventId: null,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(inspectObject).not.toHaveBeenCalled();
  });

  it("returns the published photo when the same upload is confirmed again", async () => {
    vi.mocked(Photo.findOne).mockResolvedValue({
      ...pending,
      status: "READY",
      objectKey: "weddings/one/photos/final/kept",
    } as never);
    const photo = await confirmUpload(weddingId, membershipId, {
      objectKey: pending.uploadKey,
      filename: "guest.png",
      mimeType: "image/png",
      sizeBytes: png.length,
      eventId: null,
    });
    expect(photo.url).toBe("");
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("keeps an expired upload when its staging file cannot be deleted", async () => {
    vi.mocked(Photo.find).mockReturnValue({
      select: () => ({
        limit: () => ({
          lean: async () => [
            { _id: pending._id, uploadKey: pending.uploadKey },
          ],
        }),
      }),
    } as never);
    vi.mocked(deleteObject).mockRejectedValue(new Error("storage down"));
    vi.mocked(Photo.aggregate).mockResolvedValue([
      { photos: 0, bytes: 0 },
    ] as never);
    vi.mocked(createObjectKey).mockReturnValue(
      "weddings/one/photos/staging/next",
    );
    vi.mocked(signUpload).mockResolvedValue({
      uploadUrl: "https://upload.example/next",
      expiresAt: new Date().toISOString(),
    } as never);
    await reserveUpload(weddingId, membershipId, {
      filename: "guest.png",
      mimeType: "image/png",
      sizeBytes: png.length,
      eventId: null,
    });
    expect(Photo.updateOne).not.toHaveBeenCalled();
  });

  it("does not reserve another upload when free account storage is full", async () => {
    vi.mocked(Photo.aggregate).mockResolvedValue([
      { photos: 2000, bytes: 100 },
    ] as never);
    await expect(
      reserveUpload(weddingId, membershipId, {
        filename: "guest.png",
        mimeType: "image/png",
        sizeBytes: png.length,
        eventId: null,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(signUpload).not.toHaveBeenCalled();
    expect(Event.findOne).not.toHaveBeenCalled();
  });

  it("does not store a fallback file that is not a photo", async () => {
    vi.mocked(Photo.findOne).mockResolvedValue(pending as never);
    await expect(
      uploadStagingFallback(
        weddingId,
        membershipId,
        pending.uploadKey,
        Buffer.from("not-a-photo"),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(uploadObjectDirect).not.toHaveBeenCalled();
  });

  it("stops new uploads when the free daily allowance is used", async () => {
    vi.mocked(consumeLimit).mockImplementation(async (key: string) => {
      if (key === "photos:account:day") {
        throw new AuthError(
          "RATE_LIMITED",
          "Too many attempts. Please try again later.",
          429,
        );
      }
    });
    await expect(
      reserveUpload(weddingId, membershipId, {
        filename: "guest.png",
        mimeType: "image/png",
        sizeBytes: png.length,
        eventId: null,
      }),
    ).rejects.toMatchObject({
      status: 429,
      message:
        "Today's free upload allowance is used. Try again tomorrow, or delete photos you no longer need.",
    });
    expect(signUpload).not.toHaveBeenCalled();
    expect(Photo.create).not.toHaveBeenCalled();
  });
});
