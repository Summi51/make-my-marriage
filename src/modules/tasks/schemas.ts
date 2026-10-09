import { z } from "zod";

export const taskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High Priority",
};

export const statusLabels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const title = z
  .string()
  .trim()
  .min(1, "Task title is required.")
  .max(200, "Task title must be 200 characters or fewer.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? null : (value ?? undefined)));

const objectIdPattern = /^[a-f\d]{24}$/i;

/**
 * Rejects malformed ids here so a bad value becomes a 400 instead of a
 * Mongoose CastError reaching the shared 500 handler.
 */
const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value))
  .refine(
    (value) =>
      value === null || value === undefined || objectIdPattern.test(value),
    "Check the id.",
  );

const filterObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) =>
      value === undefined || value === "none" || objectIdPattern.test(value),
    "Check the id.",
  );

const isoDateTime = z
  .string()
  .trim()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Use a valid ISO date-time for the due date.",
  );

export const createTaskSchema = z.object({
  title,
  description: optionalText(2000),
  assignedMembershipId: optionalObjectId,
  eventId: optionalObjectId,
  dueDate: isoDateTime.nullable().optional(),
  priority: z.enum(taskPriorities).default("MEDIUM"),
  status: z.enum(taskStatuses).default("TODO"),
});

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    description: optionalText(2000),
    assignedMembershipId: optionalObjectId,
    eventId: optionalObjectId,
    dueDate: isoDateTime.nullable().optional(),
    priority: z.enum(taskPriorities).optional(),
    status: z.enum(taskStatuses).optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "Provide at least one field to update." },
  );

export const listTasksQuerySchema = z.object({
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  eventId: filterObjectId,
  assignedMembershipId: filterObjectId,
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
