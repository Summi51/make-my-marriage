import { z } from "zod";

export const rsvpStatuses = ["PENDING", "ATTENDING", "NOT_ATTENDING"] as const;

const objectIdPattern = /^[a-f\d]{24}$/i;

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) =>
      value === null || value === undefined || objectIdPattern.test(value),
    "Invalid event identifier.",
  );

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) =>
      value === null ||
      value === undefined ||
      z.string().email().safeParse(value).success,
    "Please provide a valid email address.",
  );

const optionalPhone = z
  .string()
  .trim()
  .max(30, "Phone number is too long.")
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));

const optionalNotes = z
  .string()
  .trim()
  .max(1000, "Notes must be 1,000 characters or fewer.")
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));

export const createGuestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Guest name is required.")
    .max(120, "Guest name must be 120 characters or fewer."),
  email: optionalEmail,
  phone: optionalPhone,
  maxGuests: z.coerce
    .number()
    .int("Party size must be a whole number.")
    .min(1, "Maximum party size must be at least 1.")
    .max(50, "Maximum party size cannot exceed 50.")
    .default(1),
  isFamily: z.boolean().default(false),
  invitedEventIds: z.array(z.string().regex(objectIdPattern)).default([]),
  notes: optionalNotes,
});

// RSVP, invitation-token and delivery fields are server-owned. They are never
// accepted here: a guest updates their own RSVP through the public token route,
// which enforces party-size capacity and the version guard.
export const updateGuestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Guest name is required.")
      .max(120, "Guest name must be 120 characters or fewer.")
      .optional(),
    email: optionalEmail,
    phone: optionalPhone,
    maxGuests: z.coerce
      .number()
      .int("Party size must be a whole number.")
      .min(1, "Maximum party size must be at least 1.")
      .max(50, "Maximum party size cannot exceed 50.")
      .optional(),
    isFamily: z.boolean().optional(),
    invitedEventIds: z.array(z.string().regex(objectIdPattern)).optional(),
    notes: optionalNotes,
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "Provide at least one field to update." },
  );

export const listGuestsQuerySchema = z.object({
  search: z.string().trim().optional(),
  eventId: optionalObjectId.optional(),
  rsvpStatus: z
    .enum(["ALL", ...rsvpStatuses])
    .optional()
    .default("ALL"),
  invitationStatus: z.enum(["ALL", "SENT", "UNSENT"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const publicRsvpSchema = z
  .object({
    status: z.enum(["ATTENDING", "NOT_ATTENDING"]),
    attendingCount: z.coerce
      .number()
      .int("Attending count must be a whole number.")
      .min(0),
  })
  .refine(
    (data) => {
      if (data.status === "NOT_ATTENDING") {
        return data.attendingCount === 0;
      }
      if (data.status === "ATTENDING") {
        return data.attendingCount >= 1;
      }
      return true;
    },
    {
      message: "Please specify valid attending count for your RSVP status.",
      path: ["attendingCount"],
    },
  );

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type ListGuestsQuery = z.infer<typeof listGuestsQuerySchema>;
export type PublicRsvpInput = z.infer<typeof publicRsvpSchema>;
