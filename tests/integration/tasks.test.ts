import { afterAll, describe, expect, it } from "vitest";

import { UserError } from "../../server/errors";
import { completeTask, createTask, deleteTask, exportBatches, getTask, listEvents, listForSubject, listQueue, openCount, reopenTask, snoozeTask, stopRepeating, tabCounts, updateTask } from "../../server/services/tasks.server";
import { taskInputSchema } from "../../server/domain/validation";
import { db, makeShop } from "../helpers";

afterAll(() => db.$disconnect());

const input = (over: Record<string, unknown> = {}) => taskInputSchema.parse({ title: "Chase deposit", dueOn: "2026-12-01", ...over });

describe("task lifecycle", () => {
  it("creates, snoozes, completes and reopens with an event trail", async () => {
    const shop = await makeShop();
    const t = await createTask(db, shop.id, input(), "FREE");
    await snoozeTask(db, shop.id, t.id, "2026-12-05");
    const done = await completeTask(db, shop.id, t.id, "FREE", "2026-12-05");
    expect(done.task.status).toBe("DONE");
    await reopenTask(db, shop.id, t.id, "FREE");
    const events = (await listEvents(db, shop.id, t.id)).map((e) => e.kind);
    expect(events).toEqual(expect.arrayContaining(["created", "snoozed", "done", "reopened"]));
    await updateTask(db, shop.id, t.id, input({ title: "Renamed" }), "FREE");
    expect((await getTask(db, shop.id, t.id)).title).toBe("Renamed");
    await deleteTask(db, shop.id, t.id);
    await expect(getTask(db, shop.id, t.id)).rejects.toBeInstanceOf(UserError);
  });

  it("double complete is idempotent and creates one next task for a recurring series", async () => {
    const shop = await makeShop();
    const t = await createTask(db, shop.id, input({ dueOn: "2026-11-01", recurrence: { kind: "days", n: 7 } }), "PAID");
    const [a, b] = await Promise.all([completeTask(db, shop.id, t.id, "PAID", "2026-11-02"), completeTask(db, shop.id, t.id, "PAID", "2026-11-02")]);
    expect([a.next, b.next].filter(Boolean)).toHaveLength(1);
    expect(await openCount(db, shop.id)).toBe(1);
    const again = await completeTask(db, shop.id, t.id, "PAID", "2026-11-02");
    expect(again.next).toBeNull();
    const next = (a.next ?? b.next)!;
    expect(next.seriesId).toBeTruthy();
    await stopRepeating(db, shop.id, next.id);
    const stopped = await completeTask(db, shop.id, next.id, "PAID", "2026-11-10");
    expect(stopped.next).toBeNull();
  });

  it("Free plan refuses paid fields and recurring tasks do not repeat after downgrade", async () => {
    const shop = await makeShop();
    await expect(createTask(db, shop.id, input({ assignee: "Sam" }), "FREE")).rejects.toThrow(/Paid plan/);
    await expect(createTask(db, shop.id, input({ recurrence: { kind: "days", n: 3 } }), "FREE")).rejects.toThrow(/Paid plan/);
    const t = await createTask(db, shop.id, input({ recurrence: { kind: "days", n: 3 } }), "PAID");
    const res = await completeTask(db, shop.id, t.id, "FREE", "2026-12-02");
    expect(res.next).toBeNull();
  });
});

