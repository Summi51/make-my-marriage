import Link from "next/link";
import Image from "next/image";

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const zones: Record<string, string> = {
  "Asia/Kolkata": "India Standard Time (Asia/Kolkata)",
  "Asia/Karachi": "Pakistan Standard Time (Asia/Karachi)",
  "Asia/Dubai": "Gulf Standard Time (Asia/Dubai)",
  "Europe/London": "Greenwich Mean Time (Europe/London)",
  "America/New_York": "Eastern Time (America/New_York)",
};

interface MemberInfo {
  name: string;
  role: "ADMIN" | "MANAGER";
}

interface DashboardTaskItem {
  id: string;
  title: string;
  assignee: string;
  done: boolean;
  badgeText: string;
  badgeClass: string;
}

interface WeddingHomeProps {
  wedding: {
    id?: string;
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
  members?: MemberInfo[];
  eventCount?: number;
  taskProgress?: {
    total: number;
    completed: number;
    tasks: DashboardTaskItem[];
  };
  guestSummary?: {
    totalGuests: number;
    pendingInvitations: number;
    attendingInvitations: number;
    notAttendingInvitations: number;
    totalPeopleAttending: number;
  };
}

export function WeddingHome({
  wedding,
  members = [],
  eventCount = 0,
  taskProgress = { total: 0, completed: 0, tasks: [] },
  guestSummary = {
    totalGuests: 0,
    pendingInvitations: 0,
    attendingInvitations: 0,
    notAttendingInvitations: 0,
    totalPeopleAttending: 0,
  },
}: WeddingHomeProps) {
  const place =
    wedding.location.formattedAddress || "Dehradun, Uttarakhand, India";

  // Muslim celebrations matching media_1791484052560.png
  const celebrations = [
    {
      day: "01",
      title: "Mehndi & Dholki",
      time: "10:30 AM",
      venue: "Garden Courtyard",
      guests: "120 guests",
      isMain: false,
    },
    {
      day: "01",
      title: "Sangeet & Qawwali Night",
      time: "7:30 PM",
      venue: "Grand Ballroom",
      guests: "180 guests",
      isMain: false,
    },
    {
      day: "02",
      title: "Nikah Ceremony & Feast",
      time: "4:00 PM",
      venue: "Royal Pavilion & Lawn",
      guests: "240 guests",
      isMain: true,
    },
    {
      day: "03",
      title: "Walima Reception",
      time: "7:30 PM",
      venue: "Banquet Hall",
      guests: "300 guests",
      isMain: false,
    },
  ];

  // 6 Metric Cards matching media_1791493889939.png
  const summaryMetrics = [
    {
      title: "Wedding events",
      value: String(eventCount),
      subtext: "Celebrations in your itinerary",
      link: "/account/wedding/events",
      linkText: "View events →",
      isSample: false,
      icon: (
        <svg
          className="h-5 w-5 text-[#a67341]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      title: "Tasks completed",
      value: `${taskProgress.completed} / ${taskProgress.total}`,
      subtext: "One step closer to the big day",
      link: "/account/wedding/tasks",
      linkText: "View tasks →",
      isSample: false,
      icon: (
        <svg
          className="h-5 w-5 text-[#a67341]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="3"
            strokeWidth="1.8"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M8.5 12.5l2.5 2.5 5-5"
          />
        </svg>
      ),
    },
    {
      title: "Guest groups",
      value: String(guestSummary.totalGuests),
      subtext: `${guestSummary.totalPeopleAttending} attending across all celebrations`,
      link: "/account/wedding/guests",
      linkText: "View guests →",
      secondaryLink: "/account/wedding/guests/new",
      secondaryLinkText: "+ Add guest",
      isSample: false,
      soon: false,
      icon: (
        <svg
          className="h-5 w-5 text-[#a67341]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="9" cy="7" r="3" strokeWidth="1.8" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M16 8a2.5 2.5 0 010 5m2 6c0-2.5-1.8-4.6-4.2-5"
          />
        </svg>
      ),
    },
    {
      title: "RSVP responses",
      value: `${guestSummary.attendingInvitations + guestSummary.notAttendingInvitations} / ${guestSummary.totalGuests}`,
      subtext: `${guestSummary.attendingInvitations} attending • ${guestSummary.notAttendingInvitations} declined`,
      link: "/account/wedding/invitations",
      linkText: "View RSVP summary →",
      isSample: false,
      soon: false,
      icon: (
        <svg
          className="h-5 w-5 text-[#a67341]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.8" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M3 7l9 6 9-6"
          />
        </svg>
      ),
    },
    {
      title: "Total expenses",
      value: "₹12,45,000",
      subtext: "Across your wedding categories",
      link: "/account/wedding/expenses",
      linkText: "Coming soon →",
      isSample: true,
      soon: true,
      icon: (
        <svg
          className="h-5 w-5 text-[#a67341]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M6 4h10M6 8h10M6 12h5a3.5 3.5 0 000-7M6 12l7 8"
          />
        </svg>
      ),
    },
    {
      title: "Wedding vendors",
      value: "8",
      subtext: "The team behind your celebration",
      link: "/account/wedding/vendors",
      linkText: "Coming soon →",
      isSample: true,
      soon: true,
      icon: (
        <svg
          className="h-5 w-5 text-[#a67341]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M3 9l1-5h16l1 5M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 21v-6h6v6"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 p-3.5 sm:p-6 lg:p-8">
      {/* ── 1. Hero Card matching media_1791484052560.png ── */}
      <section className="min-w-0 rounded-2xl border border-[#e8e2da] bg-white p-4 shadow-2xs sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#8a7267] uppercase">
              YOUR CELEBRATION, BEAUTIFULLY ORGANISED
            </p>
            <h1 className="font-editorial mt-1 text-4xl font-medium tracking-tight text-[#1e1a1f] sm:text-5xl">
              {wedding.brideName} & {wedding.groomName}
            </h1>

            <div className="flex flex-col items-start gap-2 pt-3 text-sm text-[#71717a] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1.5 sm:text-xs">
              <span className="flex items-center gap-2 font-medium text-[#231f20]">
                <svg
                  className="h-4 w-4 text-[#5c1a33]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {formatDate(wedding.weddingDate)}
              </span>
              <span
                aria-hidden="true"
                className="hidden text-[#d8d0c7] sm:inline"
              >
                ·
              </span>
              <span className="flex min-w-0 items-start gap-2 text-[#54474b]">
                <svg
                  className="h-4 w-4 text-[#867276]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="min-w-0 break-words">{place}</span>
              </span>
              <span
                aria-hidden="true"
                className="hidden text-[#d8d0c7] sm:inline"
              >
                ·
              </span>
              <span className="flex min-w-0 items-start gap-2 text-[#54474b]">
                <svg
                  className="h-4 w-4 text-[#867276]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                <span className="min-w-0 break-words">
                  {zones[wedding.timeZone] ?? wedding.timeZone}
                </span>
              </span>
            </div>
          </div>

          <Link
            href="/account/wedding/edit"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-[#e8e2da] bg-[#faf8f5] px-3.5 py-2 text-xs font-semibold text-[#5c1a33] shadow-2xs transition hover:border-[#5c1a33]/30 hover:bg-[#f3ede8]"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            <span>Edit wedding details</span>
          </Link>
        </div>

        {/* Planning Together Bar */}
        <div className="mt-6 border-t border-[#f1ede8] pt-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-[10px] font-bold tracking-[0.16em] text-[#8a7267] uppercase">
                PLANNING TOGETHER
              </span>
              <div className="flex -space-x-1.5 overflow-hidden">
                <div
                  title={wedding.brideName}
                  className="font-editorial inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#5c1a33] text-[11px] font-semibold text-white shadow-2xs"
                >
                  {wedding.brideName.charAt(0).toUpperCase()}
                </div>
                <div
                  title={wedding.groomName}
                  className="font-editorial inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#8a2544] text-[11px] font-semibold text-white shadow-2xs"
                >
                  {wedding.groomName.charAt(0).toUpperCase()}
                </div>
                {members.length > 2 && (
                  <div
                    title={`${members.length - 2} more members`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#f1ede8] text-[10px] font-bold text-[#5c1a33]"
                  >
                    +{members.length - 2}
                  </div>
                )}
              </div>
              <span className="truncate text-xs font-medium text-[#54474b]">
                {wedding.brideName} & {wedding.groomName}
              </span>
            </div>

            <Link
              href="/account/wedding/members"
              className="group flex items-center gap-1 text-xs font-semibold text-[#5c1a33] transition hover:text-[#3e1121]"
            >
              <span>Manage wedding members</span>
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Information Banner matching media_1791484052560.png ── */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-[#ebe3da] bg-[#faf6f2] p-4 text-xs text-[#54474b]">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f3e5eb] text-xs text-[#5c1a33]">
          ✨
        </div>
        <div>
          <strong className="font-semibold text-[#1e1a1f]">
            Your workspace is taking shape
          </strong>
          <p className="mt-0.5 leading-relaxed text-[#71717a]">
            Task progress below comes from tasks you have saved. Other planning
            sections still show sample data until those features are connected.
          </p>
        </div>
      </div>

      {/* ── 3. Six Metric Cards matching media_1791493889939.png ── */}
      <section className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {summaryMetrics.map((metric, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-col justify-between rounded-2xl border border-[#ede6df] bg-white p-4 shadow-2xs transition hover:border-[#a67341]/40 sm:p-5"
          >
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-8 w-8 items-center justify-center">
                  {metric.icon}
                </div>
                {metric.isSample && (
                  <span className="text-[10px] font-medium tracking-wider text-[#8a7267] uppercase">
                    SAMPLE
                  </span>
                )}
              </div>
              <p className="mt-3 truncate text-xs font-medium text-[#71717a]">
                {metric.title}
              </p>
              <p className="font-editorial mt-1.5 truncate text-2xl font-bold tracking-tight text-[#1e1a1f] sm:text-3xl">
                {metric.value}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#8a7267]">
                {metric.subtext}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
              {metric.soon ? (
                <span
                  aria-disabled="true"
                  title="Coming soon"
                  className="inline-flex cursor-not-allowed items-center text-xs font-semibold text-[#a89ea1]"
                >
                  {metric.linkText}
                </span>
              ) : (
                <Link
                  href={metric.link}
                  className="inline-flex items-center text-xs font-semibold text-[#5c1a33] hover:underline"
                >
                  {metric.linkText}
                </Link>
              )}
              {!metric.soon &&
                metric.secondaryLink &&
                metric.secondaryLinkText && (
                  <Link
                    href={metric.secondaryLink}
                    className="inline-flex items-center text-xs font-semibold text-[#5c1a33] hover:underline"
                  >
                    {metric.secondaryLinkText}
                  </Link>
                )}
            </div>
          </div>
        ))}
      </section>

      {/* ── 4. Two-Column Main Content matching media_1791484052560.png ── */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Celebrations & Tasks */}
        <div className="min-w-0 space-y-6 lg:col-span-7">
          {/* Your Celebrations Card */}
          <section className="min-w-0 rounded-2xl border border-[#e8e2da] bg-white p-4 shadow-2xs sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f1ede8] pb-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.16em] text-[#8a7267] uppercase">
                  SAMPLE DATA · PREVIEW
                </span>
                <h2 className="font-editorial mt-0.5 text-2xl font-semibold text-[#1e1a1f]">
                  Your celebrations
                </h2>
                <p className="text-xs text-[#71717a]">
                  Every moment, with a place in your plans.
                </p>
              </div>
              <Link
                href="/account/wedding/events"
                className="text-xs font-semibold text-[#5c1a33] hover:underline"
              >
                Explore events →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {celebrations.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#f1ede8] bg-[#faf8f5]/60 p-3 transition hover:border-[#e8e2da] hover:bg-white sm:p-3.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
                    {/* Day badge box */}
                    <div
                      className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg font-serif sm:h-11 sm:w-11 ${
                        event.isMain
                          ? "bg-[#5c1a33] text-white shadow-2xs"
                          : "border border-[#e8e2da] bg-white text-[#5c1a33]"
                      }`}
                    >
                      <span className="text-[7.5px] font-bold tracking-widest uppercase sm:text-[8px]">
                        DAY
                      </span>
                      <span className="text-xs leading-none font-bold sm:text-sm">
                        {event.day}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="truncate text-xs font-semibold text-[#1e1a1f] sm:text-sm">
                          {event.title}
                        </h3>
                        {event.isMain && (
                          <span className="shrink-0 rounded-full bg-[#5c1a33] px-1.5 py-0.5 text-[8.5px] font-bold tracking-wider text-white uppercase">
                            MAIN EVENT
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#71717a] sm:text-xs">
                        <span className="flex shrink-0 items-center gap-1">
                          <svg
                            className="h-3.5 w-3.5 text-[#867276]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {event.time}
                        </span>
                        <span>·</span>
                        <span className="flex min-w-0 items-center gap-1 truncate">
                          <svg
                            className="h-3.5 w-3.5 shrink-0 text-[#867276]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                          </svg>
                          <span className="truncate">{event.venue}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full border border-[#e8e2da] bg-white px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-[#54474b] sm:px-2.5 sm:py-1 sm:text-xs">
                    {event.guests}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Tasks: A little closer to 'I do' Card */}
          <section className="min-w-0 rounded-2xl border border-[#e8e2da] bg-white p-4 shadow-2xs sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f1ede8] pb-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.16em] text-[#8a7267] uppercase">
                  {taskProgress.total === 0
                    ? "NO TASKS YET"
                    : `${taskProgress.completed} OF ${taskProgress.total} COMPLETE`}
                </span>
                <h2 className="font-editorial mt-0.5 text-2xl font-semibold text-[#1e1a1f]">
                  A little closer to &lsquo;I do&rsquo;
                </h2>
                <p className="text-xs text-[#71717a]">
                  {taskProgress.total === 0
                    ? "Saved tasks will appear here as you plan"
                    : "Your latest saved task progress"}
                </p>
              </div>
              <Link
                href="/account/wedding/tasks"
                className="text-xs font-semibold text-[#5c1a33] hover:underline"
              >
                Explore tasks →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {taskProgress.tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#e8e2da] bg-[#faf8f5]/60 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[#1e1a1f]">
                    No saved tasks yet
                  </p>
                  <p className="mt-1 text-xs text-[#71717a]">
                    Create a task and its progress will show here.
                  </p>
                  <Link
                    href="/account/wedding/tasks/new"
                    className="mt-4 inline-flex rounded-xl bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#51182d]"
                  >
                    Add a task
                  </Link>
                </div>
              ) : (
                taskProgress.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/account/wedding/tasks/${task.id}`}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-[#f1ede8] bg-[#faf8f5]/60 p-3 transition hover:border-[#e8e2da] hover:bg-white sm:p-3.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                      {task.done ? (
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#5c1a33] text-white">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-4 w-4 shrink-0 rounded-sm border border-[#d8d0c7] bg-white" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-xs font-medium ${task.done ? "text-[#867276] line-through" : "text-[#1e1a1f]"}`}
                        >
                          {task.title}
                        </p>
                        <p className="truncate text-[11px] text-[#71717a]">
                          {task.assignee}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${task.badgeClass}`}
                    >
                      {task.badgeText}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column (5 cols): RSVP Donut, Expenses, Quote Card */}
        <div className="min-w-0 space-y-6 lg:col-span-5">
          {/* Who's Celebrating? (RSVP responses) */}
          <section className="min-w-0 rounded-2xl border border-[#e8e2da] bg-white p-4 shadow-2xs sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f1ede8] pb-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.16em] text-[#8a7267] uppercase">
                  SAMPLE DATA · PREVIEW
                </span>
                <h2 className="font-editorial mt-0.5 text-xl font-semibold text-[#1e1a1f]">
                  Who&apos;s celebrating?
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#a89ea1]">
                Coming soon
              </span>
            </div>

            {/* Donut Visual + Legend */}
            <div className="mt-5 flex flex-col items-center justify-between gap-5 sm:flex-row sm:gap-6">
              {/* Donut Chart */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center sm:h-32 sm:w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 42 42">
                  {/* Background track */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#f1ede8"
                    strokeWidth="4"
                  />
                  {/* Attending (71%) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#5c1a33"
                    strokeWidth="4"
                    strokeDasharray="71 29"
                    strokeDashoffset="25"
                  />
                  {/* Declined (13%) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#e06b88"
                    strokeWidth="4"
                    strokeDasharray="13 87"
                    strokeDashoffset="-46"
                  />
                  {/* Awaiting (16%) */}
                  <circle
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke="#d6d0c7"
                    strokeWidth="4"
                    strokeDasharray="16 84"
                    strokeDashoffset="-59"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="font-editorial text-2xl leading-none font-bold text-[#1e1a1f]">
                    132
                  </span>
                  <p className="mt-0.5 text-[8px] font-bold tracking-wider text-[#867276] uppercase">
                    ATTENDING
                  </p>
                </div>
              </div>

              {/* Legend with exact numbers */}
              <div className="w-full min-w-0 flex-1 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5c1a33]" />
                    <span className="truncate font-medium text-[#54474b]">
                      Attending
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    132
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#e06b88]" />
                    <span className="truncate font-medium text-[#54474b]">
                      Declined
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    24
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d6d0c7]" />
                    <span className="truncate font-medium text-[#54474b]">
                      Awaiting
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    30
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Wedding Expenses Card */}
          <section className="min-w-0 rounded-2xl border border-[#e8e2da] bg-white p-4 shadow-2xs sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f1ede8] pb-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.16em] text-[#8a7267] uppercase">
                  SAMPLE DATA · PREVIEW
                </span>
                <h2 className="font-editorial mt-0.5 text-xl font-semibold text-[#1e1a1f]">
                  Wedding expenses
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#a89ea1]">
                Coming soon
              </span>
            </div>

            <div className="mt-4">
              <p className="font-editorial text-2xl font-bold tracking-tight text-[#1e1a1f] sm:text-3xl">
                ₹12,45,000
              </p>
              <p className="text-[11px] text-[#867276]">
                Estimated and logged across celebrations
              </p>

              {/* Category Breakdown */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#5c1a33]" />
                    <span className="truncate text-[#54474b]">
                      Venue & Courtyard
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    ₹5,00,000
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#8a2544]" />
                    <span className="truncate text-[#54474b]">
                      Decorations & Stage
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    ₹2,50,000
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#b45309]" />
                    <span className="truncate text-[#54474b]">
                      Photography & Films
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    ₹1,80,000
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#6d213c]" />
                    <span className="truncate text-[#54474b]">
                      Catering & Feast
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    ₹2,40,000
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#e06b88]" />
                    <span className="truncate text-[#54474b]">
                      Entertainment & Qawwali
                    </span>
                  </div>
                  <span className="shrink-0 font-semibold text-[#1e1a1f]">
                    ₹75,000
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* A Celebration Worth Remembering (Verse Card) */}
          <section className="min-w-0 rounded-2xl border border-[#e8e2da] bg-[#faf6f2] p-4 text-center shadow-2xs sm:p-6">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e2da] bg-white text-[#5c1a33]">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="font-editorial mt-3 text-base font-semibold text-[#1e1a1f]">
              A celebration worth remembering
            </h3>
            <p className="font-editorial mt-2 text-xs leading-relaxed text-[#54474b] italic sm:text-sm">
              &ldquo;And of His signs is that He created for you spouses from
              among yourselves, having put between you love and mercy.&rdquo;
            </p>
            <p className="mt-3.5 text-[9px] font-bold tracking-[0.2em] text-[#8a7267] uppercase">
              {wedding.brideName} &amp; {wedding.groomName} ·{" "}
              {formatDate(wedding.weddingDate)}
            </p>
          </section>
        </div>
      </div>

      {/* ── 5. Bottom Full-Width Section: Photo Highlights Preview ── */}
      <section className="min-w-0 rounded-2xl border border-[#e8e2da] bg-white p-4 shadow-2xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f1ede8] pb-4">
          <div>
            <span className="text-[10px] font-bold tracking-[0.16em] text-[#8a7267] uppercase">
              PHOTO HIGHLIGHTS · PREVIEW
            </span>
            <h2 className="font-editorial mt-0.5 text-2xl font-semibold text-[#1e1a1f]">
              Wedding moments & memories
            </h2>
            <p className="text-xs text-[#71717a]">
              Candid previews captured across Mehndi, Nikah & Walima
              celebrations
            </p>
          </div>
          <span className="text-xs font-semibold text-[#a89ea1]">
            Coming soon
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Photo Card 1: Nikah */}
          <div className="group relative overflow-hidden rounded-xl border border-[#e8e2da] bg-[#faf8f5]">
            <div className="relative h-48 w-full sm:h-56">
              <Image
                src="/images/wedding.jpg"
                alt="Nikah & Feast"
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
            </div>
            <div className="absolute top-3 left-3">
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold tracking-wider text-[#1e1a1f] uppercase shadow-xs backdrop-blur-xs">
                NIKAH & FEAST · ROYAL PAVILION
              </span>
            </div>
          </div>

          {/* Photo Card 2: Mehndi */}
          <div className="group relative overflow-hidden rounded-xl border border-[#e8e2da] bg-[#faf8f5]">
            <div className="relative h-48 w-full sm:h-56">
              <Image
                src="/images/mehndi.jpg"
                alt="Mehndi & Dholki"
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
            </div>
            <div className="absolute top-3 left-3">
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold tracking-wider text-[#1e1a1f] uppercase shadow-xs backdrop-blur-xs">
                MEHNDI & DHOLKI · COURTYARD
              </span>
            </div>
          </div>

          {/* Photo Card 3: Walima */}
          <div className="group relative overflow-hidden rounded-xl border border-[#e8e2da] bg-[#faf8f5] sm:col-span-2 md:col-span-1">
            <div className="relative h-48 w-full sm:h-56">
              <Image
                src="/images/wedding.jpg"
                alt="Walima Reception"
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
            </div>
            <div className="absolute top-3 left-3">
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold tracking-wider text-[#1e1a1f] uppercase shadow-xs backdrop-blur-xs">
                WALIMA RECEPTION · BANQUET
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
