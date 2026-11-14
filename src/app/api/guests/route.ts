import { NextResponse, type NextRequest } from "next/server";
import { listGuests, createGuest } from "@/modules/guests/use-cases";
import {
  createGuestSchema,
  listGuestsQuerySchema,
} from "@/modules/guests/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";
import { WeddingError } from "@/modules/wedding/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { searchParams } = new URL(request.url);

    const parsed = listGuestsQuerySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      eventId: searchParams.get("eventId") ?? undefined,
      rsvpStatus: searchParams.get("rsvpStatus") ?? undefined,
      invitationStatus: searchParams.get("invitationStatus") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Check your query parameters.",
        400,
      );
    }

    const result = await listGuests(String(wedding._id), parsed.data);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const input = await parseBody(request, createGuestSchema);
    const guest = await createGuest(String(wedding._id), input);
    return NextResponse.json(
      { data: guest },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
