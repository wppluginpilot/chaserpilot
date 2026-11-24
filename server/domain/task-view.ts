/** Plain, serialisable shape of a task for the admin UI and the extensions. */
import { adminUrl } from "./gid";
import { dueText, fromDbDate } from "./dates";

export interface TaskRecord {
  id: string;
  title: string;
  notes: string | null;
  subjectType: "ORDER" | "CUSTOMER" | "NONE";
  subjectGid: string | null;
  subjectName: string | null;
  dueOn: Date;
  status: "OPEN" | "DONE";
  assignee: string | null;
  tags: string[];
  recurrence: unknown;
  completedAt: Date | null;
}

export interface TaskView {
  id: string;
  title: string;
  notes: string | null;
  subjectType: "ORDER" | "CUSTOMER" | "NONE";
  subjectLabel: string;
  subjectUrl: string | null;
  dueOn: string;
  dueText: string;
  overdue: boolean;
  status: "OPEN" | "DONE";
  assignee: string | null;
  tags: string[];
  repeats: boolean;
  completedOn: string | null;
}

export function subjectLabel(t: Pick<TaskRecord, "subjectType" | "subjectName">): string {
  if (t.subjectName) return t.subjectName;
  return t.subjectType === "ORDER" ? "Order" : t.subjectType === "CUSTOMER" ? "Customer" : "General follow-up";
}

export function toView(t: TaskRecord, shopDomain: string, today: string): TaskView {
  const due = fromDbDate(t.dueOn);
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    subjectType: t.subjectType,
    subjectLabel: subjectLabel(t),
    subjectUrl: t.subjectGid ? adminUrl(shopDomain, t.subjectGid) : null,
    dueOn: due,
    dueText: dueText(due, today),
    overdue: t.status === "OPEN" && due < today,
    status: t.status,
    assignee: t.assignee,
    tags: t.tags,
    repeats: Boolean(t.recurrence),
    completedOn: t.completedAt ? t.completedAt.toISOString().slice(0, 10) : null,
  };
}
