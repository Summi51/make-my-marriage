import Link from "next/link";
import type { ReactNode } from "react";
import { tabPath } from "@/lib/tab-session";
import { Logo } from "../homepage/logo";
import { LogoutButton } from "../auth/logout-button";
import { MembershipRefresh } from "./membership-refresh";

const roleLabels = { ADMIN: "Admin", MANAGER: "Manager" } as const;

export function WorkspaceChrome({
  children,
  member,
}: {
  children: ReactNode;
  member?: { name: string; role?: "ADMIN" | "MANAGER" };
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f5] text-[#231f20]">
      <MembershipRefresh />
      <header className="sticky top-0 z-40 border-b border-[#e8e2da] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1.5 px-3 sm:gap-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="group flex min-w-0 shrink items-center space-x-1.5 sm:space-x-3"
            aria-label="Make My Marriage home"
          >
            {/* Atelier Monogram Emblem */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e8e2da] bg-[#f7f3ee] text-[#6d213c] sm:h-9 sm:w-9">
              <Logo className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-editorial max-w-[120px] truncate text-sm leading-none font-semibold tracking-wide text-[#231f20] transition group-hover:text-[#6d213c] min-[400px]:max-w-none sm:text-lg">
                Make My Marriage
              </span>
              <span className="mt-0.5 hidden text-[9px] font-semibold tracking-[0.2em] text-[#a1a1aa] uppercase sm:block">
                Wedding Atelier
              </span>
            </div>
          </Link>

          {/* User context & Sign out */}
          <div className="flex shrink-0 items-center space-x-1.5 text-xs sm:space-x-4">
            {member?.role === "ADMIN" && (
              <Link
                href={tabPath("/account/wedding/members")}
                className="text-[11px] font-medium whitespace-nowrap text-[#71717a] transition hover:text-[#6d213c] sm:text-xs"
              >
                <span className="inline sm:hidden">Members</span>
                <span className="hidden sm:inline">Wedding members</span>
              </Link>
            )}
            {member ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="hidden max-w-[120px] truncate font-medium text-[#3f3f46] md:inline-block">
                  {member.name}
                </span>
                {member.role ? (
                  <span className="rounded border border-[#e8e2da] bg-[#f1ede8] px-1.5 py-0.5 text-[9px] font-semibold tracking-wider whitespace-nowrap text-[#71717a] uppercase sm:text-[10px]">
                    {roleLabels[member.role]}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div aria-hidden="true" className="h-3.5 w-px bg-[#e8e2da]" />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-[#e8e2da]/60 bg-[#faf8f5] py-6 text-[11px] text-[#a1a1aa]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
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
  );
}
