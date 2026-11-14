import { NextResponse, type NextRequest } from "next/server";
import { requireWeddingContext } from "@/server/wedding/context";
import { weddingFailure } from "@/server/wedding/http";
import { WeddingError } from "@/modules/wedding/errors";
import { discoveryQuerySchema } from "@/modules/vendors/schemas";
import { discoverVendors } from "@/modules/vendors/discovery";
import { consumeLimit } from "@/server/auth/rate-limit";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const { wedding, user } = await requireWeddingContext(request);
    const params = new URL(request.url).searchParams;
    const parsed = discoveryQuerySchema.safeParse({
      category: params.get("category") ?? undefined,
      query: params.get("query") ?? undefined,
      lat: params.get("lat") ?? undefined,
      lng: params.get("lng") ?? undefined,
    });
    if (!parsed.success)
      throw new WeddingError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Check your search.",
        400,
      );
    // The free Maps fallback does not call Google, so it must not spend the
    // paid-search allowance and then fail closed after 20 lookups.
    if (process.env.GOOGLE_PLACES_API_KEY) {
      await consumeLimit(
        `vendor-discovery:${user.id}`,
        20,
        Date.now(),
        60 * 60 * 1000,
      );
    }
    const data = await discoverVendors(parsed.data, wedding.location ?? {});
    return NextResponse.json(
      { data, attribution: "Google Maps" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
