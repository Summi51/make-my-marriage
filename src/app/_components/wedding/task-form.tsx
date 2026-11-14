"use client";
import { tabFetch, tabPath } from "@/lib/tab-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { TaskDto } from "@/modules/tasks/use-cases";
import { formatTaskDateInput, dateInputToIso } from "@/modules/tasks/format";

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#e6dfdf] bg-white px-3.5 text-sm text-[#252126] outline-none transition focus:border-[#6d213c] focus:ring-2 focus:ring-[#6d213c]/20 disabled:opacity-60";

const selectClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#e6dfdf] bg-white px-3.5 text-sm text-[#252126] outline-none transition focus:border-[#6d213c] focus:ring-2 focus:ring-[#6d213c]/20 disabled:opacity-60";

interface MemberOption {
  membershipId: string;
  name: string;
  role: string;
}

interface EventOption {
  id: string;
  name: string;
}

type TaskDraft = {
  title: string;
  description: string;
  assignedMembershipId: string;
  eventId: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
};

function draftKey(taskId?: string) {
  return taskId ? `mmm-task-edit-draft:${taskId}` : "mmm-task-new-draft";
}

function readDraft(taskId?: string): TaskDraft | null {
  if (typeof window === "undefined") return null;
  const saved = sessionStorage.getItem(draftKey(taskId));
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as TaskDraft;
    if (typeof parsed.title !== "string") return null;
    return parsed;
  } catch {
    sessionStorage.removeItem(draftKey(taskId));
    return null;
  }
}

