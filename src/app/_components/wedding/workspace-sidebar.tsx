"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "../homepage/logo";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  adminOnly?: boolean;
  /** No route exists for this destination yet, so it is not clickable. */
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface WorkspaceSidebarProps {
  weddingTitle: string;
  role?: "ADMIN" | "MANAGER";
  userName?: string;
  currentUserId?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function WorkspaceSidebar({
  weddingTitle,
  role = "ADMIN",
  userName = "Wedding Planner",
  mobileOpen: controlledMobileOpen,
  onMobileClose,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen =
    controlledMobileOpen !== undefined
      ? controlledMobileOpen
      : internalMobileOpen;
  const setMobileOpen = (open: boolean) => {
    if (onMobileClose && !open) {
      onMobileClose();
    }
    setInternalMobileOpen(open);
  };

  const sections: NavSection[] = [
    {
      title: "PLANNING",
      items: [
        {
          name: "Events",
          href: "/account/wedding/events",
          icon: "calendar",
        },
        {
          name: "Tasks",
          href: "/account/wedding/tasks",
          icon: "tasks",
        },
      ],
    },
    {
      title: "GUESTS",
      items: [
        {
          name: "Guests",
          href: "/account/wedding/guests",
          icon: "guests",
        },
        {
          name: "Invitations & RSVP",
          href: "/account/wedding/invitations",
          icon: "mail",
        },
      ],
    },
    {
      title: "FINANCE & VENDORS",
      items: [
        {
          name: "Expenses",
          href: "/account/wedding/expenses",
          icon: "currency-rupee",
        },
        {
          name: "My Vendors",
          href: "/account/wedding/vendors",
          icon: "building-store",
        },
        {
          name: "Discover Vendors",
          href: "/account/wedding/vendors/discover",
          icon: "search",
        },
      ],
    },
    {
      title: "WEBSITE & MEDIA",
      items: [
        {
          name: "Wedding Website",
          href: "/account/wedding/website",
          icon: "globe",
          badge: "Soon",
          disabled: true,
        },
        {
          name: "Gallery",
          href: "/account/wedding/gallery",
          icon: "photo",
        },
        {
          name: "Guest QR",
          href: "/account/wedding/qr",
          icon: "qrcode",
          badge: "Soon",
          disabled: true,
        },
        {
          name: "Livestream",
          href: "/account/wedding/livestream",
          icon: "video-camera",
          badge: "Soon",
          disabled: true,
        },
      ],
    },
    {
      title: "SETTINGS",
      items: [
        {
          name: "Wedding Details",
          href: "/account/wedding/edit",
          icon: "adjustments",
        },
        ...(role === "ADMIN"
          ? [
              {
                name: "Wedding Members",
                href: "/account/wedding/members",
                icon: "user-group",
                adminOnly: true,
              },
            ]
          : []),
      ],
    },
  ];

  const isDashboardActive = pathname === "/account";

  const renderIcon = (icon: string) => {
    switch (icon) {
      case "dashboard":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect
              x="3.5"
              y="3.5"
              width="7"
              height="7"
              rx="1.75"
              strokeWidth="1.75"
            />
            <rect
              x="13.5"
              y="3.5"
              width="7"
              height="7"
              rx="1.75"
              strokeWidth="1.75"
            />
            <rect
              x="3.5"
              y="13.5"
              width="7"
              height="7"
              rx="1.75"
              strokeWidth="1.75"
            />
            <rect
              x="13.5"
              y="13.5"
              width="7"
              height="7"
              rx="1.75"
              strokeWidth="1.75"
            />
          </svg>
        );
      case "calendar":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="17"
              rx="2.5"
              strokeWidth="1.75"
            />
            <line
              x1="16"
              y1="2"
              x2="16"
              y2="6"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="2"
              x2="8"
              y2="6"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <line x1="3" y1="9.5" x2="21" y2="9.5" strokeWidth="1.75" />
          </svg>
        );
      case "tasks":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect
              x="3.5"
              y="3.5"
              width="17"
              height="17"
              rx="2.5"
              strokeWidth="1.75"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.9"
              d="M8.5 12l2.5 2.5 5-5"
            />
          </svg>
        );
      case "guests":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        );
      case "mail":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect
              x="3"
              y="4.5"
              width="18"
              height="15"
              rx="2"
              strokeWidth="1.75"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M3 7l9 6 9-6"
            />
          </svg>
        );
      case "currency-rupee":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M8.5 7h7m-7 4h5.5m-5.5 0a3.5 3.5 0 000 7h1l5 4"
            />
          </svg>
        );
      case "building-store":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M3 8l1.5-4.5h15L21 8M3 8a2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 003 0M3 8v11a2 2 0 002 2h14a2 2 0 002-2V8M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6"
            />
          </svg>
        );
      case "search":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" strokeWidth="1.75" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M20.5 20.5l-4.5-4.5"
            />
          </svg>
        );
      case "globe":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" strokeWidth="1.75" />
            <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1.75" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M12 3a14.5 14.5 0 014 9 14.5 14.5 0 01-4 9 14.5 14.5 0 01-4-9 14.5 14.5 0 014-9z"
            />
          </svg>
        );
      case "photo":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect
              x="3"
              y="3.5"
              width="18"
              height="17"
              rx="2.5"
              strokeWidth="1.75"
            />
            <circle cx="8" cy="8.5" r="1.5" strokeWidth="1.75" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M21 16l-5.5-5.5-8.5 8.5M14 17.5l2-2 5 5"
            />
          </svg>
        );
      case "qrcode":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect
              x="3.5"
              y="3.5"
              width="6.5"
              height="6.5"
              rx="1.5"
              strokeWidth="1.75"
            />
            <rect
              x="14"
              y="3.5"
              width="6.5"
              height="6.5"
              rx="1.5"
              strokeWidth="1.75"
            />
            <rect
              x="3.5"
              y="14"
              width="6.5"
              height="6.5"
              rx="1.5"
              strokeWidth="1.75"
            />
            <rect
              x="14"
              y="14"
              width="6.5"
              height="6.5"
              rx="1.5"
              strokeWidth="1.75"
            />
          </svg>
        );
      case "video-camera":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="9" strokeWidth="1.75" />
            <polygon
              points="10 8.5 16 12 10 15.5 10 8.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        );
      case "adjustments":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {/* 3 horizontal sliders matching media_1791490586863.png */}
            <line
              x1="3.5"
              y1="7"
              x2="20.5"
              y2="7"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle
              cx="9"
              cy="7"
              r="2.25"
              strokeWidth="1.75"
              fill="white"
              stroke="currentColor"
            />
            <line
              x1="3.5"
              y1="12"
              x2="20.5"
              y2="12"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle
              cx="15"
              cy="12"
              r="2.25"
              strokeWidth="1.75"
              fill="white"
              stroke="currentColor"
            />
            <line
              x1="3.5"
              y1="17"
              x2="20.5"
              y2="17"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle
              cx="10"
              cy="17"
              r="2.25"
              strokeWidth="1.75"
              fill="white"
              stroke="currentColor"
            />
          </svg>
        );
      case "user-group":
        return (
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
            />
            <circle cx="9" cy="7" r="4" strokeWidth="1.75" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
              d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between bg-white text-[#231f20]">
      {/* ── Brand Header matching atelier logo ── */}
      <div className="shrink-0 border-b border-[#f4ede7] px-5 py-4">
        <Link
          href="/"
          className="group flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
          aria-label="Go to your wedding homepage"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#faf1ec] transition group-hover:bg-[#5c1a33]/10">
            <Logo className="h-5 w-5 shrink-0 text-[#5c1a33]" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="font-editorial text-[16px] leading-tight font-semibold tracking-tight text-[#1e1a1f] transition group-hover:text-[#5c1a33]">
              Make My Marriage
            </span>
            <span className="text-[8.5px] font-bold tracking-[0.18em] text-[#a89fa1] uppercase">
              Wedding Workspace
            </span>
          </div>
        </Link>
      </div>

      {/* ── Nav Links matching media_1791490525544.png & media_1791490586863.png ── */}
      <div className="flex-1 space-y-4 px-3.5 py-4">
        {/* Primary Dashboard Link */}
        <div>
          <Link
            href="/account"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-colors duration-150 ${
              isDashboardActive
                ? "bg-[#4e1224] text-white shadow-sm"
                : "text-[#3a3034] hover:bg-[#faf7f4] hover:text-[#1e1a1f]"
            }`}
          >
            <span
              className={isDashboardActive ? "text-white" : "text-[#54484c]"}
            >
              {renderIcon("dashboard")}
            </span>
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Feature Sections */}
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-4 pt-0.5 pb-1 text-[10.5px] font-semibold tracking-[0.2em] text-[#b3a9ab] uppercase">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const matches =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const longerMatch = section.items.some(
                  (other) =>
                    other.href !== item.href &&
                    other.href.length > item.href.length &&
                    (pathname === other.href ||
                      pathname.startsWith(`${other.href}/`)),
                );
                const isActive = !item.disabled && matches && !longerMatch;
                const itemClass = `group flex items-center justify-between rounded-xl px-4 py-2 text-[13.5px] font-medium transition-colors duration-150 ${
                  item.disabled
                    ? "cursor-not-allowed text-[#a89ea1]"
                    : isActive
                      ? "bg-[#4e1224] font-semibold text-white shadow-sm"
                      : "text-[#3a3034] hover:bg-[#faf7f4] hover:text-[#1e1a1f]"
                }`;
                const content = (
                  <>
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span
                        className={`${
                          item.disabled
                            ? "text-[#c4babc]"
                            : isActive
                              ? "text-white"
                              : "text-[#54484c] group-hover:text-[#1e1a1f]"
                        }`}
                      >
                        {renderIcon(item.icon)}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge ? (
                      <span
                        className={`rounded-sm border px-2 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase ${
                          isActive
                            ? "border-white/30 bg-white/10 text-white"
                            : "border-[#e2dcd5] bg-[#f6f1ec] text-[#8a7f83]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                );
                if (item.disabled) {
                  return (
                    <span
                      key={item.name}
                      aria-disabled="true"
                      title="Coming soon"
                      className={itemClass}
                    >
                      {content}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={itemClass}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer tagline ── */}
      <div className="shrink-0 border-t border-[#f0edea] bg-white">
        <div className="flex items-start gap-3 px-5 py-3.5">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-[#9e9295]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <div className="text-[12.5px] leading-snug text-[#94878a]">
            <p>A little less planning.</p>
            <p>A lot more celebrating.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button (Visible only if not controlled by parent) */}
      {controlledMobileOpen === undefined && (
        <div className="sticky top-16 z-30 flex items-center justify-between border-b border-[#e8e2da] bg-white px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e8e2da] bg-white px-3 py-1.5 text-xs font-semibold text-[#231f20] hover:bg-[#faf7f4]"
            aria-label="Toggle workspace navigation"
          >
            <svg
              className="h-4 w-4 text-[#5c1a33]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
            <span>Workspace Menu</span>
          </button>
          <span className="max-w-[180px] truncate text-xs font-medium text-[#71717a]">
            {weddingTitle || userName}
          </span>
        </div>
      )}

      {/* Desktop Sidebar (fixed, non-scrolling, matching media_1791490525544.png & media_1791490586863.png) */}
      <aside className="hidden w-64 shrink-0 border-r border-[#ebe5df] bg-white select-none lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:flex-col lg:self-start">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white shadow-xl">
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#71717a] shadow hover:text-[#1e1a1f]"
              >
                ✕
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
}
