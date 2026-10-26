import { NextResponse, type NextRequest } from "next/server";
import {
  getEvent,
  updateEvent,
  archiveEvent,
} from "@/modules/events/use-cases";
import { updateEventSchema } from "@/modules/events/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  parseBody,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { eventId } = await params;
    const event = await getEvent(String(wedding._id), requireObjectId(eventId));
    return NextResponse.json(
      { data: event },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { eventId } = await params;
    const input = await parseBody(request, updateEventSchema);
    const event = await updateEvent(
      String(wedding._id),
      requireObjectId(eventId),
      input,
    );
    return NextResponse.json(
      { data: event },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { eventId } = await params;
    await archiveEvent(String(wedding._id), requireObjectId(eventId));
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
