import "server-only";
import type { z } from "zod";
import { Task } from "./models";
import type {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} from "./schemas";
import { WeddingMembership } from "@/modules/wedding/models";
import { Event } from "@/modules/events/models";
import { User } from "@/modules/auth/models";
import { WeddingError } from "@/modules/wedding/errors";
import { connectToDatabase } from "@/server/db";
import { formatDueDate, isTaskOverdue } from "./format";

export interface TaskDto {
  id: string;
  weddingId: string;
  title: string;
  description: string | null;
  assignedMembershipId: string | null;
  assignee: {
    membershipId: string;
    name: string;
    role: string;
  } | null;
  eventId: string | null;
  event: {
    id: string;
    name: string;
    archivedAt: string | null;
  } | null;
  dueDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

async function resolveAssociations(
  weddingId: string,
  tasks: Array<{
    _id: unknown;
    weddingId: unknown;
    title: string;
    description?: string | null;
    assignedMembershipId?: unknown;
    eventId?: unknown;
    dueDate?: Date | null;
    priority: "LOW" | "MEDIUM" | "HIGH";
    status: "TODO" | "IN_PROGRESS" | "COMPLETED";
    completedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): Promise<TaskDto[]> {
  const membershipIds = Array.from(
    new Set(
      tasks
        .map((t) =>
          t.assignedMembershipId ? String(t.assignedMembershipId) : null,
        )
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const eventIds = Array.from(
    new Set(
      tasks
        .map((t) => (t.eventId ? String(t.eventId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let memberMap = new Map<
    string,
    { membershipId: string; name: string; role: string }
  >();
  if (membershipIds.length > 0) {
    const memberships = await WeddingMembership.find({
      _id: { $in: membershipIds },
      weddingId,
    }).lean();

    const users = await User.find({
      _id: { $in: memberships.map((m) => m.userId) },
    }).lean();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    memberMap = new Map(
      memberships.map((m) => {
        const user = userById.get(String(m.userId));
        return [
          String(m._id),
          {
            membershipId: String(m._id),
            name: user?.name || "Member",
            role: m.role,
          },
        ];
      }),
    );
  }

  let eventMap = new Map<
    string,
    { id: string; name: string; archivedAt: string | null }
  >();
  if (eventIds.length > 0) {
    const events = await Event.find({
      _id: { $in: eventIds },
      weddingId,
    }).lean();

    eventMap = new Map(
      events.map((e) => [
        String(e._id),
        {
          id: String(e._id),
          name: e.name,
          archivedAt: e.archivedAt ? e.archivedAt.toISOString() : null,
        },
      ]),
    );
  }

  return tasks.map((task) => {
    const memId = task.assignedMembershipId
      ? String(task.assignedMembershipId)
      : null;
    const evId = task.eventId ? String(task.eventId) : null;

    let assignee = null;
    if (memId) {
      assignee = memberMap.get(memId) || {
        membershipId: memId,
        name: "Former member",
        role: "UNKNOWN",
      };
    }

    let event = null;
    if (evId) {
      event = eventMap.get(evId) || null;
    }

    return {
      id: String(task._id),
      weddingId: String(task.weddingId),
      title: task.title,
      description: task.description ?? null,
      assignedMembershipId: memId,
      assignee,
      eventId: evId,
      event,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      priority: task.priority,
      status: task.status,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  });
}

export async function listTasks(
  weddingId: string,
  query: z.infer<typeof listTasksQuerySchema>,
  currentMembershipId?: string,
) {
  await connectToDatabase();

  const filter: Record<string, unknown> = { weddingId };

  if (query.status) {
    filter.status = query.status;
  }
  if (query.priority) {
    filter.priority = query.priority;
  }
  if (query.eventId === "none") {
    filter.eventId = null;
  } else if (query.eventId) {
    filter.eventId = query.eventId;
  }

  if (query.mine && currentMembershipId) {
    filter.assignedMembershipId = currentMembershipId;
  } else if (query.assignedMembershipId === "none") {
    filter.assignedMembershipId = null;
  } else if (query.assignedMembershipId) {
    filter.assignedMembershipId = query.assignedMembershipId;
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const skip = (page - 1) * limit;

  const [rawTasks, total, allCount, mineCount, completedCount] =
    await Promise.all([
      Task.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
      Task.countDocuments({ weddingId }),
      currentMembershipId
        ? Task.countDocuments({
            weddingId,
            assignedMembershipId: currentMembershipId,
          })
        : 0,
      Task.countDocuments({ weddingId, status: "COMPLETED" }),
    ]);

  const data = await resolveAssociations(weddingId, rawTasks);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    counts: {
      all: allCount,
      mine: mineCount,
      completed: completedCount,
    },
  };
}

export async function createTask(
  weddingId: string,
  input: z.infer<typeof createTaskSchema>,
) {
  await connectToDatabase();

  if (input.assignedMembershipId) {
    const memberExists = await WeddingMembership.exists({
      _id: input.assignedMembershipId,
      weddingId,
    });
    if (!memberExists) {
      throw new WeddingError(
        "NOT_FOUND",
        "Assigned member not found in this wedding.",
        404,
      );
    }
  }

  if (input.eventId) {
    const event = await Event.findOne({
      _id: input.eventId,
      weddingId,
    }).lean();
    if (!event) {
      throw new WeddingError(
        "NOT_FOUND",
        "Event not found in this wedding.",
        404,
      );
    }
    if (event.archivedAt) {
      throw new WeddingError(
        "VALIDATION_ERROR",
        "Cannot assign task to an archived event.",
        400,
      );
    }
  }

  const completedAt = input.status === "COMPLETED" ? new Date() : null;

  const task = await Task.create({
    weddingId,
    title: input.title,
    description: input.description ?? null,
    assignedMembershipId: input.assignedMembershipId ?? null,
    eventId: input.eventId ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    priority: input.priority,
    status: input.status,
    completedAt,
  });

  const [dto] = await resolveAssociations(weddingId, [task.toObject()]);
  return dto;
}

export async function getTask(weddingId: string, taskId: string) {
  await connectToDatabase();
  const task = await Task.findOne({ _id: taskId, weddingId }).lean();
  if (!task) {
    throw new WeddingError("NOT_FOUND", "Task not found.", 404);
  }
  const [dto] = await resolveAssociations(weddingId, [task]);
  return dto;
}

export async function updateTask(
  weddingId: string,
  taskId: string,
  input: z.infer<typeof updateTaskSchema>,
) {
  await connectToDatabase();
  const task = await Task.findOne({ _id: taskId, weddingId }).lean();
  if (!task) {
    throw new WeddingError("NOT_FOUND", "Task not found.", 404);
  }

  const update: Record<string, unknown> = {};

  if (input.assignedMembershipId !== undefined) {
    if (input.assignedMembershipId) {
      const memberExists = await WeddingMembership.exists({
        _id: input.assignedMembershipId,
        weddingId,
      });
      if (!memberExists) {
        throw new WeddingError(
          "NOT_FOUND",
          "Assigned member not found in this wedding.",
          404,
        );
      }
      update.assignedMembershipId = input.assignedMembershipId;
    } else {
      update.assignedMembershipId = null;
    }
  }

  if (input.eventId !== undefined) {
    if (input.eventId) {
      const event = await Event.findOne({
        _id: input.eventId,
        weddingId,
      }).lean();
      if (!event) {
        throw new WeddingError(
          "NOT_FOUND",
          "Event not found in this wedding.",
          404,
        );
      }
      update.eventId = input.eventId;
    } else {
      update.eventId = null;
    }
  }

  if (input.title !== undefined) {
    update.title = input.title;
  }
  if (input.description !== undefined) {
    update.description = input.description ?? null;
  }
  if (input.dueDate !== undefined) {
    update.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.priority !== undefined) {
    update.priority = input.priority;
  }

  if (input.status !== undefined) {
    if (input.status === "COMPLETED" && task.status !== "COMPLETED") {
      update.completedAt = new Date();
    } else if (input.status !== "COMPLETED" && task.status === "COMPLETED") {
      update.completedAt = null;
    }
    update.status = input.status;
  }

  // Compare-and-set on updatedAt so a concurrent write returns CONFLICT.
  const updated = await Task.findOneAndUpdate(
    { _id: taskId, weddingId, updatedAt: task.updatedAt },
    { $set: update },
    { returnDocument: "after" },
  ).lean();
  if (!updated) {
    throw new WeddingError(
      "CONFLICT",
      "This task changed elsewhere. Reload and try again.",
      409,
    );
  }

  const [dto] = await resolveAssociations(weddingId, [updated]);
  return dto;
}

export async function deleteTask(weddingId: string, taskId: string) {
  await connectToDatabase();
  const result = await Task.deleteOne({ _id: taskId, weddingId });
  if (result.deletedCount === 0) {
    throw new WeddingError("NOT_FOUND", "Task not found.", 404);
  }
  return { success: true };
}

export async function countTasks(weddingId: string) {
  await connectToDatabase();
  const [total, completed] = await Promise.all([
    Task.countDocuments({ weddingId }),
    Task.countDocuments({ weddingId, status: "COMPLETED" }),
  ]);
  return { total, completed };
}

export interface DashboardTaskItem {
  id: string;
  title: string;
  assignee: string;
  done: boolean;
  badgeText: string;
  badgeClass: string;
}

export async function listDashboardTasks(
  weddingId: string,
  timeZone: string,
): Promise<{
  total: number;
  completed: number;
  tasks: DashboardTaskItem[];
}> {
  await connectToDatabase();
  const [counts, rawTasks] = await Promise.all([
    countTasks(weddingId),
    Task.find({ weddingId }).sort({ createdAt: -1, _id: -1 }).limit(4).lean(),
  ]);
  const tasks = await resolveAssociations(weddingId, rawTasks);
  return {
    total: counts.total,
    completed: counts.completed,
    tasks: tasks.map((task) => toDashboardTask(task, timeZone)),
  };
}

function toDashboardTask(task: TaskDto, timeZone: string): DashboardTaskItem {
  const done = task.status === "COMPLETED";
  const overdue = isTaskOverdue(task.dueDate, task.status, timeZone);
  const badgeText = done
    ? "Done"
    : overdue
      ? "Overdue"
      : task.status === "IN_PROGRESS"
        ? "In progress"
        : task.dueDate
          ? `Due ${formatDueDate(task.dueDate, timeZone)}`
          : "Pending";
  const badgeClass = done
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : overdue
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : task.status === "IN_PROGRESS"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-[#f1ede8] text-[#71717a] border-[#e8e2da]";
  return {
    id: task.id,
    title: task.title,
    assignee: task.assignee
      ? `Assigned to ${task.assignee.name}`
      : "Unassigned",
    done,
    badgeText,
    badgeClass,
  };
}
