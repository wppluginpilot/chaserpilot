/**
 * The one way an admin route gets its tenant. Authenticates the embedded
 * request and resolves (on first load, provisions) the shop.
 */
import { authenticate } from "../shopify.server";
import { prisma } from "../../server/db.server";
import { todayIn } from "../../server/domain/dates";
import { clearPlanCache, getPlanState, planGate } from "../../server/services/billing.server";
import { ensureShop } from "../../server/services/shop.server";
import { fetchShopProfile } from "../../server/shopify/admin.server";

export async function requireShop(request: Request, opts: { gate?: boolean; fresh?: boolean } = {}) {
  const auth = await authenticate.admin(request);
  const { admin, session } = auth;
  const shop = await ensureShop(prisma, session.shop, () => fetchShopProfile(admin));
  if (opts.fresh) clearPlanCache(session.shop);
  const state = await getPlanState(auth.billing, shop);
  const plan = opts.gate === false ? state.plan : planGate({ state, url: new URL(request.url), redirect: auth.redirect });
  return {
    auth,
    admin,
    session,
    shop,
    shopId: shop.id,
    db: prisma,
    /** null only on /app/plan and /app/help before a plan is chosen. */
    plan,
    planState: state,
    /** Plan for gating: a store that has not chosen yet is treated as Free. */
    effectivePlan: (plan ?? "FREE") as "FREE" | "PAID",
    today: () => todayIn(shop.timezone),
  };
}

export type AdminContext = Awaited<ReturnType<typeof requireShop>>;
