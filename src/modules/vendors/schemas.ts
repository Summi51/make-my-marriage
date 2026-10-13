import { z } from "zod";
import { VENDOR_CATEGORIES } from "./models";

export const vendorCategorySchema = z.enum(VENDOR_CATEGORIES);
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid event ID.");
const optionalWebsite = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .url()
      .max(500)
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Use an http or https URL.",
      ),
  ])
  .nullable()
  .optional();

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: vendorCategorySchema,
  contactPerson: optionalText(120),
  phone: optionalText(40),
  email: z
    .union([z.literal(""), z.string().trim().email().max(254)])
    .nullable()
    .optional(),
  address: optionalText(500),
  website: optionalWebsite,
  totalAgreedCostPaise: z
    .number()
    .int()
    .min(0)
    .max(100_000_000_000)
    .nullable()
    .optional(),
  eventIds: z.array(objectId).max(30).default([]),
  notes: optionalText(2000),
});
export const updateVendorSchema = createVendorSchema.partial().extend({
  eventIds: z.array(objectId).max(30).optional(),
});
export const listVendorsQuerySchema = z.object({
  category: vendorCategorySchema.optional(),
  search: z.string().trim().max(120).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export const discoveryQuerySchema = z
  .object({
    category: vendorCategorySchema,
    query: z.string().trim().max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine(
    (value) => (value.lat === undefined) === (value.lng === undefined),
    "Provide both latitude and longitude.",
  );

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
