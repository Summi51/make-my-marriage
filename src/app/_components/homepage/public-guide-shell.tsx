/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation unloads optional third-party help scripts before entering another page. */
import type { ReactNode } from "react";
import { BrandWordmark } from "./logo";

export function PublicGuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand-cream min-h-dvh text-[#34262c]">
      <header className="border-brand-border/70 bg-brand-cream/90 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="/" aria-label="Make My Marriage home">
            <BrandWordmark />
          </a>
          <nav
            aria-label="Guide navigation"
            className="flex items-center gap-5 text-sm font-medium text-gray-600 sm:gap-9 sm:text-[15px]"
          >
            <a
              href="/how-it-works"
              className="text-brand-wine py-3 font-semibold"
            >
              How it works
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
