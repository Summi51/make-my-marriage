import { NextResponse, type NextRequest } from "next/server";
import { restoreVendor } from "@/modules/vendors/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { vendorId } = await params;
    const vendor = await restoreVendor(
      String(wedding._id),
      requireObjectId(vendorId, "vendor id"),
    );
    return NextResponse.json(
      { data: vendor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
