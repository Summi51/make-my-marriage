import { z } from "zod";

export const photoMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// 4 MiB keeps a same-origin upload under Amplify's ~6 MB request-body ceiling
// and Next's default 10 MB proxy buffer. Phone photos are usually smaller.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_BATCH = 20;
export const DEFAULT_PAGE = 24;
export const MAX_PAGE = 48;
// One free R2 bucket is shared by every wedding on this account.
// 8 GiB leaves headroom under the 10 GB free storage allowance.
export const MAX_ACCOUNT_READY_BYTES = 8 * 1024 * 1024 * 1024;
export const MAX_ACCOUNT_READY_PHOTOS = 2000;
// One upload is several Class A writes. 400/day stays under the free monthly
// Class A allowance even if the gallery is used every day.
export const MAX_ACCOUNT_UPLOADS_PER_DAY = 400;

const objectIdPattern = /^[a-f\d]{24}$/i;

const filename = z
  .string()
  .trim()
  .min(1, "Choose a photo.")
  .max(200, "That file name is too long.");

const mimeType = z.enum(photoMimeTypes, {
  error: "Use a JPEG, PNG, or WebP photo.",
});

const sizeBytes = z
  .number()
  .int()
  .min(1, "That file is empty.")
  .max(MAX_PHOTO_BYTES, "Each photo must be 4 MB or smaller.");

const eventId = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || objectIdPattern.test(value),
    "Choose a celebration from this wedding.",
  );

export const uploadUrlSchema = z.object({
  filename,
  mimeType,
  sizeBytes,
  eventId,
});

export const confirmPhotoSchema = z.object({
  objectKey: z.string().trim().min(1).max(300),
  filename,
  mimeType,
  sizeBytes,
  eventId,
});

export const listPhotosQuerySchema = z.object({
  eventId: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        value === undefined || value === "other" || objectIdPattern.test(value),
      "Choose a celebration from this wedding.",
    ),
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE).default(DEFAULT_PAGE),
});
