import { NextResponse, type NextRequest } from "next/server";
import {
  getWeddingLivestream,
  updateWeddingLivestream,
} from "@/modules/wedding/use-cases";
import { updateLivestreamSchema } from "@/modules/wedding/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const livestream = await getWeddingLivestream(String(wedding._id));
    return NextResponse.json(
      { data: livestream },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const input = await parseBody(request, updateLivestreamSchema);
    const updated = await updateWeddingLivestream(String(wedding._id), input);
    return NextResponse.json(
      { data: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
