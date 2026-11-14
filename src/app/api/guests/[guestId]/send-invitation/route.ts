import { NextResponse, type NextRequest } from "next/server";
import { recordInvitationSent } from "@/modules/guests/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ guestId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { guestId } = await props.params;

    let sendEmail = false;
    try {
      const body = await request.json();
      sendEmail = body?.sendEmail === true;
    } catch {
      // Empty body is allowed for a manual mark.
    }

    const origin = process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : new URL(request.url).origin;

    const guest = await recordInvitationSent(
      String(wedding._id),
      requireObjectId(guestId, "guest id"),
      {
        sendEmail,
        origin,
      },
    );
    return NextResponse.json(
      { data: guest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
