"use client";
import { tabFetch } from "@/lib/tab-session";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventCard, type EventDto } from "./event-card";
import {
  dayKey,
  formatDayHeading,
  timeZoneLabel,
} from "@/modules/events/format";

export function EventsPageClient({
  timeZone,
  coupleNames,
  location,
}: {
  timeZone: string;
  coupleNames: string;
  location?: string | null;
}) {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async (includeArchived: boolean) => {
    setLoading(true);
    setLoadError(false);
    try {
      const [visibleResponse, allResponse] = await Promise.all([
        tabFetch(
          `/api/events${includeArchived ? "?includeArchived=true" : ""}`,
          { cache: "no-store" },
        ),
        tabFetch("/api/events?includeArchived=true", { cache: "no-store" }),
      ]);
      if (!visibleResponse.ok || !allResponse.ok) throw new Error();
      const visible = (await visibleResponse.json()).data as EventDto[];
      const all = (await allResponse.json()).data as EventDto[];
      setEvents(visible);
      setArchivedCount(all.filter((event) => event.archivedAt).length);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(showArchived);
  }, [load, showArchived]);

  const groups = groupByDay(events, timeZone);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6d213c] uppercase">
        Planning / Events
      </p>
      <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-editorial text-4xl tracking-tight text-[#1e1a1f] sm:text-5xl">
            Wedding events
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#676169]">
            Bring every celebration together in one curated itinerary for{" "}
            {coupleNames}.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            aria-pressed={showArchived}
            onClick={() => setShowArchived((current) => !current)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              showArchived
                ? "border-[#6d213c] bg-[#f2e8ec] text-[#6d213c]"
                : "border-[#e6dfdf] bg-white text-[#676169] hover:text-[#6d213c]"
            }`}
          >
            Show archived ({archivedCount})
          </button>
          <Link
            href="/account/wedding/events/new"
            className="inline-flex items-center rounded-lg bg-[#6d213c] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#51182d]"
          >
            + Add event
          </Link>
        </div>
      </div>
      <p className="mt-5 text-xs text-[#676169]">
        All times in {timeZoneLabel(timeZone)}. All events follow the wedding
        time zone.
        {location ? ` ${location}.` : ""}
      </p>

      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <ErrorState onRetry={() => void load(showArchived)} />
      ) : events.length === 0 ? (
        <EmptyState showingArchived={showArchived} />
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((group, index) => (
            <section key={group.key}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-[#e6dfdf] pb-3">
                <div>
                  <p className="text-sm font-semibold text-[#1e1a1f]">
                    {group.heading}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold tracking-[0.12em] text-[#6d213c] uppercase">
                    Day {index + 1}
                  </p>
                </div>
                <p className="text-xs text-[#676169]">
                  {group.events.length}{" "}
                  {group.events.length === 1 ? "Event" : "Events"}
                </p>
              </div>
              <div className="space-y-4">
                {group.events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    timeZone={timeZone}
                    onChanged={() => void load(showArchived)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(events: EventDto[], timeZone: string) {
  const map = new Map<string, { heading: string; events: EventDto[] }>();
  for (const event of events) {
    const key = dayKey(event.startsAt, timeZone);
    const group = map.get(key) ?? {
      heading: formatDayHeading(event.startsAt, timeZone),
      events: [],
    };
    group.events.push(event);
    map.set(key, group);
  }
  return Array.from(map.entries()).map(([key, group]) => ({ key, ...group }));
}

function LoadingSkeleton() {
  return (
    <div className="mt-8 space-y-4" role="status" aria-label="Loading events">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#e8e2da] bg-white p-6"
        >
          <div className="h-4 w-44 animate-pulse rounded bg-[#f0ede8]" />
          <div className="mt-3 h-3 w-64 animate-pulse rounded bg-[#f0ede8]" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-xl border border-rose-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-base font-semibold text-[#231f20]">
        Unable to load wedding events
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-[#71717a]">
        Please check your internet connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-md bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#5b1a31]"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ showingArchived }: { showingArchived: boolean }) {
  return (
    <div className="mt-8 rounded-2xl border border-[#e6dfdf] bg-white px-6 py-12 text-center sm:px-10">
      <h2 className="font-editorial text-3xl text-[#1e1a1f] sm:text-4xl">
        Every celebration starts with a plan.
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#676169]">
        {showingArchived
          ? "No active or archived events yet."
          : "Add your first event, from Mehndi & Dholki to Haldi / Mayun, Nikah ceremony, and the celebratory Walima reception."}
      </p>
      <Link
        href="/account/wedding/events/new"
        className="mt-6 inline-flex items-center rounded-lg bg-[#6d213c] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#51182d]"
      >
        Add your first event
      </Link>
      <p className="mt-3 text-xs text-[#676169]">
        You can schedule multiple ceremonies, set dress codes, and update
        details anytime.
      </p>
      <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        <FeatureTile
          index="1"
          eyebrow="Order of rituals"
          title="Chronological itinerary"
          text="Sequence your celebrations across multiple days with custom start and end times."
        />
        <FeatureTile
          index="2"
          eyebrow="Dress & venue"
          title="Attire & directions"
          text="Specify dress palettes, etiquette, and venue addresses for seamless guest arrival."
        />
        <FeatureTile
          index="3"
          eyebrow="Invitation integration"
          title="Targeted guest lists"
          text="Attach specific guest subsets to each celebration for effortless RSVP tracking."
        />
      </div>
    </div>
  );
}

function FeatureTile({
  index,
  eyebrow,
  title,
  text,
}: {
  index: string;
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-[#e6dfdf] bg-[#faf8f5] p-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[#6d213c] uppercase">
        {index}. {eyebrow}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#1e1a1f]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#676169]">{text}</p>
    </div>
  );
}
