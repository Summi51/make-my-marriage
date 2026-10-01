import { z } from "zod";

const serverEnvSchema = z.object({
  MONGODB_URI: z
    .string("MONGODB_URI is required.")
    .trim()
    .min(1, "MONGODB_URI is required.")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a MongoDB connection string.",
    ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  const result = serverEnvSchema.safeParse({
    MONGODB_URI: source.MONGODB_URI,
  });

  if (!result.success) {
    throw new Error(
      `Invalid server environment: ${result.error.issues
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }

  return result.data;
}
