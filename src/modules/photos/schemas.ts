import { z } from "zod";

export const photoMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_BATCH = 20;
export const DEFAULT_PAGE = 24;
export const MAX_PAGE = 48;

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
  .max(MAX_PHOTO_BYTES, "Each photo must be 10 MB or smaller.");

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
