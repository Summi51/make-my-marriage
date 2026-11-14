import { NextResponse, type NextRequest } from "next/server";
import { batchSendReminders } from "@/modules/guests/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);

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

    const result = await batchSendReminders(String(wedding._id), {
      sendEmail,
      origin,
      subject,
      templateType,
    });
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
