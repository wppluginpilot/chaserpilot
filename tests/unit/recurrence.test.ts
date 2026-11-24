import { describe, expect, it } from "vitest";

import { describeRecurrence, nextDue, nextOccurrence, parseRecurrence } from "../../server/domain/recurrence";

describe("nextOccurrence", () => {
  it("every N days", () => {
    expect(nextOccurrence({ kind: "days", n: 10 }, "2026-11-25")).toBe("2026-12-05");
  });
  it("weekly goes to the next such weekday, never the same day", () => {
    expect(nextOccurrence({ kind: "weekly", weekday: 1 }, "2026-11-23")).toBe("2026-11-30");
    expect(nextOccurrence({ kind: "weekly", weekday: 5 }, "2026-11-23")).toBe("2026-11-27");
  });
  it("monthly clamps 31 to the end of short months", () => {
    expect(nextOccurrence({ kind: "monthly", monthDay: 31 }, "2026-01-31")).toBe("2026-02-28");
    expect(nextOccurrence({ kind: "monthly", monthDay: 31 }, "2026-02-28")).toBe("2026-03-31");
    expect(nextOccurrence({ kind: "monthly", monthDay: 31 }, "2026-03-31")).toBe("2026-04-30");
  });
  it("monthly handles leap years", () => {
    expect(nextOccurrence({ kind: "monthly", monthDay: 31 }, "2028-01-31")).toBe("2028-02-29");
    expect(nextOccurrence({ kind: "monthly", monthDay: 29 }, "2027-01-29")).toBe("2027-02-28");
  });
  it("monthly rolls over the year", () => {
    expect(nextOccurrence({ kind: "monthly", monthDay: 15 }, "2026-12-15")).toBe("2027-01-15");
  });
  it("monthly from before the day in the same month stays in the month", () => {
    expect(nextOccurrence({ kind: "monthly", monthDay: 20 }, "2026-11-05")).toBe("2026-11-20");
  });
});

describe("nextDue catch-up rule", () => {
  it("is just the next occurrence when finished on time", () => {
    expect(nextDue({ kind: "days", n: 7 }, "2026-11-23", "2026-11-23")).toBe("2026-11-30");
  });
  it("skips missed occurrences when finished late", () => {
    expect(nextDue({ kind: "weekly", weekday: 1 }, "2026-11-02", "2026-11-24")).toBe("2026-11-30");
  });
  it("lands on today when an occurrence falls on today", () => {
    expect(nextDue({ kind: "days", n: 5 }, "2026-11-13", "2026-11-23")).toBe("2026-11-23");
  });
  it("a daily task finished days late is due today", () => {
    expect(nextDue({ kind: "days", n: 1 }, "2026-11-10", "2026-11-23")).toBe("2026-11-23");
  });
});

describe("parse and describe", () => {
  it("accepts valid and rejects invalid rules", () => {
    expect(parseRecurrence({ kind: "days", n: 3 })).toEqual({ kind: "days", n: 3 });
    expect(parseRecurrence({ kind: "days", n: 0 })).toBeNull();
    expect(parseRecurrence({ kind: "days", n: 400 })).toBeNull();
    expect(parseRecurrence({ kind: "monthly", monthDay: 32 })).toBeNull();
    expect(parseRecurrence({ kind: "weekly", weekday: 7 })).toBeNull();
    expect(parseRecurrence(null)).toBeNull();
  });
  it("describes", () => {
    expect(describeRecurrence({ kind: "days", n: 1 })).toBe("Every day");
    expect(describeRecurrence({ kind: "weekly", weekday: 1 })).toBe("Every Monday");
    expect(describeRecurrence({ kind: "monthly", monthDay: 31 })).toBe("Monthly on day 31");
    expect(describeRecurrence(null)).toBe("Does not repeat");
  });
});
