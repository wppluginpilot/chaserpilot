import { describe, expect, it } from "vitest";

import { addDays, bucketFor, diffDays, dueText, formatShort, hourIn, isIsoDate, nextMonday, todayIn, weekdayOf } from "../../server/domain/dates";

describe("calendar arithmetic", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("diffs days", () => {
    expect(diffDays("2026-11-23", "2026-11-26")).toBe(3);
    expect(diffDays("2026-11-23", "2026-11-20")).toBe(-3);
  });
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("tomorrow")).toBe(false);
  });
  it("finds the next Monday strictly after a date", () => {
    expect(weekdayOf("2026-11-23")).toBe(1);
    expect(nextMonday("2026-11-23")).toBe("2026-11-30");
    expect(nextMonday("2026-11-24")).toBe("2026-11-30");
    expect(nextMonday("2026-11-29")).toBe("2026-11-30");
  });
});

describe("today and hour in a timezone", () => {
  const instant = new Date("2026-11-23T20:30:00Z");
  it("Auckland is already tomorrow", () => {
    expect(todayIn("Pacific/Auckland", instant)).toBe("2026-11-24");
    expect(hourIn("Pacific/Auckland", instant)).toBe(9);
  });
  it("Los Angeles is still the same day", () => {
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-11-23");
    expect(hourIn("America/Los_Angeles", instant)).toBe(12);
  });
  it("UTC", () => {
    expect(todayIn("UTC", instant)).toBe("2026-11-23");
    expect(hourIn("UTC", new Date("2026-11-23T00:05:00Z"))).toBe(0);
  });
  it("falls back to UTC for an unknown zone", () => {
    expect(todayIn("Not/AZone", instant)).toBe("2026-11-23");
  });
});

describe("bucketing", () => {
  const today = "2026-11-23";
  it.each([
    ["2026-11-22", "overdue"],
    ["2026-11-23", "today"],
    ["2026-11-24", "week"],
    ["2026-11-30", "week"],
    ["2026-12-01", "later"],
  ])("%s is %s", (due, bucket) => expect(bucketFor(due, today)).toBe(bucket));

  it("follows the shop's own today", () => {
    // 20:30 UTC on the 23rd is already the 24th in Auckland, so a task due the 23rd is overdue there.
    const instant = new Date("2026-11-23T20:30:00Z");
    expect(bucketFor("2026-11-23", todayIn("Pacific/Auckland", instant))).toBe("overdue");
    expect(bucketFor("2026-11-23", todayIn("America/Los_Angeles", instant))).toBe("today");
  });
});

describe("due text", () => {
  it("reads naturally", () => {
    expect(dueText("2026-11-20", "2026-11-23")).toBe("3 days overdue");
    expect(dueText("2026-11-22", "2026-11-23")).toBe("1 day overdue");
    expect(dueText("2026-11-23", "2026-11-23")).toBe("Today");
    expect(dueText("2026-11-24", "2026-11-23")).toBe("Tomorrow");
    expect(dueText("2026-12-04", "2026-11-23")).toBe("Fri 4 Dec");
    expect(formatShort("2026-12-04")).toBe("Fri 4 Dec");
  });
});
