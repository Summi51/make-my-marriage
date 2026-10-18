"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatSchedule,
  zonedDateTime,
  dateInputValue,
} from "@/modules/events/format";

interface PublicEvent {
  id: string;
  name: string;
  type: string | null;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  description: string | null;
  dressCode: string | null;
}

interface PublicWeddingData {
  brideName: string;
  groomName: string;
  title: string | null;
  description: string | null;
  weddingDate: string;
  timeZone: string;
  location: {
    formattedAddress: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  coverImageUrl: string | null;
  theme: string;
  welcomeMessage: string | null;
  events: PublicEvent[];
  gallery: {
    enabled: boolean;
  };
  livestream: {
    enabled: boolean;
    youtubeUrl: string | null;
    videoId?: string | null;
  };
}

interface PublicWebsiteClientProps {
  wedding: PublicWeddingData;
  isEmbedPreview?: boolean;
  previewDevice?: "desktop" | "mobile";
  isDraftPreview?: boolean;
  tabId?: string;
}

function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname;
    if (host === "youtu.be" || host === "www.youtu.be") {
      return parsed.pathname.match(/^\/([\w-]{11})\/?$/)?.[1] ?? null;
    }
    if (
      host !== "youtube.com" &&
      host !== "www.youtube.com" &&
      host !== "m.youtube.com"
    ) {
      return null;
    }
    const fromPath = parsed.pathname.match(
      /^\/(?:embed|live|shorts|v)\/([\w-]{11})\/?$/,
    );
    if (fromPath) return fromPath[1];
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function PublicWebsiteClient({
  wedding,
  isEmbedPreview = false,
  previewDevice = "desktop",
  isDraftPreview = false,
  tabId,
}: PublicWebsiteClientProps) {
  const theme = wedding.theme || "CLASSIC";
  const isMobile = isEmbedPreview && previewDevice === "mobile";

  // Client-only countdown timer to prevent hydration mismatches
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
    isToday: boolean;
  } | null>(null);

  useEffect(() => {
    function calculateTime() {
      const target = zonedDateTime(
        wedding.weddingDate,
        "00:00",
        wedding.timeZone,
      )?.getTime();
      if (target === undefined) return;
      const now = new Date().getTime();
      const diff = target - now;
      const today = dateInputValue(
        new Date(now).toISOString(),
        wedding.timeZone,
      );

      if (today > wedding.weddingDate) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          isToday: false,
        });
        return;
      }

