"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AUTH_CHANNEL } from "../homepage/session-actions";

const timeZones = [
  ["Asia/Karachi", "Asia/Karachi (GMT+05:00)"],
  ["Asia/Kolkata", "India Standard Time (Asia/Kolkata GMT+05:30)"],
  ["Asia/Dubai", "Gulf Standard Time (Asia/Dubai GMT+04:00)"],
  ["Europe/London", "London (GMT+00:00 / BST)"],
  ["America/New_York", "Eastern Time (America/New_York GMT-05:00)"],
] as const;

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-[#D8D0C7] bg-white px-4 font-sans text-sm font-medium text-[#262424] placeholder:text-[#8C8583] outline-none transition-colors focus:border-[#6D213C] focus:ring-2 focus:ring-[#6D213C]/10 disabled:opacity-60";

export function SetupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function suggest(event: FormEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const bride = String(new FormData(form).get("brideName") ?? "").trim();
    const groom = String(new FormData(form).get("groomName") ?? "").trim();
    const title = form.elements.namedItem("title");
    if (title instanceof HTMLInputElement && bride && groom)
      title.value = `${bride} & ${groom}`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const location = String(data.get("location") ?? "").trim();
    try {
      const response = await fetch("/api/wedding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brideName: data.get("brideName"),
          groomName: data.get("groomName"),
          weddingDate: data.get("weddingDate"),
          title: data.get("title") || undefined,
          description: data.get("description") || undefined,
          timeZone: data.get("timeZone"),
          location: location ? { formattedAddress: location } : undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error?.message ?? "Please try again.");
        return;
      }
      try {
        const channel = new BroadcastChannel(AUTH_CHANNEL);
        channel.postMessage("wedding");
        channel.close();
      } catch {
        // Older browsers still show the wedding in this tab.
      }
      router.replace("/account");
      router.refresh();
    } catch {
      setError("We couldn’t connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6"
      aria-label="Create your wedding"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Bride’s name"
          name="brideName"
          required
          placeholder="Saman"
        />
        <Field
          label="Groom’s name"
          name="groomName"
          required
          placeholder="Hasan"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass} htmlFor="weddingDate">
          Wedding date <Required />
          <span className="relative block">
            <input
              id="weddingDate"
              name="weddingDate"
              type="date"
              required
              className={`${inputClass} pr-10 scheme-light [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
              disabled={pending}
            />
            <CalendarIcon />
          </span>
        </label>
        <label className={labelClass} htmlFor="location">
          Wedding city / location <Required />
          <span className="relative block">
            <input
              id="location"
              name="location"
              required
              maxLength={300}
              placeholder="Lahore, Pakistan"
              className={`${inputClass} pr-10`}
              disabled={pending}
            />
            <PinIcon />
          </span>
        </label>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass} htmlFor="title">
            Wedding title{" "}
            <span className="font-normal tracking-normal text-[#a39a94] normal-case">
              (optional)
            </span>
          </label>
          <button
            type="button"
            onClick={suggest}
            className="text-[12px] font-medium text-[#6d213c]"
          >
            ✦ Suggest from names
          </button>
        </div>
        <input
          id="title"
          name="title"
          maxLength={150}
          placeholder="Saman & Hasan"
          className={inputClass}
          disabled={pending}
        />
      </div>
      <label className={labelClass} htmlFor="description">
        Description{" "}
        <span className="font-normal tracking-normal text-[#a39a94] normal-case">
          (optional)
        </span>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          placeholder="An intimate Nikah ceremony and festive Walima in Lahore with our loved ones."
          className={`${inputClass} h-auto py-3`}
          disabled={pending}
        />
      </label>
      <label className={labelClass} htmlFor="timeZone">
        Time zone
        <select
          id="timeZone"
          name="timeZone"
          defaultValue="Asia/Karachi"
          className={inputClass}
          disabled={pending}
        >
          {timeZones.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
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
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#5c1a33] text-[15px] font-medium text-white hover:bg-[#4a1529] disabled:opacity-60"
      >
        {pending ? "Creating wedding…" : "Create wedding workspace"}
        {!pending && <span aria-hidden="true">→</span>}
      </button>
      <p className="text-center text-[12px] leading-5 text-[#867276]">
        You’ll be the Admin of this wedding. You can change these details and
        invite family anytime.
      </p>
    </form>
  );
}

const labelClass =
  "block text-[11px] font-semibold tracking-wide text-[#262424] uppercase";

function Required() {
  return <span className="text-[#9a435e]">*</span>;
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className={labelClass} htmlFor={name}>
      {label} {required && <Required />}
      <input
        id={name}
        name={name}
        required={required}
        maxLength={required ? 100 : 300}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#867276]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#867276]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}
