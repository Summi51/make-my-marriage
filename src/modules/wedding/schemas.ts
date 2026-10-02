import { z } from "zod";

const name = z.string().trim().min(1, "This name is required.").max(100);
const weddingDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Use a real date.");
const timeZone = z.string().trim().min(1).max(64);
const location = z
  .object({
    formattedAddress: z.string().trim().max(300).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    googlePlaceId: z.string().trim().max(300).optional(),
  })
  .optional();

export const createWeddingSchema = z.object({
  brideName: name,
  groomName: name,
  title: z.string().trim().max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  weddingDate,
  timeZone: timeZone.default("Asia/Kolkata"),
  location,
});

export const updateWeddingSchema = z
  .object({
    brideName: name,
    groomName: name,
    title: z.string().trim().max(150),
    description: z.string().trim().max(1000),
    weddingDate,
    timeZone,
    location,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER"]),
});
