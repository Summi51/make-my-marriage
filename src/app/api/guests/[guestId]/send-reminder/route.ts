import { NextResponse, type NextRequest } from "next/server";
import { recordInvitationReminder } from "@/modules/guests/use-cases";
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
    let subject: string | undefined;
    let templateType: "gentle" | "final" | undefined;
    try {
      const body = await request.json();
      sendEmail = body?.sendEmail === true;
      if (typeof body?.subject === "string" && body.subject.trim()) {
        subject = body.subject.trim();
      }
      if (body?.templateType === "gentle" || body?.templateType === "final") {
        templateType = body.templateType;
      }
    } catch {
      // Empty body is allowed.
    }

    const origin = process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : new URL(request.url).origin;

    const guest = await recordInvitationReminder(
      String(wedding._id),
      requireObjectId(guestId, "guest id"),
      {
        sendEmail,
        origin,
        subject,
        templateType,
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
