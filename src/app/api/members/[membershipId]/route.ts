import { NextResponse, type NextRequest } from "next/server";
import { updateMemberRole, removeMember } from "@/modules/wedding/use-cases";
import { updateMemberRoleSchema } from "@/modules/wedding/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  parseBody,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request, {
      requireRole: "ADMIN",
    });
    const { membershipId } = await params;
    requireObjectId(membershipId);
    const input = await parseBody(request, updateMemberRoleSchema);
    const result = await updateMemberRole(
      String(wedding._id),
      membershipId,
      input,
    );
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request, {
      requireRole: "ADMIN",
    });
    const { membershipId } = await params;
    requireObjectId(membershipId);
    await removeMember(String(wedding._id), membershipId);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return weddingFailure(error);
  }
}
