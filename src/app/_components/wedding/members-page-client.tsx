"use client";
import { tabFetch, tabPath } from "@/lib/tab-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

type Member = {
  membershipId: string;
  user: { id: string; name: string; email: string } | null;
  role: "ADMIN" | "MANAGER";
  joinedAt: string;
};
type Invitation = {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  status: "PENDING";
  expiresAt: string;
  createdAt?: string;
};

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Sent today";
  if (diffDays === 1) return "Sent 1 day ago";
  return `Sent ${diffDays} days ago`;
}

export function MembersPageClient({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const router = useRouter();
  const memberDialog = useRef<HTMLDialogElement>(null);
  const [memberTarget, setMemberTarget] = useState<Member | null>(null);
  const [memberAction, setMemberAction] = useState<"role" | "remove">("role");
  const [nextRole, setNextRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [savingMember, setSavingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(
    null,
  );
  const inviteDialog = useRef<HTMLDialogElement>(null);
  const revokeDialog = useRef<HTMLDialogElement>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [memberResponse, invitationResponse] = await Promise.all([
        tabFetch("/api/members", { cache: "no-store" }),
        tabFetch("/api/members/invitations", { cache: "no-store" }),
      ]);
      if (!memberResponse.ok || !invitationResponse.ok) throw new Error();
      const [memberResult, invitationResult] = await Promise.all([
        memberResponse.json(),
        invitationResponse.json(),
      ]);
      setMembers(memberResult.data);
      setInvitations(invitationResult.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  const refreshInvitations = useCallback(async () => {
    try {
      const response = await tabFetch("/api/members/invitations", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      const current = result.data as Invitation[];
      setInvitations(current);
      return current;
    } catch {
      return null;
    }
  }, []);
  useEffect(() => {
    // Loading remote state is the purpose of this mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function askToRevoke(invitation: Invitation) {
    setRevokeTarget(invitation);
    setRevokeError("");
    revokeDialog.current?.showModal();
  }
  async function revoke() {
    if (!revokeTarget || revoking) return;
    setRevoking(true);
    setRevokeError("");
    try {
      const response = await tabFetch(
        `/api/members/invitations/${revokeTarget.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
      setInvitations((items) =>
        items.filter((item) => item.id !== revokeTarget.id),
      );
      await refreshInvitations();
      revokeDialog.current?.close();
      setToast({
        title: "Invitation revoked",
        message: `${revokeTarget.email}'s invitation link has been canceled.`,
      });
    } catch {
      const current = await refreshInvitations();
      if (current && !current.some((item) => item.id === revokeTarget.id)) {
        revokeDialog.current?.close();
        setToast({
          title: "Invitation list updated",
          message: "That invitation is no longer pending.",
        });
      } else {
        setRevokeError(
          current
            ? "Please try again; this invitation is still pending."
            : "Please check your connection and reload the invitation list.",
        );
      }
    } finally {
      setRevoking(false);
    }
  }

  function manageMember(member: Member, action: "role" | "remove") {
    setMemberTarget(member);
    setMemberAction(action);
    setNextRole(member.role);
    setMemberError("");
    memberDialog.current?.showModal();
  }
  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberTarget || savingMember) return;
    setSavingMember(true);
    setMemberError("");
    try {
      const response = await tabFetch(
        `/api/members/${memberTarget.membershipId}`,
        {
          method: memberAction === "role" ? "PATCH" : "DELETE",
          ...(memberAction === "role"
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: nextRole }),
              }
            : {}),
        },
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error?.message ?? "Unable to update this member.",
        );
      }
      memberDialog.current?.close();
      setToast({
        title: memberAction === "role" ? "Role updated" : "Member removed",
        message: memberTarget.user?.name ?? "Wedding member",
      });
      if (memberTarget.user?.id === currentUserId) {
        router.replace(tabPath("/account"));
        router.refresh();
      } else await load();
    } catch (error) {
      setMemberError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSavingMember(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3.5 py-6 sm:px-6 sm:py-10 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-4 sm:mb-5">
        <Link
          href="/account"
          className="group inline-flex items-center text-xs font-medium text-[#71717a] transition hover:text-[#6d213c]"
        >
          <svg
            className="mr-1.5 h-3.5 w-3.5 transform transition group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          Back to your wedding
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#ebe3da]/60 pb-6 sm:flex-row sm:items-end sm:pb-8">
        <div>
          <p className="mb-1 font-sans text-[11px] font-bold tracking-[0.16em] text-[#6d213c]/90 uppercase sm:mb-1.5">
            Settings / Team
          </p>
          <h1 className="font-editorial text-3xl font-medium tracking-tight text-[#231f20] sm:text-5xl">
            Wedding members
          </h1>
          <p className="mt-1.5 text-xs font-normal text-[#71717a] sm:mt-2 sm:text-sm">
            Invite the people helping you plan your celebration.
          </p>
        </div>
        <button
          onClick={() => inviteDialog.current?.showModal()}
          className="inline-flex shrink-0 items-center justify-center self-start rounded-md bg-[#6d213c] px-3.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#5b1a31] active:scale-[0.98] sm:self-auto sm:px-4 sm:py-2.5"
        >
          <svg
            className="mr-1.5 h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 4v16m8-8H4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
            />
          </svg>
          Invite member
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div
          className="mt-8 space-y-7"
          role="status"
          aria-label="Loading wedding members"
        >
          {/* Skeleton Card 1 */}
          <div className="rounded-xl border border-[#e8e2da] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#f1ede8] pb-4">
              <div className="space-y-2">
                <div className="h-4 w-44 animate-pulse rounded bg-[#f0ede8]" />
                <div className="h-3 w-64 animate-pulse rounded bg-[#f0ede8]" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-[#f0ede8]" />
            </div>
            <div className="mt-5 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-[#f0ede8]" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-32 animate-pulse rounded bg-[#f0ede8]" />
                      <div className="h-2.5 w-48 animate-pulse rounded bg-[#f0ede8]" />
                    </div>
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded bg-[#f0ede8]" />
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton Card 2 */}
          <div className="rounded-xl border border-[#e8e2da] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#f1ede8] pb-4">
              <div className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-[#f0ede8]" />
                <div className="h-3 w-56 animate-pulse rounded bg-[#f0ede8]" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-[#f0ede8]" />
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-[#f0ede8]" />
                <div className="space-y-2">
                  <div className="h-3.5 w-48 animate-pulse rounded bg-[#f0ede8]" />
                  <div className="h-2.5 w-36 animate-pulse rounded bg-[#f0ede8]" />
                </div>
              </div>
              <div className="h-7 w-28 animate-pulse rounded bg-[#f0ede8]" />
            </div>
          </div>
        </div>
      ) : loadError ? (
        <div className="mx-auto mt-8 max-w-lg rounded-xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
              <line
                strokeLinecap="round"
                strokeWidth="1.8"
                x1="12"
                x2="12"
                y1="8"
                y2="12"
              />
              <line
                strokeLinecap="round"
                strokeWidth="2.2"
                x1="12"
                x2="12.01"
                y1="16"
                y2="16"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[#231f20]">
            Unable to load wedding members
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[#71717a]">
            We couldn&apos;t connect to your wedding workspace. Please check
            your internet connection and try reloading this section.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => void load()}
              className="rounded-md bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#5b1a31]"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border border-[#e8e2da] px-4 py-2 text-xs font-medium text-[#71717a] transition hover:bg-[#faf8f5]"
            >
              Reload page
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-7">
          {/* Current Wedding Members Card */}
          <section
            className="overflow-hidden rounded-xl border border-[#e8e2da] bg-white shadow-sm"
            data-purpose="current-members-card"
          >
            <div className="flex items-center justify-between border-b border-[#f1ede8] px-4 py-3.5 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-sm font-semibold text-[#231f20]">
                  Current wedding members
                </h2>
                <p className="mt-0.5 text-xs text-[#71717a]">
                  Active collaborators with access to planning permissions.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#f1ede8] px-2.5 py-1 text-[11px] font-medium text-[#71717a]">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            </div>
            <div className="divide-y divide-[#f1ede8]">
              {members.length === 0 ? (
                <div className="px-4 py-8 text-center sm:px-6 sm:py-9">
                  <p className="text-sm font-semibold text-[#231f20]">
                    No members yet.
                  </p>
                </div>
              ) : (
                members.map((member) => {
                  const initial = getInitial(member.user?.name);
                  const isCurrentUser = member.user?.id === currentUserId;
                  return (
                    <div
                      key={member.membershipId}
                      className="flex flex-col justify-between gap-3 px-4 py-3.5 transition hover:bg-[#faf9f7]/70 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-4"
                    >
                      <div className="flex min-w-0 items-center space-x-3 sm:space-x-3.5">
                        {/* Initials Avatar */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-serif text-xs font-semibold sm:h-10 sm:w-10 sm:text-sm ${
                            isCurrentUser
                              ? "border-[#ecd3dd]/60 bg-[#f8f1f4] text-[#6d213c]"
                              : "border-[#e8e2da] bg-[#f1ede8] text-[#71717a]"
                          }`}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <span className="truncate text-sm font-semibold text-[#231f20]">
                              {member.user?.name ?? "Wedding member"}
                            </span>
                            {isCurrentUser ? (
                              <span className="rounded bg-[#f1ede8] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#71717a]">
                                YOU
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[#71717a]">
                            {member.user?.email ?? "Email unavailable"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 self-start pl-12 sm:gap-2 sm:self-auto sm:pl-0">
                        <RoleBadge role={member.role} />
                        <button
                          className="rounded-md border border-[#e8e2da] px-2.5 py-1.5 text-xs font-medium transition hover:bg-[#faf9f7] disabled:opacity-40 sm:px-3 sm:py-2"
                          disabled={
                            member.role === "ADMIN" &&
                            members.filter((item) => item.role === "ADMIN")
                              .length === 1
                          }
                          onClick={() => manageMember(member, "role")}
                        >
                          Change role
                        </button>
                        <button
                          className="rounded-md border border-[#e8e2da] px-2.5 py-1.5 text-xs font-medium text-[#6d213c] transition hover:bg-rose-50/60 hover:text-rose-700 disabled:opacity-40 sm:px-3 sm:py-2"
                          disabled={
                            member.role === "ADMIN" &&
                            members.filter((item) => item.role === "ADMIN")
                              .length === 1
                          }
                          onClick={() => manageMember(member, "remove")}
                        >
                          {isCurrentUser ? "Leave wedding" : "Remove member"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <p className="text-xs text-[#71717a]">
            Your wedding must always have at least one Admin. Make another
            member an Admin before removing or changing the role of the last
            Admin.
          </p>
          {/* Pending Invitations Card */}
          <section
            className="overflow-hidden rounded-xl border border-[#e8e2da] bg-white shadow-sm"
            data-purpose="pending-invitations-card"
          >
            <div className="flex items-center justify-between border-b border-[#f1ede8] px-4 py-3.5 sm:px-6 sm:py-4">
              <div>
                <h2 className="text-sm font-semibold text-[#231f20]">
                  Pending invitations
                </h2>
                <p className="mt-0.5 text-xs text-[#71717a]">
                  Invitations sent by email awaiting confirmation.
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  invitations.length > 0
                    ? "border border-amber-200/50 bg-amber-50 text-amber-700"
                    : "bg-[#f1ede8] text-[#71717a]"
                }`}
              >
                {invitations.length} pending
              </span>
            </div>
            {invitations.length === 0 ? (
              <div className="px-4 py-10 text-center sm:px-6 sm:py-12">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#f1ede8] text-[#71717a] sm:h-12 sm:w-12">
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-[#231f20]">
                  No pending invitations
                </h3>
                <p className="mt-1 text-xs text-[#71717a]">
                  Invite someone helping you plan your celebration to give them
                  access to this wedding.
                </p>
                <button
                  onClick={() => inviteDialog.current?.showModal()}
                  className="mt-4 inline-flex items-center text-xs font-semibold text-[#6d213c] hover:text-[#5b1a31]"
                >
                  + Invite a member now
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#f1ede8]">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex flex-col justify-between gap-3 px-4 py-3.5 transition hover:bg-[#faf9f7]/70 sm:flex-row sm:items-center sm:px-6 sm:py-4"
                  >
                    <div className="flex min-w-0 items-start space-x-3 sm:items-center sm:space-x-3.5">
                      {/* Clock / Pending indicator */}
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50/70 text-amber-600 sm:mt-0 sm:h-10 sm:w-10">
                        <svg
                          className="h-4 w-4 text-amber-700"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-mono text-[13px] font-medium break-all text-[#231f20] sm:break-normal">
                            {invitation.email}
                          </span>
                          <RoleBadge role={invitation.role} />
                        </div>
                        <p className="mt-0.5 text-xs text-[#71717a]">
                          Expires{" "}
                          {new Date(invitation.expiresAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                          {invitation.createdAt
                            ? ` · ${formatRelativeDate(invitation.createdAt)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 self-start pl-12 sm:self-auto sm:pl-0">
                      <button
                        onClick={() => askToRevoke(invitation)}
                        className="rounded-md border border-[#e8e2da] bg-white px-2.5 py-1.5 text-xs font-medium text-[#71717a] shadow-sm transition hover:border-rose-200 hover:bg-rose-50/60 hover:text-rose-700 sm:px-3"
                      >
                        Revoke invitation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Role Guidelines */}
          <section
            className="rounded-xl border border-[#e8e2da] bg-white/80 p-5 text-xs text-[#71717a]"
            data-purpose="role-guidelines"
          >
            <div className="mb-1 flex items-center space-x-2 text-xs font-semibold text-[#231f20]">
              <svg
                className="h-4 w-4 shrink-0 text-[#c5a880]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                <path
                  d="M12 8v.01M12 11v5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
              <span>Role guidelines</span>
            </div>
            <div className="grid gap-3 pl-6 leading-relaxed sm:grid-cols-2">
              <p>
                <strong className="font-medium text-[#231f20]">Manager:</strong>{" "}
                Helps manage wedding planning across events, tasks, vendors, and
                guest intake.
              </p>
              <p>
                <strong className="font-medium text-[#231f20]">Admin:</strong>{" "}
                Complete authority over wedding settings, invitations, and
                wedding member management.
              </p>
            </div>
          </section>
        </div>
      )}

      <InviteDialog
        dialogRef={inviteDialog}
        onConflict={refreshInvitations}
        onCreated={(invitation) => {
          setInvitations((items) => [invitation, ...items]);
          void refreshInvitations();
          setToast({
            title: "Invitation dispatched",
            message: `Invitation sent to ${invitation.email}.`,
          });
        }}
      />
      <dialog
        ref={memberDialog}
        className="homepage-dialog"
        onCancel={(event) => {
          if (savingMember) event.preventDefault();
        }}
        aria-labelledby="member-action-title"
      >
        <form onSubmit={saveMember} className="dialog-content">
          <h2 id="member-action-title" className="font-editorial text-3xl">
            {memberAction === "role"
              ? "Change wedding role"
              : "Remove wedding member?"}
          </h2>
          <p className="mt-3 text-sm text-[#635559]">
            {memberTarget?.user?.name} · {memberTarget?.user?.email}
          </p>
          {memberAction === "role" ? (
            <label className="mt-5 block text-sm">
              Wedding role
              <select
                value={nextRole}
                onChange={(event) =>
                  setNextRole(event.target.value as "ADMIN" | "MANAGER")
                }
                className="mt-2 block w-full rounded-lg border border-[#e8e2da] p-3"
              >
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
          ) : (
            <p className="mt-5 text-sm">
              They will lose access to this wedding. Their account stays active
              and they can create a new wedding or accept a new invitation.
            </p>
          )}
          {memberError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {memberError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={savingMember}
              onClick={() => memberDialog.current?.close()}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>
            <button
              disabled={savingMember}
              className="rounded-lg bg-[#6d213c] px-4 py-2 text-white"
            >
              {savingMember
                ? "Saving…"
                : memberAction === "role"
                  ? "Save role"
                  : "Remove member"}
            </button>
          </div>
        </form>
      </dialog>
      <dialog
        ref={revokeDialog}
        className="homepage-dialog"
        onClose={() => setRevokeTarget(null)}
      >
        <div className="dialog-content">
          {/* Icon */}
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[#231f20]">
            Revoke invitation?
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#71717a]">
            Revoking the invitation for{" "}
            <strong className="font-mono text-[#231f20]">
              {revokeTarget?.email}
            </strong>{" "}
            will prevent this link from being used to join your wedding.
          </p>
          {revokeError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <p className="font-semibold">
                We couldn&apos;t revoke this invitation.
              </p>
              <p className="mt-0.5 text-[11px]">{revokeError}</p>
            </div>
          ) : null}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              disabled={revoking}
              onClick={() => revokeDialog.current?.close()}
              className="rounded-md border border-[#e8e2da] px-3.5 py-2 text-xs font-medium text-[#71717a] transition hover:bg-[#faf8f5] hover:text-[#231f20]"
            >
              Keep invitation
            </button>
            <button
              disabled={revoking}
              onClick={() => void revoke()}
              className="inline-flex items-center rounded-md bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
            >
              {revoking ? "Revoking…" : "Revoke invitation"}
            </button>
          </div>
        </div>
      </dialog>

      {/* Toast Notification */}
      {toast ? (
        <div
          role="status"
          className="fixed right-6 bottom-6 z-50 flex max-w-sm items-start space-x-3 rounded-lg border border-[#e8e2da] bg-white p-4 shadow-lg transition"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#231f20]">
              {toast.title}
            </p>
            <p className="mt-0.5 text-xs text-[#71717a]">{toast.message}</p>
          </div>
          <button
            className="text-[#71717a] hover:text-[#231f20]"
            onClick={() => setToast(null)}
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RoleBadge({ role }: { role: "ADMIN" | "MANAGER" }) {
  if (role === "MANAGER") {
    return (
      <span className="badge-pill rounded border border-[#ecd3dd]/60 bg-[#f8f1f4] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#6d213c] uppercase">
        Manager
      </span>
    );
  }
  return (
    <span className="badge-pill rounded border border-[#e8e2da] bg-[#f1ede8] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#71717a] uppercase">
      Admin
    </span>
  );
}

function InviteDialog({
  dialogRef,
  onCreated,
  onConflict,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onCreated: (invitation: Invitation) => void;
  onConflict: () => Promise<Invitation[] | null>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<"MANAGER" | "ADMIN">(
    "MANAGER",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      setPending(false);
      return;
    }
    try {
      const response = await tabFetch("/api/members/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: selectedRole,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.code === "INVITATION_PENDING") await onConflict();
        const messages: Record<string, string> = {
          ALREADY_MEMBER: "This person is already a member of your wedding.",
          ALREADY_HAS_WEDDING:
            "This person already belongs to another wedding. They must leave that wedding or use a different account before joining yours.",
          INVITATION_PENDING: "An invitation to this email is already waiting.",
          VALIDATION_ERROR: "Enter a valid email address.",
          EMAIL_DELIVERY_FAILED:
            "We couldn't deliver the invitation email. Please try again.",
          INVITATION_NOT_CONFIGURED:
            "Invitations aren't configured yet. Contact support.",
        };
        setError(
          result.error?.code === "EMAIL_DELIVERY_FAILED" &&
            result.error?.message
            ? result.error.message
            : (messages[result.error?.code] ??
                "We couldn't send the invitation."),
        );
        return;
      }
      onCreated(result.data);
      form.reset();
      setSelectedRole("MANAGER");
      dialogRef.current?.close();
    } catch {
      setError("We couldn't send the invitation.");
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="homepage-dialog"
      onClose={() => {
        setError("");
        setSelectedRole("MANAGER");
      }}
    >
      <form onSubmit={submit} noValidate className="dialog-content">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#f1ede8] pb-4">
          <div>
            <span className="text-[10px] font-bold tracking-[0.16em] text-[#6d213c]/90 uppercase">
              Workspace Collaborators
            </span>
            <h2 className="font-editorial mt-0.5 text-2xl font-semibold text-[#231f20]">
              Invite a wedding member
            </h2>
            <p className="mt-0.5 text-xs text-[#71717a]">
              Invite someone who is helping plan the wedding.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-sm text-[#71717a] hover:text-[#231f20]"
            onClick={() => dialogRef.current?.close()}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-[#3f3f46]">
              Email address <span className="text-[#6d213c]">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              placeholder="name@example.com"
              disabled={pending}
              className="mt-1 h-10 w-full rounded-md border border-[#e8e2da] bg-white px-3 text-xs placeholder:text-[#a1a1aa] focus:border-[#6d213c] focus:ring-2 focus:ring-[#6d213c]/20 focus:outline-none"
            />
          </div>

          {/* Role selection */}
          <div>
            <label className="block text-xs font-semibold text-[#3f3f46]">
              Assign workspace role <span className="text-[#6d213c]">*</span>
            </label>
            <div
              className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
              role="radiogroup"
            >
              <label
                className={`relative flex cursor-pointer flex-col rounded-lg border p-3.5 transition hover:border-[#6d213c]/60 ${
                  selectedRole === "MANAGER"
                    ? "border-[#6d213c] bg-[#f8f1f4]/30"
                    : "border-[#e8e2da]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#231f20]">
                    Manager
                  </span>
                  <input
                    type="radio"
                    name="role"
                    value="MANAGER"
                    checked={selectedRole === "MANAGER"}
                    onChange={() => setSelectedRole("MANAGER")}
                    className="text-[#6d213c] focus:ring-[#6d213c]/20"
                    disabled={pending}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#71717a]">
                  Manages wedding timeline, checklists, vendors, and RSVP guest
                  data.
                </p>
              </label>
              <label
                className={`relative flex cursor-pointer flex-col rounded-lg border p-3.5 transition hover:border-[#e8e2da] ${
                  selectedRole === "ADMIN"
                    ? "border-[#6d213c] bg-[#f8f1f4]/30"
                    : "border-[#e8e2da]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#231f20]">
                    Admin
                  </span>
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={selectedRole === "ADMIN"}
                    onChange={() => setSelectedRole("ADMIN")}
                    className="text-[#6d213c] focus:ring-[#6d213c]/20"
                    disabled={pending}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#71717a]">
                  Full authority over settings, financial trackers, and team
                  permissions.
                </p>
              </label>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start space-x-2 rounded-md border border-[#e8e2da]/80 bg-[#faf8f5] p-3 text-[11px] text-[#71717a]">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
            <span>
              An invitation link will be emailed to collaborate on this
              workspace.
            </span>
          </div>

          {error ? (
            <div className="flex items-center space-x-1.5 rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-rose-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
                <line
                  strokeLinecap="round"
                  strokeWidth="1.8"
                  x1="12"
                  x2="12"
                  y1="8"
                  y2="12"
                />
                <line
                  strokeLinecap="round"
                  strokeWidth="2.2"
                  x1="12"
                  x2="12.01"
                  y1="16"
                  y2="16"
                />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              className="rounded-md border border-[#e8e2da] px-4 py-2 text-xs font-medium text-[#71717a] transition hover:bg-[#faf8f5] hover:text-[#231f20]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center space-x-1.5 rounded-md bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#5b1a31] active:scale-[0.98] disabled:opacity-60"
            >
              <span>{pending ? "Sending…" : "Send invitation"}</span>
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
