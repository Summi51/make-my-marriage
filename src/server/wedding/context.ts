import "server-only";
import { findSessionUser, SESSION_COOKIE } from "@/server/auth/sessions";
import { getMembershipContext } from "@/modules/wedding/use-cases";
import { WeddingError } from "@/modules/wedding/errors";

/** Resolves the signed-in user and their wedding membership. Never trusts a client weddingId. */
export async function requireWeddingContext(
  request: { cookies: { get(name: string): { value: string } | undefined } },
  options?: { requireRole?: "ADMIN" },
) {
  const user = await findSessionUser(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!user)
    throw new WeddingError("UNAUTHENTICATED", "Please sign in.", 401);
  const { membership, wedding } = await getMembershipContext(user.id);
  if (!membership || !wedding)
    throw new WeddingError("NOT_FOUND", "You do not belong to a wedding.", 404);
  if (options?.requireRole === "ADMIN" && membership.role !== "ADMIN")
    throw new WeddingError(
      "FORBIDDEN",
      "Only an Admin can do this.",
      403,
    );
  return { user, membership, wedding };
}

export async function requireUser(request: {
  cookies: { get(name: string): { value: string } | undefined };
}) {
  const user = await findSessionUser(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!user)
    throw new WeddingError("UNAUTHENTICATED", "Please sign in.", 401);
  return user;
}
