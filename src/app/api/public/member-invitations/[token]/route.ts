import { NextResponse, type NextRequest } from "next/server";
import { getPublicMemberInvitation } from "@/modules/wedding/invitations";
import { weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    return NextResponse.json(
      { data: await getPublicMemberInvitation(token) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
