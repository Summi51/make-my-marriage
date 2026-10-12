import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { WeddingError } from "@/modules/wedding/errors";

export function requireObjectId(value: string, label = "member id") {
  if (!Types.ObjectId.isValid(value))
    throw new WeddingError("VALIDATION_ERROR", `Check the ${label}.`, 400);
  return value;
}

export { checkOrigin } from "@/server/auth/http";

type KnownError = {
  code: string;
  message: string;
  status: number;
  retryAfter?: number;
};

function isKnownError(error: unknown): error is KnownError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "status" in error &&
    "message" in error &&
    typeof (error as KnownError).code === "string" &&
    typeof (error as KnownError).status === "number" &&
    typeof (error as KnownError).message === "string"
  );
}

export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new WeddingError("VALIDATION_ERROR", "Send a JSON request.", 400);
  const reader = request.body?.getReader();
  if (!reader)
    throw new WeddingError(
      "VALIDATION_ERROR",
      "A request body is required.",
      400,
    );
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new WeddingError("VALIDATION_ERROR", "Request is too large.", 400);
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new WeddingError("VALIDATION_ERROR", "Send valid JSON.", 400);
  }
  const result = schema.safeParse(body);
  if (!result.success)
    throw new WeddingError(
      "VALIDATION_ERROR",
      result.error.issues[0]?.message ?? "Check your details.",
      400,
    );
  return result.data;
}

export function weddingFailure(error: unknown) {
  const known = isKnownError(error);
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
