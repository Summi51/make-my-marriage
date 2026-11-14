import { NextResponse, type NextRequest } from "next/server";
import { restoreEvent } from "@/modules/events/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { eventId } = await params;
    const event = await restoreEvent(
      String(wedding._id),
      requireObjectId(eventId),
    );
    return NextResponse.json(
      { data: event },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
