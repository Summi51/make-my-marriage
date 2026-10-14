"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { tabFetch, tabPath } from "@/lib/tab-session";

interface LivestreamData {
  youtubeUrl: string | null;
  videoId: string | null;
  isEnabled: boolean;
}

export function LivestreamManagerClient({
  tabId,
  initial,
  websitePublished,
}: {
  tabId: string;
  initial: LivestreamData;
  websitePublished: boolean;
}) {
  const [url, setUrl] = useState(initial.youtubeUrl ?? "");
  const [enabled, setEnabled] = useState(initial.isEnabled);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = (next?: { youtubeUrl: string | null; isEnabled: boolean }) => {
    setMessage(null);
    const payload = next ?? {
      youtubeUrl: url.trim() ? url.trim() : null,
      isEnabled: enabled,
    };
    startTransition(async () => {
      try {
        const response = await tabFetch("/api/wedding/livestream", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          const text =
            typeof body?.error?.message === "string"
              ? body.error.message.trim()
              : "";
          throw new Error(text || "Could not save the livestream.");
        }
        const data = body.data as LivestreamData;
        setSaved(data);
        setUrl(data.youtubeUrl ?? "");
        setEnabled(data.isEnabled);
        setMessage({ type: "success", text: "Livestream settings saved." });
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not save the livestream.",
        });
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-[#865045] uppercase">
          Website & media
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[#2c1820]">
          Livestream
        </h1>
        <p className="mt-1.5 text-sm text-[#735d65]">
          Paste a YouTube Live or video link. The public wedding website shows
          the player only after you turn it on and publish the website.
        </p>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-2xl p-4 text-sm ${
            message.type === "success"
              ? "border border-[#cbe5cb] bg-[#f2faf2] text-[#1c641c]"
              : "border border-[#f8d7da] bg-[#fff3f4] text-[#b02a37]"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-[#2c1820]">
          YouTube link
          <input
            aria-label="YouTube link"
            value={url}
            disabled={isPending}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-2 w-full rounded-xl border border-[#e5d8d3] px-3 py-2 text-sm focus:border-[#6d213c] focus:outline-none"
          />
        </label>
        <p className="text-xs text-[#735d65]">
          Supported: youtube.com/watch, /live, /embed, or youtu.be links.
        </p>
        <label className="flex items-center gap-2 text-sm text-[#2c1820]">
          <input
            type="checkbox"
            checked={enabled}
            disabled={isPending}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Show this stream on the wedding website
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => save()}
            className="rounded-xl bg-[#6d213c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save livestream"}
          </button>
          <button
            type="button"
            disabled={isPending || (!saved.youtubeUrl && !url)}
            onClick={() => save({ youtubeUrl: null, isEnabled: false })}
            className="rounded-xl border border-[#e5d8d3] px-4 py-2 text-sm font-semibold text-[#865045] disabled:opacity-50"
          >
            Remove livestream
          </button>
          <Link
            href={tabPath("/account/wedding/website", tabId)}
            className="rounded-xl border border-[#e5d8d3] px-4 py-2 text-sm font-semibold text-[#6d213c]"
          >
            Wedding website
          </Link>
        </div>
        {!websitePublished && (
          <p className="text-xs text-amber-800">
            The wedding website is still a draft, so guests cannot see this
            stream yet.
          </p>
        )}
      </section>
    </div>
  );
}
