import { NextResponse, type NextRequest } from "next/server";
import { getTask, updateTask, deleteTask } from "@/modules/tasks/use-cases";
import { updateTaskSchema } from "@/modules/tasks/schemas";
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
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { wedding } = await requireWeddingContext(request);
    const { taskId } = await params;
    const task = await getTask(String(wedding._id), requireObjectId(taskId));
    return NextResponse.json(
      { data: task },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { taskId } = await params;
    const input = await parseBody(request, updateTaskSchema);
    const task = await updateTask(
      String(wedding._id),
      requireObjectId(taskId),
      input,
    );
    return NextResponse.json(
      { data: task },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    checkOrigin(request);
    const { wedding } = await requireWeddingContext(request);
    const { taskId } = await params;
    await deleteTask(String(wedding._id), requireObjectId(taskId));
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
