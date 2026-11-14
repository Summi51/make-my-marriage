import { describe, expect, it } from "vitest";
import {
  formatDueDate,
  formatCompletedDate,
  formatTaskDateInput,
  dateInputToIso,
  isTaskOverdue,
} from "./format";

describe("task formatting and overdue calculations", () => {
  it("formats due date in British English format", () => {
    const iso = "2026-11-15T00:00:00.000Z";
    expect(formatDueDate(iso, "Asia/Kolkata")).toBe("15 Nov 2026");
  });

  it("formats completed date", () => {
    const iso = "2026-11-04T12:00:00.000Z";
    expect(formatCompletedDate(iso, "Asia/Kolkata")).toBe(
      "Completed on 04 Nov 2026",
    );
  });

  it("formats task date input as YYYY-MM-DD", () => {
    const iso = "2026-11-15T00:00:00.000Z";
    expect(formatTaskDateInput(iso, "Asia/Kolkata")).toBe("2026-11-15");
  });

  it("converts date input to midnight in the wedding time zone", () => {
    // 15 Nov 2026 00:00 in India is 18:30 UTC on 14 Nov.
    expect(dateInputToIso("2026-11-15", "Asia/Kolkata")).toBe(
      "2026-11-14T18:30:00.000Z",
    );
    // 15 Nov 2026 00:00 in New York is 05:00 UTC on 15 Nov.
    expect(dateInputToIso("2026-11-15", "America/New_York")).toBe(
      "2026-11-15T05:00:00.000Z",
    );
  });

  it("round-trips a due date through the wedding time zone", () => {
    for (const timeZone of [
      "Asia/Kolkata",
      "Asia/Karachi",
      "Asia/Dubai",
      "Europe/London",
      "America/New_York",
    ]) {
      const iso = dateInputToIso("2026-11-15", timeZone);
      expect(formatTaskDateInput(iso, timeZone)).toBe("2026-11-15");
    }
  });

  it("keeps the wedding-local day when a negative-offset date is overdue", () => {
    // Storing UTC midnight used to shift this to 2019-12-31 in New York.
    const due = dateInputToIso("2020-01-01", "America/New_York");
    expect(formatTaskDateInput(due, "America/New_York")).toBe("2020-01-01");
    expect(isTaskOverdue(due, "TODO", "America/New_York")).toBe(true);
  });

  it("ignores an incomplete or malformed date input", () => {
    expect(dateInputToIso("", "Asia/Kolkata")).toBe("");
    expect(dateInputToIso("15-11-2026", "Asia/Kolkata")).toBe("");
  });

  it("detects overdue tasks correctly", () => {
    // Past date is overdue when TODO or IN_PROGRESS
    const pastIso = "2020-01-01T00:00:00.000Z";
    expect(isTaskOverdue(pastIso, "TODO", "Asia/Kolkata")).toBe(true);
    expect(isTaskOverdue(pastIso, "IN_PROGRESS", "Asia/Kolkata")).toBe(true);

    // Completed task is never overdue
    expect(isTaskOverdue(pastIso, "COMPLETED", "Asia/Kolkata")).toBe(false);

    // Future date is not overdue
    const futureIso = "2099-01-01T00:00:00.000Z";
    expect(isTaskOverdue(futureIso, "TODO", "Asia/Kolkata")).toBe(false);
  });
});
