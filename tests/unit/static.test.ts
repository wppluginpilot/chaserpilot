/**
 * Static checks that keep code, config and the Partner pricing page in step.
 * "No trial" and "never billing.request" are rules a reviewer enforces, so
 * they are enforced here too.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { MONTHLY_PLAN, PLAN_PRICE } from "../../server/domain/plan";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "build", ".react-router", ".devpg"].includes(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const sources = (dir: string, exts = [".ts", ".tsx", ".js", ".jsx", ".toml", ".md", ".mjs"]) =>
  statSync(path.join(root, dir), { throwIfNoEntry: false }) ? walk(path.join(root, dir)).filter((f) => exts.includes(path.extname(f))) : [];

describe("billing", () => {
  const shopify = read("app/shopify.server.ts");
  it("declares exactly one plan with no trial", () => {
    expect(shopify.match(/\[MONTHLY_PLAN\]/g)).toHaveLength(1);
    expect(shopify).not.toMatch(/trialDays/i);
    expect(shopify).toContain("BillingInterval.Every30Days");
    expect(MONTHLY_PLAN).toBe("ChaserPilot Monthly");
    expect(PLAN_PRICE).toBe(9.95);
  });
  it("creates a 9.95 EVERY_30_DAYS subscription without trialDays", () => {
    const admin = read("server/shopify/admin.server.ts");
    expect(admin).toContain('interval: "EVERY_30_DAYS"');
    expect(admin).not.toMatch(/trialDays/i);
    expect(admin).toContain("appSubscriptionCreate");
    expect(read("server/services/billing.server.ts")).toContain("price: PLAN_PRICE");
  });
  it("checks the plan with isTest: true", () => {
    const b = read("server/services/billing.server.ts");
    expect(b).toContain("CHECK_IS_TEST = true");
    expect(b).toMatch(/isTest: CHECK_IS_TEST/);
  });
  it("never calls billing.request anywhere", () => {
    const hits = [...sources("app"), ...sources("server")].filter((f) => /billing\.request\s*\(/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
  it("has no mention of a trial in app, server, public pages or extensions", () => {
    const files = [...sources("app"), ...sources("server"), ...sources("public", [".html", ".svg"]), ...sources("extensions")];
    const hits = files.filter((f) => /\btrial/i.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => path.relative(root, f))).toEqual([]);
  });
});

describe("shopify.app.toml", () => {
  const toml = read("shopify.app.toml");
  it("api version matches the code", () => {
    expect(toml).toContain('api_version = "2026-07"');
    expect(read("app/shopify.server.ts")).toContain("ApiVersion.July26");
  });
  it("requests exactly read_orders and read_customers", () => {
    expect(toml).toMatch(/^scopes = "read_orders,read_customers"$/m);
  });
  it("has compliance and lifecycle webhooks", () => {
    for (const t of ["customers/data_request", "customers/redact", "shop/redact", "app/uninstalled", "app/scopes_update"]) expect(toml).toContain(t);
  });
  it("has no app proxy", () => {
    expect(toml).not.toContain("[app_proxy]");
  });
});

describe("expiring offline tokens", () => {
  it("are enabled and the session model stores the refresh token", () => {
    expect(read("app/shopify.server.ts")).toMatch(/expiringOfflineAccessTokens:\s*true/);
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("refreshToken");
    expect(schema).toContain("refreshTokenExpires");
  });
});

describe("no AI", () => {
  it("has no AI provider or wording in code or copy", () => {
    const files = [...sources("app"), ...sources("server")];
    const hits = files.filter((f) => /openai|anthropic|gemini|\bllm\b|ai-powered|artificial intelligence/i.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => path.relative(root, f))).toEqual([]);
  });
});

describe("extensions", () => {
  it("target the four admin surfaces on 2026-07", () => {
    const all = sources("extensions", [".toml"])
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    for (const t of [
      "admin.order-details.action.render",
      "admin.customer-details.action.render",
      "admin.order-details.block.render",
      "admin.customer-details.block.render",
    ]) {
      expect(all).toContain(t);
    }
    expect(all).toContain('api_version = "2026-07"');
  });
});
