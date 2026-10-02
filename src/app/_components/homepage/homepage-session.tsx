"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AUTH_CHANNEL,
  sessionFromMembership,
  type HomepageSession,
} from "./session-actions";

const HomepageSessionContext = createContext<HomepageSession>("signed-out");

export function HomepageSessionProvider({
  initial,
  children,
}: {
  initial: HomepageSession;
  children: ReactNode;
}) {
  const [session, setSession] = useState(initial);
  useEffect(() => {
    let ignore = false;
    async function refresh() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (ignore) return;
        if (!response.ok) {
          setSession("signed-out");
          return;
        }
        const result = (await response.json()) as {
          data?: { wedding?: unknown };
        };
        setSession(sessionFromMembership(Boolean(result.data?.wedding)));
      } catch {
        if (!ignore) setSession("signed-out");
      }
    }
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = () => {
        void refresh();
      };
    } catch {
      channel = undefined;
    }
    return () => {
      ignore = true;
      channel?.close();
    };
  }, []);
  return (
    <HomepageSessionContext.Provider value={session}>
      {children}
    </HomepageSessionContext.Provider>
  );
}

export function useHomepageSession() {
  return useContext(HomepageSessionContext);
}
