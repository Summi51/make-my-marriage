import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/modules/auth/errors";
import {
  cookieOptions,
  findSessionUser,
  cookieForTab,
  requestTabId,
} from "./sessions";

export async function requireSignedOut(request: NextRequest) {
  if (
    await findSessionUser(
      request.cookies.get(cookieForTab(requestTabId(request)))?.value,
    )
  )
    throw new AuthError(
      "ALREADY_SIGNED_IN",
      "You are already signed in. Sign out before switching accounts.",
      409,
    );
}

function requestOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function checkOrigin(request: NextRequest) {
  const configured = process.env.APP_ORIGIN;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new Error("APP_ORIGIN is required in production.");
  let expected: string;
  try {
    expected = configured
      ? new URL(configured).origin
      : new URL(request.url).origin;
  } catch {
    throw new Error("APP_ORIGIN must be an absolute URL.");
  }
  const originHeader = request.headers.get("origin");
  const origin = requestOrigin(originHeader);
  const expectedUrl = new URL(expected);
  const host = request.headers.get("host")?.trim().toLowerCase();
  const sameHost =
    originHeader === null &&
    expectedUrl.protocol === "https:" &&
    host === expectedUrl.host &&
    request.headers.get("x-forwarded-proto") === "https";
  if (origin !== expected && !sameHost)
    throw new AuthError("FORBIDDEN", "This request is not allowed.", 403);
}

export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AuthError("VALIDATION_ERROR", "Send a JSON request.", 400);
  const reader = request.body?.getReader();
  if (!reader)
    throw new AuthError("VALIDATION_ERROR", "A request body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new AuthError("VALIDATION_ERROR", "Request is too large.", 400);
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AuthError("VALIDATION_ERROR", "Send valid JSON.", 400);
  }
  const result = schema.safeParse(body);
  if (!result.success)
    throw new AuthError(
      "VALIDATION_ERROR",
      result.error.issues[0]?.message ?? "Check your details.",
      400,
    );
  return result.data;
}

export function authResponse(
  result: {
    user: { id: string; name: string; email: string };
    hasWedding: boolean;
    session: { token: string; expiresAt: Date };
  },
  status: number,
  tabId?: string | null,
) {
  const response = NextResponse.json(
    { data: { user: result.user, hasWedding: result.hasWedding } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(cookieForTab(tabId), result.session.token, {
    ...cookieOptions,
    expires: result.session.expiresAt,
  });
  return response;
}

export function authFailure(error: unknown) {
  const known = error instanceof AuthError;
  return NextResponse.json(
    {
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known
          ? error.message
          : "Something went wrong. Please try again.",
      },
    },
    {
      status: known ? error.status : 500,
      headers: {
        "Cache-Control": "no-store",
        ...(known && error.retryAfter
          ? { "Retry-After": String(error.retryAfter) }
          : {}),
      },
    },
  );
}
