import { type NextRequest } from "next/server";
import { login } from "@/modules/auth/use-cases";
import { loginSchema } from "@/modules/auth/schemas";
import {
  checkOrigin,
  parseBody,
  authResponse,
  authFailure,
} from "@/server/auth/http";
import { limitAuth } from "@/server/auth/rate-limit";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const input = await parseBody(request, loginSchema);
    await limitAuth("login", input.email);
    return authResponse(await login(input), 200);
  } catch (error) {
    return authFailure(error);
  }
}
