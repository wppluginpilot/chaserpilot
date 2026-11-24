import { describe, expect, it } from "vitest";

import { adminUrl, makeGid, parseGid } from "../../server/domain/gid";
import { canAddOpen, freeLimitMessage } from "../../server/domain/limits";
import { FREE_OPEN_LIMIT } from "../../server/domain/plan";
import { snoozeTarget } from "../../server/domain/snooze";

describe("free limit", () => {
  it("allows the 25th and refuses the 26th on Free", () => {
    expect(canAddOpen("FREE", 24)).toBe(true);
    expect(canAddOpen("FREE", 25)).toBe(false);
    expect(FREE_OPEN_LIMIT).toBe(25);
  });
  it("paid is unlimited", () => {
    expect(canAddOpen("PAID", 10_000)).toBe(true);
  });
  it("uses the agreed wording", () => {
    expect(freeLimitMessage()).toBe("You have 25 open follow-ups, the Free limit. Mark some done or upgrade.");
  });
});

describe("gid", () => {
  it("parses orders and customers", () => {
    expect(parseGid("gid://shopify/Order/123")).toEqual({ kind: "ORDER", id: "123" });
    expect(parseGid("gid://shopify/Customer/456")).toEqual({ kind: "CUSTOMER", id: "456" });
  });
  it("rejects anything else", () => {
    expect(parseGid("gid://shopify/Product/1")).toBeNull();
    expect(parseGid("gid://shopify/Order/abc")).toBeNull();
    expect(parseGid("1234")).toBeNull();
  });
  it("builds admin urls", () => {
    expect(adminUrl("my-shop.myshopify.com", "gid://shopify/Order/123")).toBe("https://admin.shopify.com/store/my-shop/orders/123");
    expect(adminUrl("my-shop.myshopify.com", "gid://shopify/Customer/9")).toBe("https://admin.shopify.com/store/my-shop/customers/9");
    expect(adminUrl("my-shop.myshopify.com", "nope")).toBeNull();
    expect(makeGid("ORDER", 5)).toBe("gid://shopify/Order/5");
  });
});

describe("snooze", () => {
  const today = "2026-11-23";
  it("counts from today", () => {
    expect(snoozeTarget("tomorrow", today)).toBe("2026-11-24");
    expect(snoozeTarget("3days", today)).toBe("2026-11-26");
    expect(snoozeTarget("monday", today)).toBe("2026-11-30");
    expect(snoozeTarget("date", today, "2026-12-25")).toBe("2026-12-25");
  });
  it("rejects a missing or invalid custom date and unknown choices", () => {
    expect(snoozeTarget("date", today)).toBeNull();
    expect(snoozeTarget("date", today, "2026-02-30")).toBeNull();
    expect(snoozeTarget("whenever", today)).toBeNull();
  });
});
