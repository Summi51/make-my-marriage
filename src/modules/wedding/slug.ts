import "server-only";
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

/** Builds a unique wedding website slug from the names and date. */
export async function generateUniqueSlug(
  brideName: string,
  groomName: string,
  weddingDate: string,
  excludeWeddingId?: string,
) {
  const base = `${slugifyName(brideName)}-${slugifyName(groomName)}-${datePart(weddingDate)}`;
  let candidate = base;
  let suffix = 2;
  while (
    await Wedding.exists({
      "website.slug": candidate,
      ...(excludeWeddingId ? { _id: { $ne: excludeWeddingId } } : {}),
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
