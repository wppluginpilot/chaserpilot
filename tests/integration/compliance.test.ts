import { afterAll, describe, expect, it } from "vitest";

import { taskInputSchema } from "../../server/domain/validation";
import { handleCustomerRedact, handleDataRequest } from "../../server/services/compliance.server";
import { runDigestTick, unsubscribeShop } from "../../server/services/digest.server";
import type { MailMessage, Mailer } from "../../server/services/mailer.server";
import { cleanupUninstalled, deleteAllData, ensureShop, markUninstalled, redactShop } from "../../server/services/shop.server";
import { createTask } from "../../server/services/tasks.server";
import { db, makeShop } from "../helpers";

afterAll(() => db.$disconnect());

const input = (over: Record<string, unknown> = {}) => taskInputSchema.parse({ title: "T", dueOn: "2026-11-01", ...over });

describe("compliance webhooks", () => {
  it("data_request returns, and customers/redact deletes, only the matching tasks", async () => {
    const shop = await makeShop();
    const other = await makeShop();
    await createTask(db, shop.id, input({ title: "mine", subjectType: "CUSTOMER", subjectGid: "gid://shopify/Customer/77" }), "FREE");
    await createTask(db, shop.id, input({ title: "order", subjectType: "ORDER", subjectGid: "gid://shopify/Order/500" }), "FREE");
    await createTask(db, shop.id, input({ title: "keep", subjectType: "CUSTOMER", subjectGid: "gid://shopify/Customer/88" }), "FREE");
    await createTask(db, other.id, input({ title: "other shop", subjectType: "CUSTOMER", subjectGid: "gid://shopify/Customer/77" }), "FREE");

    const req = await handleDataRequest(db, shop.domain, { customer: { id: 77 }, orders_requested: [500] });
    expect(req.map((t) => t.title).sort()).toEqual(["mine", "order"]);

    expect(await handleCustomerRedact(db, shop.domain, { customer: { id: 77 }, orders_to_redact: [500] })).toBe(2);
    expect(await db.task.findMany({ where: { shopId: shop.id } })).toHaveLength(1);
    expect(await db.task.count({ where: { shopId: other.id } })).toBe(1);
    expect(await handleCustomerRedact(db, shop.domain, { customer: { id: 999 } })).toBe(0);
    expect(await handleCustomerRedact(db, "unknown.myshopify.com", { customer: { id: 77 } })).toBe(0);
  });

  it("app/uninstalled keeps data and reinstall finds it; shop/redact cascades", async () => {
    const shop = await makeShop();
    await createTask(db, shop.id, input(), "FREE");
    await db.session.create({ data: { id: `s-${shop.id}`, shop: shop.domain, state: "x", isOnline: false, accessToken: "tok" } });
    await db.shop.update({ where: { id: shop.id }, data: { digestEnabled: true } });
    await markUninstalled(db, shop.domain);
    expect(await db.session.count({ where: { shop: shop.domain } })).toBe(0);
    const row = await db.shop.findUniqueOrThrow({ where: { id: shop.id } });
    expect(row.uninstalledAt).not.toBeNull();
    expect(row.digestEnabled).toBe(false);
    expect(await db.task.count({ where: { shopId: shop.id } })).toBe(1);

    const back = await ensureShop(db, shop.domain, async () => ({ name: "Test", email: "o@example.com", ianaTimezone: "UTC", devStore: false }));
    expect(back.id).toBe(shop.id);
    expect(back.uninstalledAt).toBeNull();

    await redactShop(db, shop.domain);
    expect(await db.shop.count({ where: { id: shop.id } })).toBe(0);
    expect(await db.task.count({ where: { shopId: shop.id } })).toBe(0);
    expect(await db.taskEvent.count({ where: { shopId: shop.id } })).toBe(0);
    expect(await db.template.count({ where: { shopId: shop.id } })).toBe(0);
  });

  it("hard-deletes shops uninstalled more than 48 hours ago", async () => {
    const shop = await makeShop();
    await db.shop.update({ where: { id: shop.id }, data: { uninstalledAt: new Date(Date.now() - 49 * 3600_000) } });
    const fresh = await makeShop();
    await db.shop.update({ where: { id: fresh.id }, data: { uninstalledAt: new Date(Date.now() - 3600_000) } });
    await cleanupUninstalled(db);
    expect(await db.shop.count({ where: { id: shop.id } })).toBe(0);
    expect(await db.shop.count({ where: { id: fresh.id } })).toBe(1);
  });

  it("delete all my data clears tasks, templates and events but keeps the shop", async () => {
    const shop = await makeShop();
    await createTask(db, shop.id, input(), "FREE");
    await deleteAllData(db, shop.id);
    expect(await db.task.count({ where: { shopId: shop.id } })).toBe(0);
    expect(await db.template.count({ where: { shopId: shop.id } })).toBe(0);
    expect(await db.shop.count({ where: { id: shop.id } })).toBe(1);
  });
});

describe("digest tick", () => {
  const config = { appUrl: "https://chaserpilot.test", secret: "s3cret" };
  function fake(fail = false) {
    const sent: MailMessage[] = [];
    let failing = fail;
    const mailer: Mailer = {
      async send(m) {
        if (failing) throw new Error("provider down");
        sent.push(m);
      },
    };
    return { mailer, sent, recover: () => (failing = false) };
  }

  it("sends once per local day, only when something is due, then unsubscribes", async () => {
    const shop = await makeShop({ timeZone: "UTC" });
    await db.shop.update({ where: { id: shop.id }, data: { digestEnabled: true, digestHour: 8 } });
    await createTask(db, shop.id, input({ title: "Overdue one", dueOn: "2026-11-20" }), "PAID");
    const f = fake();
    await runDigestTick(db, f.mailer, config, new Date("2026-11-24T08:10:00Z"));
    const mine = f.sent.filter((m) => m.text.includes("Overdue one"));
    expect(mine).toHaveLength(1);
    expect(mine[0]!.unsubscribeUrl).toContain("/digest/unsubscribe?t=");
    await runDigestTick(db, f.mailer, config, new Date("2026-11-24T08:40:00Z"));
    expect(f.sent.filter((m) => m.text.includes("Overdue one"))).toHaveLength(1);
    expect(await db.digestLog.count({ where: { shopId: shop.id } })).toBe(1);

    await unsubscribeShop(db, shop.id);
    expect((await db.shop.findUniqueOrThrow({ where: { id: shop.id } })).digestEnabled).toBe(false);
  });

  it("retries after a failure within the hour and sends nothing outside it", async () => {
    const shop = await makeShop({ timeZone: "UTC" });
    await db.shop.update({ where: { id: shop.id }, data: { digestEnabled: true, digestHour: 9 } });
    await createTask(db, shop.id, input({ title: "Retry me", dueOn: "2026-11-20" }), "PAID");
    const g = fake(true);
    await runDigestTick(db, g.mailer, config, new Date("2026-11-26T08:50:00Z"));
    await runDigestTick(db, g.mailer, config, new Date("2026-11-26T09:05:00Z"));
    expect(g.sent).toHaveLength(0);
    g.recover();
    await runDigestTick(db, g.mailer, config, new Date("2026-11-26T09:10:00Z"));
    expect(g.sent.filter((m) => m.text.includes("Retry me"))).toHaveLength(1);
  });

  it("a null mailer sends nothing (in-app digest only)", async () => {
    const r = await runDigestTick(db, null, config, new Date());
    expect(r.sent).toBe(0);
  });
});
