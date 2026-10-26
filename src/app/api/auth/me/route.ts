import { NextResponse, type NextRequest } from "next/server";
import {
  findSessionUser,
  cookieForTab,
  requestTabId,
} from "@/server/auth/sessions";
import { AuthError } from "@/modules/auth/errors";
import { authFailure } from "@/server/auth/http";
import { getMembershipContext } from "@/modules/wedding/use-cases";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const user = await findSessionUser(
      request.cookies.get(cookieForTab(requestTabId(request)))?.value,
    );
    if (!user) throw new AuthError("UNAUTHENTICATED", "Please sign in.", 401);
    const { membership, wedding } = await getMembershipContext(user.id);
    return NextResponse.json(
      {
        data: {
          user,
          membership: membership ? { role: membership.role } : null,
          wedding: wedding
            ? {
                id: String(wedding._id),
                brideName: wedding.brideName,
                groomName: wedding.groomName,
                weddingDate: wedding.weddingDate,
              }
            : null,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authFailure(error);
  }
}
