"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../homepage/logo";
import { tabFetch, tabPath } from "@/lib/tab-session";

type Invite = {
  state: "PENDING" | "EXPIRED" | "ACCEPTED";
  email: string;
  role: "ADMIN" | "MANAGER";
  accountExists: boolean;
  wedding: { brideName: string; groomName: string; weddingDate: string };
};
type Viewer = {
  user: { email: string };
  membership: { role: "ADMIN" | "MANAGER" } | null;
  wedding: { id: string } | null;
};

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function InvitationAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode("");
    try {
      const [inviteResponse, viewerResponse] = await Promise.all([
        tabFetch(`/api/public/member-invitations/${token}`, {
          cache: "no-store",
        }),
        tabFetch("/api/auth/me", { cache: "no-store" }),
      ]);
      if (!inviteResponse.ok) {
        const result = await inviteResponse.json();
        setErrorCode(result.error?.code ?? "NETWORK");
        return;
      }
      setInvite((await inviteResponse.json()).data);
      if (viewerResponse.ok) setViewer((await viewerResponse.json()).data);
      else if (viewerResponse.status === 401) setViewer(null);
      else setErrorCode("NETWORK");
    } catch {
      setErrorCode("NETWORK");
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    // Loading remote state is the purpose of this mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function join() {
    if (joining) return;
    setJoining(true);
    setErrorCode("");
    try {
      const response = await tabFetch(
        `/api/member-invitations/${token}/accept`,
        {
          method: "POST",
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setErrorCode(result.error?.code ?? "NETWORK");
        return;
      }
      setAccepted(true);
    } catch {
      setErrorCode("NETWORK");
    } finally {
      setJoining(false);
    }
  }
  async function signOut() {
    try {
      const response = await tabFetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      const params = new URLSearchParams({
        next: `/member-invitations/${token}`,
      });
      if (invite?.email) params.set("email", invite.email);
      router.push(
        tabPath(`/${invite?.accountExists ? "login" : "signup"}?${params}`),
      );
      router.refresh();
    } catch {
      setErrorCode("NETWORK");
    }
  }

  const returnPath = `/member-invitations/${token}`;
  let content;
  if (loading)
    content = (
      <p role="status" className="text-sm text-[#635559]">
        Opening your invitation…
      </p>
    );
  else if (accepted)
    content = (
      <State
        title="You’re part of the celebration"
        body="Invitation accepted. Welcome to the wedding workspace."
        action={
          <Link href="/account" className={primary}>
            Go to your wedding
          </Link>
        }
      />
    );
  else if (errorCode === "NETWORK")
    content = (
      <State
        title="We couldn't open this invitation"
        body="Check your connection and try again."
        action={
          <button onClick={() => void load()} className={secondary}>
            Retry
          </button>
        }
      />
    );
  else if (errorCode === "INVITATION_REVOKED" || errorCode === "INVALID_TOKEN")
    content = (
      <State
        title="This invitation is no longer available"
        body="Ask the wedding Admin for a new invitation."
      />
    );
  else if (errorCode === "INVITATION_EMAIL_MISMATCH")
    content = (
      <State
        title="This invitation is for another email"
        body={`Sign in with ${invite?.email ?? "the invited email address"} to continue.`}
        action={
          <button onClick={() => void signOut()} className={secondary}>
            Sign out and use another account
          </button>
        }
      />
    );
  else if (
    invite?.state === "PENDING" &&
    viewer &&
    viewer.user.email.toLowerCase() !== invite.email.toLowerCase()
  )
    content = (
      <State
        title="This invitation is for another email"
        body={`You’re signed in as ${viewer.user.email} in this tab, but this invitation was sent to ${invite.email}. Signing out here does not sign out your other tabs.`}
        action={
          <button onClick={() => void signOut()} className={secondary}>
            Sign out and use another account
          </button>
        }
      />
    );
  else if (
    errorCode === "ALREADY_HAS_WEDDING" ||
    (viewer?.wedding && invite?.state === "PENDING")
  )
    content = (
      <State
        title="Your account already belongs to a wedding"
        body="One account can belong to one wedding workspace."
        action={
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/account" className={secondary}>
              Go to your wedding
            </Link>
            <button onClick={() => void signOut()} className={primary}>
              Sign out and use another account
            </button>
          </div>
        }
      />
    );
  else if (errorCode === "TOKEN_EXPIRED" || invite?.state === "EXPIRED")
    content = (
      <State
        title="This invitation has expired"
        body="Ask the wedding Admin to send a new one."
      />
    );
  else if (
    errorCode === "INVITATION_ALREADY_ACCEPTED" ||
    invite?.state === "ACCEPTED"
  )
    content = (
      <State
        title="This invitation has already been used"
        body="If it was accepted by you, open your wedding workspace."
        action={
          viewer?.membership && viewer.wedding ? (
            <Link href="/account" className={primary}>
              Go to wedding
            </Link>
          ) : undefined
        }
      />
    );
  else if (errorCode)
    content = (
      <State
        title="We couldn't open this invitation"
        body="Please try again. If the problem continues, ask a wedding Admin for help."
        action={
          <button onClick={() => void load()} className={secondary}>
            Retry
          </button>
        }
      />
    );
  else if (!viewer) {
    const registered = invite?.accountExists === true;
    const entryParams = new URLSearchParams({
      next: returnPath,
      ...(invite?.email ? { email: invite.email } : {}),
    });
    const entryHref = `/${registered ? "login" : "signup"}?${entryParams}`;
    content = (
      <State
        title="You’re invited to help plan this wedding"
        body={
          registered
            ? "Sign in with the invited email, then accept this invitation."
            : "Create an account with the invited email, then accept this invitation."
        }
        details={
          invite ? (
            <InvitationDetails email={invite.email} role={invite.role} />
          ) : null
        }
        action={
          <Link href={entryHref} className={`${primary} w-full`}>
            {registered ? "Sign in" : "Create account"}
          </Link>
        }
      />
    );
  } else
    content = (
      <State
        title="Accept this invitation"
        body={`You’ve been invited to help plan this celebration in a shared wedding workspace. Signed in as ${viewer.user.email}.`}
        details={
          invite ? (
            <InvitationDetails email={invite.email} role={invite.role} />
          ) : null
        }
        action={
          <button
            onClick={() => void join()}
            disabled={joining}
            className={`${primary} w-full`}
          >
            {joining ? "Accepting…" : "Accept invitation"}
          </button>
        }
      />
    );

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1e1a1f]">
      <header className="border-b border-[#ebe5df] bg-white px-6 py-5">
        <Link
          href="/"
          className="font-editorial mx-auto flex max-w-5xl items-center gap-3 text-xl"
        >
          <Logo className="h-9 w-9" />
          Make My Marriage
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-5 py-12 sm:py-20">
        <div className="rounded-2xl border border-[#ebe5df] bg-white p-7 text-center shadow-sm sm:p-10">
          <svg
            aria-hidden="true"
            viewBox="0 0 100 64"
            className="mx-auto mb-5 h-14 w-24 fill-none stroke-[#b5a17e]"
            strokeWidth="1"
          >
            <path d="M8 60Q25 20 50 8Q75 20 92 60M20 60Q32 30 50 20Q68 30 80 60" />
            <path d="M50 1v4m0 24v5" />
          </svg>
          <p className="mb-5 text-[10px] tracking-[0.18em] text-[#867276] uppercase">
            Wedding workspace invitation
          </p>
          {invite ? (
            <div className="mb-8">
              <h1 className="font-editorial text-4xl text-[#6d213c] sm:text-5xl">
                {invite.wedding.brideName} & {invite.wedding.groomName}
              </h1>
              <p className="mt-3 text-sm text-[#635559]">
                {dateLabel(invite.wedding.weddingDate)}
              </p>
            </div>
          ) : null}
          {content}
        </div>
      </main>
    </div>
  );
}

