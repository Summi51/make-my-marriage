export const timeZoneLabels: Record<string, string> = {
  "Asia/Kolkata": "India Standard Time (Asia/Kolkata)",
  "Asia/Karachi": "Pakistan Standard Time (Asia/Karachi)",
  "Asia/Dubai": "Gulf Standard Time (Asia/Dubai)",
  "Europe/London": "Greenwich Mean Time (Europe/London)",
  "America/New_York": "Eastern Time (America/New_York)",
};

export function timeZoneLabel(timeZone: string) {
  return timeZoneLabels[timeZone] ?? timeZone;
}

function parts(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h12",
  }).formatToParts(new Date(value));
}

function part(
  list: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return list.find((item) => item.type === type)?.value ?? "";
}

export function dayKey(value: string, timeZone: string) {
  const list = parts(value, timeZone);
  return `${part(list, "year")}-${part(list, "month")}-${part(list, "day")}`;
}

export function formatDayHeading(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: string, timeZone: string) {
  const list = parts(value, timeZone);
  return `${part(list, "day")} ${part(list, "month")} ${part(list, "year")}`;
}

export function formatClock(value: string, timeZone: string) {
  const list = parts(value, timeZone);
  const hour = part(list, "hour").replace(/^0/, "");
  const minute = part(list, "minute");
  const dayPeriod = part(list, "dayPeriod").toUpperCase();
  return `${hour}:${minute} ${dayPeriod}`;
}

export function formatSchedule(
  startsAt: string,
  endsAt: string | null,
  timeZone: string,
) {
  const date = formatShortDate(startsAt, timeZone);
  const start = formatClock(startsAt, timeZone);
  if (!endsAt) return `${date} · ${start} (${timeZone})`;
  const endDate = formatShortDate(endsAt, timeZone);
  const end = formatClock(endsAt, timeZone);
  const endLabel = endDate === date ? end : `${endDate} · ${end}`;
  return `${date} · ${start} – ${endLabel} (${timeZone})`;
}

export function dateInputValue(value: string, timeZone: string) {
  const list = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return `${part(list, "year")}-${part(list, "month")}-${part(list, "day")}`;
}

export function timeInputValue(value: string, timeZone: string) {
  const list = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return `${part(list, "hour")}:${part(list, "minute")}`;
}

export function zonedDateTime(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = timeZoneOffset(new Date(utcGuess), timeZone);
  const result = new Date(utcGuess - offset);
  const check = dateInputValue(result.toISOString(), timeZone);
  const checkTime = timeInputValue(result.toISOString(), timeZone);
  if (check !== date || checkTime !== time) return null;
  return result;
}

function timeZoneOffset(date: Date, timeZone: string) {
  const list = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const asUtc = Date.UTC(
    Number(part(list, "year")),
    Number(part(list, "month")) - 1,
    Number(part(list, "day")),
    Number(part(list, "hour")) % 24,
    Number(part(list, "minute")),
    Number(part(list, "second")),
  );
  return asUtc - date.getTime();
}
