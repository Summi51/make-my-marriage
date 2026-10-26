"use client";
import { tabFetch } from "@/lib/tab-session";
import Link from "next/link";
import { useState } from "react";
import { eventTypeLabels } from "@/modules/events/schemas";
import { formatSchedule } from "@/modules/events/format";

export type EventDto = {
  id: string;
  name: string;
  type: string | null;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  description: string | null;
  dressCode: string | null;
  archivedAt: string | null;
};

export function EventCard({
  event,
  timeZone,
  onChanged,
}: {
  event: EventDto;
  timeZone: string;
  onChanged?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const typeLabel = event.type
    ? (eventTypeLabels[event.type as keyof typeof eventTypeLabels] ??
      event.type)
    : null;
  const archived = Boolean(event.archivedAt);
  const place = [event.venueName, event.address].filter(Boolean).join(", ");

  async function restore() {
    if (pending || !archived) return;
    setPending(true);
    setError("");
    try {
      const response = await tabFetch(`/api/events/${event.id}/restore`, {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      onChanged?.();
    } catch {
      setError("Couldn't restore this event.");
      setPending(false);
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-white p-5 sm:p-6 ${
        archived ? "border-[#e6dfdf] opacity-70" : "border-[#e6dfdf]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {typeLabel ? (
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[#6d213c] uppercase">
                {typeLabel}
              </p>
            ) : null}
            {archived ? (
              <span className="rounded border border-[#e6dfdf] bg-[#faf8f5] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#676169] uppercase">
                Archived
              </span>
            ) : null}
          </div>
          <h3 className="font-editorial mt-1 text-2xl text-[#1e1a1f] sm:text-3xl">
            {event.name}
          </h3>
          <p className="mt-2 text-sm text-[#676169]">
            {formatSchedule(event.startsAt, event.endsAt, timeZone)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/account/wedding/events/${event.id}`}
            className="rounded-lg border border-[#e6dfdf] px-3 py-2 text-xs font-semibold text-[#6d213c] transition hover:bg-[#f2e8ec]"
          >
            View details
          </Link>
          {archived ? (
            <button
              type="button"
              onClick={() => void restore()}
              disabled={pending}
              className="rounded-lg bg-[#6d213c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#51182d] disabled:opacity-60"
            >
              {pending ? "Restoring…" : "Restore"}
            </button>
          ) : (
            <Link
              href={`/account/wedding/events/${event.id}/edit`}
              className="rounded-lg bg-[#6d213c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#51182d]"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      {place ? <p className="mt-4 text-sm text-[#252126]">📍 {place}</p> : null}
      {event.dressCode ? (
        <p className="mt-1 text-sm text-[#252126]">
          ✨ Dress code: {event.dressCode}
        </p>
      ) : null}
      {event.description ? (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#676169]">
          {event.description}
        </p>
      ) : null}
    </article>
  );
}
