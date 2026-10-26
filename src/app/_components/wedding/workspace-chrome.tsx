"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "../homepage/logo";
import { LogoutButton } from "../auth/logout-button";
import { MembershipRefresh } from "./membership-refresh";
import { WorkspaceSidebar } from "./workspace-sidebar";

const roleLabels = { ADMIN: "Admin", MANAGER: "Manager" } as const;

function daysUntil(value?: string) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  const wedding = Date.UTC(year, month - 1, day);
  const today = new Date();
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.round((wedding - start) / 86_400_000);
}

export function WorkspaceChrome({
  children,
  member,
  weddingTitle,
  weddingDate,
}: {
  children: ReactNode;
  member?: { name: string; role?: "ADMIN" | "MANAGER" };
  weddingTitle?: string;
  weddingDate?: string;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const daysRemaining = daysUntil(weddingDate);
  const countdownLabel =
    daysRemaining !== null
      ? daysRemaining > 1
        ? `${daysRemaining} days to go`
        : daysRemaining === 1
          ? "1 day to go"
          : daysRemaining === 0
            ? "Today"
            : "Celebrated"
      : "42 days to go";

  const breadcrumbName =
    pathname === "/account"
      ? "Dashboard"
      : pathname.startsWith("/account/wedding/edit")
        ? "Wedding Details"
        : pathname.startsWith("/account/wedding/members")
          ? "Wedding Members"
          : pathname.startsWith("/account/wedding/events")
            ? "Events"
            : pathname.startsWith("/account/wedding/tasks")
              ? "Tasks"
              : pathname.startsWith("/account/wedding/guests")
                ? "Guests"
                : pathname.startsWith("/account/wedding/invitations")
                  ? "Invitations & RSVP"
                  : pathname.startsWith("/account/wedding/expenses")
                    ? "Expenses"
                    : pathname.startsWith("/account/wedding/vendors")
                      ? "Vendors"
                      : pathname.startsWith("/account/wedding/gallery")
                        ? "Gallery"
                        : pathname.startsWith("/account/wedding/website")
                          ? "Wedding Website"
                          : pathname.startsWith("/account/wedding/livestream")
                            ? "Livestream"
                            : "Workspace";

  // When no wedding is set up yet (Initial setup screen)
  if (!weddingTitle) {
    return (
      <div className="flex min-h-screen flex-col bg-[#faf8f5] text-[#231f20]">
        <MembershipRefresh />
        <header className="sticky top-0 z-40 border-b border-[#e8e2da] bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1.5 px-3 sm:gap-4 sm:px-6 lg:px-8">
            <Link
              href="/account"
              className="group flex min-w-0 shrink items-center space-x-1.5 sm:space-x-3"
              aria-label="Make My Marriage home"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e8e2da] bg-[#f7f3ee] text-[#5c1a33] sm:h-9 sm:w-9">
                <Logo className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="font-editorial max-w-[120px] truncate text-sm leading-none font-semibold tracking-wide text-[#231f20] transition group-hover:text-[#5c1a33] min-[400px]:max-w-none sm:text-lg">
                  Make My Marriage
                </span>
                <span className="mt-0.5 hidden text-[9px] font-semibold tracking-[0.2em] text-[#a1a1aa] uppercase sm:block">
                  Wedding Atelier
                </span>
              </div>
            </Link>
            <div className="flex shrink-0 items-center space-x-2 text-xs sm:space-x-4">
              {member && (
                <span className="font-medium text-[#3f3f46]">
                  {member.name}
                </span>
              )}
              <LogoutButton hideIcon label="Sign out" />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Dedicated Workspace Layout matching media_1791484052560.png
  return (
    <div className="flex min-h-screen bg-[#faf8f5] text-[#231f20]">
      <MembershipRefresh />

      {/* Left Workspace Sidebar (Fixed to viewport) */}
      <WorkspaceSidebar
        weddingTitle={weddingTitle}
        role={member?.role}
        userName={member?.name}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar matching media_1791484052560.png */}
        <header className="sticky top-0 z-40 border-b border-[#e8e2da] bg-white">
          <div className="flex h-16 items-center justify-between gap-2 px-3 sm:gap-3.5 sm:px-6 lg:px-8">
            {/* Left: Breadcrumbs + Mobile menu button */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e8e2da] text-[#5c1a33] hover:bg-[#faf8f5] lg:hidden"
                aria-label="Open workspace menu"
              >
                <svg
                  className="h-5 w-5"
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
              </button>

              <div className="flex min-w-0 items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <span className="hidden font-normal text-[#71717a] sm:inline">
                  Workspace
                </span>
                <span className="hidden text-[#d8d0c7] sm:inline">/</span>
                <span className="truncate font-semibold text-[#1e1a1f]">
                  {breadcrumbName}
                </span>
              </div>
            </div>

            {/* Right: Countdown badge, Edit button, User & Sign out */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              {/* Countdown badge */}
              <div className="rounded-full border border-[#f2d8e0] bg-[#fffafb] px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap text-[#5c1a33] shadow-2xs sm:px-3 sm:py-1 sm:text-xs">
                {countdownLabel}
              </div>

              {/* User name & role badge (visible from sm breakpoint) */}
              {member && (
                <div className="hidden items-center gap-1 text-xs sm:flex">
                  <span className="max-w-[100px] truncate font-medium text-[#231f20]">
                    {member.name}
                  </span>
                  {member.role && (
                    <span className="rounded border border-[#e8e2da] bg-[#f7f3ee] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#71717a] uppercase">
                      {roleLabels[member.role] || member.role}
                    </span>
                  )}
                </div>
              )}

              <div
                aria-hidden="true"
                className="hidden h-3.5 w-px bg-[#e8e2da] sm:block"
              />

              {/* Sign out link */}
              <LogoutButton
                hideIcon
                label="Sign out"
                className="text-xs font-medium whitespace-nowrap text-[#71717a] transition hover:text-[#1e1a1f]"
              />
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>

        {/* Footer */}
        <footer className="mt-auto border-t border-[#e8e2da]/60 bg-[#faf8f5] py-5 text-[11px] text-[#a1a1aa]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex items-center space-x-1.5">
              <span className="font-editorial text-sm font-semibold text-[#71717a]">
                Make My Marriage
              </span>
              <span>— Dedicated Wedding Workspace</span>
            </div>
            <div>
              <span>Made for your celebration · Confidential team access</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
