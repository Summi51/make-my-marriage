import { NextResponse, type NextRequest } from "next/server";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  parseBody,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";
import { updateVendorSchema } from "@/modules/vendors/schemas";
import {
  getVendor,
  updateVendor,
  archiveVendor,
} from "@/modules/vendors/use-cases";

export const runtime = "nodejs";
type Context = { params: Promise<{ vendorId: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { vendorId } = await context.params;
    return NextResponse.json(
      {
        data: await getVendor(
          String(wedding._id),
          requireObjectId(vendorId, "vendor id"),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { vendorId } = await context.params;
    const input = await parseBody(request, updateVendorSchema);
    return NextResponse.json(
      {
        data: await updateVendor(
          String(wedding._id),
          requireObjectId(vendorId, "vendor id"),
          input,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { vendorId } = await context.params;
    await archiveVendor(
      String(wedding._id),
      requireObjectId(vendorId, "vendor id"),
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return weddingFailure(error);
  }
}
