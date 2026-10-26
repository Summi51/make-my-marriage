"use client";
import { tabFetch, tabPath } from "@/lib/tab-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { eventTypeLabels, eventTypes } from "@/modules/events/schemas";
import {
  dateInputValue,
  timeInputValue,
  timeZoneLabel,
  zonedDateTime,
} from "@/modules/events/format";
import type { EventDto } from "./event-card";

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[#e6dfdf] bg-white px-3.5 text-sm text-[#252126] outline-none transition focus:border-[#6d213c] focus:ring-2 focus:ring-[#6d213c]/20 disabled:opacity-60";

export function EventForm({
  timeZone,
  event,
}: {
  timeZone: string;
  event?: EventDto;
}) {
  const router = useRouter();
  const editing = Boolean(event);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [startTimeMissing, setStartTimeMissing] = useState(false);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (pending) return;
    setError("");
    setStartTimeMissing(false);
    const data = new FormData(formEvent.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const type = String(data.get("type") ?? "");
    const startDate = String(data.get("startDate") ?? "");
    const startTime = String(data.get("startTime") ?? "");
    const endDate = String(data.get("endDate") ?? "");
    const endTime = String(data.get("endTime") ?? "");
    if (!name) {
      setError("Event name is required.");
      return;
    }
    if (!startDate || !startTime) {
      setStartTimeMissing(true);
      setError("Start date and start time are required.");
      return;
    }
    const startsAt = zonedDateTime(startDate, startTime, timeZone);
    if (!startsAt) {
      setError("Enter a valid start date and time in the wedding time zone.");
      return;
    }
    if ((endDate && !endTime) || (!endDate && endTime)) {
      setError("Provide both an end date and end time, or leave both empty.");
      return;
    }
    let endsAt: string | null = null;
    if (endDate && endTime) {
      const parsed = zonedDateTime(endDate, endTime, timeZone);
      if (!parsed) {
        setError("Enter a valid end date and time in the wedding time zone.");
        return;
      }
      if (parsed <= startsAt) {
        setError("The end must be after the start.");
        return;
      }
      endsAt = parsed.toISOString();
    }
    const body = {
      name,
      type: type || undefined,
      startsAt: startsAt.toISOString(),
      endsAt,
      venueName: String(data.get("venueName") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      description: String(data.get("description") ?? "").trim(),
      dressCode: String(data.get("dressCode") ?? "").trim(),
    };
    setPending(true);
    try {
      const response = await tabFetch(
        editing ? `/api/events/${event?.id}` : "/api/events",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          result?.error?.message ??
            (editing
              ? "We couldn't save this event."
              : "We couldn't create this event."),
        );
      }
      const id = editing ? event?.id : result?.data?.id;
      router.push(tabPath(`/account/wedding/events/${id}`));
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't save this event.",
      );
    } finally {
      setPending(false);
    }
  }

  const startDate = event ? dateInputValue(event.startsAt, timeZone) : "";
  const startTime = event ? timeInputValue(event.startsAt, timeZone) : "";
  const endDate = event?.endsAt ? dateInputValue(event.endsAt, timeZone) : "";
  const endTime = event?.endsAt ? timeInputValue(event.endsAt, timeZone) : "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <Link
        href={
          editing
            ? `/account/wedding/events/${event?.id}`
            : "/account/wedding/events"
        }
        className="text-xs font-medium text-[#676169] transition hover:text-[#6d213c]"
      >
        ← {editing ? "Back to event" : "Back to events"}
      </Link>
      <p className="mt-5 text-[11px] font-semibold tracking-[0.16em] text-[#6d213c] uppercase">
        Itinerary management
      </p>
      <h1 className="font-editorial mt-2 text-4xl text-[#1e1a1f] sm:text-5xl">
        {editing ? "Edit event" : "Add an event"}
      </h1>
      <p className="mt-2 mb-8 text-sm text-[#676169]">
        {editing
          ? "Update this celebration. Archived events stay read-only."
          : "Create a new celebration for your wedding itinerary."}
      </p>
      <form
        onSubmit={submit}
        onChange={() => setDirty(true)}
        className="space-y-6"
      >
        <FormSection
          number={1}
          title="Event details"
          subtitle="Basic information and nature of this celebration."
        >
          <Field label="Event name" required>
            <input
              name="name"
              required
              maxLength={150}
              defaultValue={event?.name ?? ""}
              placeholder="e.g. Mehendi & Dholki Night"
              className={inputClass}
            />
          </Field>
          <Field label="Event type">
            <select
              name="type"
              defaultValue={event?.type ?? ""}
              className={inputClass}
            >
              <option value="">Custom event</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {eventTypeLabels[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" optional full>
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={event?.description ?? ""}
              placeholder="Add schedule notes, themes, or special details for this event."
              className={`${inputClass} h-auto py-2.5`}
            />
          </Field>
        </FormSection>
        <FormSection
          number={2}
          title="Date & time"
          subtitle="Specify the planned schedule of your celebration."
        >
          <p className="rounded-lg border border-[#e6dfdf] bg-[#faf8f5] px-3.5 py-2.5 text-xs text-[#676169] sm:col-span-2">
            All times in {timeZoneLabel(timeZone)}. All events follow the
            wedding time zone.
          </p>
          <Field label="Start date" required>
            <input
              type="date"
              name="startDate"
              required
              defaultValue={startDate}
              className={inputClass}
            />
          </Field>
          <Field label="Start time" required>
            <input
              type="time"
              name="startTime"
              required
              defaultValue={startTime}
              className={inputClass}
            />
            {startTimeMissing ? (
              <p className="mt-1 text-xs text-[#6d213c]">
                Choose a start time.
              </p>
            ) : null}
          </Field>
          <Field label="End date" optional>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className={inputClass}
            />
          </Field>
          <Field label="End time" optional>
            <input
              type="time"
              name="endTime"
              defaultValue={endTime}
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-[#676169] sm:col-span-2">
            For an overnight event, choose the following day as its end date.
            Leave both end fields empty if the end time is undecided.
          </p>
        </FormSection>
        <FormSection
          number={3}
          title="Venue & additional details"
          subtitle="Help everyone arrive in the right place, dressed for the occasion."
        >
          <Field label="Venue name" optional full>
            <input
              name="venueName"
              maxLength={200}
              defaultValue={event?.venueName ?? ""}
              placeholder="e.g. Grand Ballroom, Royal Oasis Pavilion"
              className={inputClass}
            />
          </Field>
          <Field label="Address" optional full>
            <input
              name="address"
              maxLength={300}
              defaultValue={event?.address ?? ""}
              placeholder="Venue address"
              className={inputClass}
            />
          </Field>
          <Field label="Dress code" optional full>
            <input
              name="dressCode"
              maxLength={200}
              defaultValue={event?.dressCode ?? ""}
              placeholder="e.g. Traditional Pastels, Emerald Green & Festive Kurta"
              className={inputClass}
            />
          </Field>
        </FormSection>
        {error ? (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-[#e6dfdf] pt-5">
          <p className="text-xs text-[#676169]">
            {dirty ? "Unsaved changes" : ""}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href={
                editing
                  ? `/account/wedding/events/${event?.id}`
                  : "/account/wedding/events"
              }
              className="rounded-lg border border-[#e6dfdf] px-4 py-2 text-xs font-semibold text-[#676169] transition hover:bg-[#faf8f5]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#6d213c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#51182d] disabled:opacity-60"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Create event"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e6dfdf] bg-white p-5 sm:p-7">
      <h2 className="font-editorial text-2xl text-[#1e1a1f]">
        {number}. {title}
      </h2>
      <p className="mt-1 mb-5 text-xs text-[#676169]">{subtitle}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  optional,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`block text-xs font-semibold text-[#252126] ${full ? "sm:col-span-2" : ""}`}
    >
      {label}
      {required ? <span className="text-[#6d213c]"> *</span> : null}
      {optional ? (
        <span className="font-normal text-[#676169]"> (optional)</span>
      ) : null}
      {children}
    </label>
  );
}
