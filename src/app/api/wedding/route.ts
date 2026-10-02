import { NextResponse, type NextRequest } from "next/server";
import {
  createWedding,
  updateWedding,
  toWeddingDto,
} from "@/modules/wedding/use-cases";
import { createWeddingSchema, updateWeddingSchema } from "@/modules/wedding/schemas";
import { requireUser, requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const user = await requireUser(request);
    const input = await parseBody(request, createWeddingSchema);
    const wedding = await createWedding(user.id, input);
    return NextResponse.json(
      { data: wedding },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    return NextResponse.json(
      { data: toWeddingDto(wedding) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const input = await parseBody(request, updateWeddingSchema);
    const updated = await updateWedding(String(wedding._id), input);
    return NextResponse.json(
      { data: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
