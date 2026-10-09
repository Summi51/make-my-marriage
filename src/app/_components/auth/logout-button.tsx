"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AUTH_CHANNEL } from "../homepage/session-actions";
import { tabFetch, tabPath } from "@/lib/tab-session";

export function LogoutButton({
  className = "flex items-center space-x-1 font-medium text-[#71717a] transition hover:text-[#6d213c] disabled:opacity-60",
  hideIcon = false,
  label,
}: {
  className?: string;
  hideIcon?: boolean;
  label?: string;
} = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await tabFetch("/api/auth/logout", {
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
      router.replace(tabPath("/login"));
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
        className={className}
        type="button"
      >
        <span className="text-xs">
          {pending ? "Signing out…" : label || "Sign out"}
        </span>
        {!pending && !hideIcon && (
          <svg
            className="ml-0.5 h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </>
  );
}
