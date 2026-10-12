import { NextResponse, type NextRequest } from "next/server";
import {
  consumePublicInvitationView,
  resolvePublicInvitation,
} from "@/modules/guests/use-cases";
import { weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

// A missing or throttled link must not leak the token through a Referer, and
// must not be indexed. weddingFailure only sets Cache-Control, so these stay
// on every response from this route, including 404 and 429.
const publicHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await props.params;
    // Throttle public reads before the token lookup: a per-token counter plus a
    // shared ceiling keeps a scripted flood from exhausting the shared quota.
    await consumePublicInvitationView(token);
    const invitation = await resolvePublicInvitation(token);
    return NextResponse.json({ data: invitation }, { headers: publicHeaders });
  } catch (error) {
    const response = weddingFailure(error);
    for (const [key, value] of Object.entries(publicHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }
}
