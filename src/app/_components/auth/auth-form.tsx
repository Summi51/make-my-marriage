"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AUTH_CHANNEL } from "../homepage/session-actions";
import { tabFetch, tabPath } from "@/lib/tab-session";

export function AuthForm({
  mode,
  nextPath = "/account",
  email = "",
}: {
  mode: "signup" | "login";
  nextPath?: string;
  email?: string;
}) {
  const invitedEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  const signup = mode === "signup";
  const switchParams = new URLSearchParams();
  if (nextPath !== "/account") switchParams.set("next", nextPath);
  if (invitedEmail) switchParams.set("email", invitedEmail);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessionKnown, setSessionKnown] = useState(false);
  useEffect(() => {
    let ignore = false;
    async function redirectIfSignedIn() {
      try {
        const response = await tabFetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (ignore) return;
        if (response.ok) {
          router.replace(tabPath(nextPath));
          return;
        }
      } catch {
        if (ignore) return;
      }
      setSessionKnown(true);
    }
    void redirectIfSignedIn();
    return () => {
      ignore = true;
    };
  }, [nextPath, router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await tabFetch(`/api/auth/${mode}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(signup ? { name: data.get("name") } : {}),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "Please try again.");
        return;
      }
      try {
        const channel = new BroadcastChannel(AUTH_CHANNEL);
        channel.postMessage("login");
        channel.close();
      } catch {
        // Older browsers still sign in in this tab.
      }
      router.replace(tabPath(nextPath));
      router.refresh();
    } catch {
      setError("We couldn’t connect. Please try again.");
    } finally {
      setPending(false);
    }
  }
  const inputClass =
    "mt-1.5 h-[50px] w-full rounded-xl border border-transparent bg-[#ebf3fc] px-4 text-base text-[#1e1a1f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-colors placeholder:text-[#867276] focus:border-[#500926]/40 focus:bg-white focus:ring-4 focus:ring-[#500926]/5 sm:text-sm";
  if (!sessionKnown) {
    return (
      <p className="text-sm text-[#635559]" role="status">
        One moment…
      </p>
    );
  }
  return (
    <>
      <p className="mb-3 font-sans text-[11px] font-semibold tracking-[0.22em] text-[#9b6647] uppercase">
        A Beautiful Beginning
      </p>
      <h1 className="font-editorial text-[42px] leading-[1.08] font-normal tracking-[-0.01em] text-[#500926] sm:text-[46px] lg:text-[48px]">
        {invitedEmail ? (
          signup ? (
            "Create your account to join the celebration."
          ) : (
            "Sign in to join the celebration."
          )
        ) : signup ? (
          <>
            Your big day
            <br />
            starts here.
          </>
        ) : (
          <>
            Welcome back
            <br />
            to your big day.
          </>
        )}
      </h1>
      <p className="mt-3 pt-1 text-sm leading-relaxed text-[#635559]">
        {invitedEmail
          ? "Use the email address your invitation was sent to. You’ll return to your invitation after signing in or creating your account."
          : signup
            ? "Create your Make My Marriage account. Bring your people, plans and celebrations together."
            : "Sign in to your Make My Marriage account. We’re happy to see you again."}
      </p>
      <form
        onSubmit={submit}
        className="mt-7 space-y-5"
        aria-label={signup ? "Create account" : "Sign in"}
      >
        {signup && (
          <label
            className="block text-[13px] font-medium text-[#2d282c]"
            htmlFor="name"
          >
            Your name
            <input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Your full name"
              required
              maxLength={100}
              className={inputClass}
              disabled={pending}
            />
          </label>
        )}
        <label
          className="block text-[13px] font-medium text-[#2d282c]"
          htmlFor="email"
        >
          Email address
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@domain.com"
            required
            maxLength={254}
            defaultValue={invitedEmail}
            readOnly={Boolean(invitedEmail)}
            className={inputClass}
            disabled={pending}
          />
        </label>
        <div>
          <label
            className="block text-[13px] font-medium text-[#2d282c]"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={signup ? "Create a password" : "Enter your password"}
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={signup ? 12 : 1}
              maxLength={128}
              required
              aria-describedby={signup ? "password-hint" : undefined}
              className={`${inputClass} mt-0 pr-20`}
              disabled={pending}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-4 text-[13px] font-medium text-[#500926] hover:text-[#6d213c]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {signup && (
          <p id="password-hint" className="text-xs leading-5 text-gray-600">
            Use 12–128 characters. A memorable passphrase works well.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#500926] px-5 font-sans text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-[#6d213c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "One moment…" : signup ? "Create account" : "Sign in"}
          {!pending && <span aria-hidden="true">→</span>}
        </button>
      </form>
      <p className="mt-8 text-center text-[13px] text-[#635559]">
        {signup ? "Already have an account?" : "New to Make My Marriage?"}{" "}
        <Link
          href={tabPath(
            `${signup ? "/login" : "/signup"}${switchParams.size ? `?${switchParams}` : ""}`,
          )}
          className="font-medium text-[#500926] underline underline-offset-4 hover:text-[#6d213c]"
        >
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </>
  );
}
