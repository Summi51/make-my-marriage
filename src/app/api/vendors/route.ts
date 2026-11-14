import { NextResponse, type NextRequest } from "next/server";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";
import { WeddingError } from "@/modules/wedding/errors";
import {
  createVendorSchema,
  listVendorsQuerySchema,
} from "@/modules/vendors/schemas";
import { createVendor, listVendors } from "@/modules/vendors/use-cases";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const query = new URL(request.url).searchParams;
    const parsed = listVendorsQuerySchema.safeParse({
      category: query.get("category") ?? undefined,
      search: query.get("search") ?? undefined,
      includeArchived: query.get("includeArchived") ?? undefined,
      page: query.get("page") ?? undefined,
      limit: query.get("limit") ?? undefined,
    });
    if (!parsed.success)
      throw new WeddingError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Check filters.",
        400,
      );
    return NextResponse.json(
      await listVendors(String(wedding._id), parsed.data),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const input = await parseBody(request, createVendorSchema);
    return NextResponse.json(
      { data: await createVendor(String(wedding._id), input) },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