export function TaskForm({
  timeZone,
  task,
  initialMembers = [],
  initialEvents = [],
}: {
  timeZone: string;
  task?: TaskDto;
  initialMembers?: MemberOption[];
  initialEvents?: EventOption[];
}) {
  const router = useRouter();
  const editing = Boolean(task);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignedMembershipId, setAssignedMembershipId] = useState(
    task?.assignedMembershipId ?? "",
  );
  const [eventId, setEventId] = useState(task?.eventId ?? "");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? formatTaskDateInput(task.dueDate, timeZone) : "",
  );
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">(
    task?.priority ?? "MEDIUM",
  );
  const [status, setStatus] = useState<"TODO" | "IN_PROGRESS" | "COMPLETED">(
    task?.status ?? "TODO",
  );

  useEffect(() => {
    const saved = readDraft(task?.id);
    if (!saved) return;
    // Restore a browser-only draft after hydration, including after sign-in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(saved.title);
    setDescription(saved.description ?? "");
    setAssignedMembershipId(saved.assignedMembershipId ?? "");
    setEventId(saved.eventId ?? "");
    setDueDate(saved.dueDate ?? "");
    setPriority(saved.priority ?? "MEDIUM");
    setStatus(saved.status ?? "TODO");
    setDirty(true);
    setRestored(true);
  }, [task?.id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function currentDraft(): TaskDraft {
    return {
      title,
      description,
      assignedMembershipId,
      eventId,
      dueDate,
      priority,
      status,
    };
  }

  function writeDraft(next: TaskDraft) {
    sessionStorage.setItem(draftKey(task?.id), JSON.stringify(next));
    setDirty(true);
    setRestored(false);
  }

  function clearDraft() {
    sessionStorage.removeItem(draftKey(task?.id));
    setDirty(false);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim() || null,
      assignedMembershipId: assignedMembershipId || null,
      eventId: eventId || null,
      dueDate: dueDate ? dateInputToIso(dueDate, timeZone) : null,
      priority,
      status,
    };

    setPending(true);
    try {
      const response = await tabFetch(
        editing ? `/api/tasks/${task?.id}` : "/api/tasks",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          result?.error?.message ??
            (editing
              ? "We couldn't save this task."
              : "We couldn't create this task."),
        );
      }

      clearDraft();
      router.push(tabPath("/account/wedding/tasks"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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

      <p className="mt-5 text-[11px] font-semibold tracking-[0.16em] text-[#8c7355] uppercase">
        Planning together
      </p>

      <h1 className="font-editorial mt-2 text-4xl text-[#1e1a1f] sm:text-5xl">
        {editing ? "Edit task" : "Add a task"}
      </h1>

      <p className="mt-2 mb-8 text-sm text-[#676169]">
        Make the next step clear for everyone.
      </p>

      <form onSubmit={submit} className="space-y-6">
        {restored && (
          <p className="rounded-xl border border-[#e6dfdf] bg-[#faf7f5] px-4 py-3 text-xs text-[#4a4543]">
            Unsaved details were restored in this tab.
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#f5c2c7] bg-[#f8d7da] px-4 py-3 text-xs text-[#842029]"
          >
            {error}
          </div>
        )}

        {/* Section 1: Task details */}
        <div className="rounded-2xl border border-[#efe9e6] bg-white p-6 shadow-xs sm:p-7">
          <h2 className="font-editorial text-2xl font-normal text-[#1e1a1f]">
            1. Task details
          </h2>
          <p className="mt-1 text-xs text-[#736a64]">
            Give this detail a name and a clear next step.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="task-title"
                className="block text-xs font-semibold text-[#1e1a1f]"
              >
                Task title <span className="text-[#6d213c]">*</span>
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={(e) => {
                  const next = e.target.value;
                  setTitle(next);
                  writeDraft({ ...currentDraft(), title: next });
                }}
                placeholder="e.g. Finalise the Sangeet playlist"
                className={inputClass}
                disabled={pending}
              />
            </div>

            <div>
              <label
                htmlFor="task-description"
                className="block text-xs font-semibold text-[#1e1a1f]"
              >
                Description{" "}
                <span className="font-normal text-[#736a64]">(optional)</span>
              </label>
              <textarea
                id="task-description"
                rows={4}
                value={description}
                onChange={(e) => {
                  const next = e.target.value;
                  setDescription(next);
                  writeDraft({ ...currentDraft(), description: next });
                }}
                placeholder="Add helpful details for your wedding team..."
                className="mt-1.5 w-full rounded-xl border border-[#e6dfdf] bg-white p-3.5 text-sm text-[#252126] transition outline-none focus:border-[#6d213c] focus:ring-2 focus:ring-[#6d213c]/20 disabled:opacity-60"
                disabled={pending}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Assignment & planning */}
        <div className="rounded-2xl border border-[#efe9e6] bg-white p-6 shadow-xs sm:p-7">
          <h2 className="font-editorial text-2xl font-normal text-[#1e1a1f]">
            2. Assignment & planning
          </h2>
          <p className="mt-1 text-xs text-[#736a64]">
            Choose who can help and when this task is due.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-assignee"
                className="block text-xs font-semibold text-[#1e1a1f]"
              >
                Assigned member{" "}
                <span className="font-normal text-[#736a64]">(optional)</span>
              </label>
              <select
                id="task-assignee"
                value={assignedMembershipId}
                onChange={(e) => {
                  const next = e.target.value;
                  setAssignedMembershipId(next);
                  writeDraft({ ...currentDraft(), assignedMembershipId: next });
                }}
                className={selectClass}
                disabled={pending}
              >
                <option value="">Unassigned</option>
                {initialMembers.map((member) => (
                  <option key={member.membershipId} value={member.membershipId}>
                    {member.name} (
                    {member.role === "ADMIN" ? "Admin" : "Manager"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-event"
                className="block text-xs font-semibold text-[#1e1a1f]"
              >
                Related event{" "}
                <span className="font-normal text-[#736a64]">(optional)</span>
              </label>
              <select
                id="task-event"
                value={eventId}
                onChange={(e) => {
                  const next = e.target.value;
                  setEventId(next);
                  writeDraft({ ...currentDraft(), eventId: next });
                }}
                className={selectClass}
                disabled={pending}
              >
                <option value="">General wedding task</option>
                {initialEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              {initialEvents.length === 0 && (
                <p className="mt-1.5 text-[11px] text-[#736a64]">
                  No active events yet. You can create a general wedding task.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="task-due-date"
                className="block text-xs font-semibold text-[#1e1a1f]"
              >
                Due date{" "}
                <span className="font-normal text-[#736a64]">(optional)</span>
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setDueDate(next);
                  writeDraft({ ...currentDraft(), dueDate: next });
                }}
                className={inputClass}
                disabled={pending}
              />
              <p className="mt-1.5 text-[11px] text-[#736a64]">
                Dates follow {timeZone}. Tasks become overdue after their due
                date.
              </p>
            </div>

            <div>
              <label
                htmlFor="task-priority"
                className="block text-xs font-semibold text-[#1e1a1f]"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => {
                  const next = e.target.value as "LOW" | "MEDIUM" | "HIGH";
                  setPriority(next);
                  writeDraft({ ...currentDraft(), priority: next });
                }}
                className={selectClass}
                disabled={pending}
              >
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High Priority</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="task-status"
                className="block text-xs font-semibold text-[#1e1a1f]"
              >
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => {
                  const next = e.target.value as
                    "TODO" | "IN_PROGRESS" | "COMPLETED";
                  setStatus(next);
                  writeDraft({ ...currentDraft(), status: next });
                }}
                className={selectClass}
                disabled={pending}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/account/wedding/tasks"
            onClick={() => clearDraft()}
            className="rounded-xl border border-[#d6cecb] bg-white px-5 py-2.5 text-xs font-semibold text-[#4a4543] transition hover:bg-[#faf7f5]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[#6d213c] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#51182d] disabled:opacity-60"
          >
            {pending
              ? editing
                ? "Saving..."
                : "Creating..."
              : editing
                ? "Save changes"
                : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
