/**
 * Two plans only. Free needs no Shopify subscription; Paid is
 * "ChaserPilot Monthly", $9.95 every 30 days.
 *
 * The plan CHECK always passes `isTest: true`, which accepts test as well as
 * real subscriptions. Review stores are not partner development stores, yet
 * their charges become test charges (Plumbwise review round 1). The CREATE runs
 * `appSubscriptionCreate` here and returns the confirmationUrl; it never uses
 * `billing.request`, whose thrown re-auth response became a bare 401 inside
 * actions (Plumbwise round 2).
 */
import type { PrismaClient, Shop } from "@prisma/client";

import { MONTHLY_PLAN, PLAN_PRICE, type PlanKey } from "../domain/plan";
import { log } from "../logger.server";
import { cancelSubscription, createSubscription, fetchActiveSubscriptions, type AdminGraphql } from "../shopify/admin.server";

type Db = PrismaClient;

/** Admin URL handle (shopify.app.toml `handle`). */
export const APP_HANDLE = "chaserpilot";

/** isTest for billing.check: always true, see above. */
export const CHECK_IS_TEST = true;

/** Pages a store that has not chosen a plan can still open. */
export const PLAN_FREE_PATHS = ["/app/plan", "/app/help"];

export interface BillingCheck {
  check: (opts: { plans: (typeof MONTHLY_PLAN)[]; isTest: boolean }) => Promise<{ hasActivePayment: boolean; appSubscriptions: { id: string; name: string; test: boolean }[] }>;
}

export interface PlanState {
  /** null = the store has not chosen a plan yet. */
  plan: PlanKey | null;
  test: boolean;
  waived: boolean;
  subscriptionId: string | null;
}

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; value: PlanState }>();

export function clearPlanCache(domain?: string) {
  if (domain) cache.delete(domain);
  else cache.clear();
}

/**
 * Shops that may be given Paid without a Shopify charge, because Shopify
 * refuses charges while the app is unlisted. Explicit allowlist from
 * BILLING_WAIVER_SHOPS (comma-separated domains, default empty). Never applies
 * to a reviewer's or a merchant's store.
 */
export function waiverShops(env: Record<string, string | undefined> = process.env): string[] {
  return (env.BILLING_WAIVER_SHOPS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isWaiverShop(domain: string, env: Record<string, string | undefined> = process.env): boolean {
  return waiverShops(env).includes(domain.trim().toLowerCase());
}

export async function getPlanState(billing: BillingCheck, shop: Pick<Shop, "domain" | "billingWaived" | "freeSelectedAt">, now = Date.now(), env: Record<string, string | undefined> = process.env): Promise<PlanState> {
  // A stored flag alone never grants Paid: the store must be on the allowlist right now.
  if (shop.billingWaived && isWaiverShop(shop.domain, env)) return { plan: "PAID", test: true, waived: true, subscriptionId: null };
  const hit = cache.get(shop.domain);
  if (hit && now - hit.at < CACHE_MS) return hit.value;
  const res = await billing.check({ plans: [MONTHLY_PLAN], isTest: CHECK_IS_TEST });
  const sub = res.appSubscriptions.find((s) => s.name === MONTHLY_PLAN);
  let value: PlanState;
  if (res.hasActivePayment) value = { plan: "PAID", test: sub?.test ?? false, waived: false, subscriptionId: sub?.id ?? null };
  else if (shop.freeSelectedAt) value = { plan: "FREE", test: false, waived: false, subscriptionId: null };
  else value = { plan: null, test: false, waived: false, subscriptionId: null };
  cache.set(shop.domain, { at: now, value });
  return value;
}

/** Throws a redirect to /app/plan while the store has not picked Free or Paid. */
export function planGate(args: { state: PlanState; url: URL; redirect: (to: string) => Response }): PlanKey | null {
  if (args.state.plan) return args.state.plan;
  if (PLAN_FREE_PATHS.some((p) => args.url.pathname === p || args.url.pathname.startsWith(`${p}/`))) return null;
  throw args.redirect("/app/plan");
}

export function returnUrl(shopDomain: string): string {
  return `https://admin.shopify.com/store/${shopDomain.replace(/\.myshopify\.com$/, "")}/apps/${APP_HANDLE}/app/plan`;
}

export type UpgradeResult = { confirmationUrl: string } | { waived: true } | { error: string };

/** Starts the Paid plan: returns Shopify's approval URL for the client to open in the top window. */
export async function startUpgrade(db: Db, admin: AdminGraphql, shop: Shop, env: Record<string, string | undefined> = process.env): Promise<UpgradeResult> {
  const result = await createSubscription(admin, { name: MONTHLY_PLAN, returnUrl: returnUrl(shop.domain), test: shop.devStore, price: PLAN_PRICE });
  if ("confirmationUrl" in result) return result;
  if (result.unlisted) {
    if (!isWaiverShop(shop.domain, env)) {
      log().warn({ shop: shop.domain }, "billing refused by Shopify and shop is not on the waiver allowlist");
      return { error: "Shopify can't start a paid subscription for this store right now. Please try again later or contact support." };
    }
    // Shopify only allows billing once the app is public; only allowlisted developer stores are waived.
    log().warn({ shop: shop.domain }, "billing skipped: app distribution is not public yet");
    await db.shop.update({ where: { id: shop.id }, data: { billingWaived: true } });
    clearPlanCache(shop.domain);
    return { waived: true };
  }
  return { error: result.error };
}

/** Choosing Free: cancels any active subscription, records the choice and switches the digest off. */
export async function chooseFree(db: Db, admin: AdminGraphql, shop: Shop): Promise<{ error?: string }> {
  if (!(shop.billingWaived && isWaiverShop(shop.domain))) {
    const active = (await fetchActiveSubscriptions(admin)).filter((s) => s.name === MONTHLY_PLAN);
    for (const sub of active) {
      const err = await cancelSubscription(admin, sub.id);
      if (err) return { error: err };
    }
  }
  await db.shop.update({ where: { id: shop.id }, data: { freeSelectedAt: new Date(), billingWaived: false, digestEnabled: false } });
  clearPlanCache(shop.domain);
  return {};
}
