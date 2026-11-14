"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AvailabilityButton } from "./homepage-actions";
import { useHomepageSession } from "./homepage-session";
import { BrandWordmark } from "./logo";
import { homepageActions } from "./session-actions";

const links = [
  ["Features", "#features"],
  ["How it works", "/how-it-works"],
  ["Themes", "#themes"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const session = useHomepageSession();
  const menuButton = useRef<HTMLButtonElement>(null);
  const actions = homepageActions(session);
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
        <Link
          href={session === "signed-out" ? "#top" : actions.primary.href}
          aria-label={
            session === "signed-out"
              ? "Make My Marriage home"
              : actions.primary.label
          }
        >
          <BrandWordmark />
        </Link>
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
        <div className="flex items-center gap-2.5 sm:gap-6">
          {actions.secondary ? (
            <AvailabilityButton
              href={actions.secondary.href}
              className="hover:text-brand-wine hidden py-3 text-[15px] font-medium text-gray-700 lg:block"
            >
              {actions.secondary.label}
            </AvailabilityButton>
          ) : null}
          <AvailabilityButton
            href={actions.primary.href}
            className="bg-brand-wine hover:bg-brand-wine-dark shadow-brand-wine/20 inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-xs transition-colors sm:px-5 sm:py-2.5 sm:text-[14.5px] sm:font-medium"
          >
            {actions.primary.label}
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
          <AvailabilityButton
            href={actions.primary.href}
            className="bg-brand-wine rounded-xl px-5 py-3 text-sm text-white"
          >
            {actions.primary.label}
          </AvailabilityButton>
          {actions.secondary ? (
            <AvailabilityButton
              href={actions.secondary.href}
              className="text-brand-wine px-3 py-3 text-sm"
            >
              {actions.secondary.label}
            </AvailabilityButton>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
