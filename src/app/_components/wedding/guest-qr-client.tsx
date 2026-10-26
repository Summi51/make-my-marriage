"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { tabFetch, tabPath } from "@/lib/tab-session";
import { guestQrCardSvg, qrSvg } from "@/lib/qr";

type Settings = {
  path: string;
  isEnabled: boolean;
  guestUploadsEnabled: boolean;
};

type Notice = { type: "success" | "error"; text: string };

const toggleTrack =
  "h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-[#6d213c] peer-focus-visible:ring-2 peer-focus-visible:ring-[#6d213c]/30 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

export function GuestQrClient({
  title,
  tabId,
}: {
  title: string;
  tabId: string;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const viewId = useId();
  const uploadId = useId();

  useEffect(() => {
    let active = true;
    tabFetch("/api/gallery/qr")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(
            body.error?.message || "Could not load sharing settings.",
          );
        }
        if (active) {
          setSettings(body.data);
          setOrigin(window.location.origin);
          setLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoaded(true);
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not load sharing settings.",
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const path = settings?.path ?? "";
  const absoluteUrl = origin && path ? `${origin}${path}` : "";
  const shareText = absoluteUrl
    ? `Share the memories from ${title}.\n\nOpen this private album to view${settings?.guestUploadsEnabled ? " and add" : ""} wedding photos. No account is needed.\n\n${absoluteUrl}`
    : "";
  let svg = "";
  let cardSvg = "";
  try {
    if (absoluteUrl.startsWith("http")) {
      svg = qrSvg(absoluteUrl);
      cardSvg = guestQrCardSvg(absoluteUrl, title, shareText);
    }
  } catch {
    svg = "";
    cardSvg = "";
  }
  const cardName = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-guest-qr.png`;

  useEffect(() => {
    if (!cardSvg) return;
    let active = true;
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cardSvg)}`;
    void image
      .decode()
      .then(() => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        context.drawImage(image, 0, 0);
        canvas.toBlob((blob) => {
          if (active && blob)
            setCardFile(new File([blob], cardName, { type: "image/png" }));
        }, "image/png");
      })
      .catch(() => {
        if (active)
          setMessage({
            type: "error",
            text: "Could not prepare the QR picture. You can still share the album link or print the card.",
          });
      });
    return () => {
      active = false;
    };
  }, [cardSvg, cardName]);

  async function update(
    key: "isEnabled" | "guestUploadsEnabled",
    value: boolean,
  ) {
    if (!settings) return;
    const previous = settings;
    const next = { ...settings, [key]: value };
    setSettings(next);
    setBusy(true);
    setMessage(null);
    try {
      const response = await tabFetch("/api/gallery/qr", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled: next.isEnabled,
          guestUploadsEnabled: next.guestUploadsEnabled,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message || "Could not save settings.");
      }
      setSettings(body.data);
      setMessage({ type: "success", text: "Sharing settings saved." });
    } catch (error) {
      setSettings(previous);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const copyLink = async () => {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setMessage({ type: "success", text: "Guest gallery link copied." });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({
        type: "error",
        text: "Could not copy. Select and copy the address below.",
      });
    }
  };

  const downloadCard = () => {
    if (!cardFile) return false;
    const url = URL.createObjectURL(cardFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = cardName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  };

  const sharePayload = () =>
    cardFile
      ? {
          title,
          text: shareText,
          files: [cardFile],
        }
      : null;

  // Desktop Chrome reports canShare(files) even when its menu has no WhatsApp.
  // Only a phone can put the picture and the text in one WhatsApp share.
  const phoneCanShareFiles = () => {
    const payload = sharePayload();
    const phone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return Boolean(
      phone &&
      payload &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare(payload),
    );
  };

  const shareCard = async () => {
    if (!absoluteUrl || !cardFile || !shareText) return;
    const payload = sharePayload();
    if (payload && phoneCanShareFiles()) {
      try {
        await navigator.share(payload);
        setMessage({
          type: "success",
          text: "Choose WhatsApp. The QR picture and the message go together.",
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    // wa.me and WhatsApp Web cannot take a picture from a page link. Open the
    // text, and copy the QR so it can be pasted into that same chat.
    const opened = window.open(
      `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
    let copiedPicture = false;
    try {
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write &&
        cardFile
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": cardFile }),
        ]);
        copiedPicture = true;
      }
    } catch {
      copiedPicture = false;
    }
    const saved = copiedPicture ? false : downloadCard();
    setMessage({
      type: opened ? "success" : "error",
      text: !opened
        ? "Allow pop-ups, then tap WhatsApp message again. The QR picture is ready to paste or attach with the message."
        : copiedPicture
          ? "WhatsApp is open with the message. Click the message box and paste. The QR picture is copied and attaches next to that text."
          : saved
            ? "WhatsApp is open with the message. The QR card is saved with the couple's name and the album link. Attach that picture in the same chat, then send."
            : "WhatsApp is open with the message. Wait for the QR picture, then tap WhatsApp message again to copy or save the card.",
    });
  };

  const printCard = () => {
    if (!svg) return;
    // noopener makes window.open return null even when the blank tab opens.
    // Keep the handle to populate our own document, then sever its opener.
    const frame = window.open("about:blank", "_blank");
    if (!frame) {
      setMessage({
        type: "error",
        text: "Allow pop-ups to print the table card.",
      });
      return;
    }
    frame.opener = null;
    frame.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)} guest QR</title>
<style>
  body{margin:0;font-family:Georgia,serif;color:#2c1820;background:#faf8f5}
  #qr-card{max-width:420px;margin:32px auto;text-align:center;border:1px solid #e5d8d3;border-radius:24px;padding:32px;background:#fff}
  @media print{body> :not(#qr-card){display:none!important}#qr-card{break-inside:avoid;print-color-adjust:exact}}
  p{letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:#865045}
  h1{font-size:32px;margin:12px 0}
  img{width:280px;height:280px}
  small{display:block;margin-top:12px;color:#735d65;font-family:sans-serif}
</style></head><body><main id="qr-card">
<p>Share the memories</p>
<h1>${escapeHtml(title)}</h1>
<img alt="Guest gallery QR" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" />
<small>Scan to view${settings?.guestUploadsEnabled ? " and upload" : ""} wedding photos. No account needed.</small>
</main></body></html>`);
    frame.document.close();
    const image = frame.document.querySelector("img");
    void (image?.decode() ?? Promise.resolve())
      .then(() => {
        if (!frame.closed) {
          frame.focus();
          frame.print();
        }
      })
      .catch(() => {
        setMessage({
          type: "error",
          text: "The QR image could not load for printing. Please download the QR and try again.",
        });
      });
  };

  const sharingLive = Boolean(settings?.isEnabled);
  const uploadsOn = Boolean(settings?.guestUploadsEnabled);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-[#e5d8d3] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-widest text-[#865045] uppercase">
              Website &amp; Media
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-medium text-gray-500">{title}</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#2c1820] sm:text-4xl">
            Guest Photo QR
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#735d65]">
            One scan opens the private album. Guests can view and add photos
            without an account. Printed cards keep working when you pause and
            turn sharing back on.
          </p>
        </div>
        <div className="self-start sm:self-end">
          {!loaded ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e5d8d3] bg-[#faf6f5] px-3.5 py-1.5 text-xs font-medium text-[#735d65] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#baa6a0]" />
              Loading sharing
            </span>
          ) : sharingLive && uploadsOn ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Album open · Uploads on
            </span>
          ) : sharingLive ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 shadow-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              View only
            </span>
          ) : settings ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              Sharing paused
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 shadow-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Sharing unavailable
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
            message.type === "success"
              ? "border border-[#cbe5cb] bg-[#f2faf2] text-[#1c641c]"
              : "border border-[#f8d7da] bg-[#fff3f4] text-[#b02a37]"
          }`}
        >
          <span>{message.type === "success" ? "✓" : "⚠️"}</span>
          <p className="flex-1 font-medium">{message.text}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Dismiss message"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {!loaded ? (
        <p className="text-sm text-[#735d65]">Loading sharing settings…</p>
      ) : !settings ? (
        <section className="rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
          <h2 className="font-serif text-xl text-[#2c1820]">
            Guest sharing is not ready
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#735d65]">
            The private album link could not be prepared. Refresh this page. If
            it stays unavailable, sign out and back in, then try again.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <section className="space-y-5 rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs lg:col-span-7">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#865045] uppercase">
                Share the memories
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#6d213c]">
                {title}
              </h2>
              <p className="mt-1 text-sm text-[#735d65]">
                Scan to view
                {settings.guestUploadsEnabled ? " and upload" : ""} your
                favourite moments.
              </p>
            </div>
            <div className="mx-auto w-fit rounded-3xl border border-[#e5d8d3] bg-[#faf8f5] p-5">
              {svg ? (
                <img
                  alt="Scan to open the guest wedding gallery"
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                  className="h-64 w-64 max-w-full"
                />
              ) : (
                <p className="flex h-64 w-64 max-w-full items-center text-center text-sm text-[#735d65]">
                  The QR appears once this page knows the site address. Use the
                  link until then.
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {cardSvg && (
                <button
                  type="button"
                  onClick={downloadCard}
                  disabled={!cardFile}
                  className="rounded-xl bg-[#6d213c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#581a30]"
                >
                  Download QR
                </button>
              )}
              <button
                type="button"
                onClick={printCard}
                disabled={!svg}
                className="rounded-xl border border-[#e5d8d3] bg-white px-5 py-2.5 text-sm font-semibold text-[#6d213c] hover:bg-[#faf6f5] disabled:opacity-50"
              >
                Print table card
              </button>
              <button
                type="button"
                onClick={() => void shareCard()}
                disabled={!absoluteUrl || !cardFile}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                WhatsApp message
              </button>
              <a
                className={`rounded-xl border border-[#e5d8d3] px-5 py-2.5 text-sm font-semibold text-[#6d213c] hover:bg-[#faf8f5] ${absoluteUrl ? "" : "pointer-events-none opacity-50"}`}
                href={absoluteUrl || undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!absoluteUrl}
              >
                Open guest gallery ↗
              </a>
            </div>
            <p className="text-center text-xs text-[#937c6e]">
              On a phone, WhatsApp message sends the album text and the QR
              picture together. On this computer, it opens WhatsApp with the
              text and copies the QR picture. Click the message box and paste,
              then send. Use the live site for guests: localhost links work only
              on this computer.
            </p>
          </section>

          <div className="space-y-6 lg:col-span-5">
            <section className="space-y-4 rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#2c1820]">
                  Sharing controls
                </h2>
                <p className="mt-1 text-xs text-[#735d65]">
                  Changes save immediately. Wedding members can still remove
                  photos from Gallery.
                </p>
              </div>
              <label
                htmlFor={viewId}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#e5d8d3] bg-[#faf6f5] p-4"
              >
                <span>
                  <span className="block text-sm font-semibold text-[#2c1820]">
                    Allow guests to view the album
                  </span>
                  <span className="mt-1 block text-xs text-[#735d65]">
                    Pause hides the album. Already printed cards work again when
                    you turn this back on.
                  </span>
                </span>
                <span className="relative mt-1 inline-flex shrink-0 items-center">
                  <input
                    id={viewId}
                    type="checkbox"
                    checked={settings.isEnabled}
                    disabled={busy}
                    onChange={(event) =>
                      void update("isEnabled", event.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <span className={toggleTrack} />
                </span>
              </label>
              <label
                htmlFor={uploadId}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#e5d8d3] bg-[#faf6f5] p-4"
              >
                <span>
                  <span className="block text-sm font-semibold text-[#2c1820]">
                    Allow guest photo uploads
                  </span>
                  <span className="mt-1 block text-xs text-[#735d65]">
                    Turn this off to keep the album view-only during the event.
                  </span>
                </span>
                <span className="relative mt-1 inline-flex shrink-0 items-center">
                  <input
                    id={uploadId}
                    type="checkbox"
                    checked={settings.guestUploadsEnabled}
                    disabled={busy || !settings.isEnabled}
                    onChange={(event) =>
                      void update("guestUploadsEnabled", event.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <span className={toggleTrack} />
                </span>
              </label>
            </section>

            <section className="rounded-2xl border border-[#e5d8d3] bg-white p-6 shadow-xs">
              <h2 className="font-serif text-lg font-semibold text-[#2c1820]">
                Private gallery link
              </h2>
              <p className="mt-1 text-xs text-[#735d65]">
                Anyone with this link can open the album. Do not place it on a
                public website.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
                <span className="flex-1 truncate pl-2 font-mono text-xs text-gray-700">
                  {absoluteUrl || path || "Preparing link…"}
                </span>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  disabled={!absoluteUrl}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#6d213c] shadow-xs disabled:opacity-50"
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
              <Link
                href={tabPath("/account/wedding/gallery", tabId)}
                className="mt-4 inline-flex text-xs font-semibold text-[#6d213c] underline"
              >
                Review photos in Gallery
              </Link>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
