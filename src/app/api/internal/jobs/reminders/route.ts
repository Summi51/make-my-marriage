import { NextResponse, type NextRequest } from "next/server";
import { runDueGuestReminders } from "@/modules/guests/reminder-jobs";
import { isJobRequestAuthorized } from "@/server/jobs/authorize";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isJobRequestAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not authorized." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await runDueGuestReminders();
    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Reminders could not be sent.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
