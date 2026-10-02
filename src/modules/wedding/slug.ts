import "server-only";
import { randomBytes } from "node:crypto";
import { Wedding } from "./models";

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function datePart(weddingDate: string) {
  const [year, month, day] = weddingDate.split("-");
  return `${day}${month}${year}`;
}

/** Builds a stable, unique wedding website slug. Does not change once created. */
export async function generateUniqueSlug(
  brideName: string,
  groomName: string,
  weddingDate: string,
) {
  const base = `${slugifyName(brideName)}-${slugifyName(groomName)}-${datePart(weddingDate)}`;
  let candidate = base;
  let suffix = 2;
  while (await Wedding.exists({ "website.slug": candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function generateGalleryToken() {
  return randomBytes(32).toString("hex");
}
