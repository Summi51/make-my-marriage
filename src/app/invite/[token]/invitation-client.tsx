"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { PublicInvitationDto } from "@/modules/guests/use-cases";

interface InvitationClientProps {
  token: string;
  initialData: PublicInvitationDto;
  initialOpenRsvp?: boolean;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Date to be announced";
  try {
    // Parse YYYY-MM-DD or ISO string without time shift
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatEventTime(
  startsAt: string | null,
  endsAt: string | null,
  timeZone: string = "Asia/Kolkata",
): { date: string; time: string } {
  if (!startsAt) return { date: "Date TBA", time: "Time TBA" };

  try {
    const start = new Date(startsAt);
    const date = start.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    });

    const startTime = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });

    if (endsAt) {
      const end = new Date(endsAt);
      const endTime = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone,
      });
      return { date, time: `${startTime} – ${endTime}` };
    }

    return { date, time: `${startTime} onwards` };
  } catch {
    return { date: "Date TBA", time: "Time TBA" };
  }
}

function getEventDayBadge(
  eventDateStr: string | null,
  allEventDatesSorted: string[],
  name: string,
  type: string | null | undefined,
  timeZone: string,
): {
  dayLabel: string;
  pillClass: string;
  isMainEvent: boolean;
} {
  const lower = (name + " " + (type || "")).toLowerCase();
  const isMainEvent =
    lower.includes("nikah") ||
    lower.includes("solemnization") ||
    lower.includes("wedding ceremony") ||
    lower.includes("ceremony") ||
    type === "CEREMONY";

  let dayNumber = 1;
  if (eventDateStr) {
    try {
      const dateKey = new Date(eventDateStr).toLocaleDateString("en-CA", {
        timeZone,
      });
      const dateIndex = allEventDatesSorted.indexOf(dateKey);
      if (dateIndex !== -1) {
        dayNumber = dateIndex + 1;
      }
    } catch {
      // fallback
    }
  }

  let ceremonyLabel = "Celebration";
  let pillClass = "bg-stone-100 text-stone-700";

  if (
    lower.includes("mehndi") ||
    lower.includes("henna") ||
    type === "MEHNDI"
  ) {
    ceremonyLabel = "Mehndi";
    pillClass = "bg-amber-50 text-amber-800";
  } else if (
    lower.includes("haldi") ||
    lower.includes("mayun") ||
    type === "HALDI"
  ) {
    ceremonyLabel = "Haldi";
    pillClass = "bg-yellow-50 text-yellow-800";
  } else if (
    lower.includes("sangeet") ||
    lower.includes("qawwali") ||
    type === "SANGEET"
  ) {
    ceremonyLabel = "Sangeet";
    pillClass = "bg-purple-50 text-purple-800";
  } else if (isMainEvent) {
    ceremonyLabel = "Main Solemnization";
    pillClass = "bg-rose-50 text-[#5C1629]";
  } else if (
    lower.includes("walima") ||
    lower.includes("reception") ||
    type === "RECEPTION"
  ) {
    ceremonyLabel = "Reception";
    pillClass = "bg-stone-100 text-stone-800";
  }

  return {
    dayLabel: `Day ${dayNumber} • ${ceremonyLabel}`,
    pillClass,
    isMainEvent,
  };
}

