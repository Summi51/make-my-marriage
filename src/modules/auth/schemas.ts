import { z } from "zod";

const email = z
  .string()
  .trim()
  .max(254)
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());
export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email,
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(128, "Use no more than 128 characters."),
});
export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Use no more than 128 characters."),
});
