"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import Link from "next/link";
import { PublicWebsiteClient } from "./public-website-client";
import { qrSvg } from "@/lib/qr";
import { tabFetch, tabPath } from "@/lib/tab-session";

const subscribeOrigin = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => "";

interface WebsiteData {
  slug: string;
  theme: string;
  isPublished: boolean;
  welcomeMessage: string | null;
}

interface WeddingProps {
  id: string;
  brideName: string;
  groomName: string;
  title: string;
  description: string | null;
  weddingDate: string;
  timeZone: string;
  location: string;
  galleryEnabled: boolean;
  livestreamEnabled: boolean;
  livestreamUrl: string | null;
}

interface EventItem {
  id: string;
  name: string;
  type: string | null;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  description: string | null;
  dressCode: string | null;
}

interface WebsiteManagerClientProps {
  tabId: string;
  wedding: WeddingProps;
  initialWebsite: WebsiteData;
  events: EventItem[];
}

const THEMES = [
  {
    id: "CLASSIC",
    title: "Classic Indian / Royal Romance",
    badge: "Most Popular",
    tagline: "Royal Burgundy & Ivory · Timeless Mughal Elegance",
    description:
      "Graceful Mughal arch contour motif, royal serif typography, warm celebratory borders, and rich burgundy accents.",
    primaryColor: "#6D213C",
    accentColor: "#FAF8F5",
    secondaryColor: "#865045",
    previewBannerBg: "from-[#6D213C] via-[#865045] to-[#4A1020]",
    hasArch: true,
  },
  {
    id: "MINIMAL",
    title: "Modern Minimalist",
    badge: "Contemporary",
    tagline: "Pure Ivory & Slate · Architectural Simplicity",
    description:
      "Understated modern typography, generous whitespace, subtle hairlines, and minimal interlocking rings.",
    primaryColor: "#1A1A1A",
    accentColor: "#FFFFFF",
    secondaryColor: "#737373",
    previewBannerBg: "from-[#2A2A2A] via-[#1A1A1A] to-[#0F0F0F]",
    hasArch: false,
  },
  {
    id: "MODERN",
    title: "The Celebration Edit",
    badge: "Joyful & Vibrant",
    tagline: "Festive Rose & Terracotta · Warm Contemporary Flair",
    description:
      "Energetic celebratory vibes, warm rose-gold gradients, playful festive badges, and contemporary warmth.",
    primaryColor: "#8A2846",
    accentColor: "#FFF8F6",
    secondaryColor: "#B3541E",
    previewBannerBg: "from-[#8A2846] via-[#B3541E] to-[#6E1C34]",
    hasArch: false,
  },
];

const PRESETS = [
  {
    id: "traditional",
    label: "Traditional & Heartfelt",
    icon: "📜",
    text: "With the blessings of the Almighty and our beloved parents, we invite you to be part of our wedding celebrations. Your love, presence, and prayers mean the world to us as we begin this sacred new journey together.",
  },
  {
    id: "contemporary",
    label: "Contemporary & Joyful",
    icon: "✨",
    text: "We are thrilled to bring our family and closest friends together! Come laugh, feast, and dance the night away as we celebrate our love. Explore our itinerary and venue coordinates below.",
  },
  {
    id: "intimate",
    label: "Intimate & Serene",
    icon: "🕊️",
    text: "Two hearts, one shared promise. We warmly welcome our dearest loved ones to gather in serenity and celebrate our union with good food, soulful music, and cherished memories.",
  },
];

