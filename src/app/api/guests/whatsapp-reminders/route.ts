import { NextResponse, type NextRequest } from "next/server";
import { listReadyWhatsappReminders } from "@/modules/guests/reminder-jobs";
import { requireWeddingContext } from "@/server/wedding/context";
import { weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    return NextResponse.json(
      { data: await listReadyWhatsappReminders(String(wedding._id)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