describe("Free limit", () => {
  it("allows the 25th open task, refuses the 26th, ignores done tasks", async () => {
    const shop = await makeShop();
    const first = await createTask(db, shop.id, input(), "FREE");
    for (let i = 1; i < 25; i++) await createTask(db, shop.id, input({ title: `t${i}` }), "FREE");
    await expect(createTask(db, shop.id, input(), "FREE")).rejects.toThrow(/25 open follow-ups/);
    await completeTask(db, shop.id, first.id, "FREE", "2026-12-01");
    await expect(createTask(db, shop.id, input(), "FREE")).resolves.toBeTruthy();
    await expect(createTask(db, shop.id, input(), "PAID")).resolves.toBeTruthy();
  });

  it("two parallel creates at 24 open yield exactly one success", async () => {
    const shop = await makeShop();
    for (let i = 0; i < 24; i++) await createTask(db, shop.id, input({ title: `t${i}` }), "FREE");
    const results = await Promise.allSettled([createTask(db, shop.id, input(), "FREE"), createTask(db, shop.id, input(), "FREE")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await openCount(db, shop.id)).toBe(25);
  });
});

describe("shop scoping", () => {
  it("shop B cannot read, change or list shop A tasks", async () => {
    const a = await makeShop();
    const b = await makeShop();
    const gid = "gid://shopify/Order/1";
    const t = await createTask(db, a.id, input({ subjectType: "ORDER", subjectGid: gid, subjectName: "#1" }), "FREE");
    await expect(getTask(db, b.id, t.id)).rejects.toBeInstanceOf(UserError);
    await expect(snoozeTask(db, b.id, t.id, "2026-12-09")).rejects.toBeInstanceOf(UserError);
    await expect(deleteTask(db, b.id, t.id)).rejects.toBeInstanceOf(UserError);
    await expect(completeTask(db, b.id, t.id, "PAID", "2026-12-01")).rejects.toBeInstanceOf(UserError);
    expect((await listForSubject(db, b.id, gid)).open).toHaveLength(0);
    expect((await listForSubject(db, a.id, gid)).open).toHaveLength(1);
    expect((await listQueue(db, b.id, "later", {}, "2026-11-24", null)).tasks).toHaveLength(0);
    expect((await getTask(db, a.id, t.id)).status).toBe("OPEN");
  });
});

describe("queue and counts", () => {
  it("buckets by due date, filters and pages by cursor", async () => {
    const shop = await makeShop();
    const today = "2026-11-24";
    await createTask(db, shop.id, input({ dueOn: "2026-11-20", tags: "rush" }), "FREE");
    await createTask(db, shop.id, input({ dueOn: today }), "FREE");
    await createTask(db, shop.id, input({ dueOn: "2026-11-28" }), "FREE");
    await createTask(db, shop.id, input({ dueOn: "2026-12-30", title: "Far away" }), "FREE");
    const counts = await tabCounts(db, shop.id, {}, today);
    expect(counts).toEqual({ overdue: 1, today: 1, week: 1, later: 1, done: 0 });
    expect((await listQueue(db, shop.id, "overdue", { tag: "rush" }, today, null)).tasks).toHaveLength(1);
    expect((await listQueue(db, shop.id, "later", { q: "far" }, today, null)).tasks).toHaveLength(1);
  });

  it("paginates 25 per page", async () => {
    const shop = await makeShop();
    for (let i = 0; i < 30; i++) await createTask(db, shop.id, input({ dueOn: "2026-12-20", title: `t${i}` }), "PAID");
    const p1 = await listQueue(db, shop.id, "later", {}, "2026-11-24", null);
    expect(p1.tasks).toHaveLength(25);
    expect(p1.nextCursor).toBeTruthy();
    const p2 = await listQueue(db, shop.id, "later", {}, "2026-11-24", p1.nextCursor);
    expect(p2.tasks).toHaveLength(5);
    expect(p2.nextCursor).toBeNull();
  });
});

describe("export", () => {
  it("streams every row in batches", async () => {
    const shop = await makeShop();
    await db.task.createMany({ data: Array.from({ length: 1100 }, (_, i) => ({ shopId: shop.id, title: `row ${i}`, dueOn: new Date("2026-12-01T00:00:00Z") })) });
    const sizes: number[] = [];
    for await (const rows of exportBatches(db, shop.id, { status: "all" }, 500)) sizes.push(rows.length);
    expect(sizes).toEqual([500, 500, 100]);
  });
});
