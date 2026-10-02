"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const draftKey = "mmm-wedding-edit-draft";
const timeZones = [
  ["Asia/Karachi", "Pakistan Standard Time · PKT (UTC+05:00)"],
  ["Asia/Kolkata", "India Standard Time · IST (UTC+05:30)"],
  ["Asia/Dubai", "Gulf Standard Time · GST (UTC+04:00)"],
  ["Europe/London", "Greenwich Mean Time · GMT (UTC+00:00)"],
  ["America/New_York", "Eastern Time · ET (UTC-05:00)"],
] as const;

export type WeddingDraft = {
  brideName: string;
  groomName: string;
  weddingDate: string;
  location: string;
  title: string;
  description: string;
  timeZone: string;
  slug: string;
};

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-[#D8D0C7] bg-white px-4 font-sans text-sm font-medium text-[#262424] placeholder:text-[#8C8583] outline-none transition-colors focus:border-[#6D213C] focus:ring-2 focus:ring-[#6D213C]/10 disabled:opacity-60";

const labelClass =
  "block text-[11px] font-semibold tracking-wide text-[#262424] uppercase";

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function previewSlug(draft: WeddingDraft) {
  const [year, month, day] = draft.weddingDate.split("-");
  if (!year || !month || !day) return draft.slug;
  const bride = slugifyName(draft.brideName);
  const groom = slugifyName(draft.groomName);
  if (!bride || !groom) return draft.slug;
  return `${bride}-${groom}-${day}${month}${year}`;
}

function readDraft(wedding: WeddingDraft): WeddingDraft | null {
  const saved = sessionStorage.getItem(draftKey);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as WeddingDraft;
    if (parsed.slug === wedding.slug) return parsed;
  } catch {
    sessionStorage.removeItem(draftKey);
  }
  return null;
}

