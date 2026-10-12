import { NextResponse, type NextRequest } from "next/server";
import { reserveUpload } from "@/modules/photos/use-cases";
import { uploadUrlSchema } from "@/modules/photos/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding, membership } = await requireWeddingContext(request);
    const input = await parseBody(request, uploadUrlSchema);
    const reserved = await reserveUpload(
      String(wedding._id),
      String(membership._id),
      input,
    );
    return NextResponse.json(
      { data: reserved },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
