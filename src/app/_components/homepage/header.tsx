"use client";

import { useRef, useState } from "react";
import { AvailabilityButton } from "./homepage-actions";

const links = [
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["Themes", "#themes"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="border-brand-border/70 bg-brand-cream/90 sticky top-0 z-40 border-b backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <a
          href="#top"
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
          aria-label="Main navigation"
          className="hidden items-center gap-9 text-[15px] font-medium text-gray-600 lg:flex"
        >
          {links.map(([label, href]) => (
            <a className="hover:text-brand-wine py-3" key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-6">
          <AvailabilityButton className="hover:text-brand-wine hidden py-3 text-[15px] font-medium text-gray-700 lg:block">
            Sign In
          </AvailabilityButton>
          <AvailabilityButton className="bg-brand-wine hover:bg-brand-wine-dark shadow-brand-wine/20 hidden rounded-xl px-5 py-2.5 text-[14.5px] font-medium text-white shadow-sm transition-colors sm:block">
            Start Planning
          </AvailabilityButton>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
            className="border-brand-border text-brand-wine flex size-11 items-center justify-center rounded-xl border lg:hidden"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              {open ? (
                <path d="m6 6 12 12M6 18 18 6" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!open}
        className="border-brand-border bg-brand-cream border-t px-6 py-4 lg:hidden"
      >
        {links.map(([label, href]) => (
          <a
            className="block py-3 text-sm font-medium text-gray-700"
            key={href}
            href={href}
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-5">
          <AvailabilityButton className="bg-brand-wine rounded-xl px-5 py-3 text-sm text-white">
            Start Planning
          </AvailabilityButton>
          <AvailabilityButton className="text-brand-wine px-3 py-3 text-sm">
            Sign In
          </AvailabilityButton>
        </div>
      </nav>
    </header>
  );
}
