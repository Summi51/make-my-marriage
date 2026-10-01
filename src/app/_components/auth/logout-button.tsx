"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AUTH_CHANNEL = "mmm-auth";

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
        className="bg-brand-wine mt-8 rounded-xl px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </>
  );
}