      if (today === wedding.weddingDate) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: false,
          isToday: true,
        });
        return;
      }

      const safeDiff = Math.max(diff, 0);
      const days = Math.floor(safeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (safeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((safeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((safeDiff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isPast: false,
        isToday: false,
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [wedding.weddingDate, wedding.timeZone]);

  const locationText =
    wedding.location?.formattedAddress || wedding.location?.city || "";

  const youtubeId =
    wedding.livestream?.videoId ||
    extractYouTubeId(wedding.livestream?.youtubeUrl ?? null);

  // Formatting date for display
  const formattedDate = (() => {
    try {
      const [year, month, day] = wedding.weddingDate.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return wedding.weddingDate;
    }
  })();

  return (
    <div
      className={`min-h-screen selection:bg-[#6d213c]/15 selection:text-[#6d213c] ${
        theme === "CLASSIC"
          ? "bg-[#FAF8F5] text-[#252126]"
          : theme === "MINIMAL"
            ? "bg-[#FFFFFF] text-[#1E1E1E]"
            : "bg-[#FFF8F6] text-[#252126]"
      }`}
    >
      {/* Draft Preview Bar for Wedding Workspace Members */}
      {isDraftPreview && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 uppercase">
              Draft Preview
            </span>
            <span>
              This wedding website is unpublished and visible only to wedding
              members.
            </span>
          </div>
          <Link
            href={`/account/wedding/website${tabId ? `?tab=${encodeURIComponent(tabId)}` : ""}`}
            className="font-semibold text-[#6d213c] underline hover:text-[#521427]"
          >
            Studio &amp; Publish →
          </Link>
        </div>
      )}

      {/* Top Navigation Bar (Hidden or Compact in Embed Mobile) */}
      <header
        className={`w-full border-b transition-colors ${
          theme === "CLASSIC"
            ? "border-[#E8E2DC]/60 bg-[#FAF8F5]/90 backdrop-blur-sm"
            : theme === "MINIMAL"
              ? "border-gray-100 bg-white/90 backdrop-blur-sm"
              : "border-[#f4e2dc] bg-[#FFF8F6]/90 backdrop-blur-sm"
        }`}
      >
        <div
          className={`mx-auto flex items-center justify-between px-4 sm:px-6 ${
            isMobile ? "h-12" : "h-16 max-w-5xl"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`shrink-0 ${isMobile ? "h-4 w-4" : "h-5 w-5"} ${
                theme === "CLASSIC"
                  ? "text-[#6D213C]"
                  : theme === "MINIMAL"
                    ? "text-[#1A1A1A]"
                    : "text-[#8A2846]"
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <circle cx="9" cy="12" r="5" strokeLinecap="round" />
              <circle cx="15" cy="12" r="5" strokeLinecap="round" />
            </svg>
            <span
              className={`font-serif font-semibold tracking-tight ${
                isMobile ? "text-xs" : "text-base"
              } ${
                theme === "CLASSIC"
                  ? "text-[#6D213C]"
                  : theme === "MINIMAL"
                    ? "text-[#1A1A1A]"
                    : "text-[#8A2846]"
              }`}
            >
              Make My Marriage
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#schedule"
              className={`font-medium text-gray-600 transition-colors hover:text-[#6D213C] ${
                isMobile ? "text-[11px]" : "text-xs"
              }`}
            >
              Itinerary
            </a>
            {wedding.livestream?.enabled && youtubeId && (
              <a
                href="#livestream"
                className={`font-medium text-gray-600 transition-colors hover:text-[#6D213C] ${
                  isMobile ? "text-[11px]" : "text-xs"
                }`}
              >
                Livestream
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Editorial Canvas */}
      <div
        className={`mx-auto wrap-break-word ${
          isMobile
            ? "max-w-sm px-4 py-8"
            : isEmbedPreview
              ? "max-w-3xl px-6 py-10"
              : "max-w-4xl px-5 py-12 sm:px-6 sm:py-16"
        }`}
      >
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center">
          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-full bg-white shadow-xs ${
              isMobile ? "mb-4 px-3 py-1" : "mb-6 px-4 py-1.5"
            }`}
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span
              className={`font-semibold tracking-wider uppercase ${
                isMobile ? "text-[10px]" : "text-xs"
              } ${
                theme === "CLASSIC"
                  ? "text-[#6D213C]"
                  : theme === "MINIMAL"
                    ? "text-[#1A1A1A]"
                    : "text-[#8A2846]"
              }`}
            >
              Wedding Celebration
            </span>
          </div>

          {/* Mughal Arch Motif for Classic Theme */}
          {theme === "CLASSIC" && (
            <div
              className={`text-[#6D213C] opacity-85 ${
                isMobile ? "mb-2.5" : "mb-4"
              }`}
            >
              <svg
                className={isMobile ? "h-11 w-11" : "h-16 w-16"}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                viewBox="0 0 64 64"
                aria-hidden="true"
              >
                <circle
                  cx="32"
                  cy="6"
                  r="2"
                  fill="currentColor"
                  stroke="none"
                />
                <path d="M32 8v5" strokeLinecap="round" />
                <path d="M26 13h12" strokeLinecap="round" />
                <path
                  d="M32 13c-7 4-11 9-11 15v31h22V28c0-6-4-11-11-15z"
                  strokeLinecap="round"
                />
                <path
                  d="M24 59V30c0-3.5 2-6.5 4.5-8.5 1.5-1.2 2.7-2.5 3.5-3.5 0.8 1 2 2.3 3.5 3.5 2.5 2 4.5 5 4.5 8.5v29"
                  strokeLinecap="round"
                  strokeDasharray="2 2"
                />
                <polygon
                  points="32,32 33.5,35 37,35 34,37.5 35.5,41 32,39 28.5,41 30,37.5 27,35 30.5,35"
                  fill="currentColor"
                  stroke="none"
                />
                <line x1="17" y1="59" x2="47" y2="59" strokeLinecap="round" />
                <line x1="14" y1="62" x2="50" y2="62" strokeLinecap="round" />
              </svg>
            </div>
          )}

          {/* Eyebrow */}
          <p
            className={`font-serif tracking-wide italic ${
              isMobile ? "mb-1 text-sm" : "mb-1.5 text-lg"
            } ${
              theme === "CLASSIC"
                ? "text-[#865045]"
                : theme === "MINIMAL"
                  ? "text-[#737373]"
                  : "font-medium text-[#B3541E]"
            }`}
          >
            The Wedding &amp; Celebrations of
          </p>

          {/* Couple Names */}
          <h1
            className={`font-serif font-bold tracking-tight ${
              isMobile
                ? "text-2xl sm:text-3xl"
                : isEmbedPreview
                  ? "text-3xl sm:text-4xl"
                  : "text-4xl sm:text-6xl"
            } ${
              theme === "CLASSIC"
                ? "text-[#6D213C]"
                : theme === "MINIMAL"
                  ? "text-[#1A1A1A]"
                  : "text-[#8A2846]"
            }`}
          >
            {wedding.brideName} &amp; {wedding.groomName}
          </h1>

          {wedding.title &&
            wedding.title !== `${wedding.brideName} & ${wedding.groomName}` && (
              <p
                className={`mt-1.5 font-medium text-gray-600 ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
              >
                {wedding.title}
              </p>
            )}

          {/* Metadata Chips */}
          <div
            className={`flex flex-wrap items-center justify-center gap-2 ${
              isMobile ? "mt-4" : "mt-6 sm:gap-3"
            }`}
          >
            {/* Date Chip */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full bg-white font-medium text-gray-800 shadow-xs ${
                isMobile ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
              }`}
            >
              <span className="text-[#6D213C]">🗓</span>
              <span>{formattedDate}</span>
            </div>

            {locationText && (
              <div
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full bg-white font-medium text-gray-800 shadow-xs ${
                  isMobile ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
                }`}
              >
                <span className="text-[#6D213C]">📍</span>
                <span className="truncate">{locationText}</span>
              </div>
            )}

            {/* Countdown Chip */}
            {timeLeft && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-full bg-white font-medium text-gray-800 shadow-xs ${
                  isMobile ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
                }`}
              >
                <span>⏳</span>
                <span>
                  {timeLeft.isPast
                    ? "Happily Married"
                    : timeLeft.isToday
                      ? "Today is the Big Day!"
                      : `${timeLeft.days} days to go`}
                </span>
              </div>
            )}
          </div>

          {/* Detailed Live Countdown Banner */}
          {timeLeft && !timeLeft.isPast && !timeLeft.isToday && (
            <div
              className={`grid grid-cols-4 gap-2 ${
                isMobile ? "mt-5 w-full" : "mt-8 gap-3 sm:gap-4"
              }`}
            >
              <div
                className={`rounded-2xl border border-black/5 bg-white text-center shadow-xs ${
                  isMobile ? "p-2" : "p-3 sm:p-4"
                }`}
              >
                <span
                  className={`block font-serif font-bold text-[#6D213C] ${
                    isMobile ? "text-lg" : "text-2xl sm:text-3xl"
                  }`}
                >
                  {timeLeft.days}
                </span>
                <span
                  className={`tracking-wider text-gray-500 uppercase ${
                    isMobile ? "text-[9px]" : "text-[10px] sm:text-xs"
                  }`}
                >
                  Days
                </span>
              </div>
              <div
                className={`rounded-2xl border border-black/5 bg-white text-center shadow-xs ${
                  isMobile ? "p-2" : "p-3 sm:p-4"
                }`}
              >
                <span
                  className={`block font-serif font-bold text-[#6D213C] ${
                    isMobile ? "text-lg" : "text-2xl sm:text-3xl"
                  }`}
                >
                  {timeLeft.hours}
                </span>
                <span
                  className={`tracking-wider text-gray-500 uppercase ${
                    isMobile ? "text-[9px]" : "text-[10px] sm:text-xs"
                  }`}
                >
                  Hours
                </span>
              </div>
              <div
                className={`rounded-2xl border border-black/5 bg-white text-center shadow-xs ${
                  isMobile ? "p-2" : "p-3 sm:p-4"
                }`}
              >
                <span
                  className={`block font-serif font-bold text-[#6D213C] ${
                    isMobile ? "text-lg" : "text-2xl sm:text-3xl"
                  }`}
                >
                  {timeLeft.minutes}
                </span>
                <span
                  className={`tracking-wider text-gray-500 uppercase ${
                    isMobile ? "text-[9px]" : "text-[10px] sm:text-xs"
                  }`}
                >
                  Mins
                </span>
              </div>
              <div
                className={`rounded-2xl border border-black/5 bg-white text-center shadow-xs ${
                  isMobile ? "p-2" : "p-3 sm:p-4"
                }`}
              >
                <span
                  className={`block font-serif font-bold text-[#6D213C] ${
                    isMobile ? "text-lg" : "text-2xl sm:text-3xl"
                  }`}
                >
                  {timeLeft.seconds}
                </span>
                <span
                  className={`tracking-wider text-gray-500 uppercase ${
                    isMobile ? "text-[9px]" : "text-[10px] sm:text-xs"
                  }`}
                >
                  Secs
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ornamental Divider for Classic */}
        {theme === "CLASSIC" && (
          <div
            className={`flex items-center justify-center ${
              isMobile ? "my-6" : "my-10"
            }`}
          >
            <div className="h-px flex-1 bg-[#E8E2DC]" />
            <div className="mx-3.5 flex items-center gap-1.5 text-[#6D213C] opacity-40">
              <span className="h-1.5 w-1.5 rotate-45 bg-current" />
              <span className="h-2.5 w-2.5 rotate-45 border border-current" />
              <span className="h-1.5 w-1.5 rotate-45 bg-current" />
            </div>
            <div className="h-px flex-1 bg-[#E8E2DC]" />
          </div>
        )}

        {/* Welcome Message Card */}
        {wedding.welcomeMessage && (
          <div
            className={`rounded-2xl border border-black/5 bg-white shadow-sm ${
              isMobile ? "my-6 p-4" : "my-8 p-6 sm:p-8"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`flex shrink-0 items-center justify-center rounded-xl ${
                  isMobile ? "h-8 w-8 text-base" : "h-10 w-10 text-xl"
                } ${
                  theme === "CLASSIC"
                    ? "bg-[#FAF5F7] text-[#6D213C]"
                    : theme === "MINIMAL"
                      ? "bg-gray-100 text-[#1A1A1A]"
                      : "bg-[#FFF0ED] text-[#8A2846]"
                }`}
              >
                <span>💌</span>
              </div>
              <div className="space-y-1.5">
                <span
                  className={`font-semibold tracking-wider uppercase ${
                    isMobile ? "text-[10px]" : "text-xs"
                  } ${
                    theme === "CLASSIC"
                      ? "text-[#6D213C]"
                      : theme === "MINIMAL"
                        ? "text-[#1A1A1A]"
                        : "text-[#8A2846]"
                  }`}
                >
                  A Message from {wedding.brideName} &amp; {wedding.groomName}
                </span>
                <p
                  className={`font-serif leading-relaxed text-gray-700 italic ${
                    isMobile ? "text-xs" : "text-base sm:text-lg"
                  }`}
                >
                  “{wedding.welcomeMessage}”
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Livestream Section */}
        {wedding.livestream?.enabled && youtubeId && (
          <section
            id="livestream"
            className={`scroll-mt-20 ${isMobile ? "my-8" : "my-12"}`}
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 shadow-xs">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                  Live Ceremony Broadcast
                </div>
                <h2
                  className={`mt-2 font-serif font-bold text-gray-900 ${
                    isMobile ? "text-xl" : "text-3xl"
                  }`}
                >
                  Watch Sacred Celebrations Online
                </h2>
                <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                  Join our wedding celebrations remotely from anywhere across
                  the globe.
                </p>
              </div>

              <a
                href={`https://www.youtube.com/watch?v=${youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 hover:text-[#6d213c] ${
                  isMobile ? "text-[11px]" : "text-xs"
                }`}
              >
                <span>Cast or Watch on YouTube</span>
                <span>↗</span>
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/10 bg-black shadow-2xl ring-1 ring-black/5">
              <div className="relative aspect-video w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
                  title="Wedding Livestream Broadcast"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-gray-500 italic">
              Sending heartfelt warmth and love to our family and friends tuning
              in from afar. ❤️
            </p>
          </section>
        )}

        {/* Celebrations Schedule & Itinerary */}
        <section
          id="schedule"
          className={`scroll-mt-20 ${isMobile ? "my-8" : "my-12"}`}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <span
              className={`font-semibold tracking-widest uppercase ${
                isMobile ? "text-[10px]" : "text-xs"
              } ${
                theme === "CLASSIC"
                  ? "text-[#865045]"
                  : theme === "MINIMAL"
                    ? "text-[#737373]"
                    : "text-[#B3541E]"
              }`}
            >
              Order of Celebrations
            </span>
            <h2
              className={`mt-1 font-serif font-bold tracking-tight text-gray-900 ${
                isMobile ? "text-2xl" : "text-3xl sm:text-4xl"
              }`}
            >
              Wedding Itinerary
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              All timings are in {wedding.timeZone}.
            </p>
          </div>

          {wedding.events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              Celebration events and timings will be announced soon.
            </div>
          ) : (
            <div className="space-y-4">
              {wedding.events.map((event, index) => {
                const mapsQuery = [
                  event.venueName,
                  event.address,
                  wedding.location.formattedAddress,
                ]
                  .filter(Boolean)
                  .join(", ");
                const mapsUrl = mapsQuery
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
                  : null;

                return (
                  <div
                    key={event.id}
                    className={`overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all hover:shadow-md ${
                      isMobile ? "p-4" : "p-6 sm:p-7"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`flex items-center justify-center rounded-full font-bold ${
                              isMobile
                                ? "h-5 w-5 text-[10px]"
                                : "h-6 w-6 text-xs"
                            } ${
                              theme === "CLASSIC"
                                ? "bg-[#FAF5F7] text-[#6D213C]"
                                : theme === "MINIMAL"
                                  ? "bg-gray-100 text-black"
                                  : "bg-[#FFF0ED] text-[#8A2846]"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <h3
                            className={`font-serif font-bold text-gray-900 ${
                              isMobile ? "text-lg" : "text-xl"
                            }`}
                          >
                            {event.name}
                          </h3>
                          {event.dressCode && (
                            <span
                              className={`rounded-full bg-rose-50 font-semibold text-[#6D213C] ${
                                isMobile
                                  ? "px-2 py-0.5 text-[10px]"
                                  : "px-2.5 py-0.5 text-xs"
                              }`}
                            >
                              👗 {event.dressCode}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-medium text-gray-600">
                          ⏰{" "}
                          {formatSchedule(
                            event.startsAt,
                            event.endsAt,
                            wedding.timeZone,
                          )}
                        </p>

                        {(event.venueName || event.address) && (
                          <div className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                            <span className="shrink-0">📍</span>
                            <span>
                              {event.venueName && (
                                <strong className="font-semibold text-gray-700">
                                  {event.venueName} ·{" "}
                                </strong>
                              )}
                              {event.address}
                            </span>
                          </div>
                        )}

                        {event.description && (
                          <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {mapsUrl && (
                        <div className="shrink-0 pt-1">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#6D213C] shadow-2xs hover:bg-[#FAF5F7]"
                          >
                            <span>🗺️ View on Maps</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Photo Gallery & Candid Drop Section */}
        {wedding.gallery.enabled && (
          <section
            className={`rounded-2xl border border-[#e5d8d3] bg-white shadow-sm ${
              isMobile ? "my-8 p-5" : "my-12 p-6 sm:p-8"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold tracking-wider text-[#865045] uppercase">
                  Private Wedding Album
                </span>
                <h3
                  className={`font-serif font-bold text-gray-900 ${
                    isMobile ? "text-xl" : "text-2xl"
                  }`}
                >
                  Memories, shared privately
                </h3>
                <p className="text-xs leading-relaxed text-gray-600">
                  Wedding photos are private. Please contact the couple for
                  access to shared memories.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* RSVP Invitation Prompt */}
        <section
          className={`rounded-2xl text-center text-white shadow-md ${
            isMobile ? "my-8 p-6" : "my-12 p-8 sm:p-10"
          } ${
            theme === "MINIMAL"
              ? "bg-[#1A1A1A]"
              : theme === "MODERN"
                ? "bg-linear-to-br from-[#8A2846] to-[#c47a62]"
                : "bg-linear-to-br from-[#6D213C] to-[#865045]"
          }`}
        >
          <h3
            className={`font-serif font-bold ${
              isMobile ? "text-xl" : "text-2xl sm:text-3xl"
            }`}
          >
            Celebrating with Us?
          </h3>
          <p
            className={`mx-auto mt-2 max-w-lg leading-relaxed text-rose-100 ${
              isMobile ? "text-xs" : "text-xs sm:text-sm"
            }`}
          >
            If you received a personal invitation link, you can submit your
            formal RSVP and view your custom events itinerary directly.
          </p>
          <div className="mt-4 text-xs text-rose-100/90">
            Please use the personal invitation sent to you to respond.
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-black/5 py-8 text-center text-xs text-gray-500">
        <p className="font-serif italic">
          Celebrations orchestrated with care · Make My Marriage
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          © {wedding.weddingDate.slice(0, 4)} {wedding.brideName} &amp;{" "}
          {wedding.groomName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
