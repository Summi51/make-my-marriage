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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

export const updateWeddingSchema = z
  .object({
    brideName: name,
    groomName: name,
    title: optionalText(150),
    description: optionalText(1000),
    weddingDate,
    timeZone,
    location,
  })
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update.",
  });

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER"]),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().max(254).email("Enter a valid email address."),
  role: z.enum(["ADMIN", "MANAGER"]),
});

export const websiteThemes = ["CLASSIC", "MINIMAL", "MODERN"] as const;

const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function youtubeVideoId(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !youtubeHosts.has(url.hostname)) return null;
  if (url.username || url.password) return null;
  const fromPath = url.pathname.match(
    /^\/(?:embed|live|shorts|v)\/([\w-]{11})\/?$/,
  );
  if (url.hostname.endsWith("youtu.be")) {
    const id = url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1] ?? null;
    return id;
  }
  if (fromPath) return fromPath[1];
  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v");
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }
  return null;
}

const youtubeUrl = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || youtubeVideoId(value) !== null,
    "Use a YouTube watch, live, or youtu.be link.",
  );

export const updateWebsiteSchema = z
  .object({
    theme: z.enum(websiteThemes).optional(),
    welcomeMessage: optionalText(1500).optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update.",
  });

export const updateLivestreamSchema = z
  .object({
    youtubeUrl: youtubeUrl.optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one field to update.",
  })
  .refine((value) => !(value.isEnabled === true && value.youtubeUrl === null), {
    message: "Add a YouTube link before turning the livestream on.",
    path: ["youtubeUrl"],
  });
