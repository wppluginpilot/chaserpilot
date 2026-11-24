/**
 * Follow-up tasks. Every function takes the shopId and filters on it: no query
 * in this file can read or change another store's rows.
 */
import { Prisma, type PrismaClient, type Task } from "@prisma/client";

import { addDays, diffDays, fromDbDate, toDbDate } from "../domain/dates";
import { canAddOpen, freeLimitMessage } from "../domain/limits";
import type { PlanKey } from "../domain/plan";
import { nextDue, parseRecurrence, type Recurrence } from "../domain/recurrence";
import { parseGid } from "../domain/gid";
import type { TaskInput } from "../domain/validation";
import { notFound, UserError } from "../errors";

type Db = PrismaClient;
type Tx = Prisma.TransactionClient;

import { TABS, type QueueTab } from "../domain/tabs";
export { TABS, type QueueTab };

export interface QueueFilters {
  assignee?: string;
  tag?: string;
  subjectType?: "ORDER" | "CUSTOMER" | "NONE";
  q?: string;
}

export const PAGE_SIZE = 25;

async function lockShop(tx: Tx, shopId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shopId}))`;
}

async function event(tx: Tx, shopId: string, taskId: string, kind: string, detail?: string) {
  await tx.taskEvent.create({ data: { shopId, taskId, kind, detail: detail ?? null } });
}

export async function openCount(db: Db | Tx, shopId: string): Promise<number> {
  return db.task.count({ where: { shopId, status: "OPEN" } });
}

function assertPaidFields(plan: PlanKey, input: { assignee?: string | undefined; recurrence?: Recurrence | null | undefined }) {
  if (plan === "PAID") return;
  if (input.assignee) throw new UserError("Assignees are part of the Paid plan. Upgrade on the Plan page to use them.", 402, "assignee");
  if (input.recurrence) throw new UserError("Recurring follow-ups are part of the Paid plan. Upgrade on the Plan page to use them.", 402, "recurrence");
}

function normaliseSubject(input: TaskInput) {
  if (input.subjectType === "NONE" || !input.subjectGid) return { subjectType: "NONE" as const, subjectGid: null };
  const parsed = parseGid(input.subjectGid);
  if (!parsed || parsed.kind !== input.subjectType) throw new UserError("That order or customer link isn't valid.", 400, "subject");
  return { subjectType: parsed.kind, subjectGid: input.subjectGid };
}

export async function createTask(db: Db, shopId: string, input: TaskInput, plan: PlanKey, opts: { seriesId?: string | null } = {}): Promise<Task> {
  assertPaidFields(plan, input);
  const subject = normaliseSubject(input);
  return db.$transaction(async (tx) => {
    await lockShop(tx, shopId);
    if (!canAddOpen(plan, await openCount(tx, shopId))) throw new UserError(freeLimitMessage(), 402);
    const task = await tx.task.create({
      data: {
        shopId,
        title: input.title,
        notes: input.notes || null,
        ...subject,
        subjectName: input.subjectName || null,
        dueOn: toDbDate(input.dueOn),
        assignee: input.assignee || null,
        tags: input.tags,
        recurrence: input.recurrence ? (input.recurrence as Prisma.InputJsonValue) : Prisma.JsonNull,
        seriesId: opts.seriesId ?? null,
      },
    });
    await event(tx, shopId, task.id, "created", `Due ${input.dueOn}`);
    if (task.assignee) await tx.assignee.upsert({ where: { shopId_name: { shopId, name: task.assignee } }, create: { shopId, name: task.assignee }, update: {} });
    return task;
  });
}

export async function getTask(db: Db, shopId: string, id: string): Promise<Task> {
  const task = await db.task.findFirst({ where: { id, shopId } });
  if (!task) throw notFound("That follow-up");
  return task;
}

export async function updateTask(db: Db, shopId: string, id: string, input: TaskInput, plan: PlanKey): Promise<Task> {
  const existing = await getTask(db, shopId, id);
  // Free stores may keep paid fields that already exist, but cannot set new ones.
  assertPaidFields(plan, {
    assignee: input.assignee && input.assignee !== existing.assignee ? input.assignee : undefined,
    recurrence: input.recurrence && JSON.stringify(input.recurrence) !== JSON.stringify(existing.recurrence) ? input.recurrence : undefined,
  });
  return db.$transaction(async (tx) => {
    const data: Prisma.TaskUpdateInput = {
      title: input.title,
      notes: input.notes || null,
      dueOn: toDbDate(input.dueOn),
      assignee: input.assignee || null,
      tags: input.tags,
      subjectName: input.subjectName || null,
      recurrence: input.recurrence ? (input.recurrence as Prisma.InputJsonValue) : Prisma.JsonNull,
    };
    const updated = await tx.task.update({ where: { id: existing.id }, data });
    await event(tx, shopId, id, "edited");
    if (updated.assignee) await tx.assignee.upsert({ where: { shopId_name: { shopId, name: updated.assignee } }, create: { shopId, name: updated.assignee }, update: {} });
    return updated;
  });
}

/**
 * Marks a task done. Idempotent: a second call on a done task changes nothing.
 * A paid store's recurring task creates exactly one next open task.
 */
export async function completeTask(db: Db, shopId: string, id: string, plan: PlanKey, today: string): Promise<{ task: Task; next: Task | null }> {
  return db.$transaction(async (tx) => {
    await lockShop(tx, shopId);
    const flipped = await tx.task.updateMany({ where: { id, shopId, status: "OPEN" }, data: { status: "DONE", completedAt: new Date() } });
    const task = await tx.task.findFirst({ where: { id, shopId } });
    if (!task) throw notFound("That follow-up");
    if (flipped.count === 0) return { task, next: null };
    await event(tx, shopId, id, "done");

    const rule = parseRecurrence(task.recurrence);
    if (!rule || plan !== "PAID") return { task, next: null };
    const seriesId = task.seriesId ?? task.id;
    if (!task.seriesId) await tx.task.update({ where: { id }, data: { seriesId } });
    const due = nextDue(rule, fromDbDate(task.dueOn), today);
    const next = await tx.task.create({
      data: {
        shopId,
        title: task.title,
        notes: task.notes,
        subjectType: task.subjectType,
        subjectGid: task.subjectGid,
        subjectName: task.subjectName,
        dueOn: toDbDate(due),
        assignee: task.assignee,
        tags: task.tags,
        recurrence: rule as Prisma.InputJsonValue,
        seriesId,
      },
    });
    await event(tx, shopId, next.id, "created", `Repeat of a completed follow-up, due ${due}`);
    return { task, next };
  });
}

export async function reopenTask(db: Db, shopId: string, id: string, plan: PlanKey): Promise<Task> {
  return db.$transaction(async (tx) => {
    await lockShop(tx, shopId);
    const task = await tx.task.findFirst({ where: { id, shopId } });
    if (!task) throw notFound("That follow-up");
    if (task.status === "OPEN") return task;
    if (!canAddOpen(plan, await openCount(tx, shopId))) throw new UserError(freeLimitMessage(), 402);
    const updated = await tx.task.update({ where: { id }, data: { status: "OPEN", completedAt: null } });
    await event(tx, shopId, id, "reopened");
    return updated;
  });
}

export async function snoozeTask(db: Db, shopId: string, id: string, dueOn: string): Promise<Task> {
  const task = await getTask(db, shopId, id);
  const updated = await db.task.update({ where: { id: task.id }, data: { dueOn: toDbDate(dueOn) } });
  await db.taskEvent.create({ data: { shopId, taskId: id, kind: "snoozed", detail: `${fromDbDate(task.dueOn)} to ${dueOn}` } });
  return updated;
}

export async function stopRepeating(db: Db, shopId: string, id: string): Promise<void> {
  const task = await getTask(db, shopId, id);
  await db.task.update({ where: { id: task.id }, data: { recurrence: Prisma.JsonNull } });
  await db.taskEvent.create({ data: { shopId, taskId: id, kind: "stopped repeating" } });
}

export async function deleteTask(db: Db, shopId: string, id: string): Promise<void> {
  const task = await getTask(db, shopId, id);
  await db.$transaction([db.taskEvent.deleteMany({ where: { shopId, taskId: task.id } }), db.task.deleteMany({ where: { id: task.id, shopId } })]);
}

export async function listEvents(db: Db, shopId: string, taskId: string) {
  return db.taskEvent.findMany({ where: { shopId, taskId }, orderBy: [{ at: "desc" }, { id: "desc" }], take: 100 });
}

// --- Queue ---------------------------------------------------------------------

function baseWhere(shopId: string, f: QueueFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { shopId };
  if (f.assignee) where.assignee = f.assignee;
  if (f.tag) where.tags = { has: f.tag.toLowerCase() };
  if (f.subjectType) where.subjectType = f.subjectType;
  if (f.q) {
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { subjectName: { contains: f.q, mode: "insensitive" } },
    ];
  }
  return where;
}

function tabWhere(tab: QueueTab, today: string, now: Date): Prisma.TaskWhereInput {
  const d = toDbDate;
  switch (tab) {
    case "overdue":
      return { status: "OPEN", dueOn: { lt: d(today) } };
    case "today":
      return { status: "OPEN", dueOn: d(today) };
    case "week":
      return { status: "OPEN", dueOn: { gt: d(today), lte: d(addDays(today, 7)) } };
    case "later":
      return { status: "OPEN", dueOn: { gt: d(addDays(today, 7)) } };
    case "done":
      return { status: "DONE", completedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } };
  }
}

/** Counts for every tab in two grouped queries. */
export async function tabCounts(db: Db, shopId: string, filters: QueueFilters, today: string, now = new Date()): Promise<Record<QueueTab, number>> {
  const base = baseWhere(shopId, filters);
  const [open, done] = await Promise.all([
    db.task.groupBy({ by: ["dueOn"], where: { ...base, status: "OPEN" }, _count: { _all: true } }),
    db.task.count({ where: { AND: [base, tabWhere("done", today, now)] } }),
  ]);
  const counts: Record<QueueTab, number> = { overdue: 0, today: 0, week: 0, later: 0, done };
  for (const row of open) {
    const diff = diffDays(today, fromDbDate(row.dueOn));
    const tab: QueueTab = diff < 0 ? "overdue" : diff === 0 ? "today" : diff <= 7 ? "week" : "later";
    counts[tab] += row._count._all;
  }
  return counts;
}

export interface QueuePage {
  tasks: Task[];
  nextCursor: string | null;
}

/** 25 per page, cursor on (dueOn, id); the Done tab pages on (completedAt, id) newest first. */
export async function listQueue(db: Db, shopId: string, tab: QueueTab, filters: QueueFilters, today: string, cursor: string | null, now = new Date()): Promise<QueuePage> {
  const where: Prisma.TaskWhereInput[] = [baseWhere(shopId, filters), tabWhere(tab, today, now)];
  const [key, id] = cursor ? cursor.split("|") : [null, null];
  if (tab === "done") {
    if (key && id) {
      const at = new Date(key);
      if (!Number.isNaN(at.getTime())) where.push({ OR: [{ completedAt: { lt: at } }, { completedAt: at, id: { lt: id } }] });
    }
    const rows = await db.task.findMany({ where: { AND: where }, orderBy: [{ completedAt: "desc" }, { id: "desc" }], take: PAGE_SIZE + 1 });
    const page = rows.slice(0, PAGE_SIZE);
    const last = page[page.length - 1];
    return { tasks: page, nextCursor: rows.length > PAGE_SIZE && last?.completedAt ? `${last.completedAt.toISOString()}|${last.id}` : null };
  }
  if (key && id && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const due = toDbDate(key);
    where.push({ OR: [{ dueOn: { gt: due } }, { dueOn: due, id: { gt: id } }] });
  }
  const rows = await db.task.findMany({ where: { AND: where }, orderBy: [{ dueOn: "asc" }, { id: "asc" }], take: PAGE_SIZE + 1 });
  const page = rows.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];
  return { tasks: page, nextCursor: rows.length > PAGE_SIZE && last ? `${fromDbDate(last.dueOn)}|${last.id}` : null };
}

/** Everything the admin extension block shows for one order or customer. */
export async function listForSubject(db: Db, shopId: string, subjectGid: string) {
  const [open, done] = await Promise.all([
    db.task.findMany({ where: { shopId, subjectGid, status: "OPEN" }, orderBy: [{ dueOn: "asc" }, { id: "asc" }], take: 20 }),
    db.task.findMany({ where: { shopId, subjectGid, status: "DONE" }, orderBy: [{ completedAt: "desc" }], take: 3 }),
  ]);
  return { open, done };
}

/** Overdue and due-today tasks for the digest and the in-app Today view. */
export async function dueNow(db: Db, shopId: string, today: string, limit = 200) {
  const rows = await db.task.findMany({ where: { shopId, status: "OPEN", dueOn: { lte: toDbDate(today) } }, orderBy: [{ dueOn: "asc" }, { id: "asc" }], take: limit });
  return { overdue: rows.filter((t) => fromDbDate(t.dueOn) < today), today: rows.filter((t) => fromDbDate(t.dueOn) === today) };
}

export async function knownFilters(db: Db, shopId: string) {
  const [assignees, tagRows] = await Promise.all([
    db.task.findMany({ where: { shopId, assignee: { not: null } }, distinct: ["assignee"], select: { assignee: true }, take: 100 }),
    db.task.findMany({ where: { shopId, status: "OPEN" }, select: { tags: true }, take: 500 }),
  ]);
  const tags = [...new Set(tagRows.flatMap((r) => r.tags))].sort();
  return { assignees: assignees.map((a) => a.assignee!).sort(), tags };
}

// --- Compliance ----------------------------------------------------------------

function subjectGids(customerGid: string | null, orderIds: (string | number)[]): string[] {
  return [...(customerGid ? [customerGid] : []), ...orderIds.map((id) => `gid://shopify/Order/${id}`)];
}

