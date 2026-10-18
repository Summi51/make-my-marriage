/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation unloads optional third-party help scripts before entering another page. */
import type { ReactNode } from "react";

export function PublicGuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand-cream min-h-dvh text-[#34262c]">
      <header className="border-brand-border/70 bg-brand-cream/90 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a
            href="/"
            className="flex shrink-0 items-center gap-2 sm:gap-3"
            aria-label="Make My Marriage home"
          >
            <svg
              aria-hidden="true"
              width="32"
              height="32"
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
            <span className="flex flex-col">
              <span className="text-sm leading-none font-bold tracking-tight text-gray-900 sm:text-lg">
                Make My Marriage
              </span>
              <span className="mt-1 text-[9px] font-semibold tracking-wider text-gray-500 uppercase sm:text-[11px]">
                Wedding Workspace
              </span>
            </span>
          </a>
          <nav
            aria-label="Guide navigation"
            className="flex items-center gap-5 text-sm font-medium text-gray-600 sm:gap-9 sm:text-[15px]"
          >
            <a href="/how-it-works" className="hover:text-brand-wine py-3">
              How it works
            </a>
            <a href="/help" className="text-brand-wine py-3 font-semibold">
              Help & FAQs
            </a>
            <a
              href="/account"
              className="bg-brand-wine hover:bg-brand-wine-dark hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white sm:inline-flex"
            >
              Your workspace
            </a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-brand-border border-t px-5 py-8 text-center text-sm text-gray-600">
        Make My Marriage · Less coordinating. More celebrating.
        <a
          href="/"
          className="text-brand-wine mt-3 block font-semibold hover:underline"
        >
          Back to home
        </a>
      </footer>
    </div>
  );
}
