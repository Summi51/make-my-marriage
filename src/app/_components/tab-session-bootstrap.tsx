"use client";
import { useEffect } from "react";
import { currentTabId, TAB_QUERY } from "@/lib/tab-session";

// Public routes that are never tab-scoped. Rewriting their URL would add a
// stray ?tab= to a shareable link and force a second full document load, which
// shows up as the page rendering twice.
const TAB_FREE_PREFIXES = ["/invite/", "/w/"];

export function TabSessionBootstrap() {
  useEffect(() => {
    const id = currentTabId();
    const url = new URL(window.location.href);
    const tabFree = TAB_FREE_PREFIXES.some((prefix) =>
      window.location.pathname.startsWith(prefix),
    );
    if (!tabFree && id && url.searchParams.get(TAB_QUERY) !== id) {
      url.searchParams.set(TAB_QUERY, id);
      window.location.replace(url.href);
      return;
    }
    const followLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const element = event.target;
      if (!(element instanceof Element)) return;
      const link = element.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      )
        return;
      const next = new URL(link.href, window.location.href);
      if (
        next.origin !== window.location.origin ||
        (next.pathname === url.pathname &&
          next.search === url.search &&
          next.hash)
      )
        return;
      const nextTabFree = TAB_FREE_PREFIXES.some((prefix) =>
        next.pathname.startsWith(prefix),
      );
      if (!nextTabFree) next.searchParams.set(TAB_QUERY, id!);
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(next.href);
    };
    document.addEventListener("click", followLink, true);
    return () => document.removeEventListener("click", followLink, true);
  }, []);
  return null;
}
