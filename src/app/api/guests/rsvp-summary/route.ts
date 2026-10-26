import { NextResponse, type NextRequest } from "next/server";
import { getRsvpSummary } from "@/modules/guests/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import { weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const summary = await getRsvpSummary(String(wedding._id));
    return NextResponse.json(
      { data: summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
