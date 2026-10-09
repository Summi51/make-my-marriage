export function formatDueDate(
  dateIso: string | null,
  timeZone: string,
): string {
  if (!dateIso) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).formatToParts(new Date(dateIso));
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return `${day} ${month} ${year}`;
  } catch {
    return dateIso.slice(0, 10);
  }
}

export function formatCompletedDate(
  dateIso: string | null,
  timeZone: string,
): string {
  if (!dateIso) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).formatToParts(new Date(dateIso));
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return `Completed on ${day} ${month} ${year}`;
  } catch {
    return `Completed on ${dateIso.slice(0, 10)}`;
  }
}

export function formatTaskDateInput(
  dateIso: string | null,
  timeZone: string,
): string {
  if (!dateIso) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(dateIso));
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    return `${year}-${month}-${day}`;
  } catch {
    return dateIso.slice(0, 10);
  }
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
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
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(list.find((item) => item.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );
  return asUtc - date.getTime();
}

/**
 * Converts a date-only input (YYYY-MM-DD) into the UTC instant of midnight in
 * the wedding time zone, so the saved date keeps the day the member chose.
 */
export function dateInputToIso(dateStr: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day);
  let result = new Date(
    utcGuess - timeZoneOffsetMs(new Date(utcGuess), timeZone),
  );
  // A DST transition can move the offset, so confirm the local date matches.
  if (formatTaskDateInput(result.toISOString(), timeZone) !== dateStr) {
    result = new Date(utcGuess - timeZoneOffsetMs(result, timeZone));
  }
  return result.toISOString();
}

export function isTaskOverdue(
  dueDateIso: string | null,
  status: string,
  timeZone: string,
): boolean {
  if (!dueDateIso || status === "COMPLETED") return false;
  try {
    const now = new Date();
    const todayParts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const todayStr = `${todayParts.find((p) => p.type === "year")?.value}-${todayParts.find((p) => p.type === "month")?.value}-${todayParts.find((p) => p.type === "day")?.value}`;

    const dueParts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(dueDateIso));
    const dueStr = `${dueParts.find((p) => p.type === "year")?.value}-${dueParts.find((p) => p.type === "month")?.value}-${dueParts.find((p) => p.type === "day")?.value}`;

    return dueStr < todayStr;
  } catch {
    return new Date(dueDateIso) < new Date();
  }
}
