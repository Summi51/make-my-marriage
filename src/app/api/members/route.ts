import { NextResponse, type NextRequest } from "next/server";
import { listMembers } from "@/modules/wedding/use-cases";
import { requireWeddingContext } from "@/server/wedding/context";
import { weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const members = await listMembers(String(wedding._id));
    return NextResponse.json(
      { data: members },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