export function InvitationClient({
  token,
  initialData,
  initialOpenRsvp = false,
}: InvitationClientProps) {
  const { guest, wedding, events } = initialData;

  const [currentRsvp, setCurrentRsvp] = useState({
    status: guest.rsvpStatus,
    attendingCount: guest.attendingCount ?? (guest.maxGuests > 1 ? 2 : 1),
  });

  // Modal dialog state
  const [isModalOpen, setIsModalOpen] = useState(initialOpenRsvp);
  const [formStatus, setFormStatus] = useState<"ATTENDING" | "NOT_ATTENDING">(
    currentRsvp.status === "NOT_ATTENDING" ? "NOT_ATTENDING" : "ATTENDING",
  );
  const [formCount, setFormCount] = useState<number>(
    currentRsvp.attendingCount && currentRsvp.attendingCount > 0
      ? currentRsvp.attendingCount
      : guest.maxGuests > 1
        ? 2
        : 1,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep the server-side RSVP in step when the guest returns to this tab or
  // another tab changes it. Only the confirmed response is refreshed, so an
  // unsaved draft is never discarded.
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/public/invitations/${token}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        const latest = json?.data?.guest;
        if (!latest) return;
        setCurrentRsvp({
          status: latest.rsvpStatus,
          attendingCount:
            latest.attendingCount ?? (latest.maxGuests > 1 ? 2 : 1),
        });
      } catch {
        // A failed refresh leaves the current view untouched.
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token]);

  const openModal = () => {
    setFormStatus(
      currentRsvp.status === "NOT_ATTENDING" ? "NOT_ATTENDING" : "ATTENDING",
    );
    setFormCount(
      currentRsvp.attendingCount && currentRsvp.attendingCount > 0
        ? currentRsvp.attendingCount
        : guest.maxGuests > 1
          ? 2
          : 1,
    );
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMessage(null);
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        status: formStatus,
        attendingCount: formStatus === "ATTENDING" ? formCount : 0,
      };

      const res = await fetch(`/api/public/invitations/${token}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || "Failed to submit RSVP. Please try again.",
        );
      }

      setCurrentRsvp({
        status: json.data.status,
        attendingCount: json.data.attendingCount,
      });

      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An error occurred submitting your RSVP.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedWeddingDate = formatDate(wedding.weddingDate);
  const guestInitial = guest.name.trim().charAt(0).toUpperCase() || "G";

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 selection:bg-[#5C1629]/15 selection:text-[#5C1629]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#eee8e0] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-12">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#faf1ec] ring-1 ring-[#e8e2da]">
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 40 40"
              >
                <ellipse
                  cx="16"
                  cy="20"
                  rx="12"
                  ry="12"
                  stroke="#6B1B34"
                  strokeWidth="2.2"
                />
                <ellipse
                  cx="24"
                  cy="20"
                  rx="12"
                  ry="12"
                  stroke="#A26769"
                  strokeWidth="2.2"
                />
                <circle cx="20" cy="20" r="2.5" fill="#6B1B34" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="font-editorial text-[16px] leading-tight font-semibold tracking-tight text-stone-900 sm:text-lg">
                Make My Marriage
              </span>
              <span className="text-[9px] font-semibold tracking-[0.16em] text-stone-500 uppercase sm:text-[10px]">
                Wedding Workspace
              </span>
            </div>
          </div>

          {/* Right: Guest Profile & Invitation Indicator */}
          <div className="flex items-center gap-3.5">
            <span className="hidden text-xs font-semibold tracking-widest text-stone-500 uppercase sm:inline-block">
              PERSONAL INVITATION
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold tracking-wider text-white shadow-2xs ring-2 ring-stone-200">
              {guestInitial}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pb-20">
        {/* Couple Header Section */}
        <section className="mx-auto max-w-4xl px-4 pt-14 pb-10 text-center sm:pt-16 sm:pb-12">
          {/* Heart Icon Emblem */}
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-stone-300 bg-white shadow-2xs">
            <svg
              className="h-6 w-6 text-stone-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              viewBox="0 0 24 24"
            >
              <path
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Eyebrow & Recipient */}
          <p className="mb-2 text-xs font-semibold tracking-widest text-stone-500 uppercase">
            PERSONAL INVITATION
          </p>
          <p className="mb-4 text-sm font-medium text-stone-600">
            An invitation for {guest.name}
          </p>

          {/* Couple Title */}
          <h1 className="mb-5 font-serif text-5xl font-medium tracking-tight text-[#5C1629] sm:text-7xl lg:text-8xl">
            {wedding.brideName}{" "}
            <span className="mx-1 font-serif text-4xl font-light text-stone-400 italic sm:text-6xl lg:text-7xl">
              &amp;
            </span>{" "}
            {wedding.groomName}
          </h1>

          {/* Invitation Quote */}
          <p className="mx-auto max-w-2xl font-serif text-base leading-relaxed text-stone-600 italic sm:text-lg">
            “Together with our families, we would love for you to celebrate with
            us as we embark on this journey of love and union.”
          </p>

          {/* Date Indicator */}
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-stone-700">
            <svg
              className="h-4 w-4 text-stone-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{formattedWeddingDate}</span>
          </div>
        </section>

        {/* Hero Image Banner */}
        <section className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative h-[340px] w-full overflow-hidden rounded-2xl shadow-xl sm:h-[440px] md:rounded-3xl lg:h-[500px]">
            <Image
              src="/images/wedding.jpg"
              alt={`The Wedding of ${wedding.brideName} & ${wedding.groomName}`}
              fill
              priority
              className="object-cover object-center"
            />
            {/* Gradient Overlay for Typography Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

            {/* Banner Text Overlay */}
            <div className="absolute bottom-14 left-6 z-10 max-w-xl text-white sm:bottom-20 sm:left-12">
              <span className="mb-2 block text-xs font-semibold tracking-[0.25em] text-amber-200/95 uppercase">
                A CELEBRATION OF LOVE
              </span>
              <h2 className="font-serif text-3xl font-medium tracking-wide text-white drop-shadow sm:text-5xl">
                The Wedding of {wedding.brideName} &amp; {wedding.groomName}
              </h2>
            </div>
          </div>
        </section>

        {/* Floating RSVP Status Card */}
        <section className="relative z-20 mx-auto -mt-10 max-w-5xl px-4 sm:-mt-14 sm:px-6">
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-[0_16px_36px_-8px_rgba(38,18,26,0.08),0_4px_12px_-2px_rgba(38,18,26,0.04)] sm:p-9 md:flex-row md:items-center">
            {/* Left Status & Context */}
            <div className="space-y-2">
              {currentRsvp.status === "ATTENDING" ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#276738] uppercase">
                    <svg
                      className="h-4 w-4 text-[#276738]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>RSVP STATUS: CONFIRMED ATTENDING</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#5C1629] sm:text-3xl">
                    We look forward to celebrating with you!
                  </h3>
                  <p className="text-sm font-medium text-stone-700 sm:text-base">
                    {guest.name} • Attending: {currentRsvp.attendingCount}{" "}
                    {currentRsvp.attendingCount === 1 ? "person" : "people"}.
                  </p>
                </>
              ) : currentRsvp.status === "NOT_ATTENDING" ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-stone-600 uppercase">
                    <svg
                      className="h-4 w-4 text-stone-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M6 18L18 6M6 6l12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>RSVP STATUS: NOT ATTENDING</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#5C1629] sm:text-3xl">
                    We will miss you!
                  </h3>
                  <p className="text-sm font-medium text-stone-700 sm:text-base">
                    {guest.name} • Regretfully declined.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-stone-600 uppercase">
                    <svg
                      className="h-4 w-4 text-[#5C1629]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>RSVP STATUS: PENDING</span>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#5C1629] sm:text-3xl">
                    Will you be joining us?
                  </h3>
                  <p className="text-sm font-medium text-stone-700 sm:text-base">
                    Please let us know your attendance plans for you and your
                    family.
                  </p>
                </>
              )}

              <p className="pt-1 text-xs font-normal text-stone-400">
                Your response applies to your whole invitation. You can update
                it using this same link.
              </p>
            </div>

            {/* Right Action Button */}
            <div className="flex shrink-0 flex-col items-start justify-center gap-2 pt-2 md:items-end md:pt-0">
              {currentRsvp.status === "PENDING" ? (
                <button
                  type="button"
                  onClick={openModal}
                  className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg bg-[#5C1629] px-6 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#4A1020] active:scale-[0.99]"
                >
                  <span>Respond to invitation</span>
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openModal}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 shadow-2xs transition hover:border-[#5C1629] hover:text-[#5C1629] active:scale-[0.99]"
                >
                  <span>Update response</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
              <span className="text-xs font-medium text-stone-500">
                Reserved for up to {guest.maxGuests}{" "}
                {guest.maxGuests === 1 ? "person" : "people"}
              </span>
            </div>
          </div>
        </section>

        {/* Celebration Itinerary Section */}
        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="mb-2.5 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">
            YOUR PERSONAL SCHEDULE
          </p>
          <h2 className="mb-4 font-serif text-4xl font-bold text-[#5C1629] sm:text-5xl lg:text-[54px]">
            Celebration Itinerary
          </h2>
          <div className="mx-auto mb-6 h-0.5 w-20 rounded-full bg-[#C59B27]/70"></div>

          <div className="mb-3 inline-block rounded-lg bg-[#F3EDE4] px-4 py-2 text-xs font-semibold text-stone-700">
            All ceremony schedules are displayed in{" "}
            <span className="font-bold text-stone-900">
              {wedding.timeZone || "Asia/Kolkata"}
            </span>
          </div>
          <p className="mb-10 text-xs font-normal text-stone-500">
            Only ceremonies designated for {guest.name} are displayed below.
          </p>

          {/* List of Itinerary Cards */}
          {(() => {
            const timeZone = wedding.timeZone || "Asia/Kolkata";
            const uniqueEventDates = Array.from(
              new Set(
                events
                  .map((ev) => {
                    if (!ev.startsAt) return null;
                    try {
                      return new Date(ev.startsAt).toLocaleDateString("en-CA", {
                        timeZone,
                      });
                    } catch {
                      return null;
                    }
                  })
                  .filter((d): d is string => Boolean(d)),
              ),
            ).sort();

            if (events.length === 0) {
              return (
                <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-xs">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#faf1ec] text-[#5C1629]">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-stone-900">
                    Ceremonies to be announced
                  </h3>
                  <p className="mt-1.5 text-xs text-stone-500">
                    Ceremonies designated for {guest.name} will appear here once
                    finalized by the couple.
                  </p>
                </div>
              );
            }

            return (
              <div className="mx-auto grid max-w-4xl gap-5 text-left">
                {events.map((ev) => {
                  const badge = getEventDayBadge(
                    ev.startsAt,
                    uniqueEventDates,
                    ev.name,
                    ev.type,
                    timeZone,
                  );
                  const timing = formatEventTime(
                    ev.startsAt,
                    ev.endsAt,
                    timeZone,
                  );

                  const venueDisplay =
                    ev.venueName && ev.address
                      ? `${ev.venueName}, ${ev.address}`
                      : ev.venueName || ev.address || wedding.location;

                  return (
                    <article
                      key={ev.id}
                      className={`flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-[0_8px_24px_-6px_rgba(38,18,26,0.06)] sm:p-7 md:flex-row ${
                        badge.isMainEvent ? "border-l-4 border-l-[#5C1629]" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-block rounded px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${badge.pillClass}`}
                          >
                            {badge.dayLabel}
                          </span>
                          {badge.isMainEvent && (
                            <span className="inline-block rounded bg-[#5C1629] px-2 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase">
                              MAIN EVENT
                            </span>
                          )}
                          {currentRsvp.status === "ATTENDING" && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#E8F3EB] px-2.5 py-0.5 text-[11px] font-medium text-[#276738]">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  d="M5 13l4 4L19 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>
                                Attending • {currentRsvp.attendingCount}{" "}
                                {currentRsvp.attendingCount === 1
                                  ? "Guest"
                                  : "Guests"}
                              </span>
                            </span>
                          )}
                        </div>

                        <h4 className="font-serif text-2xl font-bold text-[#5C1629]">
                          {ev.name}
                        </h4>
                        <p className="mt-1 text-sm text-stone-600">
                          {venueDisplay}
                          {ev.dressCode ? ` • Dress code: ${ev.dressCode}` : ""}
                        </p>
                        {ev.description && (
                          <p className="mt-2 text-xs text-stone-500">
                            {ev.description}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 md:text-right">
                        <p className="text-sm font-semibold text-stone-900">
                          {timing.date}
                        </p>
                        <p className="text-xs text-stone-500">{timing.time}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })()}
        </section>
      </main>

      {/* Brand Footer */}
      <footer className="w-full border-t border-[#eee8e0] bg-white py-14 text-center select-none">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4">
          {/* Centered Website Logo */}
          <div className="mb-3 inline-flex items-center justify-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e8e2da] bg-[#faf1ec] shadow-2xs">
              <svg
                aria-hidden="true"
                className="h-6 w-6 shrink-0"
                fill="none"
                viewBox="0 0 40 40"
              >
                <ellipse
                  cx="16"
                  cy="20"
                  rx="12"
                  ry="12"
                  stroke="#6B1B34"
                  strokeWidth="2.2"
                />
                <ellipse
                  cx="24"
                  cy="20"
                  rx="12"
                  ry="12"
                  stroke="#A26769"
                  strokeWidth="2.2"
                />
                <circle cx="20" cy="20" r="2.5" fill="#6B1B34" />
              </svg>
            </span>
          </div>

          <p className="font-editorial text-sm font-semibold tracking-tight text-stone-900 sm:text-base">
            Make My Marriage
          </p>
          <p className="text-[9px] font-semibold tracking-[0.18em] text-stone-400 uppercase sm:text-[10px]">
            Wedding Workspace
          </p>
          <p className="mt-4 text-xs font-normal text-stone-500">
            A shared space for your celebration.
          </p>
          <p className="text-xs text-stone-400">
            Shared privately with you and your family.
          </p>
        </div>
      </footer>

      {/* Interactive Formal RSVP Modal Dialog (Matching Image 2 / Stitch Screen 017eda1d) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs"
        >
          {/* Backdrop Click Close */}
          <div
            className="fixed inset-0"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-[#EDE7DE] bg-white p-6 shadow-2xl transition-all sm:p-10">
            {/* Top Eyebrow and Recipient Pill */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <span className="block text-[11px] font-semibold tracking-[0.2em] text-[#9E8B7A] uppercase">
                  GUEST RESPONSE PORTAL
                </span>
                <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#5C1629] sm:text-4xl">
                  Formal RSVP
                </h2>
              </div>

              <div className="flex items-center gap-3 self-start">
                <div className="rounded-xl border border-[#F0E6DA] bg-[#FAF5F0] px-4 py-2.5 text-right">
                  <p className="text-[11px] font-medium text-[#8C7A6B]">
                    Private invitation for
                  </p>
                  <p className="text-sm font-semibold text-[#1F1915]">
                    {guest.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="cursor-pointer rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                  aria-label="Close modal"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitRsvp}>
              {/* Question */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#1C1917]">
                  Will {guest.name} be joining us?
                </p>
              </div>

              {/* Two Option Selection Cards */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Option A: Yes, joyfully accepting */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormStatus("ATTENDING")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setFormStatus("ATTENDING");
                  }}
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-5 transition-all select-none ${
                    formStatus === "ATTENDING"
                      ? "border-[#5C1629] bg-[#FFFDF9] shadow-[0_4px_16px_-2px_rgba(92,22,41,0.06)] ring-1 ring-[#5C1629]"
                      : "border-[#E7DFD5] bg-white hover:bg-stone-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white ${
                      formStatus === "ATTENDING"
                        ? "border-[#5C1629]"
                        : "border-[#C5BCB1]"
                    }`}
                  >
                    {formStatus === "ATTENDING" && (
                      <span className="h-2 w-2 rounded-full bg-[#5C1629]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs leading-snug font-semibold text-[#1C1917]">
                      Yes, joyfully accepting!
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#78716C]">
                      We&apos;re excited to celebrate with you.
                    </p>
                  </div>
                </div>

                {/* Option B: Regretfully declining */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormStatus("NOT_ATTENDING")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setFormStatus("NOT_ATTENDING");
                  }}
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-5 transition-all select-none ${
                    formStatus === "NOT_ATTENDING"
                      ? "border-[#5C1629] bg-[#FFFDF9] shadow-[0_4px_16px_-2px_rgba(92,22,41,0.06)] ring-1 ring-[#5C1629]"
                      : "border-[#E7DFD5] bg-white hover:bg-stone-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white ${
                      formStatus === "NOT_ATTENDING"
                        ? "border-[#5C1629]"
                        : "border-[#C5BCB1]"
                    }`}
                  >
                    {formStatus === "NOT_ATTENDING" && (
                      <span className="h-2 w-2 rounded-full bg-[#5C1629]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs leading-snug font-semibold text-[#1C1917]">
                      Regretfully declining
                    </h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#78716C]">
                      We will celebrate with you in spirit.
                    </p>
                  </div>
                </div>
              </div>

              {/* Headcount Selector (only when ATTENDING) */}
              {formStatus === "ATTENDING" && (
                <div className="mb-6">
                  <label className="mb-2.5 block text-xs font-semibold text-[#4A423D]">
                    How many guests will be attending?
                  </label>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    {Array.from(
                      { length: Math.max(1, guest.maxGuests) },
                      (_, i) => i + 1,
                    ).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormCount(num)}
                        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                          formCount === num
                            ? "border border-[#5C1629] bg-[#5C1629] text-white shadow-xs"
                            : "border border-[#E5DDD2] bg-white text-[#4A423D] hover:border-[#5C1629]"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] font-normal text-[#8C7A6B]">
                    Includes the named guest. Your invitation allows up to{" "}
                    {guest.maxGuests}{" "}
                    {guest.maxGuests === 1 ? "person" : "people"}.
                  </p>
                </div>
              )}

              {/* Notice Banner Box */}
              <div className="mb-6 rounded-xl border border-[#F2EADB] bg-[#F9F5EF] px-4 py-3.5">
                <p className="text-xs leading-relaxed text-[#6B5E52]">
                  Your response applies to your invitation. You can update it
                  later using this same link.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Footer Action Area */}
              <div className="flex flex-col-reverse justify-between gap-4 pt-1 sm:flex-row sm:items-center">
                <p className="text-xs font-normal text-[#8F857D]">
                  Shared privately with the wedding team.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="cursor-pointer rounded-lg border border-stone-200 bg-transparent px-4 py-2.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#5C1629] px-6 py-2.5 text-xs font-medium tracking-wide text-white shadow-sm transition hover:bg-[#4A1020] active:scale-[0.99] disabled:opacity-60"
                  >
                    <span>{isSubmitting ? "Sending..." : "Send RSVP"}</span>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
