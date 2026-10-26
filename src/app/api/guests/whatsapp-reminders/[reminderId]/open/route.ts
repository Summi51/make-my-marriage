import { NextResponse, type NextRequest } from "next/server";
import { markWhatsappReminderOpened } from "@/modules/guests/reminder-jobs";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ reminderId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { reminderId } = await props.params;
    await markWhatsappReminderOpened(
      String(wedding._id),
      requireObjectId(reminderId),
    );
    return NextResponse.json(
      { data: { opened: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
