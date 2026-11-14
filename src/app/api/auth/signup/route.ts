import { type NextRequest } from "next/server";
import { signup } from "@/modules/auth/use-cases";
import { signupSchema } from "@/modules/auth/schemas";
import {
  checkOrigin,
  parseBody,
  authResponse,
  authFailure,
  requireSignedOut,
} from "@/server/auth/http";
import { limitAuth } from "@/server/auth/rate-limit";
import { requestTabId } from "@/server/auth/sessions";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await requireSignedOut(request);
    const input = await parseBody(request, signupSchema);
    await limitAuth("signup", input.email);
    return authResponse(await signup(input), 201, requestTabId(request));
  } catch (error) {
    return authFailure(error);
  }
}