const primary =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5c1a33] px-5 text-sm font-semibold text-white hover:bg-[#4a1529] disabled:opacity-60";
const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8d0c7] bg-white px-5 text-sm font-semibold text-[#5c1a33] hover:bg-[#f6f1ec]";
function InvitationDetails({
  email,
  role,
}: {
  email: string;
  role: "ADMIN" | "MANAGER";
}) {
  return (
    <dl className="mt-6 space-y-4 rounded-2xl border border-[#ebe5df] bg-[#faf8f5] px-5 py-4 text-left">
      <div>
        <dt className="text-[11px] font-semibold tracking-[0.14em] text-[#8a8082] uppercase">
          Invited email
        </dt>
        <dd className="mt-1 text-sm break-all text-[#1e1a1f]">{email}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold tracking-[0.14em] text-[#8a8082] uppercase">
          Assigned role
        </dt>
        <dd className="mt-1 text-sm font-semibold text-[#5c1a33]">
          {role === "ADMIN" ? "Admin" : "Manager"}
        </dd>
      </div>
    </dl>
  );
}

function State({
  title,
  body,
  details,
  action,
}: {
  title: string;
  body: string;
  details?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <>
      <h2 className="font-editorial text-3xl text-[#1e1a1f]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#635559]">
        {body}
      </p>
      {details}
      {action ? <div className="mt-6">{action}</div> : null}
    </>
  );
}
