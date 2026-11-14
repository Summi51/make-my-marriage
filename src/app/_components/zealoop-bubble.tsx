"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

type ZealoopHost = Window & {
  zealoop?: { publicKey: string; apiUrl: string };
  Zealoop?: ((...args: unknown[]) => void) & { q: unknown[][] };
};

// These pages put a private token in the URL. The widget reports the current
// page, so it must not load there.
const PRIVATE_LINK_PREFIXES = ["/invite/", "/gallery/", "/member-invitations/"];

export function isPrivateLinkPath(pathname: string) {
  return PRIVATE_LINK_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
  );
}

export function ZealoopBubble({ publicKey }: { publicKey: string }) {
  const pathname = usePathname() ?? "/";
  const hidden = isPrivateLinkPath(pathname);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!publicKey || hidden) return;
    const host = window as ZealoopHost;
    host.zealoop = { publicKey, apiUrl: "https://api.zealoop.com" };
    if (!host.Zealoop) {
      const queue = Object.assign(
        (...args: unknown[]) => {
          queue.q.push(args);
        },
        { q: [] as unknown[][] },
      );
      host.Zealoop = queue;
    }
    host.Zealoop("boot");
    return () => {
      host.Zealoop?.("shutdown");
    };
  }, [publicKey, hidden, ready]);

  if (!publicKey || hidden) return null;

  return (
    <Script
      src="https://api.zealoop.com/widget.js"
      strategy="afterInteractive"
      onLoad={() => setReady(true)}
    />
  );
}
