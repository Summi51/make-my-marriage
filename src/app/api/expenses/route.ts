import { NextResponse, type NextRequest } from "next/server";
import { listExpenses, createExpense } from "@/modules/expenses/use-cases";
import {
  createExpenseSchema,
  listExpensesQuerySchema,
} from "@/modules/expenses/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";
import { WeddingError } from "@/modules/wedding/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { searchParams } = new URL(request.url);

    const parsed = listExpensesQuerySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      paymentKind: searchParams.get("paymentKind") ?? undefined,
      eventId: searchParams.get("eventId") ?? undefined,
      vendorId: searchParams.get("vendorId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Check your query parameters.",
        400,
      );
    }

    const result = await listExpenses(String(wedding._id), parsed.data);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { wedding, membership } = await requireWeddingContext(request);
    const input = await parseBody(request, createExpenseSchema);

    const expense = await createExpense(
      String(wedding._id),
      String(membership._id),
      input,
    );

    return NextResponse.json(
      { data: expense },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
