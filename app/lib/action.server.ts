import { UserError } from "../../server/errors";
import { log } from "../../server/logger.server";

export type ActionFailure = { ok: false; error: string; field?: string; fields?: Record<string, string> };
export type ActionSuccess<T = undefined> = { ok: true; message?: string; data?: T };

/**
 * Runs an action body, converting a UserError into a message the page shows
 * inline. Redirect/re-auth Responses pass through; anything unexpected is logged
 * and replaced with a generic message so no internals reach the browser.
 */
export async function guard<T>(fn: () => Promise<T>): Promise<T | ActionFailure> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof UserError) {
      return { ok: false, error: error.message, ...(error.field ? { field: error.field } : {}) };
    }
    log().error({ err: error }, "action failed");
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}

export function fail(error: string, fields?: Record<string, string>): ActionFailure {
  return { ok: false, error, ...(fields ? { fields } : {}) };
}

export function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export function bool(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function pageParam(url: URL): number {
  const page = Number(url.searchParams.get("page") ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Builds the TaskInput candidate from the task form, including the optional repeat rule. */
export function taskFormValues(form: FormData) {
  const kind = str(form, "repeat");
  let recurrence: unknown = null;
  if (kind === "days") recurrence = { kind, n: Number(str(form, "repeatDays")) };
  else if (kind === "weekly") recurrence = { kind, weekday: Number(str(form, "repeatWeekday")) };
  else if (kind === "monthly") recurrence = { kind, monthDay: Number(str(form, "repeatMonthDay")) };
  return {
    title: str(form, "title"),
    dueOn: str(form, "dueOn"),
    notes: str(form, "notes"),
    assignee: str(form, "assignee"),
    tags: str(form, "tags"),
    subjectType: str(form, "subjectType") || "NONE",
    subjectGid: str(form, "subjectGid") || undefined,
    subjectName: str(form, "subjectName"),
    recurrence,
  };
}
