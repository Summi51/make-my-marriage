import { NextResponse, type NextRequest } from "next/server";
import { revokeMemberInvitation } from "@/modules/wedding/invitations";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request, {
      requireRole: "ADMIN",
    });
    const { invitationId } = await params;
    requireObjectId(invitationId);
    await revokeMemberInvitation(String(wedding._id), invitationId);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return weddingFailure(error);
  }
}
