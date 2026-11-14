"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GuestDto } from "@/modules/guests/use-cases";
import { buildGuestMessage } from "@/modules/guests/messages";
import { tabFetch } from "@/lib/tab-session";

interface InvitationsPageClientProps {
  wedding: {
    id: string;
    title: string;
    brideName: string;
    groomName: string;
    weddingDate: string | null;
    timeZone: string;
    location: string;
  };
  events: Array<{
    id: string;
    name: string;
    type?: string | null;
    startsAt: string | null;
    venueName: string | null;
  }>;
}

interface RsvpSummaryData {
  totalGuests: number;
  pendingInvitations: number;
  attendingInvitations: number;
  notAttendingInvitations: number;
  totalPeopleAttending: number;
  totalCapacity?: number;
  sentInvitations?: number;
  unsentInvitations?: number;
}

const PAGE_SIZE = 25;

export function InvitationsPageClient({
  wedding,
  events,
}: InvitationsPageClientProps) {
  const [guests, setGuests] = useState<GuestDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "ALL" | "PENDING" | "ATTENDING" | "NOT_ATTENDING" | "UNSENT"
  >("ALL");

  // Summary statistics
  const [summary, setSummary] = useState<RsvpSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Copy feedback
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [whatsappGuest, setWhatsappGuest] = useState<GuestDto | null>(null);
  const [customWhatsappMsg, setCustomWhatsappMsg] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreviewGuestId, setSelectedPreviewGuestId] = useState<
    string | null
  >(null);
  const [previewInviteUrl, setPreviewInviteUrl] = useState<string | null>(null);
  const [mockRsvpStatus, setMockRsvpStatus] = useState<
    "PENDING" | "ATTENDING" | "NOT_ATTENDING"
  >("PENDING");
  const [mockAttendingCount, setMockAttendingCount] = useState<number>(1);
  const [mockSubmitted, setMockSubmitted] = useState<boolean>(false);

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderTemplate, setReminderTemplate] = useState<"gentle" | "final">(
    "gentle",
  );
  const [customReminderSubject, setCustomReminderSubject] = useState("");
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchIncludeEmail, setBatchIncludeEmail] = useState(true);
  const [openedWhatsappGuestIds, setOpenedWhatsappGuestIds] = useState<
    Set<string>
  >(new Set());
  const [copiedBatchGuestId, setCopiedBatchGuestId] = useState<string | null>(
    null,
  );
  const batchCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(
    null,
  );

  // Email invitation modal state
  const [emailInviteGuest, setEmailInviteGuest] = useState<GuestDto | null>(
    null,
  );
  const [emailInput, setEmailInput] = useState("");
  const [isSendingEmailInvite, setIsSendingEmailInvite] = useState(false);
  const [emailInviteError, setEmailInviteError] = useState<string | null>(null);

  // Single reminder options modal state
  const [singleReminderGuest, setSingleReminderGuest] =
    useState<GuestDto | null>(null);
  const [isSendingSingleEmailReminder, setIsSendingSingleEmailReminder] =
    useState(false);
  const [readyWhatsapp, setReadyWhatsapp] = useState<
    Array<{
      id: string;
      guestId: string;
      kind: string;
      phone: string | null;
      message: string;
    }>
  >([]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (batchCopyTimer.current) clearTimeout(batchCopyTimer.current);
    };
  }, []);

  // The invitation secret stays on the server. Sharing always asks for the
  // stable link instead of rebuilding one from the browser origin.
  const loadInviteUrl = useCallback(async (guestId: string) => {
    const res = await tabFetch(`/api/guests/${guestId}/invitation-link`);
    if (!res.ok) throw new Error("Invitation link unavailable");
    const json = await res.json();
    const url: string | undefined = json.data?.url;
    if (!url) throw new Error("Invitation link unavailable");
    return url;
  }, []);

  useEffect(() => {
    if (!previewOpen || !selectedPreviewGuestId) return;
    let active = true;
    loadInviteUrl(selectedPreviewGuestId)
      .then((url) => {
        if (active) setPreviewInviteUrl(url);
      })
      .catch(() => {
        if (active) setPreviewInviteUrl(null);
      });
    return () => {
      active = false;
    };
  }, [previewOpen, selectedPreviewGuestId, loadInviteUrl]);

  // Fetch summary helper for mutation refreshes
  const refreshSummary = useCallback(async () => {
    try {
      const res = await tabFetch("/api/guests/rsvp-summary", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data);
      }
    } catch {
      // Ignore summary failure
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch guests list
  const loadGuests = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setLoadError(false);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (eventFilter !== "all") params.set("eventId", eventFilter);

        if (activeTab === "UNSENT") {
          params.set("invitationStatus", "UNSENT");
        } else if (activeTab !== "ALL") {
          params.set("rsvpStatus", activeTab);
        }

        params.set("page", String(targetPage));
        params.set("limit", String(PAGE_SIZE));

        const res = await tabFetch(`/api/guests?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load guests");
        const json = await res.json();
        setGuests(json.data ?? []);
        setTotal(json.pagination?.total ?? 0);
        setPage(json.pagination?.page ?? targetPage);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [search, eventFilter, activeTab],
  );

  useEffect(() => {
    let active = true;
    tabFetch("/api/guests/rsvp-summary", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.data) {
          setSummary(json.data);
        }
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadGuests(1), 200);
    return () => clearTimeout(timer);
  }, [loadGuests]);

  useEffect(() => {
    let active = true;
    tabFetch("/api/guests/whatsapp-reminders", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active)
          setReadyWhatsapp(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {
        // The invitations list still works if this optional list fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const currentPreviewGuest =
    guests.find((g) => g.id === selectedPreviewGuestId) || guests[0] || null;

  const coupleNames =
    wedding.title || `${wedding.brideName} & ${wedding.groomName}`;
  const pendingGuests = guests.filter((g) => g.rsvpStatus === "PENDING");
  const pendingAttendees = pendingGuests.reduce(
    (acc, g) => acc + (g.maxGuests || 1),
    0,
  );
  const guestsWithEmailCount = pendingGuests.filter((g) => !!g.email).length;
  const guestsWithPhoneCount = pendingGuests.filter((g) => !!g.phone).length;
  const sampleGuestName = pendingGuests[0]?.name || "the first guest";
  const countdownPill = (() => {
    if (events.length > 0) {
      const dates = events
        .map((e) => e.startsAt)
        .filter((d): d is string => !!d)
        .sort();
      if (dates.length > 0) {
        const first = new Date(dates[0]);
        const now = new Date();
        const diff = Math.ceil(
          (first.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (!isNaN(diff) && diff > 0) {
          return `${events[0].name.split(" ")[0]} in ${diff} days`;
        }
      }
    }
    return "Nikah in 42 days";
  })();

  const handleOpenPreview = (guestId?: string) => {
    const target = guestId ? guests.find((g) => g.id === guestId) : null;
    const initial = target || guests[0] || null;
    if (initial) {
      setSelectedPreviewGuestId(initial.id);
      setMockRsvpStatus(initial.rsvpStatus);
      setMockAttendingCount(initial.attendingCount || 1);
      setMockSubmitted(initial.rsvpStatus !== "PENDING");
    } else {
      setMockRsvpStatus("PENDING");
      setMockAttendingCount(1);
      setMockSubmitted(false);
    }
    setPreviewInviteUrl(null);
    setPreviewOpen(true);
  };

  const handleCopyLink = async (guest: GuestDto) => {
    try {
      const url = await loadInviteUrl(guest.id);
      await navigator.clipboard.writeText(url);
      setCopyFeedback(guest.id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      // Clipboard access can be denied, or the link route can fail. The guest
      // page shows the full link for a manual copy.
    }
  };

  const handleOpenWhatsAppModal = async (
    guest: GuestDto,
    kind: "invite" | "reminder" = "invite",
  ) => {
    const coupleNames =
      wedding.title || `${wedding.brideName} & ${wedding.groomName}`;
    const invited = events.filter((event) =>
      guest.invitedEventIds.includes(event.id),
    );
    let inviteUrl = "your invitation link";
    try {
      inviteUrl = await loadInviteUrl(guest.id);
    } catch {
      // The chat can still open. The member can copy the link separately.
    }
    setCustomWhatsappMsg(
      buildGuestMessage({
        kind: kind === "reminder" ? "rsvp-reminder" : "invite",
        guestName: guest.name,
        coupleName: coupleNames,
        dateLabel: wedding.weddingDate,
        venue: wedding.location,
        events: invited.map((event) => ({
          name: event.name,
          when: event.startsAt,
          venueName: event.venueName,
        })),
        inviteUrl,
        isFamily: guest.isFamily,
      }),
    );
    setWhatsappGuest(guest);
  };

  const handleSendViaWhatsApp = () => {
    if (!whatsappGuest) return;
    const cleanPhone = (whatsappGuest.phone || "").replace(/[^\d+]/g, "");
    const encoded = encodeURIComponent(customWhatsappMsg);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Mark as sent optimistically & on server
    void handleMarkSent(whatsappGuest.id);
    setWhatsappGuest(null);
  };

  const handleOpenReadyWhatsapp = (item: (typeof readyWhatsapp)[number]) => {
    const cleanPhone = (item.phone || "").replace(/[^\d+]/g, "");
    const encoded = encodeURIComponent(item.message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setReadyWhatsapp((current) => current.filter((row) => row.id !== item.id));
    void tabFetch(`/api/guests/whatsapp-reminders/${item.id}/open`, {
      method: "POST",
    });
  };

  const handleMarkSent = async (guestId: string) => {
    try {
      const res = await tabFetch(`/api/guests/${guestId}/send-invitation`, {
        method: "POST",
      });
      if (res.ok) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guestId
              ? { ...g, invitationSentAt: new Date().toISOString() }
              : g,
          ),
        );
        void refreshSummary();
      }
    } catch {
      // Ignore error
    }
  };

  const handleOpenEmailInvite = (guest: GuestDto) => {
    setEmailInviteGuest(guest);
    setEmailInput(guest.email || "");
    setEmailInviteError(null);
  };

  const handleSendEmailInvite = async () => {
    if (!emailInviteGuest) return;
    const targetEmail = emailInput.trim();
    if (!targetEmail) {
      setEmailInviteError("Please enter a valid email address.");
      return;
    }
    setIsSendingEmailInvite(true);
    setEmailInviteError(null);
    try {
      if (emailInviteGuest.email !== targetEmail) {
        const patchRes = await tabFetch(`/api/guests/${emailInviteGuest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail }),
        });
        if (!patchRes.ok) {
          const errData = await patchRes.json().catch(() => null);
          throw new Error(
            errData?.error?.message || "Failed to save email address",
          );
        }
      }

      const res = await tabFetch(
        `/api/guests/${emailInviteGuest.id}/send-invitation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sendEmail: true }),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error?.message || "The invitation email could not be sent.",
        );
      }

      setGuests((prev) =>
        prev.map((g) =>
          g.id === emailInviteGuest.id
            ? {
                ...g,
                email: targetEmail,
                invitationSentAt: new Date().toISOString(),
              }
            : g,
        ),
      );
      setBatchSuccessMessage(`✓ Wedding invitation sent to ${targetEmail}.`);
      setEmailInviteGuest(null);
      void refreshSummary();
      setTimeout(() => setBatchSuccessMessage(null), 4500);
    } catch (err) {
      setEmailInviteError(
        err instanceof Error ? err.message : "Failed to deliver email",
      );
    } finally {
      setIsSendingEmailInvite(false);
    }
  };

  const handleSendSingleEmailReminder = async (guest: GuestDto) => {
    if (!guest.email) {
      handleOpenEmailInvite(guest);
      return;
    }
    setIsSendingSingleEmailReminder(true);
    try {
      const res = await tabFetch(`/api/guests/${guest.id}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: true }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error?.message || "The reminder email could not be sent.",
        );
      }
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id
            ? {
                ...g,
                lastReminderSentAt: new Date().toISOString(),
                reminderCount: (g.reminderCount || 0) + 1,
              }
            : g,
        ),
      );
      setBatchSuccessMessage(`✓ RSVP reminder sent to ${guest.email}.`);
      setSingleReminderGuest(null);
      void refreshSummary();
      setTimeout(() => setBatchSuccessMessage(null), 4500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setIsSendingSingleEmailReminder(false);
    }
  };

  const handleOpenReminderModal = () => {
    setReminderTemplate("gentle");
    setCustomReminderSubject(
      `Friendly Reminder: RSVP for ${wedding.brideName} & ${wedding.groomName}'s Wedding`,
    );
    setBatchIncludeEmail(true);
    setOpenedWhatsappGuestIds(new Set());
    setBatchPreviewMessage("");
    setReminderModalOpen(true);
  };

  const handleSelectTemplate = (tpl: "gentle" | "final") => {
    setReminderTemplate(tpl);
    if (tpl === "gentle") {
      setCustomReminderSubject(
        `Friendly Reminder: RSVP for ${wedding.brideName} & ${wedding.groomName}'s Wedding`,
      );
    } else {
      setCustomReminderSubject(
        `Final RSVP Deadline: ${wedding.brideName} & ${wedding.groomName}'s Wedding (7 Days Left)`,
      );
    }
  };

  const getBatchWhatsappMessage = useCallback(
    (guest: GuestDto, inviteUrl: string) => {
      const invited = events.filter((event) =>
        guest.invitedEventIds.includes(event.id),
      );
      // Same builder the reminder email uses, so the preview is the message
      // that actually goes out for the template the member picked.
      return buildGuestMessage({
        kind: "rsvp-reminder",
        guestName: guest.name,
        coupleName: coupleNames,
        dateLabel: wedding.weddingDate,
        venue: wedding.location,
        events: invited.map((event) => ({
          name: event.name,
          when: event.startsAt,
          venueName: event.venueName,
        })),
        inviteUrl,
        isFamily: guest.isFamily,
        tone: reminderTemplate,
      });
    },
    [
      coupleNames,
      events,
      reminderTemplate,
      wedding.location,
      wedding.weddingDate,
    ],
  );

  const [batchPreviewMessage, setBatchPreviewMessage] = useState("");

  const samplePendingGuestId = pendingGuests[0]?.id ?? null;

  useEffect(() => {
    const sample = guests.find((guest) => guest.id === samplePendingGuestId);
    if (!reminderModalOpen || !sample) return;
    let active = true;
    loadInviteUrl(sample.id)
      .then((url) => {
        if (active)
          setBatchPreviewMessage(getBatchWhatsappMessage(sample, url));
      })
      .catch(() => {
        if (active) {
          setBatchPreviewMessage(
            getBatchWhatsappMessage(sample, "your invitation link"),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [
    reminderModalOpen,
    samplePendingGuestId,
    guests,
    reminderTemplate,
    getBatchWhatsappMessage,
    loadInviteUrl,
  ]);

  const handleSendBatchGuestWhatsApp = async (guest: GuestDto) => {
    const cleanPhone = (guest.phone || "").replace(/[^\d+]/g, "");
    let inviteUrl = "your invitation link";
    try {
      inviteUrl = await loadInviteUrl(guest.id);
    } catch {
      // The chat can still open. The member can copy the link separately.
    }
    const msg = getBatchWhatsappMessage(guest, inviteUrl);
    const encoded = encodeURIComponent(msg);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Opening the chat is not a sent reminder. Recording it used to start the
    // 24-hour email cooldown even though no email went out.
    setOpenedWhatsappGuestIds((prev) => new Set([...prev, guest.id]));
  };

  const handleCopyBatchGuestWhatsApp = async (guest: GuestDto) => {
    let inviteUrl = "your invitation link";
    try {
      inviteUrl = await loadInviteUrl(guest.id);
    } catch {
      // Copy the message anyway so the member is not stuck.
    }
    const msg = getBatchWhatsappMessage(guest, inviteUrl);
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedBatchGuestId(guest.id);
      if (batchCopyTimer.current) clearTimeout(batchCopyTimer.current);
      batchCopyTimer.current = setTimeout(
        () => setCopiedBatchGuestId(null),
        2500,
      );
    } catch {
      // Fallback
    }
  };

  const handleBatchSendReminders = async () => {
    if (!batchIncludeEmail) return;

    setIsSendingBatch(true);
    try {
      const res = await tabFetch("/api/guests/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendEmail: true,
          subject: customReminderSubject.trim() || undefined,
          templateType: reminderTemplate,
        }),
      });
      if (!res.ok) throw new Error("Failed to send reminders");
      const json = await res.json();
      const emailsSent = json.data?.emailsSent ?? 0;
      const emailsFailed = json.data?.emailsFailed ?? 0;
      const emailError =
        typeof json.data?.emailError === "string" ? json.data.emailError : null;
      if (emailsFailed > 0 && emailsSent === 0) {
        throw new Error(
          emailError ||
            "The reminder was recorded, but the email was not delivered.",
        );
      }
      setBatchSuccessMessage(
        emailsFailed > 0
          ? `✓ ${emailsSent} reminder email${emailsSent === 1 ? "" : "s"} sent. ${emailsFailed} could not be delivered.`
          : `✓ ${emailsSent} reminder email${emailsSent === 1 ? "" : "s"} sent.`,
      );
      setReminderModalOpen(false);
      void refreshSummary();
      void loadGuests(page);
      setTimeout(() => setBatchSuccessMessage(null), 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setIsSendingBatch(false);
    }
  };

  const hasActiveFilters =
    search.trim() !== "" || eventFilter !== "all" || activeTab !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setEventFilter("all");
    setActiveTab("ALL");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      {/* Toast Notification */}
      {batchSuccessMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-3 rounded-xl border border-[#276738]/20 bg-[#EBF4EC] px-4 py-3 shadow-lg">
          <svg
            className="h-5 w-5 text-[#276738]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-semibold text-[#276738]">
            {batchSuccessMessage}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-widest text-[#8D6B4F] uppercase">
            PLANNING / GUESTS
          </span>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#1F1E1D] sm:text-4xl">
            Invitations & RSVP
          </h1>
          <p className="mt-1.5 text-sm font-normal text-[#7A7269]">
            Track digital invitations, monitor RSVP confirmations, and share
            personalized links.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenPreview()}
            className="inline-flex cursor-pointer items-center justify-center space-x-1.5 rounded-lg border border-[#E8E2D9] bg-white px-3.5 py-2 text-xs font-semibold text-[#1F1E1D] shadow-xs transition hover:bg-[#FAF7F4]"
          >
            <svg
              className="h-4 w-4 text-[#6D213C]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>Preview Digital Invite</span>
          </button>

          <button
            type="button"
            onClick={handleOpenReminderModal}
            className="inline-flex cursor-pointer items-center justify-center space-x-1.5 rounded-lg bg-[#6D213C] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5B1A31]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span>Send Reminder to Pending</span>
          </button>
        </div>
      </div>

      {readyWhatsapp.length > 0 && (
        <div className="mb-6 rounded-xl border border-[#E8E2D9] bg-white p-4 shadow-2xs">
          <h2 className="text-sm font-semibold text-[#1F1E1D]">
            WhatsApp reminders ready to send
          </h2>
          <p className="mt-1 text-xs text-[#7A7269]">
            These were prepared for today. Opening one starts the WhatsApp chat
            so you can send it yourself.
          </p>
          <ul className="mt-3 divide-y divide-[#F0EAE1]">
            {readyWhatsapp.map((item) => {
              const guest = guests.find((row) => row.id === item.guestId);
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1F1E1D]">
                      {guest?.name || "Guest"}
                    </p>
                    <p className="text-xs text-[#7A7269]">
                      {item.kind === "EVENT"
                        ? "Event-day reminder"
                        : "RSVP reminder"}
                      {item.phone ? ` · ${item.phone}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenReadyWhatsapp(item)}
                    className="cursor-pointer rounded-lg bg-[#128C7E] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open WhatsApp
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:gap-4">
        {/* Card 1: Total Invited */}
        <div className="rounded-xl border border-[#E8E2D9] bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[#7A7269] uppercase">
              Total Invited
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FAF7F4] text-[#8D6B4F]">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-[#1F1E1D] sm:text-3xl">
              {summaryLoading ? "..." : (summary?.totalGuests ?? 0)}
            </span>
            <span className="text-xs text-[#7A7269]">parties / families</span>
          </div>
          <div className="mt-1 text-[11.5px] text-[#8D6B4F]">
            Max capacity: {summary?.totalCapacity ?? 0} attendees
          </div>
        </div>

        {/* Card 2: Confirmed Attending */}
        <div className="rounded-xl border border-[#E8E2D9] bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[#276738] uppercase">
              Confirmed
            </span>
            <span className="inline-flex items-center rounded-full bg-[#EBF4EC] px-2 py-0.5 text-[10px] font-bold text-[#276738]">
              ✓ Attending
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-[#276738] sm:text-3xl">
              {summaryLoading ? "..." : (summary?.attendingInvitations ?? 0)}
            </span>
            <span className="text-xs text-[#7A7269]">parties</span>
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-[#276738]">
            {summary?.totalPeopleAttending ?? 0} confirmed guests
          </div>
        </div>

        {/* Card 3: Pending RSVP */}
        <div className="rounded-xl border border-[#E8E2D9] bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[#B54708] uppercase">
              Pending RSVP
            </span>
            <span className="inline-flex items-center rounded-full bg-[#FFFAEB] px-2 py-0.5 text-[10px] font-bold text-[#B54708]">
              ⏳ Awaiting
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-[#B54708] sm:text-3xl">
              {summaryLoading ? "..." : (summary?.pendingInvitations ?? 0)}
            </span>
            <span className="text-xs text-[#7A7269]">parties</span>
          </div>
          <div className="mt-1 text-[11.5px] text-[#B54708]">
            Need response confirmation
          </div>
        </div>

        {/* Card 4: Declined */}
        <div className="rounded-xl border border-[#E8E2D9] bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[#B42318] uppercase">
              Declined
            </span>
            <span className="inline-flex items-center rounded-full bg-[#FEF3F2] px-2 py-0.5 text-[10px] font-bold text-[#B42318]">
              ✕ Declined
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-[#B42318] sm:text-3xl">
              {summaryLoading ? "..." : (summary?.notAttendingInvitations ?? 0)}
            </span>
            <span className="text-xs text-[#7A7269]">parties</span>
          </div>
          <div className="mt-1 text-[11.5px] text-[#7A7269]">
            Unable to join celebration
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Container */}
      <div className="mb-6 rounded-xl border border-[#E8E2D9] bg-white p-4 shadow-2xs sm:p-5">
        {/* Status Tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[#F0EAE1] pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "ALL"
                ? "bg-[#6D213C] text-white shadow-xs"
                : "text-[#7A7269] hover:bg-[#FAF7F4] hover:text-[#1F1E1D]"
            }`}
          >
            All ({summary?.totalGuests ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "PENDING"
                ? "bg-[#6D213C] text-white shadow-xs"
                : "text-[#7A7269] hover:bg-[#FAF7F4] hover:text-[#1F1E1D]"
            }`}
          >
            Pending RSVP ({summary?.pendingInvitations ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ATTENDING")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "ATTENDING"
                ? "bg-[#6D213C] text-white shadow-xs"
                : "text-[#7A7269] hover:bg-[#FAF7F4] hover:text-[#1F1E1D]"
            }`}
          >
            Confirmed ({summary?.attendingInvitations ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("NOT_ATTENDING")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "NOT_ATTENDING"
                ? "bg-[#6D213C] text-white shadow-xs"
                : "text-[#7A7269] hover:bg-[#FAF7F4] hover:text-[#1F1E1D]"
            }`}
          >
            Declined ({summary?.notAttendingInvitations ?? 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("UNSENT")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "UNSENT"
                ? "bg-[#6D213C] text-white shadow-xs"
                : "text-[#7A7269] hover:bg-[#FAF7F4] hover:text-[#1F1E1D]"
            }`}
          >
            Unsent ({summary?.unsentInvitations ?? 0})
          </button>
        </div>

        {/* Search & Event Select Controls */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search Input */}
          <div className="sm:col-span-8">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by guest name, phone, or email..."
                className="w-full rounded-lg border border-[#E8E2D9] bg-white py-2.5 pr-4 pl-9 text-xs text-[#1F1E1D] placeholder-[#9B948B] transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#9B948B]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" strokeWidth="2" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20.5 20.5l-4.5-4.5"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Event Filter */}
          <div className="sm:col-span-4">
            <div className="relative">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-[#E8E2D9] bg-white px-3.5 py-2.5 pr-9 text-xs text-[#1F1E1D] transition focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
              >
                <option value="all">All celebrations</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#7A7269]">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Clear filters badge */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between pt-2 text-xs text-[#7A7269]">
            <span>Showing filtered results</span>
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer font-semibold text-[#6D213C] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-[#E8E2D9] bg-white shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-xs text-[#7A7269]">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#6D213C] border-t-transparent" />
            Loading invitations and RSVPs...
          </div>
        ) : loadError ? (
          <div className="py-20 text-center">
            <p className="text-sm font-semibold text-[#B42318]">
              Unable to load invitation data.
            </p>
            <button
              type="button"
              onClick={() => void loadGuests(page)}
              className="mt-3 rounded-lg bg-[#6D213C] px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : guests.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F4] text-[#8D6B4F]">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1F1E1D]">
              No guests found
            </h3>
            <p className="mt-1 text-xs text-[#7A7269]">
              {hasActiveFilters
                ? "Try clearing or adjusting your search filters."
                : "Add guests to start sending invitations and tracking RSVPs."}
            </p>
            {!hasActiveFilters && (
              <Link
                href="/account/wedding/guests/new"
                className="mt-4 inline-flex items-center rounded-lg bg-[#6D213C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B1A31]"
              >
                + Add First Guest
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E2D9] bg-[#FAF7F4] font-medium text-[#7A7269]">
                  <th className="px-5 py-3.5">GUEST / FAMILY</th>
                  <th className="px-4 py-3.5">INVITED EVENTS</th>
                  <th className="px-4 py-3.5">DELIVERY STATUS</th>
                  <th className="px-4 py-3.5">RSVP STATUS</th>
                  <th className="px-5 py-3.5 text-right">INVITE ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {guests.map((g) => {
                  const isSent = Boolean(g.invitationSentAt);
                  const isPending = g.rsvpStatus === "PENDING";
                  const isAttending = g.rsvpStatus === "ATTENDING";
                  const isDeclined = g.rsvpStatus === "NOT_ATTENDING";

                  return (
                    <tr
                      key={g.id}
                      className="transition-colors hover:bg-[#FCFBF9]"
                    >
                      {/* Guest Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/account/wedding/guests/${g.id}`}
                                className="font-semibold text-[#1F1E1D] hover:text-[#6D213C]"
                              >
                                {g.name}
                              </Link>
                              {g.isFamily && (
                                <span className="inline-flex rounded-sm bg-[#F7F2EC] px-1.5 py-0.5 text-[10px] font-semibold text-[#8D6B4F]">
                                  Family of {g.maxGuests}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#7A7269]">
                              {g.phone && <span>📞 {g.phone}</span>}
                              {g.email && <span>✉️ {g.email}</span>}
                              {!g.phone && !g.email && (
                                <span className="text-[#9B948B] italic">
                                  No contact added
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Invited Events */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {g.invitedEvents && g.invitedEvents.length > 0 ? (
                            g.invitedEvents.map((ev) => (
                              <span
                                key={ev.id}
                                className="inline-flex rounded-full border border-[#E8E2D9] bg-[#FAF7F4] px-2 py-0.5 text-[10.5px] font-medium text-[#7A7269]"
                              >
                                {ev.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-[#9B948B]">
                              No celebrations
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Delivery Status */}
                      <td className="px-4 py-4">
                        {isSent ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#EBF4EC] px-2 py-0.5 text-[10.5px] font-semibold text-[#276738]">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Sent{" "}
                              {new Date(g.invitationSentAt!).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                            {g.reminderCount > 0 && (
                              <span className="text-[10px] text-[#B54708]">
                                {g.reminderCount}{" "}
                                {g.reminderCount === 1
                                  ? "reminder"
                                  : "reminders"}{" "}
                                sent
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-[#FAF7F4] px-2 py-0.5 text-[10.5px] font-medium text-[#7A7269]">
                              Not Sent
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleMarkSent(g.id)}
                              className="cursor-pointer text-[10.5px] font-semibold text-[#6D213C] hover:underline"
                            >
                              Mark Sent
                            </button>
                          </div>
                        )}
                      </td>

                      {/* RSVP Status */}
                      <td className="px-4 py-4">
                        {isAttending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4EC] px-2.5 py-1 text-[11px] font-semibold text-[#276738]">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Attending ({g.attendingCount ?? g.maxGuests}/
                            {g.maxGuests})
                          </span>
                        )}

                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFAEB] px-2.5 py-1 text-[11px] font-semibold text-[#B54708]">
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <circle cx="12" cy="12" r="9" strokeWidth="2" />
                              <path
                                strokeLinecap="round"
                                strokeWidth="2"
                                d="M12 7v5l3 3"
                              />
                            </svg>
                            Awaiting Response
                          </span>
                        )}

                        {isDeclined && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3F2] px-2.5 py-1 text-[11px] font-semibold text-[#B42318]">
                            ✕ Declined
                          </span>
                        )}
                      </td>

                      {/* Invite Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Email invite */}
                          <button
                            type="button"
                            onClick={() => handleOpenEmailInvite(g)}
                            title={
                              g.email
                                ? `Send an email invitation to ${g.email}`
                                : "Add an email address and send the invitation"
                            }
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#6D213C]/20 bg-[#FAF7F4] px-2.5 py-1 text-[11px] font-semibold text-[#6D213C] transition hover:bg-[#6D213C]/10"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            <span>Email</span>
                          </button>

                          {/* WhatsApp Share Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsAppModal(g)}
                            title="Share on WhatsApp"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-2.5 py-1 text-[11px] font-semibold text-[#128C7E] transition hover:bg-[#25D366]/20"
                          >
                            <svg
                              className="h-3.5 w-3.5 fill-current"
                              viewBox="0 0 24 24"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.411z" />
                            </svg>
                            <span>WhatsApp</span>
                          </button>

                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => void handleCopyLink(g)}
                            title="Copy personalized invitation link"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E8E2D9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1F1E1D] transition hover:bg-[#FAF7F4]"
                          >
                            {copyFeedback === g.id ? (
                              <span className="font-semibold text-[#276738]">
                                ✓ Copied
                              </span>
                            ) : (
                              <>
                                <svg
                                  className="h-3.5 w-3.5 text-[#7A7269]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                                  />
                                </svg>
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* Send Reminder button if pending */}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => setSingleReminderGuest(g)}
                              title={
                                g.reminderCount > 0
                                  ? `${g.reminderCount} reminder(s) sent. Click to send Email / WhatsApp reminder.`
                                  : "Send Email / WhatsApp reminder to this guest"
                              }
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#B54708]/30 bg-[#FFFAEB] px-2.5 py-1 text-[11px] font-semibold text-[#B54708] transition hover:bg-[#B54708]/15"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                              </svg>
                              <span>
                                {g.reminderCount > 0
                                  ? `Remind (${g.reminderCount})`
                                  : "Remind"}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-[#E8E2D9] bg-[#FAF7F4] px-5 py-3 text-xs text-[#7A7269]">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(page * PAGE_SIZE, total)} of {total} guests
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => void loadGuests(page - 1)}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => void loadGuests(page + 1)}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: WhatsApp Share Modal */}
      {whatsappGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setWhatsappGuest(null)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-xl sm:p-7">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-[#128C7E] uppercase">
                  SHARE ON WHATSAPP
                </span>
                <h3 className="mt-0.5 font-serif text-xl font-bold text-[#1F1E1D]">
                  Invite {whatsappGuest.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappGuest(null)}
                className="cursor-pointer rounded-lg p-1 text-[#7A7269] hover:bg-[#FAF7F4]"
              >
                ✕
              </button>
            </div>

            {/* Guest details summary pill */}
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-[#FAF7F4] p-3 text-xs text-[#7A7269]">
              <span>
                Party size:{" "}
                <strong className="text-[#1F1E1D]">
                  {whatsappGuest.maxGuests} max
                </strong>
              </span>
              <span>•</span>
              <span>
                Phone:{" "}
                <strong className="text-[#1F1E1D]">
                  {whatsappGuest.phone || "Not set (will open WhatsApp search)"}
                </strong>
              </span>
            </div>

            {/* Message edit box */}
            <div className="mt-4">
              <label
                htmlFor="wa-msg"
                className="block text-xs font-medium text-[#7A7269]"
              >
                Invitation Message
              </label>
              <textarea
                id="wa-msg"
                rows={6}
                value={customWhatsappMsg}
                onChange={(e) => setCustomWhatsappMsg(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E8E2D9] p-3 text-xs text-[#1F1E1D] focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWhatsappGuest(null)}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] px-4 py-2 text-xs font-semibold text-[#7A7269] hover:bg-[#FAF7F4]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(customWhatsappMsg);
                  alert("Message copied to clipboard!");
                }}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-4 py-2 text-xs font-semibold text-[#1F1E1D] hover:bg-[#FAF7F4]"
              >
                Copy Message
              </button>

              <button
                type="button"
                onClick={handleSendViaWhatsApp}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#20bd5a]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.411z" />
                </svg>
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1b: Send email invitation */}
      {emailInviteGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setEmailInviteGuest(null)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-[#D4AF37]/50 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between border-b border-[#F0EAE1] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6D213C] text-[#D4AF37] shadow-sm">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <span className="rounded border border-[#E8E2D9] bg-[#FAF7F4] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase">
                    Email invitation
                  </span>
                  <h3 className="mt-0.5 font-serif text-xl font-bold text-[#1F1E1D]">
                    Send Digital Invitation
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailInviteGuest(null)}
                className="cursor-pointer rounded-lg p-1 text-[#7A7269] hover:bg-[#FAF7F4]"
              >
                ✕
              </button>
            </div>

            {/* Guest details summary */}
            <div className="mt-4 rounded-xl border border-[#E8E2D9] bg-[#FAF7F4] p-3 text-xs text-[#7A7269]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1F1E1D]">
                  {emailInviteGuest.name}
                  {emailInviteGuest.isFamily && (
                    <span className="ml-1 text-[11px] font-medium text-[#8D6B4F]">
                      (Family of {emailInviteGuest.maxGuests})
                    </span>
                  )}
                </span>
                <span className="rounded-full border border-[#E8E2D9] bg-white px-2 py-0.5 text-[10.5px] font-medium">
                  Party: max {emailInviteGuest.maxGuests}
                </span>
              </div>
            </div>

            {/* Recipient Email Address Input */}
            <div className="mt-4">
              <label
                htmlFor="guest-email-input"
                className="block text-xs font-semibold text-[#1F1E1D]"
              >
                Recipient Email Address{" "}
                <span className="text-[#B42318]">*</span>
              </label>
              <input
                id="guest-email-input"
                type="email"
                value={emailInput}
                placeholder="e.g. guest@example.com"
                onChange={(e) => setEmailInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E8E2D9] px-3.5 py-2 text-xs text-[#1F1E1D] focus:border-[#6D213C] focus:ring-1 focus:ring-[#6D213C] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#7A7269]">
                The invitation email will be sent from the wedding address.
              </p>
            </div>

            {/* Email Preview Snippet */}
            <div className="mt-4 rounded-xl border border-[#E8E2D9] bg-white p-3 text-xs">
              <span className="text-[10px] font-bold tracking-wider text-[#7A7269] uppercase">
                Subject Preview
              </span>
              <p className="mt-0.5 text-xs font-semibold text-[#1F1E1D]">
                Wedding invitation from{" "}
                {wedding.title || `${wedding.brideName} & ${wedding.groomName}`}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] text-[#7A7269]">
                &ldquo;Assalamu alaikum {emailInviteGuest.name}. With the
                blessings of Allah,{" "}
                {wedding.title || `${wedding.brideName} & ${wedding.groomName}`}{" "}
                request the honour of your company at their nikah...&rdquo;
              </p>
            </div>

            {emailInviteError && (
              <div className="mt-4 rounded-lg border border-[#B42318]/30 bg-[#FEF3F2] p-2.5 text-xs font-medium text-[#B42318]">
                {emailInviteError}
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSendingEmailInvite}
                onClick={() => setEmailInviteGuest(null)}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] px-4 py-2 text-xs font-semibold text-[#7A7269] hover:bg-[#FAF7F4]"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSendingEmailInvite}
                onClick={() => void handleSendEmailInvite()}
                className="inline-flex cursor-pointer items-center justify-center space-x-1.5 rounded-lg bg-[#6D213C] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#5B1A31] disabled:opacity-50"
              >
                {isSendingEmailInvite ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sending invitation...</span>
                  </>
                ) : (
                  <span>Send invitation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1c: Single Guest Reminder Options */}
      {singleReminderGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSingleReminderGuest(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-xl sm:p-7">
            <div className="flex items-start justify-between border-b border-[#F0EAE1] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFFAEB] text-[#B54708]">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-[#B54708] uppercase">
                    Follow Up
                  </span>
                  <h3 className="mt-0.5 font-serif text-xl font-bold text-[#1F1E1D]">
                    Send RSVP Reminder
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSingleReminderGuest(null)}
                className="cursor-pointer rounded-lg p-1 text-[#7A7269] hover:bg-[#FAF7F4]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm leading-relaxed text-[#7A7269]">
                Email is sent from here. WhatsApp opens a chat you send
                yourself.
              </p>
              {singleReminderGuest.reminderCount > 0 && (
                <p className="mt-1 text-[11px] font-medium text-[#B54708]">
                  • Previously sent {singleReminderGuest.reminderCount} reminder
                  {singleReminderGuest.reminderCount > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Reminder Options Cards */}
            <div className="mt-4 space-y-3">
              {/* Email reminder */}
              <div className="rounded-xl border border-[#E8E2D9] bg-[#FAF7F4] p-3.5 transition hover:border-[#6D213C]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✉️</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1F1E1D]">
                        Email reminder
                      </h4>
                      <p className="text-[11px] text-[#7A7269]">
                        {singleReminderGuest.email || "No email address set"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSendingSingleEmailReminder}
                    onClick={() =>
                      void handleSendSingleEmailReminder(singleReminderGuest)
                    }
                    className="cursor-pointer rounded-lg bg-[#6D213C] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#5B1A31] disabled:opacity-50"
                  >
                    {isSendingSingleEmailReminder
                      ? "Sending..."
                      : singleReminderGuest.email
                        ? "Send Email"
                        : "+ Add Email"}
                  </button>
                </div>
              </div>

              {/* Option 2: WhatsApp Reminder */}
              <div className="rounded-xl border border-[#E8E2D9] bg-[#FAF7F4] p-3.5 transition hover:border-[#25D366]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1F1E1D]">
                        WhatsApp Reminder
                      </h4>
                      <p className="text-[11px] text-[#7A7269]">
                        {singleReminderGuest.phone || "No phone number set"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const g = singleReminderGuest;
                      setSingleReminderGuest(null);
                      handleOpenWhatsAppModal(g, "reminder");
                    }}
                    className="cursor-pointer rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#20bd5a]"
                  >
                    Open WhatsApp
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSingleReminderGuest(null)}
                className="cursor-pointer rounded-lg border border-[#E8E2D9] px-4 py-2 text-xs font-semibold text-[#7A7269] hover:bg-[#FAF7F4]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Send RSVP Reminders Modal (Stitch Spec) */}
      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setReminderModalOpen(false)}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#E8E2D9] bg-white shadow-2xl">
            {/* Top accent gradient bar */}
            <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-[#6D213C] via-[#9E3E5B] to-[#C89D47]" />

            <div className="flex-1 overflow-y-auto p-6 sm:p-7">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-[#8D6B4F] uppercase">
                    Pending replies
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#1F1E1D]">
                    Remind guests
                  </h2>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-[#7A7269]">
                    {pendingGuests.length} guest
                    {pendingGuests.length === 1 ? " has" : "s have"} not replied
                    yet. Email goes out from here. WhatsApp opens a chat you
                    send yourself.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReminderModalOpen(false)}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#F5F2EC] text-[#7A7269] transition hover:bg-[#EAE4D9] hover:text-[#1F1E1D]"
                >
                  ✕
                </button>
              </div>

              {pendingGuests.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF4EC] text-[#276738]">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h4 className="font-serif text-base font-bold text-[#1F1E1D]">
                    All guests have responded!
                  </h4>
                  <p className="mt-1 text-xs text-[#7A7269]">
                    There are currently no guests with pending RSVPs in your
                    list.
                  </p>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setReminderModalOpen(false)}
                      className="cursor-pointer rounded-lg bg-[#6D213C] px-5 py-2 text-xs font-semibold text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {/* Targeting Callout Banner */}
                  <div className="flex items-center justify-between rounded-xl border border-[#EFE9DF] bg-[#FAF7F4] p-3 text-xs">
                    <div className="flex items-center gap-2.5 text-[#7A7269]">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4E9ED] text-[#6D213C]">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                      </div>
                      <span>
                        Targeting{" "}
                        <strong className="font-semibold text-[#1F1E1D]">
                          {pendingGuests.length} pending guest
                          {pendingGuests.length === 1 ? "" : "s"}
                        </strong>{" "}
                        across {events.length || 4} celebrations (approx.{" "}
                        {pendingAttendees} attendees)
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#F4E9ED] px-2.5 py-1 text-[11px] font-semibold text-[#6D213C]">
                      {countdownPill}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold tracking-wider text-[#7A7269] uppercase">
                      Tone
                    </span>
                  </div>

                  {/* Template Option Cards */}
                  <div className="space-y-2.5">
                    {/* Option 1: Gentle Reminder */}
                    <div
                      onClick={() => handleSelectTemplate("gentle")}
                      className={`cursor-pointer rounded-xl p-3.5 transition ${
                        reminderTemplate === "gentle"
                          ? "border-2 border-[#6D213C] bg-[#FFF9FA] shadow-xs"
                          : "border border-[#E8E2D9] bg-white hover:border-[#D4AF37]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[#6D213C]">
                            {reminderTemplate === "gentle" && (
                              <div className="h-2 w-2 rounded-full bg-[#6D213C]" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#1F1E1D]">
                              Gentle Reminder
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-[#7A7269]">
                              Just checking in to see if you can join us for the
                              celebrations...
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded bg-[#F4E9ED] px-2 py-0.5 text-[10px] font-bold text-[#6D213C]">
                          RECOMMENDED
                        </span>
                      </div>
                    </div>

                    {/* Option 2: Final Deadline Reminder */}
                    <div
                      onClick={() => handleSelectTemplate("final")}
                      className={`cursor-pointer rounded-xl p-3.5 transition ${
                        reminderTemplate === "final"
                          ? "border-2 border-[#6D213C] bg-[#FFF9FA] shadow-xs"
                          : "border border-[#E8E2D9] bg-white hover:border-[#D4AF37]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                              reminderTemplate === "final"
                                ? "border-[#6D213C]"
                                : "border-[#C8BFB5]"
                            }`}
                          >
                            {reminderTemplate === "final" && (
                              <div className="h-2 w-2 rounded-full bg-[#6D213C]" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#1F1E1D]">
                              Final Deadline Reminder
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-[#7A7269]">
                              Only 7 days left to confirm your attendance before
                              venue headcount locks...
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded bg-[#FFF8E6] px-2 py-0.5 text-[10px] font-bold text-[#B54708]">
                          7 DAYS LEFT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EMAIL SUBJECT */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold tracking-wider text-[#7A7269] uppercase">
                        Email Subject
                      </label>
                      <span className="rounded bg-[#F5F2EC] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#7A7269] uppercase">
                        Editable
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[#7A7269]">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={customReminderSubject}
                        onChange={(e) =>
                          setCustomReminderSubject(e.target.value)
                        }
                        className="w-full rounded-xl border border-[#E8E2D9] bg-white py-2.5 pr-3 pl-9 text-xs text-[#1F1E1D] shadow-2xs focus:border-[#6D213C] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-[#7A7269] uppercase">
                        Message
                      </span>
                      <span className="text-[11px] text-[#8A8082]">
                        Written for {sampleGuestName}
                      </span>
                    </div>
                    <pre className="max-h-40 overflow-y-auto rounded-xl border border-[#EFE9DF] bg-[#FAF8F5] p-4 font-sans text-xs leading-relaxed whitespace-pre-wrap text-[#544F49]">
                      {batchPreviewMessage}
                    </pre>
                  </div>

                  <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[#1F1E1D]">
                          Email
                        </h3>
                        <p className="mt-0.5 text-xs text-[#7A7269]">
                          {guestsWithEmailCount === 0
                            ? "No pending guest has an email address."
                            : `Sends now to ${guestsWithEmailCount} guest${guestsWithEmailCount === 1 ? "" : "s"} with an email.`}
                        </p>
                      </div>
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-[#544F49]">
                        <input
                          type="checkbox"
                          checked={batchIncludeEmail}
                          onChange={(e) =>
                            setBatchIncludeEmail(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-[#E8E2D9] text-[#6D213C] focus:ring-[#6D213C]"
                        />
                        Include
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[#1F1E1D]">
                          WhatsApp
                        </h3>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#7A7269]">
                          Opens the chat with this message. You press send in
                          WhatsApp.
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-[#8A8082]">
                        {guestsWithPhoneCount} with a number
                      </span>
                    </div>
                    <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                      {pendingGuests.map((pg) => {
                        const opened = openedWhatsappGuestIds.has(pg.id);
                        const hasPhone = !!pg.phone;
                        return (
                          <div
                            key={pg.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF8F5] px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#1F1E1D]">
                                {pg.name}
                              </p>
                              <p className="truncate text-xs text-[#7A7269]">
                                {hasPhone
                                  ? pg.phone
                                  : pg.email || "No phone number"}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopyBatchGuestWhatsApp(pg)
                                }
                                className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium text-[#7A7269] transition hover:bg-white hover:text-[#1F1E1D]"
                              >
                                {copiedBatchGuestId === pg.id
                                  ? "Copied"
                                  : "Copy"}
                              </button>
                              <button
                                type="button"
                                disabled={!hasPhone}
                                onClick={() =>
                                  void handleSendBatchGuestWhatsApp(pg)
                                }
                                className="cursor-pointer rounded-lg bg-[#1F1E1D] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3A3632] disabled:cursor-not-allowed disabled:bg-[#C8BFB5]"
                              >
                                {opened ? "Open again" : "Open chat"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Pinned Modal Footer */}
            {pendingGuests.length > 0 && (
              <div className="flex shrink-0 items-center justify-between border-t border-[#F0EAE1] bg-[#FAF8F5] px-6 py-3.5 sm:px-7">
                <button
                  type="button"
                  disabled={isSendingBatch}
                  onClick={() => setReminderModalOpen(false)}
                  className="cursor-pointer text-xs font-semibold text-[#7A7269] transition hover:text-[#1F1E1D]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    isSendingBatch ||
                    !batchIncludeEmail ||
                    guestsWithEmailCount === 0
                  }
                  onClick={() => void handleBatchSendReminders()}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#6D213C] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#5B1A31] disabled:opacity-50"
                >
                  {isSendingBatch
                    ? "Sending emails..."
                    : guestsWithEmailCount === 0
                      ? "No emails to send"
                      : `Send ${guestsWithEmailCount} email${guestsWithEmailCount === 1 ? "" : "s"}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Preview Digital Invite Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setPreviewOpen(false)}
          />

          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#D4AF37]/40 bg-[#FAF7F4] shadow-2xl">
            {/* Modal Top Control Bar */}
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E2D9] bg-white/95 px-5 py-3 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#6D213C] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#D4AF37] uppercase">
                  Digital Invite
                </span>
                {guests.length > 0 && (
                  <select
                    value={currentPreviewGuest?.id || ""}
                    onChange={(e) => {
                      const g = guests.find((x) => x.id === e.target.value);
                      if (g) {
                        setSelectedPreviewGuestId(g.id);
                        setMockRsvpStatus(g.rsvpStatus);
                        setMockAttendingCount(g.attendingCount || 1);
                        setMockSubmitted(g.rsvpStatus !== "PENDING");
                      }
                    }}
                    className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-2.5 py-1 text-xs font-medium text-[#1F1E1D] focus:border-[#6D213C] focus:outline-none"
                  >
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        Preview for: {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentPreviewGuest && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        void handleCopyLink(currentPreviewGuest);
                      }}
                      className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-2.5 py-1 text-xs font-semibold text-[#1F1E1D] transition hover:bg-[#FAF7F4]"
                    >
                      {copyFeedback === currentPreviewGuest.id
                        ? "✓ Copied"
                        : "Copy Link"}
                    </button>
                    {previewInviteUrl && (
                      <a
                        href={previewInviteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#6D213C] px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-[#5B1A31]"
                      >
                        <span>Open Live Page</span>
                        <span className="text-[13px]">↗</span>
                      </a>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="cursor-pointer rounded-full bg-[#FAF7F4] p-1.5 text-[#7A7269] hover:bg-[#E8E2D9]"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Digital Invitation Experience */}
            <div className="p-5 sm:p-8">
              <div className="mx-auto max-w-lg rounded-2xl border border-[#D4AF37]/40 bg-white p-6 text-center shadow-sm sm:p-8">
                {/* Royal Seal Emblem */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#6D213C] text-[#D4AF37] shadow-lg ring-4 ring-[#FAF7F4]">
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                </div>

                <span className="text-[10px] font-bold tracking-[0.25em] text-[#8D6B4F] uppercase">
                  WEDDING CELEBRATION
                </span>

                <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#6D213C] sm:text-4xl">
                  {wedding.brideName} &amp; {wedding.groomName}
                </h2>

                {currentPreviewGuest && (
                  <p className="mt-2 text-xs font-semibold text-[#8D6B4F]">
                    Personal Invitation for {currentPreviewGuest.name}
                    {currentPreviewGuest.isFamily && " & Family"}
                  </p>
                )}

                <p className="mt-2 text-xs leading-relaxed text-[#7A7269]">
                  together with their families, request the pleasure of your
                  company to celebrate their wedding ceremonies
                </p>

                {/* Date & Location Pill */}
                <div className="mt-5 rounded-xl border border-[#D4AF37]/40 bg-[#FAF7F4] p-3 text-center">
                  <div className="text-xs font-bold text-[#8D6B4F]">
                    {wedding.weddingDate
                      ? new Date(wedding.weddingDate).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "October 2026"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#7A7269]">
                    {wedding.location}
                  </div>
                </div>

                {/* Ceremonies Itinerary */}
                <div className="mt-6 border-t border-[#E8E2D9] pt-5 text-left">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-serif text-xs font-bold tracking-wider text-[#1F1E1D] uppercase">
                      Invited Celebrations
                    </h4>
                    <span className="text-[10px] font-semibold text-[#8D6B4F]">
                      {currentPreviewGuest?.invitedEvents.length ?? 0} Events
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(currentPreviewGuest?.invitedEvents.length ?? 0) === 0 ? (
                      <p className="rounded-lg border border-[#E8E2D9] bg-[#FAF7F4] p-3 text-xs text-[#7A7269]">
                        No celebrations assigned.
                      </p>
                    ) : (
                      currentPreviewGuest!.invitedEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between rounded-lg border border-[#E8E2D9] bg-[#FAF7F4] p-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-[#1F1E1D]">
                              {ev.name}
                            </div>
                            <div className="text-[11px] text-[#7A7269]">
                              {ev.venueName || "Celebration Venue"}
                            </div>
                          </div>
                          {ev.startsAt && (
                            <div className="text-right text-[11px] font-semibold text-[#8D6B4F]">
                              {new Date(ev.startsAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                },
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Interactive RSVP Simulator Widget */}
                <div className="mt-6 rounded-2xl border border-[#D4AF37]/50 bg-[#FAF7F4] p-4 text-center">
                  <span className="text-[10px] font-bold tracking-wider text-[#8D6B4F] uppercase">
                    Interactive RSVP Experience
                  </span>

                  {mockSubmitted ? (
                    <div className="mt-3 rounded-xl border border-[#E8E2D9] bg-white p-4">
                      {mockRsvpStatus === "ATTENDING" ? (
                        <div>
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF4EC] px-3 py-1 text-xs font-bold text-[#276738]">
                            ✓ Joyfully Attending ({mockAttendingCount} Guests)
                          </div>
                          <p className="mt-2 text-[11px] text-[#7A7269]">
                            Response confirmed! Looking forward to celebrating
                            together.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3F2] px-3 py-1 text-xs font-bold text-[#B42318]">
                            ✕ Regretfully Declined
                          </div>
                          <p className="mt-2 text-[11px] text-[#7A7269]">
                            You will be dearly missed at the celebrations.
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setMockSubmitted(false)}
                        className="mt-3 cursor-pointer text-xs font-semibold text-[#6D213C] hover:underline"
                      >
                        Change response
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <p className="font-serif text-xs font-bold text-[#1F1E1D]">
                        Will you be celebrating with us?
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMockRsvpStatus("ATTENDING")}
                          className={`cursor-pointer rounded-xl border p-2.5 text-xs font-bold transition ${
                            mockRsvpStatus === "ATTENDING"
                              ? "border-[#276738] bg-[#EBF4EC] text-[#276738] shadow-xs"
                              : "border-[#E8E2D9] bg-white text-[#7A7269] hover:bg-[#FAF7F4]"
                          }`}
                        >
                          ✓ Joyfully Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => setMockRsvpStatus("NOT_ATTENDING")}
                          className={`cursor-pointer rounded-xl border p-2.5 text-xs font-semibold transition ${
                            mockRsvpStatus === "NOT_ATTENDING"
                              ? "border-[#B42318] bg-[#FEF3F2] text-[#B42318] shadow-xs"
                              : "border-[#E8E2D9] bg-white text-[#7A7269] hover:bg-[#FAF7F4]"
                          }`}
                        >
                          Regretfully Decline
                        </button>
                      </div>

                      {mockRsvpStatus === "ATTENDING" && (
                        <div className="rounded-xl border border-[#E8E2D9] bg-white p-3">
                          <label className="mb-1 block text-[11px] font-semibold text-[#7A7269]">
                            Number of attendees (Max:{" "}
                            {currentPreviewGuest?.maxGuests || 4})
                          </label>
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setMockAttendingCount((c) => Math.max(1, c - 1))
                              }
                              className="h-7 w-7 cursor-pointer rounded-md border border-[#E8E2D9] bg-[#FAF7F4] font-bold text-[#1F1E1D]"
                            >
                              -
                            </button>
                            <span className="font-serif text-lg font-bold text-[#6D213C]">
                              {mockAttendingCount}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setMockAttendingCount((c) =>
                                  Math.min(
                                    currentPreviewGuest?.maxGuests || 4,
                                    c + 1,
                                  ),
                                )
                              }
                              className="h-7 w-7 cursor-pointer rounded-md border border-[#E8E2D9] bg-[#FAF7F4] font-bold text-[#1F1E1D]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setMockSubmitted(true)}
                        className="w-full cursor-pointer rounded-xl bg-[#6D213C] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#5B1A31]"
                      >
                        Submit Response
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    className="cursor-pointer rounded-lg border border-[#E8E2D9] bg-white px-6 py-2 text-xs font-semibold text-[#1F1E1D] transition hover:bg-[#FAF7F4]"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
