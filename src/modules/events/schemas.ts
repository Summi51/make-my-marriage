import { z } from "zod";

export const eventTypes = [
  "MEHENDI",
  "HALDI",
  "SANGEET",
  "NIKAH",
  "BARAAT",
  "WALIMA",
  "RUKHSATI",
] as const;

export const eventTypeLabels: Record<(typeof eventTypes)[number], string> = {
  MEHENDI: "Mehendi / Mehndi Celebration",
  HALDI: "Haldi / Mayun Ritual",
  SANGEET: "Sangeet & Qawwali Night",
  NIKAH: "Nikah Ceremony & Feast",
  BARAAT: "Baraat Arrival",
  WALIMA: "Walima Reception",
  RUKHSATI: "Rukhsati",
};

const name = z.string().trim().min(1, "Event name is required.").max(150);
const type = z.enum(eventTypes).optional();
const isoDateTime = z
  .string()
  .trim()
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) && /[+-]\d{2}:?\d{2}|Z$/.test(value),
    "Use a date-time with an explicit time zone offset.",
  );
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? null : (value ?? undefined)));

export const createEventSchema = z
  .object({
    name,
    type,
    startsAt: isoDateTime,
    endsAt: isoDateTime.nullable().optional(),
    venueName: optionalText(200),
    address: optionalText(300),
    description: optionalText(2000),
    dressCode: optionalText(200),
  })
  .refine(
    (value) =>
      !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt),
    { message: "The end must be after the start.", path: ["endsAt"] },
  );

export const updateEventSchema = z
  .object({
    name,
    type,
    startsAt: isoDateTime,
    endsAt: isoDateTime.nullable(),
    venueName: optionalText(200),
    address: optionalText(300),
    description: optionalText(2000),
    dressCode: optionalText(200),
  })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update.",
  });

export const listEventsQuerySchema = z.object({
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
});
