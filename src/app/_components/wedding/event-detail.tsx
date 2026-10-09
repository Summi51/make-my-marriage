"use client";
import { tabFetch, tabPath } from "@/lib/tab-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { eventTypeLabels } from "@/modules/events/schemas";
import { formatSchedule, timeZoneLabel } from "@/modules/events/format";
import type { EventDto } from "./event-card";

export function EventDetail({
  event,
  timeZone,
}: {
  event: EventDto;
  timeZone: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const archived = Boolean(event.archivedAt);
  const typeLabel = event.type
    ? (eventTypeLabels[event.type as keyof typeof eventTypeLabels] ??
      event.type)
    : "Custom event";

  async function archive() {
    if (pending || archived) return;
    if (
      !window.confirm(
        `Archive "${event.name}"? It will leave the active itinerary. This can't be undone.`,
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      const response = await tabFetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      router.push(tabPath("/account/wedding/events"));
      router.refresh();
    } catch {
      setError("Couldn't archive this event. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <Link
        href="/account/wedding/events"
        className="text-xs font-medium text-[#676169] transition hover:text-[#6d213c]"
      >
        ← Back to events
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6d213c] uppercase">
            {typeLabel}
            {archived ? " · Archived" : ""}
          </p>
          <h1 className="font-editorial mt-2 text-4xl text-[#1e1a1f] sm:text-5xl">
            {event.name}
          </h1>
          <p className="mt-3 text-sm text-[#676169]">
            {formatSchedule(event.startsAt, event.endsAt, timeZone)}
          </p>
          <p className="mt-1 text-xs text-[#676169]">
            All times in {timeZoneLabel(timeZone)}.
          </p>
        </div>
        {archived ? null : (
          <div className="flex gap-2">
            <Link
              href={`/account/wedding/events/${event.id}/edit`}
              className="rounded-lg bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#51182d]"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => void archive()}
              disabled={pending}
              className="rounded-lg border border-[#e6dfdf] px-4 py-2 text-xs font-semibold text-[#6d213c] transition hover:bg-[#f2e8ec] disabled:opacity-60"
            >
              {pending ? "Archiving…" : "Archive"}
            </button>
          </div>
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <dl className="mt-8 divide-y divide-[#e6dfdf] rounded-2xl border border-[#e6dfdf] bg-white">
        <Detail label="Venue" value={event.venueName} />
        <Detail label="Address" value={event.address} />
        <Detail label="Dress code" value={event.dressCode} />
        <Detail label="Description" value={event.description} />
      </dl>
      {archived ? (
        <p className="mt-4 text-sm text-[#676169]">
          This event is archived and read-only. It stays out of the active
          itinerary unless archived events are shown.
        </p>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold tracking-wide text-[#676169] uppercase">
        {label}
      </dt>
      <dd className="text-sm leading-6 text-[#252126]">
        {value?.trim() ? value : "Not added yet"}
      </dd>
    </div>
  );
}
