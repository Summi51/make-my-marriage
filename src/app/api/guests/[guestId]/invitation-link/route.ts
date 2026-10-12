import { NextResponse, type NextRequest } from "next/server";
import { getGuestInvitationLink } from "@/modules/guests/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import { requireObjectId, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ guestId: string }> },
) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { guestId } = await props.params;
    const origin = request.nextUrl.origin;
    const result = await getGuestInvitationLink(
      String(wedding._id),
      requireObjectId(guestId, "guest id"),
      origin,
    );
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
