import Link from "next/link";
import { tabPath } from "@/lib/tab-session";

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysUntil(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const wedding = Date.UTC(year, month - 1, day);
  const today = new Date();
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.round((wedding - start) / 86_400_000);
}

const zones: Record<string, string> = {
  "Asia/Kolkata": "India Standard Time · IST (UTC+05:30)",
  "Asia/Karachi": "Pakistan Standard Time · PKT (UTC+05:00)",
  "Asia/Dubai": "Gulf Standard Time · GST (UTC+04:00)",
  "Europe/London": "London · GMT/BST",
  "America/New_York": "Eastern Time · ET",
};

export function WeddingHome({
  wedding,
  role,
}: {
  wedding: {
    brideName: string;
    groomName: string;
    title: string | null;
    description: string | null;
    weddingDate: string;
    timeZone: string;
    location: { formattedAddress?: string };
    website: { slug: string };
  };
  role?: "ADMIN" | "MANAGER";
}) {
  const remaining = daysUntil(wedding.weddingDate);
  const when =
    remaining > 1
      ? `Upcoming in ${remaining} days`
      : remaining === 1
        ? "Upcoming tomorrow"
        : remaining === 0
          ? "Today"
          : "The celebration date has passed";
  const place = wedding.location.formattedAddress || "Location not added yet";
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 text-center sm:px-8 sm:py-16">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[#9a435e] uppercase">
        Your wedding is ready
      </p>
      <p className="font-editorial mt-6 text-xl text-[#6d213c]">
        The Nikah & Wedding of
      </p>
      <h1 className="font-editorial mt-1 text-5xl leading-tight text-[#1e1a1f] sm:text-6xl">
        {wedding.brideName} & {wedding.groomName}
      </h1>
      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#635559]">
        <span>{formatDate(wedding.weddingDate)}</span>
        <span aria-hidden="true">·</span>
        <span>{when}</span>
      </p>
      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
        <article className="rounded-2xl border border-[#ebe5df] bg-white p-5">
          <p className="text-[11px] font-semibold tracking-widest text-[#867276] uppercase">
            Wedding city / location
          </p>
          <p className="mt-2 text-[15px] font-semibold">{place}</p>
          {wedding.description && (
            <p className="mt-2 text-sm leading-6 text-[#635559]">
              {wedding.description}
            </p>
          )}
        </article>
        <article className="rounded-2xl border border-[#ebe5df] bg-white p-5">
          <p className="text-[11px] font-semibold tracking-widest text-[#867276] uppercase">
            Time zone
          </p>
          <p className="mt-2 text-[15px] font-semibold">{wedding.timeZone}</p>
          <p className="mt-2 text-sm text-[#635559]">
            {zones[wedding.timeZone] ??
              "Used for this wedding’s dates and times."}
          </p>
        </article>
      </div>
      {wedding.title && (
        <p className="mt-4 rounded-2xl border border-[#ebe5df] bg-[#f6f1ec] px-5 py-4 text-left text-sm leading-6 text-[#635559]">
          <span className="font-semibold text-[#6d213c]">Wedding title. </span>
          {wedding.title}
        </p>
      )}
      <p className="mt-8 text-[13px] text-[#867276]">
        Wedding address{" "}
        <span className="font-medium text-[#1e1a1f]">
          {wedding.website.slug}
        </span>
        . It updates when names or the date change.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={tabPath("/account/wedding/edit")}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#5c1a33] px-5 text-[15px] font-medium text-white hover:bg-[#4a1529]"
        >
          Edit wedding
        </Link>
        {role === "ADMIN" && (
          <Link
            href={tabPath("/account/wedding/members")}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d8d0c7] bg-white px-5 text-[15px] font-medium text-[#5c1a33] hover:bg-[#f6f1ec]"
          >
            Wedding members
          </Link>
        )}
      </div>
      <p className="mt-3 text-[13px] text-[#867276]">
        Events and guests come next.
      </p>
    </div>
  );
}
