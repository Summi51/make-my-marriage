import { NextResponse, type NextRequest } from "next/server";
import {
  createMemberInvitation,
  listPendingInvitations,
} from "@/modules/wedding/invitations";
import { inviteMemberSchema } from "@/modules/wedding/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request, {
      requireRole: "ADMIN",
    });
    return NextResponse.json(
      { data: await listPendingInvitations(String(wedding._id)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { user, wedding } = await requireWeddingContext(request, {
      requireRole: "ADMIN",
    });
    const input = await parseBody(request, inviteMemberSchema);
    const origin = process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : new URL(request.url).origin;
    const invitation = await createMemberInvitation(
      {
        weddingId: String(wedding._id),
        invitedByUserId: user.id,
        inviterName: user.name,
        brideName: wedding.brideName,
        groomName: wedding.groomName,
        weddingDate: wedding.weddingDate,
      },
      input,
      origin,
    );
    return NextResponse.json(
      { data: invitation },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
