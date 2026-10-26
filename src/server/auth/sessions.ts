import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Session, User } from "@/modules/auth/models";
import { connectToDatabase } from "@/server/db";
import { TAB_HEADER } from "@/lib/tab-session";

export function sessionCookieName(origin = process.env.APP_ORIGIN) {
  if (origin) {
    const url = new URL(origin);
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      return `mmm_session_local_${url.port || (url.protocol === "https:" ? "443" : "80")}`;
  }
  return "mmm_session";
}
export const SESSION_COOKIE = sessionCookieName();
export function cookieForTab(tabId?: string | null) {
  if (tabId === null || tabId === undefined) return SESSION_COOKIE;
  return /^[a-f0-9]{32}$/.test(tabId)
    ? `${SESSION_COOKIE}_${tabId}`
    : `${SESSION_COOKIE}_invalid`;
}
export function requestTabId(request: {
  headers: { get(name: string): string | null };
}) {
  return request.headers.get(TAB_HEADER);
}
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  await Session.init();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await Session.create({ userId, tokenHash: tokenHash(token), expiresAt });
  return { token, expiresAt };
}

export async function findSessionUser(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await connectToDatabase();
  const session = await Session.findOne({
    tokenHash: tokenHash(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).lean();
  return user
    ? { id: user._id.toString(), name: user.name, email: user.email }
    : null;
}

export async function currentUser(tabId?: string | null) {
  return findSessionUser((await cookies()).get(cookieForTab(tabId))?.value);
}

export async function deleteSession(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  await connectToDatabase();
  await Session.deleteOne({ tokenHash: tokenHash(token) });
}
