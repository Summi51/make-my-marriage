import { NextResponse, type NextRequest } from "next/server";
import {
  getWeddingWebsite,
  updateWeddingWebsite,
} from "@/modules/wedding/use-cases";
import { updateWebsiteSchema } from "@/modules/wedding/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const website = await getWeddingWebsite(String(wedding._id));
    return NextResponse.json(
      { data: website },
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
    const input = await parseBody(request, updateWebsiteSchema);
    const updated = await updateWeddingWebsite(String(wedding._id), input);
    return NextResponse.json(
      { data: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
