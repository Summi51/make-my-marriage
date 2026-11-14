import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import { Wedding } from "@/modules/wedding/models";
import { Event } from "@/modules/events/models";
import { WeddingError } from "@/modules/wedding/errors";
import { connectToDatabase } from "@/server/db";

export const gallerySettingsSchema = z
  .object({
    isEnabled: z.boolean().optional(),
    guestUploadsEnabled: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update.",
  });
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
function encryptionKey() {
  const secret = process.env.MEMBER_INVITATION_SECRET;
  if (!secret || secret.length < 32)
    throw new WeddingError(
      "NOT_CONFIGURED",
      "Guest sharing is not available yet. Please contact the organiser.",
      503,
    );
  return createHash("sha256").update(`guest-gallery:v1:${secret}`).digest();
}
function encrypt(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const bytes = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
}
/** Stable share credentials. Raw token is returned only to the caller that stores it encrypted. */
export function createGalleryCredentials() {
  const token = randomBytes(24).toString("base64url");
  return {
    token,
    encryptedToken: encrypt(token),
    tokenHash: digest(token),
  };
}

function decrypt(envelope: string) {
  const bytes = Buffer.from(envelope, "base64url");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    bytes.subarray(0, 12),
  );
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
const missingToken = {
  $or: [
    { "gallery.encryptedToken": { $exists: false } },
    { "gallery.encryptedToken": null },
    { "gallery.encryptedToken": "" },
  ],
};

async function ensureGalleryToken(weddingId: string) {
  const id = new Types.ObjectId(weddingId);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const credentials = createGalleryCredentials();
    try {
      // Older weddings only stored an unrecoverable placeholder hash.
      // Write through the driver so a cached schema cannot drop this field.
      // Write once, including a stored null, and never rotate a real token.
      // Driver 6 returns the document directly. An older `{ value }` wrapper
      // must not hide that document, or a successful write looks like a miss.
      const written = await Wedding.collection.findOneAndUpdate(
        { _id: id, deletedAt: null, ...missingToken },
        {
          $set: {
            "gallery.encryptedToken": credentials.encryptedToken,
            "gallery.tokenHash": credentials.tokenHash,
          },
        },
        { returnDocument: "after" },
      );
      const updated =
        written &&
        typeof written === "object" &&
        "value" in written &&
        written.value &&
        typeof written.value === "object"
          ? written.value
          : written;
      if (updated?.gallery?.encryptedToken) return updated;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    const current = await Wedding.collection.findOne({
      _id: id,
      deletedAt: null,
    });
    if (current?.gallery?.encryptedToken) return current;
  }
  return null;
}

export async function gallerySharing(weddingId: string) {
  await connectToDatabase();
  let wedding = await Wedding.findOne({
    _id: weddingId,
    deletedAt: null,
  }).lean();
  if (!wedding) throw new WeddingError("NOT_FOUND", "Wedding not found.", 404);
  if (!wedding.gallery?.encryptedToken) {
    wedding = await ensureGalleryToken(weddingId);
  }
  if (!wedding?.gallery?.encryptedToken)
    throw new WeddingError(
      "NOT_CONFIGURED",
      "Guest sharing could not be prepared. Please try again.",
      503,
    );
  const token = decrypt(wedding.gallery.encryptedToken);
  return {
    path: `/gallery/${token}`,
    isEnabled: wedding.gallery.isEnabled !== false,
    guestUploadsEnabled: wedding.gallery.guestUploadsEnabled !== false,
  };
}
export async function updateGallerySharing(
  weddingId: string,
  input: z.infer<typeof gallerySettingsSchema>,
) {
  await connectToDatabase();
  const update: Record<string, unknown> = {};
  if (input.isEnabled !== undefined)
    update["gallery.isEnabled"] = input.isEnabled;
  if (input.guestUploadsEnabled !== undefined)
    update["gallery.guestUploadsEnabled"] = input.guestUploadsEnabled;
  await Wedding.updateOne(
    { _id: weddingId, deletedAt: null },
    { $set: update },
  );
  return gallerySharing(weddingId);
}
export async function guestGallery(token: string, upload = false) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token))
    throw new WeddingError(
      "NOT_FOUND",
      "This gallery link is unavailable.",
      404,
    );
  await connectToDatabase();
  const wedding = await Wedding.findOne({
    "gallery.tokenHash": digest(token),
    "gallery.isEnabled": true,
    deletedAt: null,
  }).lean();
  if (!wedding)
    throw new WeddingError(
      "NOT_FOUND",
      "This gallery link is unavailable or sharing has been paused.",
      404,
    );
  if (upload && wedding.gallery?.guestUploadsEnabled === false)
    throw new WeddingError(
      "FORBIDDEN",
      "Photo uploads are paused. You can still view the album.",
      403,
    );
  return wedding;
}
export async function guestGalleryInfo(token: string) {
  const wedding = await guestGallery(token);
  const events = await Event.find({ weddingId: wedding._id, archivedAt: null })
    .sort({ startsAt: 1 })
    .select("name")
    .lean();
  return {
    wedding: {
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate: wedding.weddingDate,
    },
    guestUploadsEnabled: wedding.gallery?.guestUploadsEnabled !== false,
    events: events.map((event) => ({
      id: String(event._id),
      name: event.name,
    })),
  };
}
