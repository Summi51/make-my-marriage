"use client";

import { useState, useTransition, useId, useEffect } from "react";
import { useSyncExternalStore } from "react";
const subscribeOrigin = () => () => {};
const readOrigin = () => window.location.origin;
const serverOrigin = () => "";
import Link from "next/link";
import { tabFetch, tabPath } from "@/lib/tab-session";
import { youtubeVideoId } from "@/modules/wedding/schemas";
import { qrSvg } from "@/lib/qr";

interface LivestreamData {
  youtubeUrl: string | null;
  videoId: string | null;
  isEnabled: boolean;
}

interface LivestreamManagerClientProps {
  tabId: string;
  initial: LivestreamData;
  websitePublished: boolean;
  websiteSlug: string;
  weddingTitle: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
}

export function LivestreamManagerClient({
  tabId,
  initial,
  websitePublished,
  websiteSlug,
  weddingTitle,
  brideName,
  groomName,
  weddingDate,
}: LivestreamManagerClientProps) {
  const [url, setUrl] = useState(initial.youtubeUrl ?? "");
  const [enabled, setEnabled] = useState(initial.isEnabled);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const urlInputId = useId();
  const origin = useSyncExternalStore(
    subscribeOrigin,
    readOrigin,
    serverOrigin,
  );

  useEffect(() => {
    if (!showQrModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowQrModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showQrModal]);

  // Realtime validation
  const trimmedUrl = url.trim();
  const detectedVideoId = trimmedUrl ? youtubeVideoId(trimmedUrl) : null;
  const isUrlValid = trimmedUrl === "" || detectedVideoId !== null;
  const currentVideoId =
    trimmedUrl === "" || trimmedUrl === (saved.youtubeUrl ?? "")
      ? (saved.videoId ?? detectedVideoId)
      : detectedVideoId;

  // Stream status logic
  const isBroadcastingLive =
    saved.isEnabled && Boolean(saved.videoId) && websitePublished;
  const isStreamReadyDraft =
    saved.isEnabled && Boolean(saved.videoId) && !websitePublished;
  const isStreamPaused = Boolean(saved.videoId) && !saved.isEnabled;
  const isUnconfigured = !saved.videoId && !saved.youtubeUrl;

  const publicStreamUrl = `${origin}/w/${websiteSlug}#livestream`;

  const absoluteStreamUrl =
    origin === ""
      ? publicStreamUrl
      : new URL(`/w/${websiteSlug}#livestream`, origin).href;

  const copyPublicStreamLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(absoluteStreamUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2400);
      }
    } catch {
      // Fallback
    }
  };

  const openWhatsAppInvite = () => {
    const text = `✨ Join our Wedding Celebration Live! ✨\n\nDear loved ones, you are warmly invited to watch our wedding ceremonies live online. We'd love to share our sacred moments with you wherever you are!\n\n🔴 Watch the live broadcast here:\n${absoluteStreamUrl}\n\nWith love,\n${brideName} & ${groomName}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const save = (next?: { youtubeUrl: string | null; isEnabled: boolean }) => {
    setMessage(null);
    const targetUrl = next ? next.youtubeUrl : trimmedUrl ? trimmedUrl : null;
    const targetEnabled = next ? next.isEnabled : enabled;

    if (targetEnabled && !targetUrl) {
      setMessage({
        type: "error",
        text: "Please enter a valid YouTube link before enabling the broadcast.",
      });
      return;
    }

    if (targetUrl && !youtubeVideoId(targetUrl)) {
      setMessage({
        type: "error",
        text: "Please enter a supported YouTube watch, live, embed, or youtu.be link.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await tabFetch("/api/wedding/livestream", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            youtubeUrl: targetUrl,
            isEnabled: targetEnabled,
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          const text =
            typeof body?.error?.message === "string"
              ? body.error.message.trim()
              : "";
          throw new Error(text || "Could not save the livestream settings.");
        }
        const data = body.data as LivestreamData;
        setSaved(data);
        setUrl(data.youtubeUrl ?? "");
        setEnabled(data.isEnabled);
        setMessage({
          type: "success",
          text: data.youtubeUrl
            ? data.isEnabled
              ? "Livestream broadcast saved and activated!"
              : "Livestream link saved (currently paused)."
            : "Livestream removed successfully.",
        });
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

  // QR SVG generation
  let qrCodeSvg = "";
  if (showQrModal) {
    try {
      qrCodeSvg = qrSvg(absoluteStreamUrl);
    } catch {
      qrCodeSvg = "";
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header & Status Section */}
      <div className="flex flex-col gap-4 border-b border-[#e5d8d3] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-widest text-[#865045] uppercase">
              Website & Media
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-medium text-gray-500">
              {weddingTitle}
            </span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#2c1820] sm:text-4xl">
            Livestream Studio
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#735d65]">
            Broadcast your sacred vows and celebrations live to loved ones
            anywhere in the world. Seamlessly embed your YouTube Live feed onto
            your official wedding website.
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-end">
          {isBroadcastingLive && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
              </span>
              <span>Live on Wedding Website</span>
            </div>
          )}
          {isStreamReadyDraft && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 shadow-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Configured · Website in Draft</span>
            </div>
          )}
          {isStreamPaused && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              <span>Broadcast Paused</span>
            </div>
          )}
          {isUnconfigured && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e5d8d3] bg-[#faf6f5] px-3.5 py-1.5 text-xs font-medium text-[#735d65] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#baa6a0]" />
              <span>No Stream Configured</span>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm shadow-xs transition-all ${
            message.type === "success"
              ? "border border-[#cbe5cb] bg-[#f2faf2] text-[#1c641c]"
              : "border border-[#f8d7da] bg-[#fff3f4] text-[#b02a37]"
          }`}
        >
          <span className="mt-0.5 text-base">
            {message.type === "success" ? "✓" : "⚠️"}
          </span>
          <div className="flex-1">
            <p className="font-medium">{message.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Stream Configuration & Sharing */}
        <div className="space-y-6 lg:col-span-6">
          {/* Card 1: Broadcast Feed Link & Toggles */}
          <section className="space-y-6 rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#2c1820]">
                  Broadcast Stream Details
                </h2>
                <p className="mt-0.5 text-xs text-[#735d65]">
                  Connect your YouTube Live or pre-recorded ceremony stream.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            </div>

            {/* Input field */}
            <div className="space-y-2">
              <label
                htmlFor={urlInputId}
                className="block text-xs font-semibold tracking-wider text-[#6d213c] uppercase"
              >
                YouTube URL
              </label>
              <div className="relative">
                <input
                  id={urlInputId}
                  aria-label="YouTube Live link"
                  value={url}
                  disabled={isPending}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                  className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm transition-colors focus:outline-none ${
                    !isUrlValid
                      ? "border-red-300 bg-red-50/30 focus:border-red-500"
                      : "border-[#e5d8d3] bg-white focus:border-[#6d213c]"
                  }`}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl("")}
                    disabled={isPending}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Clear input"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dynamic validation feedback */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                {detectedVideoId ? (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <span className="text-sm font-bold">✓</span> YouTube Video
                    ID:{" "}
                    <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] text-emerald-900">
                      {detectedVideoId}
                    </code>
                  </span>
                ) : /studio\.youtube\.com/i.test(trimmedUrl) ? (
                  <span className="font-medium text-red-600">
                    This is the YouTube Studio dashboard, not the guest link.
                    Open the stream, click Share, and paste the
                    youtube.com/watch, youtube.com/live, or youtu.be address.
                  </span>
                ) : trimmedUrl ? (
                  <span className="font-medium text-red-600">
                    Unrecognized YouTube format. Use a youtube.com/watch,
                    youtube.com/live, or youtu.be link.
                  </span>
                ) : (
                  <span className="text-gray-400">
                    Paste the Share link from your stream, not the Studio page
                  </span>
                )}
              </div>

              {/* Quick Format Reference Pills */}
              <div className="rounded-xl border border-gray-100 bg-[#fbf9f8] p-3 text-xs text-[#735d65]">
                <p className="font-semibold text-gray-700">
                  Supported formats:
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px] text-gray-600">
                  <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5">
                    youtube.com/watch?v=...
                  </span>
                  <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5">
                    youtu.be/...
                  </span>
                  <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5">
                    youtube.com/live/...
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle switch for broadcast visibility */}
            <div className="rounded-xl border border-[#e5d8d3] bg-[#faf6f5] p-4">
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-[#2c1820]">
                    Broadcast on Wedding Website
                  </span>
                  <p className="text-xs text-[#735d65]">
                    When activated, guests visiting your wedding website can
                    watch the livestream directly in the embedded video player.
                  </p>
                </div>
                <div className="relative mt-1 inline-flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={isPending}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-[#6d213c] peer-focus:ring-2 peer-focus:ring-[#6d213c]/30 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                </div>
              </label>

              {saved.youtubeUrl && !saved.isEnabled && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span>⚠️</span>
                  <span>
                    A YouTube link is saved, but the public player stays hidden
                    until <strong>Broadcast on Wedding Website</strong> is on
                    and you click <strong>Save Livestream</strong>.
                  </span>
                </div>
              )}
              {!websitePublished && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span>ℹ️</span>
                  <span>
                    Your wedding website is currently in <strong>Draft</strong>{" "}
                    mode. Guests will see this broadcast once you publish the
                    site.
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 border-t border-[#e5d8d3] pt-4">
              <button
                type="button"
                disabled={isPending || (!trimmedUrl && enabled)}
                onClick={() => save()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6d213c] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#581a30] disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Livestream</span>
                )}
              </button>

              <button
                type="button"
                disabled={isPending || (!saved.youtubeUrl && !url)}
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to remove the livestream link?",
                    )
                  ) {
                    save({ youtubeUrl: null, isEnabled: false });
                  }
                }}
                className="rounded-xl border border-[#e5d8d3] bg-white px-4 py-2.5 text-sm font-semibold text-[#865045] hover:bg-gray-50 disabled:opacity-50"
              >
                Remove Stream
              </button>

              <Link
                href={tabPath("/account/wedding/website", tabId)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-[#e5d8d3] bg-white px-4 py-2.5 text-sm font-semibold text-[#6d213c] hover:bg-[#faf6f5]"
              >
                <span>Wedding Website</span>
                <span className="text-xs">↗</span>
              </Link>
            </div>
          </section>

          {/* Card 2: Remote Guest Invitations & Sharing */}
          <section className="space-y-4 rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#2c1820]">
                  Share with Remote Family & Guests
                </h2>
                <p className="mt-0.5 text-xs text-[#735d65]">
                  Invite loved ones who cannot travel in person to attend your
                  wedding ceremony online.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf2f4] text-[#6d213c]">
                💌
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-700">
                <span className="flex-1 truncate pl-2 font-sans text-xs">
                  {publicStreamUrl}
                </span>
                <button
                  type="button"
                  onClick={copyPublicStreamLink}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#6d213c] shadow-xs hover:bg-gray-50"
                >
                  {copiedLink ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openWhatsAppInvite}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <span>💬 WhatsApp Live Invite</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5d8d3] bg-white px-4 py-2.5 text-xs font-semibold text-[#6d213c] transition hover:bg-[#faf6f5]"
                >
                  <span>📱 Stream QR Code</span>
                </button>
              </div>
            </div>
          </section>

          {/* Card 3: YouTube Broadcast Setup Guide */}
          <section className="rounded-2xl border border-[#e5d8d3] bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="flex w-full items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-800">
                  💡
                </div>
                <div>
                  <h3 className="font-serif text-sm font-semibold text-[#2c1820]">
                    YouTube Broadcast Setup Guide
                  </h3>
                  <p className="text-xs text-[#735d65]">
                    Essential tips for your videographer and stream team.
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-[#6d213c]">
                {showGuide ? "Hide ▲" : "View Steps ▼"}
              </span>
            </button>

            {showGuide && (
              <div className="space-y-4 border-t border-[#e5d8d3] p-6 pt-4 text-xs text-[#523d45]">
                <div className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6d213c] text-[10px] font-bold text-white">
                    1
                  </span>
                  <div>
                    <strong className="text-gray-900">
                      Create or Schedule Stream in YouTube Studio:
                    </strong>
                    <p className="mt-0.5 text-gray-600">
                      Go to{" "}
                      <a
                        href="https://studio.youtube.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6d213c] underline"
                      >
                        studio.youtube.com
                      </a>
                      , click <em>Create → Go live</em>, and schedule your
                      wedding stream date and start time in advance.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6d213c] text-[10px] font-bold text-white">
                    2
                  </span>
                  <div>
                    <strong className="text-gray-900">
                      Set Privacy to &quot;Unlisted&quot; or &quot;Public&quot;:
                    </strong>
                    <p className="mt-0.5 text-gray-600">
                      Select <strong>Unlisted</strong> so only wedding guests
                      with your website link can view, or{" "}
                      <strong>Public</strong>. <em>Do not set to Private</em>,
                      or guests will be unable to watch.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6d213c] text-[10px] font-bold text-white">
                    3
                  </span>
                  <div>
                    <strong className="text-gray-900">
                      Enable &quot;Allow Embedding&quot; (Crucial):
                    </strong>
                    <p className="mt-0.5 text-gray-600">
                      In YouTube Studio stream settings under{" "}
                      <em>Additional options</em>, ensure{" "}
                      <strong>Allow embedding</strong> is turned ON. Without
                      this, YouTube blocks third-party site embedding.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6d213c] text-[10px] font-bold text-white">
                    4
                  </span>
                  <div>
                    <strong className="text-gray-900">
                      Paste the Share URL into Make My Marriage:
                    </strong>
                    <p className="mt-0.5 text-gray-600">
                      On the stream, click Share and copy the public address
                      (youtube.com/watch, youtube.com/live, or youtu.be). Do not
                      paste the studio.youtube.com dashboard page. Paste the
                      Share link above, then check the preview on the right.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Live Broadcast Monitor Preview */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:col-span-6">
          <section className="overflow-hidden rounded-2xl border border-[#e5d8d3] bg-[#1a1518] text-white shadow-xl">
            {/* Monitor Chrome Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#251f23] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {currentVideoId && enabled ? (
                    <>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </>
                  ) : (
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-500" />
                  )}
                </span>
                <span className="font-mono text-xs font-semibold tracking-wider text-gray-300 uppercase">
                  Live Studio Monitor
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
                <span className="rounded bg-black/40 px-1.5 py-0.5">16:9</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5">
                  1080p HD
                </span>
              </div>
            </div>

            {/* Screen Frame */}
            <div className="relative aspect-video w-full bg-black">
              {currentVideoId ? (
                <iframe
                  key={currentVideoId}
                  src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=0&rel=0`}
                  title="Wedding Livestream Player Preview"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl text-white/40">
                    📺
                  </div>
                  <h3 className="mt-3 font-serif text-base font-semibold text-white/90">
                    Stream Monitor Offline
                  </h3>
                  <p className="mt-1 max-w-xs text-xs text-white/50">
                    Paste your YouTube Live link on the left to preview the
                    ceremony broadcast player here in real time.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>Awaiting YouTube Feed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Monitor Footer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#251f23] p-4 text-xs">
              <div>
                <p className="font-medium text-white/90">
                  {currentVideoId
                    ? enabled
                      ? websitePublished
                        ? "🟢 Broadcasting Live on Wedding Website"
                        : "🟡 Ready · Website in Draft"
                      : "⚪ Feed Connected (Broadcast Paused)"
                    : "No Stream Active"}
                </p>
                <p className="text-[11px] text-white/50">
                  Ceremony: {weddingDate || "Wedding Day"}
                </p>
              </div>

              {currentVideoId && (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.youtube.com/watch?v=${currentVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
                  >
                    <span>Open in YouTube</span>
                    <span>↗</span>
                  </a>

                  <Link
                    href={tabPath(`/w/${websiteSlug}#livestream`, tabId)}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg bg-[#6d213c] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#581a30]"
                  >
                    <span>Guest View</span>
                    <span>↗</span>
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Quick Info Bento Card */}
          <div className="rounded-2xl border border-[#e5d8d3] bg-white p-5 shadow-xs">
            <h4 className="font-serif text-xs font-semibold tracking-wider text-[#6d213c] uppercase">
              Broadcast Specifications
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#faf6f5] p-3">
                <span className="text-gray-500">Provider</span>
                <p className="mt-0.5 font-semibold text-gray-900">
                  YouTube Live Embed
                </p>
              </div>
              <div className="rounded-xl bg-[#faf6f5] p-3">
                <span className="text-gray-500">Device Support</span>
                <p className="mt-0.5 font-semibold text-gray-900">
                  Mobile, Tablet, TV, Mac/PC
                </p>
              </div>
              <div className="rounded-xl bg-[#faf6f5] p-3">
                <span className="text-gray-500">Guest Access</span>
                <p className="mt-0.5 font-semibold text-gray-900">
                  100% Free · No App Required
                </p>
              </div>
              <div className="rounded-xl bg-[#faf6f5] p-3">
                <span className="text-gray-500">Privacy</span>
                <p className="mt-0.5 font-semibold text-gray-900">
                  Secured by Unlisted Link
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal for Livestream */}
      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-sm rounded-3xl border border-[#e5d8d3] bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close QR Modal"
            >
              ✕
            </button>

            <div className="text-center">
              <span className="text-[10px] font-semibold tracking-widest text-[#865045] uppercase">
                Remote Guest Invitation
              </span>
              <h3 className="mt-1 font-serif text-xl font-semibold text-[#2c1820]">
                Livestream QR Code
              </h3>
              <p className="mt-1 text-xs text-[#735d65]">
                Scan to watch {brideName} & {groomName}’s wedding ceremony live.
              </p>
            </div>

            <div className="my-6 flex justify-center">
              <div className="rounded-2xl border-2 border-[#e5d8d3] bg-white p-4 shadow-sm">
                {qrCodeSvg ? (
                  <div
                    className="flex h-56 w-56 items-center justify-center [&_svg]:h-full [&_svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center text-xs text-gray-400">
                    Could not generate this QR code. Please copy and share the
                    livestream link instead.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={copyPublicStreamLink}
                className="w-full rounded-xl bg-[#6d213c] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#581a30]"
              >
                {copiedLink ? "✓ Copied Stream Link!" : "Copy Stream Link"}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
