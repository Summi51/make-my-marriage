import { NextResponse, type NextRequest } from "next/server";
import {
  getExpense,
  updateExpense,
  deleteExpense,
} from "@/modules/expenses/use-cases";
import { updateExpenseSchema } from "@/modules/expenses/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import {
  checkOrigin,
  parseBody,
  requireObjectId,
  weddingFailure,
} from "@/server/wedding/http";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { expenseId } = await params;

    const expense = await getExpense(
      String(wedding._id),
      requireObjectId(expenseId, "expense id"),
    );

    return NextResponse.json(
      { data: expense },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { expenseId } = await params;
    const input = await parseBody(request, updateExpenseSchema);

    const expense = await updateExpense(
      String(wedding._id),
      requireObjectId(expenseId, "expense id"),
      input,
    );

    return NextResponse.json(
      { data: expense },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { expenseId } = await params;

    await deleteExpense(
      String(wedding._id),
      requireObjectId(expenseId, "expense id"),
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return weddingFailure(error);
  }
}
