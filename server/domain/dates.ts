/**
 * Calendar dates as plain YYYY-MM-DD strings. Tasks are due on a date in the
 * shop's timezone, never at an instant, so all arithmetic is done on the
 * calendar and never through local-time Date objects.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isIsoDate(value: string): boolean {
  const m = ISO.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

function toUtc(iso: string): Date {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(iso: string): number {
  return toUtc(iso).getUTCDay();
}

/** Today's calendar date in an IANA timezone. Falls back to UTC for an unknown zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    return isIsoDate(parts) ? parts : fromUtc(now);
  } catch {
    return fromUtc(now);
  }
}

/** The hour (0-23) it is right now in an IANA timezone. */
export function hourIn(timeZone: string, now: Date = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now);
    const n = Number(h);
    return Number.isInteger(n) ? n % 24 : now.getUTCHours();
  } catch {
    return now.getUTCHours();
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The next Monday strictly after the given date. */
export function nextMonday(iso: string): string {
  const wd = weekdayOf(iso);
  const add = (1 - wd + 7) % 7 || 7;
  return addDays(iso, add);
}

export type Bucket = "overdue" | "today" | "week" | "later";

/** Overdue before today, Today, This week = the next 7 days after today, Later beyond. */
export function bucketFor(dueOn: string, today: string): Bucket {
  const diff = diffDays(today, dueOn);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatShort(iso: string): string {
  const parts = iso.split("-").map(Number);
  return `${DAYS[weekdayOf(iso)]} ${parts[2]} ${MONTHS[(parts[1] ?? 1) - 1]}`;
}

/** "3 days overdue", "Today", "Tomorrow", "Fri 4 Dec". */
export function dueText(dueOn: string, today: string): string {
  const diff = diffDays(today, dueOn);
  if (diff < 0) return diff === -1 ? "1 day overdue" : `${-diff} days overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatShort(dueOn);
}

/** YYYY-MM-DD as a Date at UTC midnight, for @db.Date columns. */
export function toDbDate(iso: string): Date {
  return toUtc(iso);
}

export function fromDbDate(d: Date): string {
  return fromUtc(d);
}
