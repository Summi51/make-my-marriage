import { NextResponse, type NextRequest } from "next/server";
import { uploadStagingFallback } from "@/modules/photos/use-cases";
import { MAX_PHOTO_BYTES } from "@/modules/photos/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, weddingFailure } from "@/server/wedding/http";
import { WeddingError } from "@/modules/wedding/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding, membership } = await requireWeddingContext(request);
    const formData = await request.formData();
    const objectKey = formData.get("objectKey");
    const file = formData.get("file");

    if (typeof objectKey !== "string" || !objectKey) {
      throw new WeddingError("VALIDATION_ERROR", "objectKey is required", 400);
    }
    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      throw new WeddingError("VALIDATION_ERROR", "file is required", 400);
    }
    if (file.size < 1 || file.size > MAX_PHOTO_BYTES) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        "Each photo must be 4 MB or smaller.",
        400,
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadStagingFallback(
      String(wedding._id),
      String(membership._id),
      objectKey,
      buffer,
    );

    return NextResponse.json(
      { data: result },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
