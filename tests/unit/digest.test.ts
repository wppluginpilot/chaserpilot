import { describe, expect, it } from "vitest";

import { buildDigest, isDigestHour, makeUnsubscribeToken, verifyUnsubscribeToken } from "../../server/domain/digest";

const task = (over: Partial<{ id: string; title: string; dueOn: string; label: string | null; assignee: string | null }> = {}) => ({
  id: "t1",
  title: "Chase deposit",
  dueOn: "2026-11-23",
  label: "#1043",
  assignee: null,
  ...over,
});
const input = {
  shopName: "Sam Sashes",
  shopDomain: "sam.myshopify.com",
  today: "2026-11-23",
  queueUrl: "https://admin.shopify.com/store/sam/apps/chaserpilot/app",
  unsubscribeUrl: "https://x/digest/unsubscribe?t=abc",
};

describe("digest email", () => {
  it("sends nothing when nothing is due", () => {
    expect(buildDigest({ ...input, overdue: [], dueToday: [] })).toBeNull();
  });
  it("lists overdue and due-today with a subject count", () => {
    const e = buildDigest({ ...input, overdue: [task({ id: "a", title: "Call back", dueOn: "2026-11-20", assignee: "Ana" })], dueToday: [task()] })!;
    expect(e.subject).toBe("2 follow-ups due for Sam Sashes");
    expect(e.text).toContain("Overdue (1)");
    expect(e.text).toContain("Call back (#1043) [Ana] - 3 days overdue");
    expect(e.text).toContain("Due today (1)");
    expect(e.text).toContain(input.queueUrl);
    expect(e.text).toContain(input.unsubscribeUrl);
    expect(e.html).toContain("Turn it off");
  });
  it("uses singular wording", () => {
    expect(buildDigest({ ...input, overdue: [], dueToday: [task()] })!.subject).toBe("1 follow-up due for Sam Sashes");
  });
  it("escapes HTML in merchant text", () => {
    const e = buildDigest({ ...input, overdue: [], dueToday: [task({ title: "<script>alert(1)</script>" })] })!;
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });
  it("matches the local hour only", () => {
    expect(isDigestHour(8, 8)).toBe(true);
    expect(isDigestHour(9, 8)).toBe(false);
  });
});

describe("unsubscribe token", () => {
  it("round-trips for the right secret", () => {
    expect(verifyUnsubscribeToken("secret", makeUnsubscribeToken("secret", "shop_1"))).toBe("shop_1");
  });
  it("rejects tampering, another secret and garbage", () => {
    const t = makeUnsubscribeToken("secret", "shop_1");
    expect(verifyUnsubscribeToken("other", t)).toBeNull();
    expect(verifyUnsubscribeToken("secret", t.replace("shop_1", "shop_2"))).toBeNull();
    expect(verifyUnsubscribeToken("secret", "garbage")).toBeNull();
    expect(verifyUnsubscribeToken("secret", "")).toBeNull();
  });
});
