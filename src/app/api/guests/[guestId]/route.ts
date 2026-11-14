import { NextResponse, type NextRequest } from "next/server";
import { getGuest, updateGuest, deleteGuest } from "@/modules/guests/use-cases";
import { updateGuestSchema } from "@/modules/guests/schemas";
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
  props: { params: Promise<{ guestId: string }> },
) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { guestId } = await props.params;
    const guest = await getGuest(
      String(wedding._id),
      requireObjectId(guestId, "guest id"),
    );
    return NextResponse.json(
      { data: guest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ guestId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { guestId } = await props.params;
    const input = await parseBody(request, updateGuestSchema);
    const guest = await updateGuest(
      String(wedding._id),
      requireObjectId(guestId, "guest id"),
      input,
    );
    return NextResponse.json(
      { data: guest },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ guestId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { guestId } = await props.params;
    await deleteGuest(
      String(wedding._id),
      requireObjectId(guestId, "guest id"),
    );
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
