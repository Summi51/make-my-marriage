import { describe, expect, it } from "vitest";
import {
  dateInputValue,
  dayKey,
  formatClock,
  formatSchedule,
  timeInputValue,
  zonedDateTime,
} from "./format";

describe("event time zone formatting", () => {
  it("groups an overnight event by the wedding day, not the browser day", () => {
    const startsAt = "2026-11-13T20:30:00.000Z";
    expect(dayKey(startsAt, "Asia/Kolkata")).toBe("2026-Nov-14");
    expect(formatClock(startsAt, "Asia/Kolkata")).toBe("2:00 AM");
    expect(dateInputValue(startsAt, "Asia/Kolkata")).toBe("2026-11-14");
    expect(timeInputValue(startsAt, "Asia/Kolkata")).toBe("02:00");
  });

  it("converts a wedding-local date and time back to the same instant", () => {
    const parsed = zonedDateTime("2026-11-12", "14:00", "Asia/Kolkata");
    expect(parsed?.toISOString()).toBe("2026-11-12T08:30:00.000Z");
    expect(
      formatSchedule(
        "2026-11-12T08:30:00.000Z",
        "2026-11-12T12:30:00.000Z",
        "Asia/Kolkata",
      ),
    ).toBe("12 Nov 2026 · 2:00 PM – 6:00 PM (Asia/Kolkata)");
  });

  it("rejects a time that does not exist in the wedding time zone", () => {
    expect(zonedDateTime("2026-03-08", "02:30", "America/New_York")).toBeNull();
  });
});
