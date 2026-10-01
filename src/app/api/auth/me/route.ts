import { NextResponse, type NextRequest } from "next/server";
import { findSessionUser, SESSION_COOKIE } from "@/server/auth/sessions";
import { AuthError } from "@/modules/auth/errors";
import { authFailure } from "@/server/auth/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const user = await findSessionUser(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    if (!user) throw new AuthError("UNAUTHENTICATED", "Please sign in.", 401);
    return NextResponse.json(
      { data: { user, membership: null, wedding: null } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authFailure(error);
  }
}
