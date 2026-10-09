"use client";
import { tabFetch, tabPath } from "@/lib/tab-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TaskDto } from "@/modules/tasks/use-cases";
import {
  formatDueDate,
  formatCompletedDate,
  isTaskOverdue,
} from "@/modules/tasks/format";

export function TaskDetail({
  task,
  timeZone,
}: {
  task: TaskDto;
  timeZone: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const overdue = isTaskOverdue(task.dueDate, task.status, timeZone);
  const isCompleted = task.status === "COMPLETED";

  async function deleteTask() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await tabFetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      router.push(tabPath("/account/wedding/tasks"));
      router.refresh();
    } catch {
      setError("Couldn't delete this task. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <Link
        href="/account/wedding/tasks"
        className="text-xs font-medium text-[#676169] transition hover:text-[#6d213c]"
      >
        ← Back to tasks
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold tracking-[0.16em] text-[#8c7355] uppercase">
              Task Details
            </span>

            {task.priority === "HIGH" && (
              <span className="inline-flex items-center rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#b91c1c] uppercase">
                HIGH PRIORITY
              </span>
            )}
            {task.priority === "MEDIUM" && (
              <span className="inline-flex items-center rounded border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#c2410c] uppercase">
                MEDIUM
              </span>
            )}
            {task.priority === "LOW" && (
              <span className="inline-flex items-center rounded border border-[#e5e7eb] bg-[#f9fafb] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#4b5563] uppercase">
                LOW
              </span>
            )}

            {overdue && (
              <span className="inline-flex items-center rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#dc2626] uppercase">
                OVERDUE
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex items-center rounded border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#16a34a] uppercase">
                COMPLETED
              </span>
            )}
          </div>

          <h1
            className={`font-editorial mt-2 text-4xl sm:text-5xl ${
              isCompleted ? "text-[#9ca3af] line-through" : "text-[#1e1a1f]"
            }`}
          >
            {task.title}
          </h1>

          <p className="mt-2 text-sm text-[#676169]">
            {isCompleted
              ? formatCompletedDate(task.completedAt, timeZone)
              : task.dueDate
                ? `Due: ${formatDueDate(task.dueDate, timeZone)}`
                : "No due date set"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/account/wedding/tasks/${task.id}/edit`}
            className="rounded-xl bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#51182d]"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            className="rounded-xl border border-[#e6dfdf] bg-white px-4 py-2 text-xs font-semibold text-[#dc2626] transition hover:bg-[#fef2f2] disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-[#efe9e6] bg-white p-6 shadow-xs">
        <h2 className="font-editorial text-xl font-normal text-[#1e1a1f]">
          Description
        </h2>
        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[#4a4543]">
          {task.description || "No description provided."}
        </p>
      </div>

      <dl className="mt-6 divide-y divide-[#efe9e6] rounded-2xl border border-[#efe9e6] bg-white shadow-xs">
        <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <dt className="text-xs font-medium text-[#736a64]">
            Assigned member
          </dt>
          <dd className="text-xs font-semibold text-[#1e1a1f]">
            {task.assignee ? (
              <span>
                {task.assignee.name} (
                {task.assignee.role === "ADMIN"
                  ? "Admin"
                  : task.assignee.role === "MANAGER"
                    ? "Manager"
                    : task.assignee.role}
                )
              </span>
            ) : (
              <span className="text-[#9ca3af] italic">Unassigned</span>
            )}
          </dd>
        </div>

        <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <dt className="text-xs font-medium text-[#736a64]">Related event</dt>
          <dd className="text-xs font-semibold text-[#1e1a1f]">
            {task.event ? (
              <Link
                href={`/account/wedding/events/${task.event.id}`}
                className="text-[#6d213c] hover:underline"
              >
                {task.event.name}
              </Link>
            ) : (
              "General wedding task"
            )}
          </dd>
        </div>

        <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <dt className="text-xs font-medium text-[#736a64]">Status</dt>
          <dd className="text-xs font-semibold text-[#1e1a1f]">
            {task.status === "COMPLETED"
              ? "Completed"
              : task.status === "IN_PROGRESS"
                ? "In Progress"
                : "To Do"}
          </dd>
        </div>

        <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <dt className="text-xs font-medium text-[#736a64]">Priority</dt>
          <dd className="text-xs font-semibold text-[#1e1a1f]">
            {task.priority === "HIGH"
              ? "High Priority"
              : task.priority === "MEDIUM"
                ? "Medium"
                : "Low"}
          </dd>
        </div>

        <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <dt className="text-xs font-medium text-[#736a64]">Due date</dt>
          <dd className="text-xs font-semibold text-[#1e1a1f]">
            {task.dueDate ? formatDueDate(task.dueDate, timeZone) : "None"}
          </dd>
        </div>
      </dl>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#efe9e6] bg-white p-6 shadow-xl">
            <h3 className="font-editorial text-2xl font-normal text-[#1e1a1f]">
              Delete task?
            </h3>
            <p className="mt-2 text-xs leading-5 text-[#676169]">
              This will permanently remove &quot;{task.title}&quot;. This action
              cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-[#d6cecb] bg-white px-4 py-2 text-xs font-semibold text-[#4a4543] transition hover:bg-[#faf7f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void deleteTask()}
                className="rounded-xl bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-60"
              >
                {pending ? "Deleting..." : "Delete task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
