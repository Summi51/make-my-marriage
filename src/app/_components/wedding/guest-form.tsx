"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GuestDto } from "@/modules/guests/use-cases";
import { tabFetch, tabPath } from "@/lib/tab-session";

interface GuestFormProps {
  initialData?: GuestDto;
  events: Array<{
    id: string;
    name: string;
    startsAt: string | null;
    venueName: string | null;
    description: string | null;
  }>;
  weddingTitle: string;
  timeZone?: string;
}

function formatEventBadge(
  startsAtStr: string | null,
  timeZone: string = "Asia/Kolkata",
) {
  if (!startsAtStr) return null;
  try {
    const d = new Date(startsAtStr);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return null;
  }
}

export function GuestForm({
  initialData,
  events,
  weddingTitle,
  timeZone = "Asia/Kolkata",
}: GuestFormProps) {
  const router = useRouter();

  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [maxGuests, setMaxGuests] = useState<number>(
    initialData?.maxGuests ?? 1,
  );
  const [isFamily, setIsFamily] = useState<boolean>(
    initialData?.isFamily ?? false,
  );
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(
    initialData?.invitedEventIds ?? events.map((e) => e.id),
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Associations whose event is archived or gone are kept but cannot be shown
  // as checkboxes, so they get their own removable chips.
  const activeEventIds = new Set(events.map((e) => e.id));
  const unavailableEventIds = selectedEventIds.filter(
    (id) => !activeEventIds.has(id),
  );
  const selectedActiveCount = selectedEventIds.filter((id) =>
    activeEventIds.has(id),
  ).length;

  const isAllEventsSelected =
    events.length > 0 && selectedActiveCount === events.length;
  const isSomeEventsSelected =
    selectedActiveCount > 0 && selectedActiveCount < events.length;

  // The toggle governs the active program events only. Links to archived or
  // unavailable celebrations are preserved, so they are never dropped without the
  // member using the explicit "Remove unavailable link" control.
  const handleToggleAllEvents = () => {
    if (isAllEventsSelected) {
      setSelectedEventIds(unavailableEventIds);
    } else {
      setSelectedEventIds([...events.map((e) => e.id), ...unavailableEventIds]);
    }
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId],
    );
  };

  const handleFamilyToggle = (checked: boolean) => {
    setIsFamily(checked);
    if (checked && maxGuests === 1) {
      setMaxGuests(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        maxGuests: Number(maxGuests),
        isFamily,
        invitedEventIds: selectedEventIds,
        notes: notes.trim() || null,
      };

      const url = isEditing ? `/api/guests/${initialData?.id}` : "/api/guests";
      const method = isEditing ? "PATCH" : "POST";

      const res = await tabFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to save guest record.");
      }

      const createdOrUpdatedId = json.data?.id || initialData?.id;
      router.push(
        tabPath(`/account/wedding/guests/${createdOrUpdatedId}?saved=1`),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      {/* Back Link & Page Title */}
      <div className="mb-7">
        <Link
          href={
            isEditing
              ? `/account/wedding/guests/${initialData?.id}`
              : "/account/wedding/guests"
          }
          className="mb-4 inline-flex items-center text-xs font-medium text-[#7A7269] transition hover:text-[#1F1E1D]"
        >
          <span className="mr-1">←</span> Back to guests
        </Link>
        <p className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-[#8D6B4F] uppercase">
          PLANNING / GUESTS
        </p>
        <h1 className="mb-2 font-serif text-3xl font-normal tracking-tight text-[#1F1E1D] sm:text-4xl">
          {isEditing ? "Edit guest" : "Add a guest"}
        </h1>
        <p className="text-sm text-[#7A7269]">
          Create a place for every person and family in your celebration.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Form Details (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card 1: Guest Details */}
            <section className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:p-7">
              <h2 className="mb-4 font-serif text-2xl font-normal text-[#1F1E1D]">
                1. Guest details
              </h2>

              {/* Ivory Helper Banner */}
              <div className="mb-6 rounded-xl border border-[#F0EBE1] bg-[#FAF8F5] p-4 text-xs leading-relaxed text-[#7A7269]">
                One guest record represents one invitation or family group.
                Adding a guest does not send an invitation.
              </div>

              {/* Input: Guest name */}
              <div className="mb-6 space-y-2">
                <label
                  htmlFor="guest-name"
                  className="block text-xs font-semibold text-[#1F1E1D]"
                >
                  Guest name <span className="text-[#6D213C]">*</span>
                </label>
                <input
                  id="guest-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adil Bhai & family"
                  className="h-11 w-full rounded-lg border border-[#DED7CD] bg-white px-3.5 text-sm placeholder-gray-400 transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
                />
              </div>

              {/* Two-Column Fields: Email & Phone */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="guest-email"
                    className="block text-xs font-semibold text-[#1F1E1D]"
                  >
                    Email{" "}
                    <span className="font-normal text-gray-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-11 w-full rounded-lg border border-[#DED7CD] bg-white px-3.5 text-sm placeholder-gray-400 transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="guest-phone"
                    className="block text-xs font-semibold text-[#1F1E1D]"
                  >
                    Phone{" "}
                    <span className="font-normal text-gray-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="guest-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-11 w-full rounded-lg border border-[#DED7CD] bg-white px-3.5 text-sm placeholder-gray-400 transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Card 2: Invitation Planning */}
            <section className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:p-7">
              <h2 className="mb-5 font-serif text-2xl font-normal text-[#1F1E1D]">
                2. Invitation planning
              </h2>

              {/* Family Option Feature */}
              <div className="mb-6 rounded-xl border border-[#EDE7DD] bg-[#FAF8F5]/80 p-4 transition">
                <label className="flex cursor-pointer items-start gap-3.5 select-none">
                  <input
                    type="checkbox"
                    checked={isFamily}
                    onChange={(e) => handleFamilyToggle(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#6D213C] focus:ring-[#6D213C]"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-[#1F1E1D]">
                      Invite with family option (& family)
                    </span>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#7A7269]">
                      Designates this invitation as a family group. The
                      invitation card will readily address the primary guest and
                      their family, allowing group RSVP.
                    </p>
                  </div>
                </label>
              </div>

              {/* Input: Maximum party size */}
              <div className="mb-6 space-y-2">
                <label
                  htmlFor="party-size"
                  className="block text-xs font-semibold text-[#1F1E1D]"
                >
                  Maximum party size <span className="text-[#6D213C]">*</span>
                </label>
                <input
                  id="party-size"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={maxGuests}
                  onChange={(e) =>
                    setMaxGuests(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="h-11 w-full rounded-lg border border-[#DED7CD] bg-white px-3.5 text-sm text-[#1F1E1D] transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
                />
                <div className="rounded-xl border border-[#F0EBE1] bg-[#FAF8F5] p-3.5 text-xs text-[#7A7269]">
                  {isFamily
                    ? "Enter total number of family members attending, including the primary guest (e.g. 4 for a family of four)."
                    : "Includes the named guest. For example, enter 2 for a couple or 1 for an individual."}
                </div>
              </div>

              {/* Invited Events */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F1E1D]">
                      Invited events{" "}
                      <span className="font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>
                    <p className="mt-0.5 text-xs text-[#7A7269]">
                      Select which wedding functions this family or guest is
                      invited to attend:
                    </p>
                  </div>
                  <span className="rounded-full border border-[#EFEAE2] bg-[#FAF7F3] px-2.5 py-1 text-[11px] font-medium text-[#7A7269]">
                    Celebrations for {weddingTitle}
                  </span>
                </div>

                {events.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E8E2D9] bg-[#FAF8F5]/60 p-6 text-center">
                    <p className="text-xs font-semibold text-[#1F1E1D]">
                      No events added yet
                    </p>
                    <p className="mt-1 text-[11px] text-[#7A7269]">
                      You can create celebration events in your wedding
                      itinerary and associate them later.
                    </p>
                    <Link
                      href="/account/wedding/events/new"
                      className="mt-3 inline-flex items-center rounded-lg bg-[#6D213C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#5B1A31]"
                    >
                      + Add celebration event
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Master Checkbox: All Program Events */}
                    <div
                      onClick={handleToggleAllEvents}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition select-none ${
                        isAllEventsSelected
                          ? "border-[#6D213C] bg-[#FAF8F5] shadow-xs"
                          : isSomeEventsSelected
                            ? "border-[#8D6B4F]/50 bg-[#FAF8F5]/50"
                            : "border-[#EDE7DD] bg-white hover:bg-[#FAF8F5]/50"
                      }`}
                    >
                      <label
                        className="flex flex-1 cursor-pointer items-center gap-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isAllEventsSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeEventsSelected;
                          }}
                          onChange={handleToggleAllEvents}
                          className="h-4 w-4 rounded border-gray-300 text-[#6D213C] focus:ring-[#6D213C]"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-[#1F1E1D]">
                            All program events
                          </span>
                          <span className="block text-[11px] text-[#7A7269]">
                            Invite this guest or family to all wedding
                            celebrations
                          </span>
                        </div>
                      </label>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                          isAllEventsSelected
                            ? "bg-[#6D213C]/10 text-[#6D213C]"
                            : isSomeEventsSelected
                              ? "bg-[#F5ECE1] text-[#8C6843]"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isAllEventsSelected
                          ? "All events selected"
                          : `${selectedActiveCount} of ${events.length} selected`}
                      </span>
                    </div>

                    {unavailableEventIds.length > 0 && (
                      <div className="rounded-xl border border-[#EDE7DD] bg-[#FAF8F5]/60 p-3.5">
                        <p className="text-xs font-semibold text-[#1F1E1D]">
                          Archived or unavailable celebrations
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#7A7269]">
                          This guest is still linked to{" "}
                          {unavailableEventIds.length} celebration
                          {unavailableEventIds.length === 1 ? "" : "s"} that are
                          no longer active. Remove a link if this guest should
                          not stay invited to it.
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {unavailableEventIds.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleEvent(id)}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#DED7CD] bg-white px-2.5 py-1 text-[11px] font-medium text-[#7A7269] transition hover:border-[#6D213C] hover:text-[#6D213C]"
                            >
                              Remove unavailable link
                              <span aria-hidden="true">✕</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Individual Ceremony Cards */}
                    <div className="space-y-2 pt-1">
                      {events.map((ev) => {
                        const isChecked = selectedEventIds.includes(ev.id);
                        const badgeDate = formatEventBadge(
                          ev.startsAt,
                          timeZone,
                        );
                        return (
                          <label
                            key={ev.id}
                            className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition select-none ${
                              isChecked
                                ? "border-[#6D213C]/40 bg-[#FAF8F5]"
                                : "border-[#EDE7DD] bg-white hover:border-[#DED7CD] hover:bg-[#FAF8F5]/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleEvent(ev.id)}
                              className="h-4 w-4 rounded border-gray-300 text-[#6D213C] focus:ring-[#6D213C]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-[#1F1E1D]">
                                  {ev.name}
                                </span>
                                {badgeDate && (
                                  <span className="shrink-0 text-[10px] font-medium text-[#8D6B4F]">
                                    {badgeDate}
                                  </span>
                                )}
                              </div>
                              <span className="block truncate text-[11px] text-[#7A7269]">
                                {ev.description ||
                                  ev.venueName ||
                                  "Wedding ceremony"}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Bottom Helper link */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#7A7269]">
                      <span>
                        Ceremonies can be added or updated anytime in the
                        itinerary.
                      </span>
                      <Link
                        href="/account/wedding/events"
                        className="font-medium text-[#6D213C] hover:underline"
                      >
                        Manage events →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Card 3: Additional Details */}
            <section className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] sm:p-7">
              <h2 className="mb-4 font-serif text-2xl font-normal text-[#1F1E1D]">
                3. Additional details
              </h2>
              <div className="space-y-2">
                <label
                  htmlFor="notes"
                  className="block text-xs font-semibold text-[#1F1E1D]"
                >
                  Notes{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything helpful for your wedding team..."
                  className="w-full resize-y rounded-lg border border-[#DED7CD] bg-white p-3.5 text-sm placeholder-gray-400 transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
                />
                <p className="pt-1 text-xs text-[#7A7269]">
                  Notes are for your wedding team.
                </p>
              </div>
            </section>

            {/* Form Actions Footer */}
            <div className="flex flex-col items-center justify-between gap-4 pt-2 pb-8 sm:flex-row">
              <div className="flex items-center gap-2 text-xs text-[#7A7269]">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                <span>Unsaved changes</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={
                    isEditing
                      ? `/account/wedding/guests/${initialData?.id}`
                      : "/account/wedding/guests"
                  }
                  className="rounded-xl border border-[#DED7CD] bg-white px-5 py-2.5 text-xs font-semibold text-[#1F1E1D] shadow-sm transition hover:bg-gray-50 active:bg-gray-100"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-xl bg-[#6D213C] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#5B1A31] active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : isEditing
                      ? "Save changes"
                      : "Create guest"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Contextual Helper Cards (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Helper Card 1: Planning Together */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <p className="mb-3 text-[10px] font-bold tracking-[0.16em] text-[#8D6B4F] uppercase">
              PLANNING TOGETHER
            </p>
            <h3 className="mb-3 font-serif text-2xl leading-snug font-normal text-[#1F1E1D]">
              Every guest has a place.
            </h3>
            <p className="mb-6 text-xs leading-relaxed text-[#7A7269]">
              Keep families together in one record, and choose the celebrations
              they will share with you.
            </p>

            <div className="space-y-3.5 border-t border-[#F0EBE1] pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A7269]">RSVP status</span>
                <span className="rounded-md bg-[#F5ECE1] px-2.5 py-0.5 text-[11px] font-medium text-[#8C6843]">
                  {initialData ? initialData.rsvpStatus : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7A7269]">Attendance</span>
                <span className="font-medium text-[#1F1E1D]">
                  {initialData?.attendingCount
                    ? `${initialData.attendingCount} attending`
                    : "Awaiting response"}
                </span>
              </div>
            </div>

            <p className="mt-4 border-t border-[#F7F4EF] pt-3 text-[11px] text-[#9B948B]">
              RSVP information is read-only here.
            </p>
          </div>

          {/* Helper Card 2: Thoughtful Detail */}
          <div className="rounded-2xl border border-[#EDE6DC] bg-[#FAF8F5] p-6 shadow-sm">
            <p className="mb-2 text-[10px] font-bold tracking-[0.16em] text-[#8D6B4F] uppercase">
              A THOUGHTFUL DETAIL
            </p>
            <p className="text-xs leading-relaxed text-[#7A7269]">
              A family of four needs one guest record with a maximum party size
              of 4, including the named guest.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