export function WebsiteManagerClient({
  tabId,
  wedding,
  initialWebsite,
  events,
}: WebsiteManagerClientProps) {
  const [theme, setTheme] = useState<string>(initialWebsite.theme || "CLASSIC");
  const [savedTheme, setSavedTheme] = useState<string>(
    initialWebsite.theme || "CLASSIC",
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    initialWebsite.isPublished,
  );
  const [welcomeMessage, setWelcomeMessage] = useState<string>(
    initialWebsite.welcomeMessage || "",
  );
  const [savedWelcomeMessage, setSavedWelcomeMessage] = useState<string>(
    initialWebsite.welcomeMessage || "",
  );
  const [slug] = useState<string>(initialWebsite.slug);

  const hasUnsavedChanges =
    theme !== savedTheme ||
    welcomeMessage.trim() !== savedWelcomeMessage.trim();

  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Public URL with tab query so members can preview even if draft
  const publicUrl = `/w/${slug}${!isPublished && tabId ? `?tab=${encodeURIComponent(tabId)}` : ""}`;
  const origin = useSyncExternalStore(
    subscribeOrigin,
    browserOrigin,
    serverOrigin,
  );
  const displayPublicUrl = `${origin}/w/${slug}`;

  const shareUrl = () => new URL(`/w/${slug}`, window.location.origin).href;

  const requirePublished = () => {
    if (isPublished) return true;
    setStatusMessage({
      type: "error",
      text: "Publish the website first. Copy, WhatsApp, and QR use the public address, which stays private until the site is live.",
    });
    return false;
  };

  const copyToClipboard = async () => {
    if (!requirePublished()) return;
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setStatusMessage({
        type: "success",
        text: "Link copied. Paste it in a new tab — it opens the live wedding page.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusMessage({
        type: "error",
        text: "Could not copy link. Open the website and copy its address instead.",
      });
    }
  };

  const saveSettings = (newPublishedState?: boolean) => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const payload = {
          theme,
          welcomeMessage: welcomeMessage.trim() ? welcomeMessage.trim() : null,
          isPublished:
            newPublishedState !== undefined ? newPublishedState : isPublished,
        };

        const res = await tabFetch("/api/wedding/website", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(
            err?.error?.message || "Failed to update website settings.",
          );
        }

        if (newPublishedState !== undefined) {
          setIsPublished(newPublishedState);
        }
        setSavedTheme(theme);
        setSavedWelcomeMessage(welcomeMessage.trim());

        setStatusMessage({
          type: "success",
          text:
            newPublishedState === true
              ? "Your wedding website is now live on the web!"
              : newPublishedState === false
                ? "Your website is now in Draft mode (Private)."
                : "Website settings saved successfully.",
        });
      } catch (err: unknown) {
        setStatusMessage({
          type: "error",
          text:
            err instanceof Error ? err.message : "An unexpected error occurred",
        });
      }
    });
  };

  const shareOnWhatsApp = () => {
    if (!requirePublished()) return;
    const text = encodeURIComponent(
      `Our wedding website is ready! View our schedule and celebration coordinates here: ${shareUrl()}`,
    );
    window.open(
      `https://api.whatsapp.com/send?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-[#ece4e0] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#6d213c]" />
            <span className="text-[11px] font-semibold tracking-widest text-[#865045] uppercase">
              Website &amp; Media Studio
            </span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#2c1820] sm:text-4xl">
            Wedding Website
          </h1>
          <p className="mt-1.5 text-xs text-[#735d65] sm:text-sm">
            Publish an editorial home for your wedding story, celebration
            schedule, and interactive live stream.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={tabPath("/account/wedding/edit", tabId)}
            className="rounded-xl border border-[#e5d8d3] bg-white px-4 py-2 text-xs font-semibold text-[#6d213c] shadow-2xs transition-colors hover:bg-[#faf4f2]"
          >
            Edit Wedding Details
          </Link>
          <button
            onClick={() => saveSettings()}
            disabled={isPending || !hasUnsavedChanges}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6d213c] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#5b1b32] disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <span>Save Changes</span>
            ) : (
              <span>✓ All Saved</span>
            )}
          </button>
        </div>
      </div>

      {/* Status Notification Alert */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-medium transition-all ${
            statusMessage.type === "success"
              ? "border border-[#cbe5cb] bg-[#f2faf2] text-[#1c641c]"
              : "border border-[#f8d7da] bg-[#fff3f4] text-[#b02a37]"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="cursor-pointer text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Website Status & Quick Actions Bar */}
      <div className="overflow-hidden rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-3 w-3 rounded-full ${
                  isPublished
                    ? "animate-pulse bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-base font-bold text-[#2c1820]">
                {isPublished
                  ? "Your Wedding Website is Live"
                  : "Draft Mode (Private to You)"}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  isPublished
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {isPublished ? "Publicly Accessible" : "Draft Preview"}
              </span>
            </div>
            <p className="text-xs text-[#735d65]">
              {isPublished
                ? "Guests can view your schedule, venue maps, livestream, and details via your unique web address."
                : "Copy, WhatsApp, or QR publishes this site and opens the public link. Preview Draft stays private until you share."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => saveSettings(!isPublished)}
              disabled={isPending}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-2xs transition-all ${
                isPublished
                  ? "border border-[#e5d8d3] bg-white text-[#865045] hover:bg-[#faf4f2]"
                  : "bg-emerald-700 text-white hover:bg-emerald-800"
              }`}
            >
              <span>
                {isPublished ? "Switch to Draft" : "🚀 Publish Website"}
              </span>
            </button>
          </div>
        </div>

        {/* Public URL Box */}
        <div className="mt-5 rounded-xl border border-[#ece4e0] bg-[#faf8f5] p-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-hidden text-xs">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-[#865045] uppercase">
                Website Link:
              </span>
              <span className="truncate font-mono text-xs font-medium text-[#6d213c]">
                {displayPublicUrl}
              </span>
              {!isPublished && (
                <span className="py-0.2 rounded bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">
                  Draft
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={isPending}
                title={
                  isPublished
                    ? "Copy the public website address"
                    : "Publish the website before copying the public link"
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e5d8d3] bg-white px-3 py-1.5 text-xs font-semibold text-[#6d213c] transition-colors hover:bg-[#faf4f2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? "✓ Copied!" : "📋 Copy Link"}
              </button>
              <button
                type="button"
                onClick={shareOnWhatsApp}
                disabled={isPending}
                title={
                  isPublished
                    ? "Share the public website on WhatsApp"
                    : "Publish the website before sharing the public link"
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#cce8d0] bg-[#f0f9f1] px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-[#e4f4e6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>💬 WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!requirePublished()) return;
                  setShowQrModal(true);
                }}
                disabled={isPending}
                title={
                  isPublished
                    ? "Show the public QR code"
                    : "Publish the website before showing the public QR code"
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e5d8d3] bg-white px-3 py-1.5 text-xs font-semibold text-[#865045] transition-colors hover:bg-[#faf4f2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>📱 QR Code</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#6d213c] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5b1b32]"
              >
                <span>
                  {isPublished ? "Visit Live Site ↗" : "Preview Draft ↗"}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Left Settings + Right Live Device Preview */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Theme Picker & Customization */}
        <div className="space-y-8 lg:col-span-6">
          {/* Theme Selection */}
          <div className="rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#2c1820]">
                  Predefined Wedding Themes
                </h2>
                <p className="text-xs text-[#735d65]">
                  Select an aesthetic theme. Your schedule, venue maps, and
                  welcome story adapt seamlessly.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {THEMES.map((item) => {
                const isSelected = theme === item.id;
                return (
                  <div
                    key={item.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setTheme(item.id);
                      }
                    }}
                    onClick={() => setTheme(item.id)}
                    className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? "border-[#6d213c] bg-white shadow-md ring-2 ring-[#6d213c]/30"
                        : "border-[#e5d8d3] bg-white hover:border-[#cbbaa8] hover:shadow-xs"
                    }`}
                  >
                    {/* Miniature Illustrative Header Mockup */}
                    <div
                      className={`h-12 w-full bg-gradient-to-r ${item.previewBannerBg} flex items-center justify-between px-4 text-white`}
                    >
                      <div className="flex items-center gap-2">
                        {item.hasArch ? (
                          <svg
                            className="h-5 w-5 text-amber-200 opacity-90"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 64 64"
                          >
                            <path
                              d="M32 13c-7 4-11 9-11 15v31h22V28c0-6-4-11-11-15z"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <span className="text-xs">✨</span>
                        )}
                        <span className="font-serif text-xs font-semibold tracking-wide">
                          {wedding.brideName} &amp; {wedding.groomName}
                        </span>
                      </div>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase backdrop-blur-xs">
                        {item.badge}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#2c1820]">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-[11px] font-medium text-[#865045]">
                            {item.tagline}
                          </p>
                          <p className="text-xs text-[#735d65]">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 pl-3">
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: item.primaryColor }}
                            title="Primary color"
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: item.secondaryColor }}
                            title="Secondary color"
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: item.accentColor }}
                            title="Accent color"
                          />
                          <div
                            className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                              isSelected
                                ? "border-[#6d213c] bg-[#6d213c] text-white"
                                : "border-[#d1c2bc] bg-white text-transparent"
                            }`}
                          >
                            <span className="text-[10px]">✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Welcome Message Editor */}
          <div className="rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#2c1820]">
                  Welcome Note for Guests
                </h2>
                <p className="text-xs text-[#735d65]">
                  A personal message displayed on your website&apos;s story
                  section.
                </p>
              </div>
              <span
                className={`font-mono text-xs ${
                  welcomeMessage.length > 1400
                    ? "font-semibold text-rose-600"
                    : "text-[#865045]"
                }`}
              >
                {welcomeMessage.length} / 1500
              </span>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="mt-4">
              <span className="text-[11px] font-semibold tracking-wider text-[#865045] uppercase">
                Inspiration Presets:
              </span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setWelcomeMessage(p.text)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e5d8d3] bg-[#faf8f5] px-2.5 py-1 text-xs font-medium text-[#6d213c] transition-colors hover:bg-[#f5eeea]"
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3.5">
              <textarea
                aria-label="Welcome message"
                value={welcomeMessage}
                onChange={(e) =>
                  setWelcomeMessage(e.target.value.slice(0, 1500))
                }
                rows={5}
                placeholder="Write your welcome note here..."
                className="w-full rounded-xl border border-[#e5d8d3] p-3 text-xs leading-relaxed text-[#2c1820] placeholder-[#a69299] focus:border-[#6d213c] focus:ring-1 focus:ring-[#6d213c] focus:outline-none"
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#865045] italic">
                Changes sync live in the preview on the right.
              </span>
              <button
                type="button"
                onClick={() => saveSettings()}
                disabled={isPending || !hasUnsavedChanges}
                className="cursor-pointer rounded-xl bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5b1b32] disabled:opacity-50"
              >
                {isPending
                  ? "Saving..."
                  : hasUnsavedChanges
                    ? "Save Message"
                    : "Message saved"}
              </button>
            </div>
          </div>

          {/* Connected Sections Summary Bento Card */}
          <div className="rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#2c1820]">
              Sections Included on Your Public Site
            </h2>
            <p className="text-xs text-[#735d65]">
              These modules automatically populate your public website from your
              workspace data:
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#ece4e0] bg-[#faf8f5] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2c1820]">
                    Events &amp; Itinerary
                  </span>
                  <span className="rounded-full bg-[#6d213c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#6d213c]">
                    {events.length} active
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#735d65]">
                  Shows venues, timings, dress codes, and Google Maps links.
                </p>
                <Link
                  href={tabPath("/account/wedding/events", tabId)}
                  className="mt-2 inline-flex text-[11px] font-semibold text-[#6d213c] underline"
                >
                  Manage events
                </Link>
              </div>

              <div className="rounded-xl border border-[#ece4e0] bg-[#faf8f5] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2c1820]">
                    Live Countdown Clock
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#735d65]">
                  Counts down to your wedding date in {wedding.timeZone}.
                </p>
              </div>

              <div className="rounded-xl border border-[#ece4e0] bg-[#faf8f5] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2c1820]">
                    Private Photo Gallery
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      wedding.galleryEnabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Private
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#735d65]">
                  Protected photo drop for invited guests with personal links.
                </p>
                <Link
                  href={tabPath("/account/wedding/gallery", tabId)}
                  className="mt-2 inline-flex text-[11px] font-semibold text-[#6d213c] underline"
                >
                  Manage gallery
                </Link>
              </div>

              <div className="rounded-xl border border-[#ece4e0] bg-[#faf8f5] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2c1820]">
                    YouTube Livestream
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      wedding.livestreamEnabled && wedding.livestreamUrl
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {wedding.livestreamEnabled && wedding.livestreamUrl
                      ? "Connected"
                      : "Optional"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#735d65]">
                  Embed live video stream for remote family members.
                </p>
                <Link
                  href={tabPath("/account/wedding/livestream", tabId)}
                  className="mt-2 inline-flex text-[11px] font-semibold text-[#6d213c] underline"
                >
                  Manage livestream
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Live Device Preview Frame */}
        <div className="lg:col-span-6">
          <div className="sticky top-20 z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold tracking-wider text-[#865045] uppercase">
                  Live Preview
                </h2>
                <span className="rounded-full bg-[#FAF5F7] px-2 py-0.5 text-[10px] font-semibold text-[#6D213C]">
                  {theme}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Device Selector Pill */}
                <div className="flex rounded-xl border border-[#e5d8d3] bg-white p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setDevicePreview("desktop")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      devicePreview === "desktop"
                        ? "bg-[#6d213c] text-white shadow-2xs"
                        : "text-[#735d65] hover:text-[#2c1820]"
                    }`}
                  >
                    <span>🖥️</span>
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevicePreview("mobile")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      devicePreview === "mobile"
                        ? "bg-[#6d213c] text-white shadow-2xs"
                        : "text-[#735d65] hover:text-[#2c1820]"
                    }`}
                  >
                    <span>📱</span>
                    <span>Mobile</span>
                  </button>
                </div>

                {/* Fullscreen Preview Lightbox Trigger */}
                <button
                  type="button"
                  onClick={() => setShowFullscreenModal(true)}
                  title="View Fullscreen Preview"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#e5d8d3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d213c] shadow-2xs transition-colors hover:bg-[#FAF5F7]"
                >
                  <span>⛶</span>
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>
              </div>
            </div>

            {/* DESKTOP FRAME PREVIEW (MacBook Safari Window) */}
            {devicePreview === "desktop" && (
              <div className="w-full overflow-hidden rounded-2xl border border-[#d8cdc5] bg-white shadow-xl transition-all">
                {/* Safari Browser Window Header */}
                <div className="flex items-center justify-between border-b border-[#e2d8d1] bg-gradient-to-b from-[#f8f5f2] to-[#eee8e2] px-3.5 py-2">
                  {/* Window Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full border border-[#E0443E] bg-[#FF5F56] shadow-2xs" />
                    <span className="inline-block h-3 w-3 rounded-full border border-[#DEA123] bg-[#FFBD2E] shadow-2xs" />
                    <span className="inline-block h-3 w-3 rounded-full border border-[#1AAB29] bg-[#27C93F] shadow-2xs" />
                    <div className="ml-2 hidden items-center gap-1 text-[#8b7d76] sm:flex">
                      <span className="px-0.5 text-xs">‹</span>
                      <span className="px-0.5 text-xs">›</span>
                    </div>
                  </div>

                  {/* Central URL Bar */}
                  <div className="mx-2 flex w-full max-w-xs items-center justify-between rounded-lg border border-[#dfd4cc] bg-white/95 px-2.5 py-1 text-[11px] shadow-inner sm:max-w-sm">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs text-emerald-600">🔒</span>
                      <span className="truncate font-mono text-gray-800">
                        {displayPublicUrl}
                      </span>
                    </div>
                    <span
                      className={`py-0.2 rounded px-1.5 text-[9px] font-semibold tracking-wider uppercase ${
                        isPublished
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isPublished ? "Live" : "Draft"}
                    </span>
                  </div>

                  {/* Window Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open website in new tab"
                      className="text-xs font-semibold text-[#6d213c] hover:underline"
                    >
                      Open ↗
                    </a>
                  </div>
                </div>

                {/* Desktop Viewport Canvas */}
                <div
                  className="max-h-[600px] overflow-y-auto"
                  aria-label="Desktop website preview"
                >
                  <PublicWebsiteClient
                    isEmbedPreview={true}
                    previewDevice="desktop"
                    wedding={{
                      brideName: wedding.brideName,
                      groomName: wedding.groomName,
                      title: wedding.title,
                      description: wedding.description,
                      weddingDate: wedding.weddingDate,
                      timeZone: wedding.timeZone,
                      location: {
                        formattedAddress: wedding.location,
                        city: null,
                        state: null,
                        country: null,
                      },
                      coverImageUrl: null,
                      theme,
                      welcomeMessage: welcomeMessage.trim() || null,
                      events,
                      gallery: { enabled: wedding.galleryEnabled },
                      livestream: {
                        enabled: wedding.livestreamEnabled,
                        youtubeUrl: wedding.livestreamUrl,
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {/* MOBILE FRAME PREVIEW (iPhone 16 Pro) */}
            {devicePreview === "mobile" && (
              <div className="flex justify-center py-1">
                <div className="relative w-full max-w-[340px] rounded-[48px] border-4 border-[#3c3337] bg-[#1f191b] p-2.5 shadow-2xl ring-1 ring-black/40">
                  {/* Hardware Side Button Accents */}
                  <div className="absolute top-24 -left-[6px] h-7 w-[4px] rounded-l-sm bg-[#3a3034]" />
                  <div className="absolute top-36 -left-[6px] h-10 w-[4px] rounded-l-sm bg-[#3a3034]" />
                  <div className="absolute top-50 -left-[6px] h-10 w-[4px] rounded-l-sm bg-[#3a3034]" />
                  <div className="absolute top-32 -right-[6px] h-14 w-[4px] rounded-r-sm bg-[#3a3034]" />

                  {/* Inner Screen Container */}
                  <div className="relative overflow-hidden rounded-[38px] bg-white">
                    {/* Dynamic Island and Status Bar - z-10 ensures it NEVER overlaps workspace header */}
                    <div className="relative z-10 flex h-10 w-full items-center justify-between bg-black px-5 pt-0.5 text-white">
                      <span className="text-[11px] font-semibold tracking-tight">
                        9:41
                      </span>

                      {/* Dynamic Island Pill */}
                      <div className="flex h-4.5 w-22 items-center justify-end rounded-full bg-black px-2 shadow-inner">
                        <span className="h-1.5 w-1.5 rounded-full border border-[#2b2b36] bg-[#111116]" />
                      </div>

                      <div className="flex items-center gap-1 text-[11px]">
                        <span>5G</span>
                        <span className="text-[9px]">98%</span>
                      </div>
                    </div>

                    {/* Rendered Mobile Viewport */}
                    <div
                      className="max-h-[540px] overflow-y-auto"
                      aria-label="Mobile website preview"
                    >
                      <PublicWebsiteClient
                        isEmbedPreview={true}
                        previewDevice="mobile"
                        wedding={{
                          brideName: wedding.brideName,
                          groomName: wedding.groomName,
                          title: wedding.title,
                          description: wedding.description,
                          weddingDate: wedding.weddingDate,
                          timeZone: wedding.timeZone,
                          location: {
                            formattedAddress: wedding.location,
                            city: null,
                            state: null,
                            country: null,
                          },
                          coverImageUrl: null,
                          theme,
                          welcomeMessage: welcomeMessage.trim() || null,
                          events,
                          gallery: { enabled: wedding.galleryEnabled },
                          livestream: {
                            enabled: wedding.livestreamEnabled,
                            youtubeUrl: wedding.livestreamUrl,
                          },
                        }}
                      />
                    </div>

                    {/* Bottom iOS Home Indicator */}
                    <div className="flex justify-center border-t border-black/5 bg-white/90 py-1.5 backdrop-blur-xs">
                      <div className="h-1 w-24 rounded-full bg-black/40" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX PREVIEW MODAL */}
      {showFullscreenModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
          {/* Top Control Bar */}
          <div className="flex h-14 items-center justify-between border-b border-white/10 bg-[#1e171a] px-6 text-white">
            <div className="flex items-center gap-3">
              <span className="font-serif text-sm font-semibold tracking-wide text-amber-200">
                Fullscreen Live Preview
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80">
                {theme}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-[#6d213c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5b1b32]"
              >
                <span>Open in Tab ↗</span>
              </a>
              <button
                onClick={() => setShowFullscreenModal(false)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                <span>✕ Close Preview</span>
              </button>
            </div>
          </div>

          {/* Modal Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
              <PublicWebsiteClient
                wedding={{
                  brideName: wedding.brideName,
                  groomName: wedding.groomName,
                  title: wedding.title,
                  description: wedding.description,
                  weddingDate: wedding.weddingDate,
                  timeZone: wedding.timeZone,
                  location: {
                    formattedAddress: wedding.location,
                    city: null,
                    state: null,
                    country: null,
                  },
                  coverImageUrl: null,
                  theme,
                  welcomeMessage: welcomeMessage.trim() || null,
                  events,
                  gallery: { enabled: wedding.galleryEnabled },
                  livestream: {
                    enabled: wedding.livestreamEnabled,
                    youtubeUrl: wedding.livestreamUrl,
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* QR Code Sharing Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-[#e5d8d3] bg-white p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ece4e0] pb-3">
              <span className="font-serif text-lg font-bold text-[#2c1820]">
                Website QR Code
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="cursor-pointer rounded-lg p-1 text-gray-400 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center">
              {/* QR Code Container */}
              <div className="rounded-2xl border-2 border-[#6d213c]/20 bg-[#faf8f5] p-4 shadow-xs">
                <div
                  className="flex h-44 w-44 items-center justify-center rounded-xl border border-[#e5d8d3] bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
                  role="img"
                  aria-label="Wedding website QR code"
                  dangerouslySetInnerHTML={{
                    __html: origin ? qrSvg(shareUrl()) : "",
                  }}
                />
              </div>

              <h4 className="mt-4 font-serif text-base font-bold text-[#6d213c]">
                {wedding.brideName} &amp; {wedding.groomName}
              </h4>
              <p className="mt-1 px-2 font-mono text-xs break-all text-gray-500">
                {displayPublicUrl}
              </p>
              <p className="mt-2 text-[11px] text-[#865045]">
                Print this on your invitation cards or share on WhatsApp for
                instant guest access.
              </p>

              <div className="mt-5 flex w-full gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 cursor-pointer rounded-xl bg-[#6d213c] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#5b1b32]"
                >
                  {copied ? "✓ Link Copied" : "Copy Link"}
                </button>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="cursor-pointer rounded-xl border border-[#e5d8d3] px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-[#faf4f2]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
