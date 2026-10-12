"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GuestDto } from "@/modules/guests/use-cases";
import { tabFetch } from "@/lib/tab-session";

interface GuestsPageClientProps {
  events: Array<{ id: string; name: string }>;
}

const PAGE_SIZE = 20;

export function GuestsPageClient({ events }: GuestsPageClientProps) {
  const [guests, setGuests] = useState<GuestDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [rsvpFilter, setRsvpFilter] = useState("all");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const [guestToDelete, setGuestToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters =
    search.trim() !== "" || eventFilter !== "all" || rsvpFilter !== "all";

  // Search, event and RSVP filters run in the API so every guest stays
  // reachable, not only the first page of records.
  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setLoadError(false);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (eventFilter !== "all") params.set("eventId", eventFilter);
        if (rsvpFilter !== "all") params.set("rsvpStatus", rsvpFilter);
        params.set("page", String(targetPage));
        params.set("limit", String(PAGE_SIZE));

        const res = await tabFetch(`/api/guests?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setGuests(json.data ?? []);
        setTotal(json.pagination?.total ?? 0);
        setPage(json.pagination?.page ?? targetPage);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [search, eventFilter, rsvpFilter],
  );

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => void load(1), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const handleClearFilters = () => {
    setSearch("");
    setEventFilter("all");
    setRsvpFilter("all");
  };

  const handleCopyLink = async (guestId: string) => {
    setCopyError(null);
    try {
      const res = await tabFetch(`/api/guests/${guestId}/invitation-link`);
      if (!res.ok) throw new Error("Failed to load invitation link");
      const json = await res.json();
      const url: string | undefined = json.data?.url;
      if (!url) throw new Error("Invitation link unavailable");
      await navigator.clipboard.writeText(url);
      setCopyFeedback(guestId);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      // Clipboard access can be denied: point the member at the guest page,
      // where the full link is displayed and can be copied by hand.
      setCopyError(guestId);
    }
  };

  const handleDeleteGuest = async () => {
    if (!guestToDelete) return;
    setIsDeleting(true);
    try {
      const res = await tabFetch(`/api/guests/${guestToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete guest");
      setGuestToDelete(null);
      // Step back a page when the last row on this page was just removed.
      await load(guests.length === 1 && page > 1 ? page - 1 : page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete guest");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      {/* Eyebrow & Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-widest text-[#8D6B4F] uppercase">
            PLANNING / GUESTS
          </span>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#1F1E1D] sm:text-4xl">
            Wedding guests
          </h1>
          <p className="mt-1.5 text-sm font-normal text-[#7A7269]">
            Bring your favourite people into the celebration.
          </p>
        </div>

        <Link
          href="/account/wedding/guests/new"
          className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[#6D213C] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#5B1A31]"
        >
          + Add guest
        </Link>
      </div>

      {/* Search & Filters Container Card */}
      <div className="mb-6 rounded-xl border border-[#E8E2D9] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Search Guests Input */}
          <div className="flex flex-col gap-1.5 md:col-span-6">
            <label
              htmlFor="search-input"
              className="text-xs font-medium text-[#7A7269]"
            >
              Search guests
            </label>
            <input
              id="search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone"
              className="w-full rounded-lg border border-[#E8E2D9] bg-white px-3.5 py-2.5 text-xs text-[#1F1E1D] placeholder-[#9B948B] transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
            />
          </div>

          {/* Event Dropdown */}
          <div className="flex flex-col gap-1.5 md:col-span-3">
            <label
              htmlFor="event-select"
              className="text-xs font-medium text-[#7A7269]"
            >
              Event
            </label>
            <div className="relative">
              <select
                id="event-select"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-[#E8E2D9] bg-white px-3.5 py-2.5 pr-9 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
              >
                <option value="all">All events</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#7A7269]">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* RSVP Status Dropdown */}
          <div className="flex flex-col gap-1.5 md:col-span-3">
            <label
              htmlFor="rsvp-select"
              className="text-xs font-medium text-[#7A7269]"
            >
              RSVP status
            </label>
            <div className="relative">
              <select
                id="rsvp-select"
                value={rsvpFilter}
                onChange={(e) => setRsvpFilter(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-[#E8E2D9] bg-white px-3.5 py-2.5 pr-9 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
              >
                <option value="all">All RSVP statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ATTENDING">Attending</option>
                <option value="NOT_ATTENDING">Not attending</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#7A7269]">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom filter count & actions */}
        <div className="mt-4 flex items-center justify-between border-t border-[#E8E2D9]/60 pt-3">
          <span className="text-xs text-[#7A7269]">
            {total} {total === 1 ? "guest group" : "guest groups"}{" "}
            {hasActiveFilters ? "match your filters" : "in your guest list"}
          </span>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="cursor-pointer text-xs font-medium text-[#7A7269] transition hover:text-[#1F1E1D]"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => void load(1)}
              className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-transparent px-3.5 py-1.5 text-xs font-medium text-[#7A7269] transition hover:bg-neutral-50"
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Error, Loading, Empty State or Populated Directory */}
      {loadError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <h2 className="font-serif text-2xl font-bold text-[#1F1E1D]">
            Unable to load your guest list
          </h2>
          <p className="mt-2 text-sm text-[#7A7269]">
            Please check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => void load(page)}
            className="mt-5 cursor-pointer rounded-lg bg-[#6D213C] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#5B1A31]"
          >
            Try again
          </button>
        </section>
      ) : loading && guests.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-[#E8E2D9] bg-white/60"
            />
          ))}
        </div>
      ) : guests.length === 0 ? (
        <section className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-[#E8E2D9] bg-white/40 p-10 text-center shadow-sm sm:p-16">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F6EFE6]">
            <svg
              className="h-9 w-9 text-[#8D6B4F]"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              viewBox="0 0 24 24"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <h2 className="mb-2 font-serif text-2xl font-bold tracking-tight text-[#1F1E1D] sm:text-3xl">
            {hasActiveFilters
              ? "No guests match your filters."
              : "Your celebration starts with your people."}
          </h2>

          <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed font-normal text-[#7A7269]">
            {hasActiveFilters
              ? "Try adjusting your search criteria or resetting filters to see your guest records."
              : "Add your first guest or family group to begin organising your guest list."}
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#E8E2D9] bg-white px-5 py-2.5 text-xs font-semibold text-[#1F1E1D] shadow-sm transition hover:bg-neutral-50"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/account/wedding/guests/new"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#6D213C] px-6 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-[#5B1A31]"
            >
              + Add your first guest
            </Link>
          )}
        </section>
      ) : (
        <div className="space-y-4">
          {/* Desktop & Tablet Table View */}
          <div className="hidden overflow-hidden rounded-2xl border border-[#E8E2D9] bg-white shadow-xs md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E8E2D9] bg-[#FAF7F2]">
                    <th
                      scope="col"
                      className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase"
                    >
                      GUEST NAME & GROUP
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase"
                    >
                      CONTACT DETAILS
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase"
                    >
                      INVITED EVENTS
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase"
                    >
                      MAX PARTY
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase"
                    >
                      RSVP STATUS
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase"
                    >
                      ATTENDANCE
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase"
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1] bg-white">
                  {guests.map((guest) => {
                    return (
                      <tr
                        key={guest.id}
                        className="transition-colors hover:bg-[#FAF8F5]/60"
                      >
                        {/* Guest Name & Group */}
                        <td className="px-6 py-5 align-middle">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/account/wedding/guests/${guest.id}`}
                              className="font-serif text-lg font-medium text-[#1F1E1D] transition hover:text-[#6D213C]"
                            >
                              {guest.name}
                            </Link>
                            {guest.isFamily && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#F4EFE6] px-1.5 py-0.5 text-[10px] font-semibold text-[#8C6843]">
                                👨‍👩‍👧‍👦 Family
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="px-6 py-5 align-middle text-xs">
                          {guest.email || guest.phone ? (
                            <div className="space-y-0.5">
                              {guest.phone && (
                                <p className="font-medium text-[#1F1E1D]">
                                  {guest.phone}
                                </p>
                              )}
                              {guest.email && (
                                <p className="max-w-[180px] truncate text-[#7A7269]">
                                  {guest.email}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#7A7269]">
                              No contact details
                            </span>
                          )}
                        </td>

                        {/* Invited Events */}
                        <td className="px-6 py-5 align-middle text-xs">
                          {guest.invitedEvents &&
                          guest.invitedEvents.length > 0 ? (
                            <span className="text-[#1F1E1D]">
                              {guest.invitedEvents.length === events.length &&
                              events.length > 0
                                ? `All ${events.length} celebrations`
                                : guest.invitedEvents.length <= 2
                                  ? guest.invitedEvents
                                      .map((e) => e.name)
                                      .join(", ")
                                  : `${guest.invitedEvents[0]?.name} +${guest.invitedEvents.length - 1} more`}
                            </span>
                          ) : (
                            <span className="text-[#7A7269]">
                              No events selected
                            </span>
                          )}
                        </td>

                        {/* Max Party */}
                        <td className="px-6 py-5 align-middle">
                          <p className="text-xs font-semibold text-[#1F1E1D]">
                            {guest.maxGuests}
                          </p>
                          <span className="block text-[10px] text-[#7A7269]">
                            including named guest
                          </span>
                        </td>

                        {/* RSVP Status */}
                        <td className="px-6 py-5 align-middle">
                          {guest.rsvpStatus === "ATTENDING" ? (
                            <span className="inline-flex items-center rounded bg-[#E8F3EB] px-2.5 py-0.5 text-[11px] font-medium text-[#276738]">
                              Attending
                            </span>
                          ) : guest.rsvpStatus === "NOT_ATTENDING" ? (
                            <span className="inline-flex items-center rounded bg-[#FCEBEB] px-2.5 py-0.5 text-[11px] font-medium text-[#9B2C2C]">
                              Declined
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded bg-[#F5ECE1] px-2.5 py-0.5 text-[11px] font-medium text-[#8C6843]">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Attendance */}
                        <td className="px-6 py-5 align-middle text-xs text-[#1F1E1D]">
                          {guest.rsvpStatus === "ATTENDING" ? (
                            <span>
                              {guest.attendingCount
                                ? `${guest.attendingCount} ${guest.attendingCount === 1 ? "person" : "people"}`
                                : "Attending"}
                            </span>
                          ) : guest.rsvpStatus === "NOT_ATTENDING" ? (
                            <span className="text-[#7A7269]">
                              Not attending
                            </span>
                          ) : (
                            <span className="text-[#7A7269]">
                              Awaiting response
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5 align-middle">
                          <div className="flex items-center gap-3 text-xs">
                            <Link
                              href={`/account/wedding/guests/${guest.id}`}
                              className="font-medium text-[#8D6B4F] transition hover:text-[#6D213C] hover:underline"
                            >
                              Details
                            </Link>
                            <Link
                              href={`/account/wedding/guests/${guest.id}/edit`}
                              className="font-medium text-[#7A7269] transition hover:text-[#1F1E1D] hover:underline"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                setGuestToDelete({
                                  id: guest.id,
                                  name: guest.name,
                                })
                              }
                              className="cursor-pointer font-medium text-[#9B948B] transition hover:text-red-700 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (optimized touch-friendly experience on small screens) */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="rounded-2xl border border-[#E8E2D9] bg-white p-4.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[#F0EBE1] pb-3">
                  <div className="min-w-0">
                    <Link
                      href={`/account/wedding/guests/${guest.id}`}
                      className="block truncate font-serif text-lg font-medium text-[#1F1E1D] hover:text-[#6D213C]"
                    >
                      {guest.name}
                    </Link>
                    {guest.isFamily && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#F4EFE6] px-1.5 py-0.5 text-[10px] font-semibold text-[#8C6843]">
                        👨‍👩‍👧‍👦 Family
                      </span>
                    )}
                  </div>
                  {guest.rsvpStatus === "ATTENDING" ? (
                    <span className="shrink-0 rounded bg-[#E8F3EB] px-2.5 py-0.5 text-[11px] font-medium text-[#276738]">
                      Attending
                    </span>
                  ) : guest.rsvpStatus === "NOT_ATTENDING" ? (
                    <span className="shrink-0 rounded bg-[#FCEBEB] px-2.5 py-0.5 text-[11px] font-medium text-[#9B2C2C]">
                      Declined
                    </span>
                  ) : (
                    <span className="shrink-0 rounded bg-[#F5ECE1] px-2.5 py-0.5 text-[11px] font-medium text-[#8C6843]">
                      Pending
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3.5 py-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase">
                      CONTACT
                    </span>
                    <p className="mt-0.5 truncate text-[#1F1E1D]">
                      {guest.phone || guest.email || "No contact details"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase">
                      MAX PARTY
                    </span>
                    <p className="mt-0.5 font-medium text-[#1F1E1D]">
                      {guest.maxGuests} (incl. guest)
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase">
                      INVITED EVENTS
                    </span>
                    <p className="mt-0.5 truncate text-[#7A7269]">
                      {guest.invitedEvents && guest.invitedEvents.length > 0
                        ? `${guest.invitedEvents.length} events`
                        : "No events selected"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase">
                      ATTENDANCE
                    </span>
                    <p className="mt-0.5 text-[#1F1E1D]">
                      {guest.rsvpStatus === "ATTENDING" && guest.attendingCount
                        ? `${guest.attendingCount} people`
                        : guest.rsvpStatus === "NOT_ATTENDING"
                          ? "Not attending"
                          : "Awaiting response"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#F0EBE1] pt-3 text-xs">
                  {copyError === guest.id ? (
                    <span className="text-[11px] font-medium text-[#9B4B3C]">
                      Copy blocked — open the guest to copy the link
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(guest.id)}
                      className="cursor-pointer text-[11px] font-medium text-[#8D6B4F] hover:underline"
                    >
                      {copyFeedback === guest.id
                        ? "✓ Link copied"
                        : "Copy invitation link"}
                    </button>
                  )}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/account/wedding/guests/${guest.id}`}
                      className="font-medium text-[#6D213C] hover:underline"
                    >
                      Details
                    </Link>
                    <Link
                      href={`/account/wedding/guests/${guest.id}/edit`}
                      className="text-[#7A7269] hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setGuestToDelete({
                          id: guest.id,
                          name: guest.name,
                        })
                      }
                      className="text-[#9B948B] hover:text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer: Count & Page info */}
          <div className="flex items-center justify-between gap-3 px-2 pt-2 text-xs text-[#7A7269]">
            <span>
              Showing {guests.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {(page - 1) * PAGE_SIZE + guests.length} of {total} guest groups
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1)}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-3 py-1.5 font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1)}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-3 py-1.5 font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {guestToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-guest-list-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#EDE7DD] bg-white p-6 shadow-xl">
            <h3
              id="delete-guest-list-title"
              className="font-serif text-xl font-bold text-[#1F1E1D]"
            >
              Delete Guest Record
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#7A7269]">
              Are you sure you want to remove{" "}
              <strong className="text-[#1F1E1D]">{guestToDelete.name}</strong>?
              Their invitation link and RSVP response will be permanently
              deleted.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setGuestToDelete(null)}
                className="cursor-pointer rounded-lg border border-[#DED7CD] bg-white px-4 py-2 text-xs font-semibold text-[#1F1E1D] transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteGuest}
                className="cursor-pointer rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Guest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
