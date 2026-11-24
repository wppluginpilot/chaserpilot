import { addDays, isIsoDate, nextMonday } from "./dates";

export type SnoozeChoice = "tomorrow" | "3days" | "monday" | "date";

export const SNOOZE_CHOICES: { key: SnoozeChoice; label: string }[] = [
  { key: "tomorrow", label: "Tomorrow" },
  { key: "3days", label: "In 3 days" },
  { key: "monday", label: "Next Monday" },
];

/** The new due date for a snooze, counted from today (not from the old due date). */
export function snoozeTarget(choice: string, today: string, custom?: string): string | null {
  switch (choice) {
    case "tomorrow":
      return addDays(today, 1);
    case "3days":
      return addDays(today, 3);
    case "monday":
      return nextMonday(today);
    case "date":
      return custom && isIsoDate(custom) ? custom : null;
    default:
      return null;
  }
}