export function EditForm({ wedding }: { wedding: WeddingDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState(wedding);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [titleSuggested, setTitleSuggested] = useState(false);

  useEffect(() => {
    const saved = readDraft(wedding);
    if (saved) {
      setDraft(saved);
      setDirty(true);
    }
    setReady(true);
  }, [wedding]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function writeDraft(next: WeddingDraft) {
    sessionStorage.setItem(
      draftKey,
      JSON.stringify({ ...next, slug: wedding.slug }),
    );
  }

  function change(name: keyof WeddingDraft, value: string) {
    setDraft((current) => {
      const next = { ...current, [name]: value };
      const suggested = `${current.brideName.trim()} & ${current.groomName.trim()}`;
      if (
        titleSuggested &&
        (name === "brideName" || name === "groomName") &&
        current.title === suggested
      ) {
        next.title = "";
      }
      writeDraft(next);
      return next;
    });
    setDirty(true);
  }

  function suggest() {
    const bride = draft.brideName.trim();
    const groom = draft.groomName.trim();
    if (!bride || !groom) return;
    const next = { ...draft, title: `${bride} & ${groom}` };
    setTitleSuggested(true);
    setDraft(next);
    setDirty(true);
    writeDraft(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/wedding", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brideName: draft.brideName,
          groomName: draft.groomName,
          weddingDate: draft.weddingDate,
          title: draft.title,
          description: draft.description,
          timeZone: draft.timeZone,
          location: { formattedAddress: draft.location },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setError(result.error?.message ?? "Please try again.");
        return;
      }
      sessionStorage.removeItem(draftKey);
      setDirty(false);
      router.replace("/account");
      router.refresh();
    } catch {
      setError("We couldn't connect. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" aria-label="Edit wedding">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#ebe5df] bg-[#f7f1eb] px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0e8e2] text-[#6d213c]">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path
                d="M10 1.5C7 1.5 4.5 4 4.5 7c0 4.5 5.5 10 5.5 10s5.5-5.5 5.5-10C15.5 4 13 1.5 10 1.5z"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="7" r="2" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-[#867276] uppercase">
              Wedding address
            </p>
            <p className="mt-0.5 font-mono text-sm font-medium text-[#1e1a1f]">
              {ready ? previewSlug(draft) : wedding.slug}
            </p>
          </div>
        </div>
        <p className="max-w-[220px] text-[12px] leading-5 text-[#867276] sm:text-right">
          Updates when you save a new name or date.
        </p>
      </div>
      {/* Bride & Groom names */}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Bride's name"
          name="brideName"
          required
          value={draft.brideName}
          onChange={change}
          disabled={pending}
        />
        <TextField
          label="Groom's name"
          name="groomName"
          required
          value={draft.groomName}
          onChange={change}
          disabled={pending}
        />
      </div>

      {/* Wedding date & location */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="weddingDate">
            Wedding date <Required />
          </label>
          <span className="relative block">
            <input
              id="weddingDate"
              name="weddingDate"
              type="date"
              required
              value={draft.weddingDate}
              onChange={(event) => change("weddingDate", event.target.value)}
              className={`${inputClass} scheme-light`}
              disabled={pending}
            />
          </span>
        </div>
        <div>
          <label className={labelClass} htmlFor="location">
            Wedding city / location <Required />
          </label>
          <span className="relative block">
            <input
              id="location"
              name="location"
              required
              maxLength={300}
              value={draft.location}
              onChange={(event) => change("location", event.target.value)}
              className={`${inputClass} pr-10`}
              disabled={pending}
            />
            <PinIcon />
          </span>
        </div>
      </div>

      {/* Wedding title */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClass} htmlFor="title">
            Wedding title{" "}
            <span className="font-normal tracking-normal text-[#8C8583] normal-case">
              (optional)
            </span>
          </label>
          <button
            type="button"
            onClick={suggest}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D213C] transition-colors hover:text-[#58192F]"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.2 1.2 7 3.6l2.4.8L7 5.2l-.8 2.4L5.4 5.2 3 4.4l2.4-.8.8-2.4zM11.2 6.4l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5zM10.4 11.2l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4.4-1.1z" />
            </svg>
            Suggest from names
          </button>
        </div>
        <input
          id="title"
          name="title"
          maxLength={150}
          value={draft.title}
          onChange={(event) => change("title", event.target.value)}
          className={inputClass}
          disabled={pending}
        />
        <p className="mt-1.5 text-xs text-[#8C8583]">
          This title introduces your shared planning space and guest
          correspondence.
        </p>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass} htmlFor="description">
          Description{" "}
          <span className="font-normal tracking-normal text-[#8C8583] normal-case">
            (optional)
          </span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          value={draft.description}
          onChange={(event) => change("description", event.target.value)}
          className={`${inputClass} h-auto resize-none py-3 leading-relaxed`}
          disabled={pending}
        />
      </div>

      {/* Time zone */}
      <div>
        <label className={labelClass} htmlFor="timeZone">
          Time zone
        </label>
        <div className="relative">
          <select
            id="timeZone"
            name="timeZone"
            value={draft.timeZone}
            onChange={(event) => change("timeZone", event.target.value)}
            className={`${inputClass} appearance-none pr-10`}
            disabled={pending}
          >
            {timeZones.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
            {!timeZones.some(([value]) => value === draft.timeZone) && (
              <option value={draft.timeZone}>{draft.timeZone}</option>
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#666160]">
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path
                d="M6 8l4 4 4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#F8D7DA] bg-[#FDF2F2] p-3 text-sm text-[#B42318]"
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-4 border-t border-[#E8E2DC] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-[#8C8583]">
          Changes are saved to this wedding only.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            onClick={(event) => {
              if (dirty && !window.confirm("Leave without saving these changes?")) {
                event.preventDefault();
                return;
              }
              sessionStorage.removeItem(draftKey);
            }}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#D8D0C7] px-5 text-sm font-medium text-[#262424] transition-colors hover:bg-[#FAF8F5] sm:flex-none"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6D213C] px-6 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#58192F] hover:shadow disabled:opacity-60 sm:flex-none"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Required() {
  return <span className="text-[#9a435e]">*</span>;
}

function TextField({
  label,
  name,
  required,
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: "brideName" | "groomName";
  required?: boolean;
  value: string;
  onChange: (name: "brideName" | "groomName", value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={name}>
        {label} {required && <Required />}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        maxLength={100}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className={inputClass}
        disabled={disabled}
      />
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#666160]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}
