"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_CHANNEL } from "../homepage/session-actions";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event: MessageEvent<string>) => {
        if (event.data === "logout") router.replace("/login");
      };
    } catch {
      return;
    }
    return () => channel?.close();
  }, [router]);
  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok && response.status !== 401) throw new Error();
      try {
        const channel = new BroadcastChannel(AUTH_CHANNEL);
        channel.postMessage("logout");
        channel.close();
      } catch {
        // Older browsers still sign out in this tab.
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Couldn’t sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <button
        onClick={logout}
        disabled={pending}
        className="text-[13px] font-medium text-[#635559] underline-offset-4 hover:text-[#6d213c] hover:underline disabled:opacity-60"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </>
  );
}
