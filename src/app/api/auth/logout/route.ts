import { NextResponse, type NextRequest } from "next/server";
import {
  findSessionUser,
  deleteSession,
  cookieForTab,
  requestTabId,
  cookieOptions,
} from "@/server/auth/sessions";
import { AuthError } from "@/modules/auth/errors";
import { checkOrigin, authFailure } from "@/server/auth/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const cookieName = cookieForTab(requestTabId(request));
    const token = request.cookies.get(cookieName)?.value;
    if (!token || !(await findSessionUser(token)))
      throw new AuthError("UNAUTHENTICATED", "Please sign in.", 401);
    await deleteSession(token);
    const response = NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(cookieName, "", {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    return authFailure(error);
  }
}
