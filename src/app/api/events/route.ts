import { NextResponse, type NextRequest } from "next/server";
import { listEvents, createEvent } from "@/modules/events/use-cases";
import {
  createEventSchema,
  listEventsQuerySchema,
} from "@/modules/events/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";
import { WeddingError } from "@/modules/wedding/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { searchParams } = new URL(request.url);
    const parsed = listEventsQuerySchema.safeParse({
      includeArchived: searchParams.get("includeArchived") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!parsed.success)
      throw new WeddingError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Check your query parameters.",
        400,
      );
    const events = await listEvents(String(wedding._id), parsed.data);
    return NextResponse.json(
      { data: events },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const input = await parseBody(request, createEventSchema);
    const event = await createEvent(String(wedding._id), input);
    return NextResponse.json(
      { data: event },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
