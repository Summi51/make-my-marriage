import { NextResponse, type NextRequest } from "next/server";
import { deletePhoto } from "@/modules/photos/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { photoId } = await params;
    const result = await deletePhoto(
      String(wedding._id),
      requireObjectId(photoId, "photo id"),
    );
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
