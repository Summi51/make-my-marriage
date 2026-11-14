import { NextResponse, type NextRequest } from "next/server";
import { acceptMemberInvitation } from "@/modules/wedding/invitations";
import { requireUser } from "@/server/wedding/context";
import { checkOrigin, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    checkOrigin(request);
    const user = await requireUser(request);
    const { token } = await params;
    return NextResponse.json(
      { data: await acceptMemberInvitation(token, user.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