/** customers/data_request: the tasks attached to that customer or those orders. */
export async function tasksForDataRequest(db: Db, shopId: string, customerId: string | number | null, orderIds: (string | number)[]) {
  const gids = subjectGids(customerId ? `gid://shopify/Customer/${customerId}` : null, orderIds);
  if (!gids.length) return [];
  return db.task.findMany({
    where: { shopId, subjectGid: { in: gids } },
    select: { id: true, title: true, notes: true, subjectName: true, dueOn: true, status: true, createdAt: true, completedAt: true },
  });
}

/** customers/redact: delete those tasks and their events. 0 is a fine answer. */
export async function redactCustomerTasks(db: Db, shopId: string, customerId: string | number | null, orderIds: (string | number)[]): Promise<number> {
  const gids = subjectGids(customerId ? `gid://shopify/Customer/${customerId}` : null, orderIds);
  if (!gids.length) return 0;
  const ids = (await db.task.findMany({ where: { shopId, subjectGid: { in: gids } }, select: { id: true } })).map((t) => t.id);
  if (!ids.length) return 0;
  await db.$transaction([db.taskEvent.deleteMany({ where: { shopId, taskId: { in: ids } } }), db.task.deleteMany({ where: { shopId, id: { in: ids } } })]);
  return ids.length;
}

// --- Export --------------------------------------------------------------------

export interface ExportFilter {
  status: "done" | "all";
  from?: string;
  to?: string;
}

/** Yields tasks in batches of 500 ordered by id, so 10,000 rows never sit in memory at once. */
export async function* exportBatches(db: Db, shopId: string, filter: ExportFilter, batch = 500): AsyncGenerator<Task[]> {
  let after: string | undefined;
  for (;;) {
    const where: Prisma.TaskWhereInput = { shopId };
    if (filter.status === "done") where.status = "DONE";
    const range: Prisma.DateTimeFilter = {};
    if (filter.from) range.gte = toDbDate(filter.from);
    if (filter.to) range.lte = toDbDate(filter.to);
    if (filter.from || filter.to) where.dueOn = range;
    const rows = await db.task.findMany({ where, orderBy: { id: "asc" }, take: batch, ...(after ? { cursor: { id: after }, skip: 1 } : {}) });
    if (!rows.length) return;
    yield rows;
    if (rows.length < batch) return;
    after = rows[rows.length - 1]!.id;
  }
}
