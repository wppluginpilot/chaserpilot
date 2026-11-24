import { z } from "zod";

import { addDays, daysInMonth, diffDays, weekdayOf } from "./dates";

export const recurrenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("days"), n: z.number().int().min(1).max(365) }),
  z.object({ kind: z.literal("weekly"), weekday: z.number().int().min(0).max(6) }),
  z.object({ kind: z.literal("monthly"), monthDay: z.number().int().min(1).max(31) }),
]);

export type Recurrence = z.infer<typeof recurrenceSchema>;

export function parseRecurrence(value: unknown): Recurrence | null {
  const parsed = recurrenceSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The given day of a month, clamped to that month's length (31 becomes 28 or 29 in February). */
function monthDate(year: number, month: number, day: number): string {
  const d = Math.min(day, daysInMonth(year, month));
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The first occurrence strictly after `from`. */
export function nextOccurrence(rule: Recurrence, from: string): string {
  switch (rule.kind) {
    case "days":
      return addDays(from, rule.n);
    case "weekly": {
      const add = (rule.weekday - weekdayOf(from) + 7) % 7 || 7;
      return addDays(from, add);
    }
    case "monthly": {
      const [y, m] = from.split("-").map(Number) as [number, number];
      const thisMonth = monthDate(y, m, rule.monthDay);
      if (diffDays(from, thisMonth) > 0) return thisMonth;
      return monthDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, rule.monthDay);
    }
  }
}

/**
 * The due date of the task created when `completedDue` is marked done: the next
 * occurrence after the completed task's due date, advanced until it is on or
 * after today, so finishing a task late never produces a backlog of missed ones.
 */
export function nextDue(rule: Recurrence, completedDue: string, today: string): string {
  let due = nextOccurrence(rule, completedDue);
  let guard = 0;
  while (diffDays(today, due) < 0 && guard++ < 10_000) due = nextOccurrence(rule, due);
  return due;
}

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function describeRecurrence(rule: Recurrence | null): string {
  if (!rule) return "Does not repeat";
  if (rule.kind === "days") return rule.n === 1 ? "Every day" : `Every ${rule.n} days`;
  if (rule.kind === "weekly") return `Every ${WEEKDAY_NAMES[rule.weekday]}`;
  return `Monthly on day ${rule.monthDay}`;
}
