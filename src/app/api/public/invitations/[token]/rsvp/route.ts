import { NextResponse, type NextRequest } from "next/server";
import { submitPublicRsvp } from "@/modules/guests/use-cases";
import { publicRsvpSchema } from "@/modules/guests/schemas";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

// A rejected RSVP must not leak the invitation token through a Referer, and
// must not be indexed. weddingFailure only sets Cache-Control.
const publicHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await props.params;

    // Reject a foreign origin and malformed input before the use case looks up
    // the invitation. Quota is consumed there, only after the guest and wedding
    // exist and the party size is valid.
    checkOrigin(request);
    const input = await parseBody(request, publicRsvpSchema);
    const result = await submitPublicRsvp(token, input);

    return NextResponse.json({ data: result }, { headers: publicHeaders });
  } catch (error) {
    const response = weddingFailure(error);
    for (const [key, value] of Object.entries(publicHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }
}
