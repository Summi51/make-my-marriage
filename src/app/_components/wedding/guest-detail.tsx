"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { GuestDto } from "@/modules/guests/use-cases";
import { getGuestInitials, getRsvpStatusBadge } from "@/modules/guests/format";
import { tabFetch, tabPath } from "@/lib/tab-session";

interface GuestDetailProps {
  guest: GuestDto;
  invitationUrl: string;
  token?: string;
}

const emptySubscribe = () => () => {};

export function GuestDetail({
  guest,
  invitationUrl: initialInvitationUrl,
  token,
}: GuestDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSaved = searchParams.get("saved") === "1";

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const invitationInputRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const origin = useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => "",
  );

  const displayInvitationUrl =
    origin && token
      ? `${origin}/invite/${token}`
      : initialInvitationUrl || (token ? `/invite/${token}` : "");

  const initials = getGuestInitials(guest.name);
  const badge = getRsvpStatusBadge(guest.rsvpStatus, guest.attendingCount);

  const handleCopy = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(displayInvitationUrl);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard access can be denied: select the text for a manual copy.
      invitationInputRef.current?.select();
      setCopyFailed(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await tabFetch(`/api/guests/${guest.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to delete guest.");
      }
      router.push(tabPath("/account/wedding/guests"));
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Error deleting guest.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      {/* Creation/Save Feedback Notification */}
      {isSaved && (
        <div className="mb-4 text-sm font-medium text-[#2E6A44]">
          Guest saved successfully.
        </div>
      )}

      {/* Header Section with Title and Edit Action */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/account/wedding/guests"
            className="mb-3 inline-flex items-center text-xs font-medium text-[#7A7269] transition hover:text-[#1F1E1D]"
          >
            <span className="mr-1">←</span> Back to guests
          </Link>
          <p className="mb-1 text-[11px] font-bold tracking-[0.16em] text-[#8D6B4F] uppercase">
            INVITATION & GUEST ACCESS
          </p>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-[#2D1A22] sm:text-4xl lg:text-[42px]">
            Guest details & invitation link
          </h1>
          <p className="mt-1 text-sm text-[#7A7269]">
            Manage {guest.name}&apos;s personal invitation link, party size, and
            invited celebrations.
          </p>
        </div>

        <Link
          href={`/account/wedding/guests/${guest.id}/edit`}
          className="self-start rounded-lg border border-[#D5CCC1] bg-white px-5 py-2 text-sm font-medium text-[#1F1E1D] shadow-xs transition hover:bg-[#FAF8F5]"
        >
          Edit guest
        </Link>
      </div>

      {/* Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column (Core Invitation Card) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Main Link Management Card */}
          <div className="space-y-6 rounded-2xl border border-[#EBE4DC] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] md:p-8">
            {/* Guest Header Inside Card */}
            <div>
              <p className="mb-1 text-[11px] font-bold tracking-widest text-[#9B948B] uppercase">
                STABLE INVITATION LINK
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#29171F]">
                  {guest.name}
                </h2>
                {guest.isFamily && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#F4EFE6] px-2 py-0.5 text-xs font-semibold text-[#8C6843]">
                    👨‍👩‍👧‍👦 Family Invitation (& family)
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center space-x-2 text-sm text-[#7A7269]">
                <svg
                  className="h-4 w-4 shrink-0 text-[#9B948B]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  Maximum party size: {guest.maxGuests}{" "}
                  {guest.maxGuests === 1 ? "person" : "people"} (includes the
                  named guest)
                </span>
              </div>
            </div>

            {/* Dedicated Invitation URL Box */}
            <div className="space-y-2">
              <label
                htmlFor="invitation-url"
                className="text-[11px] font-bold tracking-wider text-[#9B948B] uppercase"
              >
                DEDICATED INVITATION URL
              </label>
              <div className="relative flex items-center rounded-xl border border-[#E6DFD6] bg-[#FAF8F5] px-4 py-3.5 transition-colors focus-within:border-[#6D213C]">
                <svg
                  className="mr-3 h-4 w-4 shrink-0 text-[#9B948B]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  id="invitation-url"
                  ref={invitationInputRef}
                  type="text"
                  readOnly
                  value={displayInvitationUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full truncate border-0 bg-transparent p-0 font-mono text-[13px] text-[#1F1E1D] outline-none select-all focus:ring-0"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex cursor-pointer items-center space-x-2 rounded-lg bg-[#6D213C] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5B1A31]"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Copy invitation link</span>
              </button>

              <a
                href={token ? `/invite/${token}` : displayInvitationUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 rounded-lg border border-[#6D213C] px-4 py-2.5 text-sm font-medium text-[#6D213C] transition-colors hover:bg-[#6D213C]/5"
              >
                <span>Open invitation</span>
                <span>→</span>
              </a>
            </div>

            {/* Copied Feedback Badge */}
            {copied && (
              <div className="flex items-center space-x-2 pt-0.5 text-sm font-medium text-[#276738]">
                <svg
                  className="h-4 w-4 text-[#276738]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Invitation link copied</span>
              </div>
            )}

            {copyFailed && (
              <p className="pt-0.5 text-sm font-medium text-[#9B4B3C]">
                Copying is blocked in this browser. The link above is selected —
                press Ctrl/Cmd + C to copy it.
              </p>
            )}

            {/* Privacy Explainer Note */}
            <div className="mt-4 flex items-start space-x-3.5 rounded-xl border border-[#EFEAE2] bg-[#FAF7F3] p-5">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-[#6D213C]/80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="space-y-1">
                <p className="text-xs leading-relaxed font-normal text-[#1F1E1D]">
                  Share this link privately with this guest or family. Anyone
                  with the link can view this invitation and update its RSVP.
                </p>
                <p className="text-[11px] text-[#7A7269]">
                  Copying or opening this link does not send an email or SMS.
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete Link */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="cursor-pointer text-xs font-medium text-[#9B948B] transition-colors hover:text-red-700"
            >
              Delete guest
            </button>
          </div>
        </div>

        {/* Right Column (Registry & Celebrations) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Contact Registry Card */}
          <div className="space-y-5 rounded-2xl border border-[#EBE4DC] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            {/* Monogram Header */}
            <div className="flex items-center space-x-3.5 border-b border-[#F4EFEB] pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F6EDE2] text-sm font-semibold tracking-wide text-[#866848] uppercase">
                {initials}
              </div>
              <div>
                <h3 className="font-serif text-xl leading-tight font-bold text-[#2A1820]">
                  Contact Registry
                </h3>
                <p className="text-[11px] text-[#7A7269]">
                  Guest invitation record
                </p>
              </div>
            </div>

            {/* Registry Metadata List */}
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-[#F2ECE4] bg-[#FCFBF8] p-3">
                <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-[#9B948B] uppercase">
                  PRIMARY EMAIL
                </span>
                <span className="font-medium text-[#1F1E1D]">
                  {guest.email || "Not provided"}
                </span>
              </div>

              <div className="rounded-lg border border-[#F2ECE4] bg-[#FCFBF8] p-3">
                <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-[#9B948B] uppercase">
                  PRIMARY PHONE
                </span>
                <span className="font-medium text-[#1F1E1D]">
                  {guest.phone || "Not provided"}
                </span>
              </div>

              <div className="rounded-lg border border-[#F2ECE4] bg-[#FCFBF8] p-3">
                <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-[#9B948B] uppercase">
                  OVERALL RSVP STATUS
                </span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${badge.dotColor}`}
                  />
                  <span className="font-semibold text-[#1F1E1D]">
                    {badge.label}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-[#F2ECE4] bg-[#FCFBF8] p-3">
                <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-[#9B948B] uppercase">
                  MAXIMUM PARTY SIZE
                </span>
                <span className="font-medium text-[#1F1E1D]">
                  {guest.maxGuests}{" "}
                  {guest.maxGuests === 1 ? "person" : "people"}, including the
                  named guest
                </span>
              </div>

              {guest.notes && (
                <div className="rounded-lg border border-[#F2ECE4] bg-[#FCFBF8] p-3">
                  <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-[#9B948B] uppercase">
                    TEAM NOTES
                  </span>
                  <p className="text-xs whitespace-pre-wrap text-[#7A7269]">
                    {guest.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Permitted Ceremonies Card */}
          <div className="space-y-4 rounded-2xl border border-[#EBE4DC] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div>
              <h3 className="font-serif text-2xl font-bold text-[#2A1820]">
                Permitted Ceremonies
              </h3>
              <p className="mt-1 text-xs text-[#7A7269]">
                {guest.invitedEvents.length} active events. Only these invited
                celebrations appear on {guest.name}&apos;s page:
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {guest.invitedEvents.length === 0 ? (
                <p className="text-xs text-[#7A7269]">
                  No celebrations assigned.
                </p>
              ) : (
                guest.invitedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start space-x-2.5 rounded-lg border border-[#F0EBE2] bg-[#FAF8F5] p-2.5 text-xs"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#6D213C]" />
                    <div>
                      <p className="font-semibold text-[#1F1E1D]">{ev.name}</p>
                      {ev.venueName && (
                        <p className="text-[11px] text-[#7A7269]">
                          {ev.venueName}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Celebratory Card (Wine Background #6D213C) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#6D213C] p-7 text-white shadow-md">
            <div className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 rounded-full border border-white/10" />
            <div className="relative space-y-3">
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#E5D6C5] uppercase">
                A LINK TO YOUR CELEBRATION
              </p>
              <h4 className="font-serif text-2xl leading-snug font-light tracking-normal text-white">
                One invitation.
                <br />
                One familiar link.
              </h4>
              <p className="pt-1 text-xs leading-relaxed font-normal text-white/80">
                {guest.name} can bookmark this link and return to view their
                invited events or update their RSVP. Sharing it again keeps the
                same address.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-guest-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3
              id="delete-guest-title"
              className="font-serif text-xl font-bold text-[#1F1E1D]"
            >
              Delete guest record?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#7A7269]">
              Are you sure you want to remove <strong>{guest.name}</strong>?
              Their invitation link will immediately become invalid.
            </p>

            {deleteError && (
              <p className="mt-2 text-xs font-medium text-red-600">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-[#DED7CD] bg-white px-4 py-2 text-xs font-semibold text-[#1F1E1D] transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="cursor-pointer rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete guest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
