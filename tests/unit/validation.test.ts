import { describe, expect, it } from "vitest";

import { csvCell, csvRow, fieldErrors, normalizeTags, settingsSchema, taskInputSchema, templateInputSchema } from "../../server/domain/validation";

const base = { title: "Chase deposit", dueOn: "2026-11-30" };

describe("task input", () => {
  it("accepts a minimal task", () => {
    const r = taskInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.subjectType).toBe("NONE");
  });
  it("requires a title and trims it", () => {
    expect(taskInputSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
    expect(taskInputSchema.parse({ ...base, title: "  hi  " }).title).toBe("hi");
  });
  it("limits title to 140 and notes to 2000 characters", () => {
    expect(taskInputSchema.safeParse({ ...base, title: "x".repeat(140) }).success).toBe(true);
    expect(taskInputSchema.safeParse({ ...base, title: "x".repeat(141) }).success).toBe(false);
    expect(taskInputSchema.safeParse({ ...base, notes: "x".repeat(2000) }).success).toBe(true);
    expect(taskInputSchema.safeParse({ ...base, notes: "x".repeat(2001) }).success).toBe(false);
  });
  it("limits assignee to 60", () => {
    expect(taskInputSchema.safeParse({ ...base, assignee: "a".repeat(61) }).success).toBe(false);
  });
  it("rejects impossible dates but allows past ones", () => {
    expect(taskInputSchema.safeParse({ ...base, dueOn: "2026-02-30" }).success).toBe(false);
    expect(taskInputSchema.safeParse({ ...base, dueOn: "2001-01-01" }).success).toBe(true);
  });
  it("gives merchant-readable field errors", () => {
    const r = taskInputSchema.safeParse({ title: "", dueOn: "nope" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toEqual({ title: "Title is required.", dueOn: "Pick a valid due date." });
  });
});

describe("tags", () => {
  it("lowercases, trims and de-duplicates", () => {
    expect(normalizeTags(" Deposit, deposit ,VIP,, ")).toEqual(["deposit", "vip"]);
  });
  it("allows at most 5 tags of 24 characters", () => {
    expect(taskInputSchema.safeParse({ ...base, tags: "a,b,c,d,e" }).success).toBe(true);
    expect(taskInputSchema.safeParse({ ...base, tags: "a,b,c,d,e,f" }).success).toBe(false);
    expect(taskInputSchema.safeParse({ ...base, tags: "x".repeat(25) }).success).toBe(false);
    expect(taskInputSchema.safeParse({ ...base, tags: "x".repeat(24) }).success).toBe(true);
  });
});

describe("templates and settings", () => {
  it("validates days until due", () => {
    expect(templateInputSchema.safeParse({ name: "a", title: "b", dueDays: "3" }).success).toBe(true);
    expect(templateInputSchema.safeParse({ name: "a", title: "b", dueDays: "-1" }).success).toBe(false);
    expect(templateInputSchema.safeParse({ name: "a", title: "b", dueDays: "1.5" }).success).toBe(false);
  });
  it("validates settings", () => {
    const ok = { timezone: "Europe/London", defaultDueDays: "1", digestEnabled: true, digestHour: "8", digestExtraTo: "" };
    expect(settingsSchema.safeParse(ok).success).toBe(true);
    expect(settingsSchema.safeParse({ ...ok, timezone: "Mars/Base" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, digestHour: "24" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, defaultDueDays: "31" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, digestExtraTo: "not an email" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, digestExtraTo: "a@b.co" }).success).toBe(true);
  });
});

describe("csv escaping", () => {
  it("prefixes formula starters", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(null)).toBe("");
  });
  it("builds a row", () => {
    expect(csvRow(["a", "b,c", 3])).toBe('a,"b,c",3\r\n');
  });
});
