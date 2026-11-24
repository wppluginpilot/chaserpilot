import { describe, expect, it, vi } from "vitest";

import { clearPlanCache, getPlanState, isWaiverShop, startUpgrade, waiverShops } from "../../server/services/billing.server";

vi.mock("../../server/shopify/admin.server", async (orig) => ({
  ...(await orig<typeof import("../../server/shopify/admin.server")>()),
  createSubscription: vi.fn(async () => ({ error: "Public distribution is required to charge", unlisted: true })),
}));

const billing = { check: async () => ({ hasActivePayment: false, appSubscriptions: [] }) };
const env = { BILLING_WAIVER_SHOPS: " Usman-Built-This.myshopify.com , other.myshopify.com" };

function fakeDb() {
  const update = vi.fn(async () => ({}));
  return { db: { shop: { update } } as never, update };
}
const shopRow = (domain: string) => ({ id: "s1", domain, devStore: true, billingWaived: false }) as never;

describe("billing waiver allowlist", () => {
  it("parses the env list, trimmed and lowercased, empty by default", () => {
    expect(waiverShops(env)).toEqual(["usman-built-this.myshopify.com", "other.myshopify.com"]);
    expect(waiverShops({})).toEqual([]);
    expect(isWaiverShop("USMAN-BUILT-THIS.myshopify.com", env)).toBe(true);
    expect(isWaiverShop("review.myshopify.com", env)).toBe(false);
  });

  it("waives an allowlisted store", async () => {
    const { db, update } = fakeDb();
    const res = await startUpgrade(db, {} as never, shopRow("usman-built-this.myshopify.com"), env);
    expect(res).toEqual({ waived: true });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not waive another store and returns a readable error", async () => {
    const { db, update } = fakeDb();
    const res = await startUpgrade(db, {} as never, shopRow("review.myshopify.com"), env);
    expect("error" in res && res.error).toMatch(/can't start a paid subscription/i);
    expect(update).not.toHaveBeenCalled();
    expect(await startUpgrade(db, {} as never, shopRow("usman-built-this.myshopify.com"), {})).toHaveProperty("error");
  });

  it("ignores a stale billingWaived flag on a non-allowlisted store", async () => {
    clearPlanCache();
    const stale = { domain: "review.myshopify.com", billingWaived: true, freeSelectedAt: null };
    expect(await getPlanState(billing, stale, Date.now(), env)).toMatchObject({ plan: null, waived: false });
    clearPlanCache();
    expect(await getPlanState(billing, { ...stale, domain: "usman-built-this.myshopify.com" }, Date.now(), env)).toMatchObject({ plan: "PAID", waived: true, test: true });
  });
});
