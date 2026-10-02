import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../homepage/logo";
import { LogoutButton } from "../auth/logout-button";

const roleLabels = { ADMIN: "Admin", MANAGER: "Manager" } as const;

export function WorkspaceChrome({
  children,
  member,
}: {
  children: ReactNode;
  member?: { name: string; role?: "ADMIN" | "MANAGER" };
}) {
  return (
    <div className="bg-brand-cream flex min-h-screen flex-col text-[#1e1a1f]">
      <header className="bg-brand-cream/95 border-b border-[#ebe5df]">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3"
            aria-label="Make My Marriage home"
          >
            <Logo className="h-8 w-8 shrink-0" />
            <span className="truncate text-[15px] leading-none font-bold tracking-tight">
              Make My Marriage
            </span>
            <span className="hidden rounded-full border border-[#e2dcd5] bg-[#f6f1ec] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#867276] uppercase sm:inline">
              Wedding Workspace
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {member ? (
              <p className="flex items-center gap-2 text-[13px] font-medium text-[#1e1a1f]">
                <span className="max-w-28 truncate sm:max-w-48">
                  {member.name}
                </span>
                {member.role ? (
                  <span className="rounded-full border border-[#e2dcd5] bg-[#f6f1ec] px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-[#6d213c] uppercase">
                    {roleLabels[member.role]}
                  </span>
                ) : null}
              </p>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[#ebe5df] px-5 py-6 text-[12px] text-[#867276] sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Make My Marriage. Celebrations
            orchestrated with care.
          </p>
          <div className="flex gap-5">
            <Link href="/" className="hover:text-[#6d213c]">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-[#6d213c]">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
