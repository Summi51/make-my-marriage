import { NextResponse, type NextRequest } from "next/server";
import { listTasks, createTask } from "@/modules/tasks/use-cases";
import {
  createTaskSchema,
  listTasksQuerySchema,
} from "@/modules/tasks/schemas";
import { requireWeddingContext } from "@/server/wedding/context";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";
import { WeddingError } from "@/modules/wedding/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { wedding, membership } = await requireWeddingContext(request);
    const { searchParams } = new URL(request.url);

    const parsed = listTasksQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      eventId: searchParams.get("eventId") ?? undefined,
      assignedMembershipId:
        searchParams.get("assignedMembershipId") ?? undefined,
      mine: searchParams.get("mine") ?? undefined,
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

    const result = await listTasks(
      String(wedding._id),
      parsed.data,
      String(membership._id),
    );

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
    const { wedding } = await requireWeddingContext(request);
    const input = await parseBody(request, createTaskSchema);
    const task = await createTask(String(wedding._id), input);
    return NextResponse.json(
      { data: task },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
