import type { PrismaClient, Shop } from "@prisma/client";

import { isValidTimeZone } from "../domain/dates";
import { log } from "../logger.server";
import type { ShopProfile } from "../shopify/admin.server";

type Db = PrismaClient;

export const STARTER_TEMPLATES = [
  { name: "Chase deposit", title: "Chase deposit", dueDays: 3, tags: ["deposit"], notes: null },
  { name: "Check delivery", title: "Check the order was delivered", dueDays: 7, tags: ["delivery"], notes: null },
  { name: "Ask for review", title: "Ask for a review", dueDays: 14, tags: ["review"], notes: null },
] as const;

/**
 * Finds or provisions the shop on the first admin load. A reinstall finds the
 * row (and its tasks) again and clears uninstalledAt. The Shopify profile is
 * only fetched when the shop is new or reinstalled.
 */
export async function ensureShop(db: Db, domain: string, fetchProfile: () => Promise<ShopProfile>): Promise<Shop> {
  const existing = await db.shop.findUnique({ where: { domain } });
  if (existing && !existing.uninstalledAt) return existing;

  const profile = await fetchProfile();
  const tz = isValidTimeZone(profile.ianaTimezone) ? profile.ianaTimezone : "UTC";
  if (existing) {
    return db.shop.update({
      where: { id: existing.id },
      data: { uninstalledAt: null, name: profile.name, ownerEmail: profile.email, devStore: profile.devStore },
    });
  }
  try {
    const shop = await db.shop.create({
      data: { domain, name: profile.name, ownerEmail: profile.email, timezone: tz, devStore: profile.devStore },
    });
    await seedStarterTemplates(db, shop.id);
    return shop;
  } catch (error) {
    // Two first requests raced: the other one created the row.
    const again = await db.shop.findUnique({ where: { domain } });
    if (again) return again;
    throw error;
  }
}

export async function seedStarterTemplates(db: Db, shopId: string): Promise<void> {
  await db.template.createMany({
    data: STARTER_TEMPLATES.map((t) => ({ shopId, name: t.name, title: t.title, dueDays: t.dueDays, tags: [...t.tags], notes: t.notes })),
    skipDuplicates: true,
  });
}

/** app/uninstalled: sessions go, tasks stay until shop/redact so a reinstall finds them. */
export async function markUninstalled(db: Db, domain: string): Promise<void> {
  await db.session.deleteMany({ where: { shop: domain } });
  await db.shop.updateMany({ where: { domain }, data: { uninstalledAt: new Date(), digestEnabled: false } });
}

/** shop/redact: delete the shop (everything cascades) and its sessions. */
export async function redactShop(db: Db, domain: string): Promise<void> {
  await db.session.deleteMany({ where: { shop: domain } });
  await db.shop.deleteMany({ where: { domain } });
}

/** "Delete all my data" in Settings: tasks, events, templates, assignees and digest log. The shop row stays. */
export async function deleteAllData(db: Db, shopId: string): Promise<void> {
  await db.$transaction([
    db.taskEvent.deleteMany({ where: { shopId } }),
    db.task.deleteMany({ where: { shopId } }),
    db.template.deleteMany({ where: { shopId } }),
    db.assignee.deleteMany({ where: { shopId } }),
    db.digestLog.deleteMany({ where: { shopId } }),
  ]);
}

/** Hard-deletes shops uninstalled more than 48 hours ago whose shop/redact never arrived. */
export async function cleanupUninstalled(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 48 * 3600_000);
  const stale = await db.shop.findMany({ where: { uninstalledAt: { lt: cutoff } }, select: { id: true, domain: true } });
  for (const s of stale) {
    await db.session.deleteMany({ where: { shop: s.domain } });
    await db.shop.delete({ where: { id: s.id } });
  }
  if (stale.length) log().info({ count: stale.length }, "cleaned up shops uninstalled more than 48h ago");
  return stale.length;
}

export async function markOnboarding(db: Db, shopId: string, key: string): Promise<void> {
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { onboardingDone: true } });
  if (!shop) return;
  const current = (shop.onboardingDone ?? {}) as Record<string, boolean>;
  if (current[key]) return;
  await db.shop.update({ where: { id: shopId }, data: { onboardingDone: { ...current, [key]: true } } });
}
