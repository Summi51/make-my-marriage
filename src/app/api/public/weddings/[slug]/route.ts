import { NextResponse, type NextRequest } from "next/server";
import { getPublicWedding } from "@/modules/wedding/use-cases";
import { weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

const publicHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await props.params;
    const wedding = await getPublicWedding(slug);
    return NextResponse.json({ data: wedding }, { headers: publicHeaders });
  } catch (error) {
    const response = weddingFailure(error);
    for (const [key, value] of Object.entries(publicHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }
}
