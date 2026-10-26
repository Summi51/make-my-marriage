import { NextResponse, type NextRequest } from "next/server";
import { downloadPhoto } from "@/modules/photos/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import { requireObjectId, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { photoId } = await params;
    const result = await downloadPhoto(
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
