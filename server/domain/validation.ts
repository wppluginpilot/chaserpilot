import { z } from "zod";

import { isIsoDate, isValidTimeZone } from "./dates";
import { recurrenceSchema } from "./recurrence";

export const LIMITS = { title: 140, notes: 2000, assignee: 60, tag: 24, tags: 5, label: 80, templateName: 60 } as const;

/** Lowercases, trims, de-duplicates and drops empties. */
export function normalizeTags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(/[,\n]/);
  const out: string[] = [];
  for (const t of raw) {
    const tag = t.trim().toLowerCase().replace(/\s+/g, " ");
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

const isoDate = z.string().refine(isIsoDate, "Pick a valid due date.");

const required = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} can be at most ${max} characters.`);

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().max(max, `${label} can be at most ${max} characters.`).optional(),
  );

const tagsField = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => normalizeTags(v ?? []))
  .superRefine((tags, ctx) => {
    if (tags.length > LIMITS.tags) ctx.addIssue({ code: "custom", message: `Use at most ${LIMITS.tags} tags.` });
    if (tags.some((t) => t.length > LIMITS.tag)) ctx.addIssue({ code: "custom", message: `Each tag can be at most ${LIMITS.tag} characters.` });
  });

export const taskInputSchema = z.object({
  title: required(LIMITS.title, "Title"),
  dueOn: isoDate,
  notes: optionalText(LIMITS.notes, "Notes"),
  assignee: optionalText(LIMITS.assignee, "Assignee"),
  tags: tagsField,
  subjectType: z.enum(["ORDER", "CUSTOMER", "NONE"]).default("NONE"),
  subjectGid: z.string().optional(),
  subjectName: optionalText(LIMITS.label, "Label"),
  recurrence: recurrenceSchema.nullable().optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export const templateInputSchema = z.object({
  name: required(LIMITS.templateName, "Template name"),
  title: required(LIMITS.title, "Title"),
  dueDays: z.coerce.number().int("Days must be a whole number.").min(0, "Days can't be negative.").max(365, "Days can be at most 365."),
  tags: tagsField,
  notes: optionalText(LIMITS.notes, "Notes"),
});

export const settingsSchema = z.object({
  timezone: z.string().refine(isValidTimeZone, "Pick a timezone from the list."),
  defaultDueDays: z.coerce.number().int().min(0, "Use 0 to 30 days.").max(30, "Use 0 to 30 days."),
  digestEnabled: z.boolean(),
  digestHour: z.coerce.number().int().min(0, "Use an hour from 0 to 23.").max(23, "Use an hour from 0 to 23."),
  digestExtraTo: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address or leave it empty."),
});

/** Turns zod issues into { field: message } for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Cells starting with = + - @ (or a tab/CR) are prefixed with ' so spreadsheets don't run them as formulas. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}
