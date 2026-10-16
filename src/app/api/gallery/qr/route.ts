import { NextResponse, type NextRequest } from "next/server";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";
import {
  gallerySharing,
  updateGallerySharing,
  gallerySettingsSchema,
} from "@/modules/photos/guest-gallery";
export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    return NextResponse.json(
      { data: await gallerySharing(String(wedding._id)) },
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
    const input = await parseBody(request, gallerySettingsSchema);
    return NextResponse.json(
      { data: await updateGallerySharing(String(wedding._id), input) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
