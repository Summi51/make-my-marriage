import { NextResponse, type NextRequest } from "next/server";
import { confirmUpload, listPhotos } from "@/modules/photos/use-cases";
import {
  confirmPhotoSchema,
  listPhotosQuerySchema,
} from "@/modules/photos/schemas";
import { WeddingError } from "@/modules/wedding/errors";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { searchParams } = new URL(request.url);
    const parsed = listPhotosQuerySchema.safeParse({
      eventId: searchParams.get("eventId") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Check your query parameters.",
        400,
      );
    }
    return NextResponse.json(
      await listPhotos(String(wedding._id), parsed.data),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding, membership } = await requireWeddingContext(request);
    const input = await parseBody(request, confirmPhotoSchema);
    const photo = await confirmUpload(
      String(wedding._id),
      String(membership._id),
      input,
    );
    return NextResponse.json(
      { data: photo },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
