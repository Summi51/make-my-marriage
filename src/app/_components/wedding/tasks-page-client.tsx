"use client";
import { tabFetch } from "@/lib/tab-session";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TaskDto } from "@/modules/tasks/use-cases";
import {
  formatDueDate,
  formatCompletedDate,
  isTaskOverdue,
} from "@/modules/tasks/format";

interface MemberItem {
  membershipId: string;
  name: string;
  role: string;
}

interface EventItem {
  id: string;
  name: string;
}

export function TasksPageClient({ timeZone }: { timeZone: string }) {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [counts, setCounts] = useState({ all: 0, mine: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Filter options loaded once
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  // Active tab: "all" | "mine" | "completed"
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "completed">(
    "all",
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [memberFilter, setMemberFilter] = useState<string>("ALL");

  // Delete modal state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingPending, setDeletingPending] = useState(false);

  // Status updating tracking
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Fetch members and events for filters
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [membersRes, eventsRes] = await Promise.all([
          tabFetch("/api/members", { cache: "no-store" }),
          tabFetch("/api/events", { cache: "no-store" }),
        ]);
        if (membersRes.ok) {
          const mJson = await membersRes.json();
          const mappedMembers = (mJson.data || []).map(
            (m: {
              membershipId: string;
              user?: { name?: string };
              role: string;
            }) => ({
              membershipId: m.membershipId,
              name: m.user?.name || "Member",
              role: m.role,
            }),
          );
          setMembers(mappedMembers);
        }
        if (eventsRes.ok) {
          const eJson = await eventsRes.json();
          setEvents(eJson.data || []);
        }
      } catch {
        // non-blocking for page load
      }
    }
    void loadMetadata();
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (activeTab === "mine") {
        params.set("mine", "true");
      } else if (activeTab === "completed") {
        params.set("status", "COMPLETED");
      }

      if (statusFilter !== "ALL" && activeTab !== "completed") {
        params.set("status", statusFilter);
      }
      if (priorityFilter !== "ALL") {
        params.set("priority", priorityFilter);
      }
      if (eventFilter !== "ALL") {
        params.set("eventId", eventFilter);
      }
      if (memberFilter !== "ALL" && activeTab !== "mine") {
        params.set("assignedMembershipId", memberFilter);
      }

      const res = await tabFetch(`/api/tasks?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTasks(json.data || []);
      if (json.counts) {
        setCounts(json.counts);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, priorityFilter, eventFilter, memberFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTasks();
  }, [loadTasks]);

  const isCustomFiltered =
    priorityFilter !== "ALL" ||
    eventFilter !== "ALL" ||
    (activeTab !== "mine" && memberFilter !== "ALL") ||
    (activeTab !== "completed" && statusFilter !== "ALL");

  function clearFilters() {
    setStatusFilter(activeTab === "completed" ? "COMPLETED" : "ALL");
    setPriorityFilter("ALL");
    setEventFilter("ALL");
    setMemberFilter("ALL");
  }

  function handleTabChange(tab: "all" | "mine" | "completed") {
    setActiveTab(tab);
    setStatusFilter(tab === "completed" ? "COMPLETED" : "ALL");
    setPriorityFilter("ALL");
    setEventFilter("ALL");
    setMemberFilter("ALL");
  }

  async function handleStatusChange(
    taskId: string,
    newStatus: "TODO" | "IN_PROGRESS" | "COMPLETED",
  ) {
    setUpdatingTaskId(taskId);
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completedAt:
                newStatus === "COMPLETED" ? new Date().toISOString() : null,
            }
          : t,
      ),
    );

    try {
      const res = await tabFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        void loadTasks();
      } else {
        const json = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? json.data : t)));
        // refresh counts in background
        void loadTasks();
      }
    } catch {
      void loadTasks();
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleDeleteTask() {
    if (!deletingTaskId) return;
    setDeletingPending(true);
    try {
      const res = await tabFetch(`/api/tasks/${deletingTaskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDeletingTaskId(null);
      void loadTasks();
    } catch {
      alert("Failed to delete task. Please try again.");
    } finally {
      setDeletingPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      {/* Breadcrumb */}
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6d213c] uppercase">
        Planning / Tasks
      </p>

      {/* Top Header */}
      <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-editorial text-4xl tracking-tight text-[#1e1a1f] sm:text-5xl">
            Wedding tasks
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#676169]">
            Bring your people and plans together, one task at a time.
          </p>
        </div>

        <div>
          <Link
            href="/account/wedding/tasks/new"
            className="inline-flex items-center rounded-lg bg-[#6d213c] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#51182d]"
          >
            + Add task
          </Link>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="mt-8 flex flex-col justify-between gap-3 border-b border-[#e6dfdf] sm:flex-row sm:items-center">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`relative pb-3 text-xs font-semibold transition ${
              activeTab === "all"
                ? "text-[#1e1a1f]"
                : "text-[#676169] hover:text-[#1e1a1f]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              All Tasks
              {counts.all > 0 && (
                <span className="rounded-full bg-[#f4ece3] px-2 py-0.5 text-[10px] font-semibold text-[#6d213c]">
                  {counts.all}
                </span>
              )}
            </span>
            {activeTab === "all" && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#6d213c]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("mine")}
            className={`relative pb-3 text-xs font-semibold transition ${
              activeTab === "mine"
                ? "text-[#1e1a1f]"
                : "text-[#676169] hover:text-[#1e1a1f]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              My Tasks
              {counts.mine > 0 && (
                <span className="rounded-full bg-[#f4ece3] px-2 py-0.5 text-[10px] font-semibold text-[#6d213c]">
                  {counts.mine}
                </span>
              )}
            </span>
            {activeTab === "mine" && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#6d213c]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("completed")}
            className={`relative pb-3 text-xs font-semibold transition ${
              activeTab === "completed"
                ? "text-[#1e1a1f]"
                : "text-[#676169] hover:text-[#1e1a1f]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              Completed
              {counts.completed > 0 && (
                <span className="rounded-full bg-[#f4ece3] px-2 py-0.5 text-[10px] font-semibold text-[#6d213c]">
                  {counts.completed}
                </span>
              )}
            </span>
            {activeTab === "completed" && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#6d213c]" />
            )}
          </button>
        </div>

        <p className="pb-3 text-xs text-[#8f8582] italic">
          Showing active items &amp; upcoming deadlines
        </p>
      </div>

      {/* Filter Card */}
      <div className="mt-6 rounded-2xl border border-[#efe9e6] bg-white p-4 shadow-xs sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-medium text-[#736a64]">
              Status
            </label>
            <select
              value={activeTab === "completed" ? "COMPLETED" : statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={activeTab === "completed"}
              className="mt-1 h-9 w-full rounded-xl border border-[#e6dfdf] bg-white px-3 text-xs text-[#252126] transition outline-none focus:border-[#6d213c] disabled:bg-[#f9fafb] disabled:text-[#676169]"
            >
              <option value="ALL">All statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#736a64]">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="mt-1 h-9 w-full rounded-xl border border-[#e6dfdf] bg-white px-3 text-xs text-[#252126] transition outline-none focus:border-[#6d213c]"
            >
              <option value="ALL">All priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#736a64]">
              Event
            </label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="mt-1 h-9 w-full rounded-xl border border-[#e6dfdf] bg-white px-3 text-xs text-[#252126] transition outline-none focus:border-[#6d213c]"
            >
              <option value="ALL">All events</option>
              <option value="none">General wedding task</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#736a64]">
              Assigned member
            </label>
            <select
              value={activeTab === "mine" ? "ALL" : memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              disabled={activeTab === "mine"}
              className="mt-1 h-9 w-full rounded-xl border border-[#e6dfdf] bg-white px-3 text-xs text-[#252126] transition outline-none focus:border-[#6d213c] disabled:bg-[#f9fafb] disabled:text-[#676169]"
            >
              <option value="ALL">All members</option>
              <option value="none">Unassigned</option>
              {members.map((m) => (
                <option key={m.membershipId} value={m.membershipId}>
                  {m.name} ({m.role === "ADMIN" ? "Admin" : "Manager"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#f4ece3] pt-3 text-xs text-[#736a64]">
          <span>
            {activeTab === "mine"
              ? "Showing tasks assigned to you"
              : activeTab === "completed"
                ? "Showing completed tasks"
                : "Showing wedding tasks"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="rounded-lg border border-[#dcd6d2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3d3835] transition hover:bg-[#faf7f5]"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[#6d213c] transition hover:underline"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-[#efe9e6] bg-white"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="mt-8 rounded-2xl border border-[#f5c2c7] bg-[#f8d7da] p-6 text-center">
          <p className="text-sm font-semibold text-[#842029]">
            Unable to load tasks right now.
          </p>
          <button
            type="button"
            onClick={() => void loadTasks()}
            className="mt-3 rounded-lg bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#51182d]"
          >
            Try again
          </button>
        </div>
      ) : tasks.length === 0 ? (
        isCustomFiltered ? (
          <div className="mt-6 rounded-2xl border border-[#efe9e6] bg-white p-12 text-center shadow-xs">
            <p className="text-sm text-[#736a64]">
              No tasks match your filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs font-semibold text-[#6d213c] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Empty State from Stitch Screens */
          <div className="mt-6 rounded-2xl border border-[#efe9e6] bg-white p-12 text-center shadow-xs sm:p-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#faf4ef]">
              <svg
                className="h-7 w-7 text-[#8c7355]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <h2 className="font-editorial mt-5 text-3xl font-normal text-[#1e1a1f]">
              {activeTab === "mine"
                ? "You don’t have any assigned tasks yet."
                : activeTab === "completed"
                  ? "Your completed tasks will appear here."
                  : "A little planning goes a long way."}
            </h2>
            <p className="mt-2 text-xs text-[#736a64] sm:text-sm">
              Add your first task and give every detail a place.
            </p>
            <div className="mt-6">
              <Link
                href="/account/wedding/tasks/new"
                className="inline-flex items-center rounded-xl bg-[#6d213c] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#51182d]"
              >
                {activeTab === "all" ? "+ Add your first task" : "+ Add task"}
              </Link>
            </div>
          </div>
        )
      ) : (
        /* Populated Task Cards matching Stitch Screen 4d89729f9854417aa4eb8139e14f9336 */
        <div className="mt-6 space-y-3">
          {tasks.map((task) => {
            const overdue = isTaskOverdue(task.dueDate, task.status, timeZone);
            const isCompleted = task.status === "COMPLETED";

            return (
              <div
                key={task.id}
                className="rounded-xl border border-[#efe9e6] bg-white p-4 transition hover:border-[#ddd1cc] hover:shadow-xs sm:p-5"
              >
                {/* Top Row: Title + Badges + Actions */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isCompleted
                          ? "text-[#9ca3af] line-through"
                          : "text-[#1e1a1f]"
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Priority badge */}
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

                    {/* Overdue badge */}
                    {overdue && (
                      <span className="inline-flex items-center rounded border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#dc2626] uppercase">
                        OVERDUE
                      </span>
                    )}

                    {/* Completed badge */}
                    {isCompleted && (
                      <span className="inline-flex items-center rounded border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#16a34a] uppercase">
                        COMPLETED
                      </span>
                    )}
                  </div>

                  {/* Actions: Status Dropdown, Details, Delete */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Status Dropdown */}
                    <select
                      value={task.status}
                      disabled={updatingTaskId === task.id}
                      onChange={(e) =>
                        void handleStatusChange(
                          task.id,
                          e.target.value as
                            "TODO" | "IN_PROGRESS" | "COMPLETED",
                        )
                      }
                      className={`h-7 cursor-pointer rounded-lg px-2.5 text-xs font-medium transition outline-none ${
                        task.status === "COMPLETED"
                          ? "border border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]"
                          : task.status === "IN_PROGRESS"
                            ? "border border-[#fde68a] bg-[#fffbeb] text-[#b45309]"
                            : "border border-[#e5e7eb] bg-[#f9fafb] text-[#374151]"
                      }`}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>

                    <Link
                      href={`/account/wedding/tasks/${task.id}`}
                      className="text-xs font-medium text-[#676169] transition hover:text-[#1e1a1f]"
                    >
                      Details
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeletingTaskId(task.id)}
                      className="text-xs font-medium text-[#dc2626] transition hover:text-[#991b1b]"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Subtitle Line: Assignee, Event, Due Date */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[#736a64]">
                  {/* Assignee */}
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5 text-[#9ca3af]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7 0 3.75 3.75 0 0 1 7 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                      />
                    </svg>
                    {task.assignee ? (
                      <span>
                        {task.assignee.name}{" "}
                        <span className="text-[#9ca3af]">
                          (
                          {task.assignee.role === "ADMIN"
                            ? "Admin"
                            : task.assignee.role === "MANAGER"
                              ? "Manager"
                              : task.assignee.role}
                          )
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#9ca3af] italic">Unassigned</span>
                    )}
                  </span>

                  <span>•</span>

                  {/* Related Event */}
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5 text-[#9ca3af]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                      />
                    </svg>
                    <span>{task.event?.name || "General wedding task"}</span>
                  </span>

                  <span>•</span>

                  {/* Date information */}
                  {isCompleted ? (
                    <span className="flex items-center gap-1.5 text-[#16a34a]">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                      <span>
                        {formatCompletedDate(task.completedAt, timeZone)}
                      </span>
                    </span>
                  ) : overdue ? (
                    <span className="flex items-center gap-1.5 font-medium text-[#dc2626]">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                      <span>
                        Due: {formatDueDate(task.dueDate, timeZone)} (Overdue)
                      </span>
                    </span>
                  ) : task.dueDate ? (
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="h-3.5 w-3.5 text-[#9ca3af]"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                      <span>Due: {formatDueDate(task.dueDate, timeZone)}</span>
                    </span>
                  ) : (
                    <span>No due date</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer below cards */}
          <div className="flex items-center justify-between pt-2 text-xs text-[#8f8582]">
            <span>
              Showing {tasks.length} of {counts.all} tasks
            </span>
            <span className="italic">All changes auto-saved to cloud</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTaskId && (
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
              This will permanently remove this task from your wedding. This
              action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deletingPending}
                onClick={() => setDeletingTaskId(null)}
                className="rounded-xl border border-[#d6cecb] bg-white px-4 py-2 text-xs font-semibold text-[#4a4543] transition hover:bg-[#faf7f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingPending}
                onClick={() => void handleDeleteTask()}
                className="rounded-xl bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#b91c1c] disabled:opacity-60"
              >
                {deletingPending ? "Deleting..." : "Delete task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
