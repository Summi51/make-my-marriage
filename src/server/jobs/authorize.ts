import "server-only";
import { timingSafeEqual } from "node:crypto";

export function isJobRequestAuthorized(
  authorization: string | null,
  secret = process.env.CRON_SECRET,
) {
  if (!secret || secret.length < 32 || !authorization) return false;
  const expected = `Bearer ${secret}`;
  const provided = Buffer.from(authorization);
  const required = Buffer.from(expected);
  if (provided.length !== required.length) return false;
  return timingSafeEqual(provided, required);
}
