/**
 * The daily digest. A tick every 5 minutes finds shops whose local hour matches
 * and that have no DigestLog row for their local date yet. The row is claimed
 * BEFORE sending (unique on shop + date), so two ticks or two instances can
 * never double-send; a failed send releases the claim so a later tick in the
 * same hour retries.
 */
import type { PrismaClient, Shop } from "@prisma/client";

import { fromDbDate, hourIn, todayIn } from "../domain/dates";
import { buildDigest, isDigestHour, makeUnsubscribeToken } from "../domain/digest";
import { log } from "../logger.server";
import type { Mailer } from "./mailer.server";
import { dueNow } from "./tasks.server";

type Db = PrismaClient;

export interface DigestConfig {
  appUrl: string;
  secret: string;
  /** Admin URL handle of the app, for the queue link. */
  handle?: string;
}

export interface TickResult {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
}

export function queueUrl(shop: Pick<Shop, "domain">, handle = "chaserpilot"): string {
  return `https://admin.shopify.com/store/${shop.domain.replace(/\.myshopify\.com$/, "")}/apps/${handle}/app`;
}

export function unsubscribeUrl(appUrl: string, secret: string, shopId: string): string {
  return `${appUrl.replace(/\/$/, "")}/digest/unsubscribe?t=${encodeURIComponent(makeUnsubscribeToken(secret, shopId))}`;
}

export function recipientsFor(shop: Pick<Shop, "ownerEmail" | "digestExtraTo">): string[] {
  return [...new Set([shop.ownerEmail, shop.digestExtraTo].map((e) => (e ?? "").trim()).filter(Boolean))];
}

let running = false;

export async function runDigestTick(db: Db, mailer: Mailer | null, config: DigestConfig, now: Date = new Date()): Promise<TickResult> {
  const result: TickResult = { checked: 0, sent: 0, failed: 0, skipped: 0 };
  if (!mailer || running) return result;
  running = true;
  try {
    const shops = await db.shop.findMany({ where: { digestEnabled: true, uninstalledAt: null } });
    for (const shop of shops) {
      result.checked++;
      if (!isDigestHour(hourIn(shop.timezone, now), shop.digestHour)) {
        result.skipped++;
        continue;
      }
      const today = todayIn(shop.timezone, now);
      const outcome = await sendDigestForShop(db, mailer, shop, today, config);
      result[outcome]++;
    }
  } finally {
    running = false;
  }
  return result;
}

export async function sendDigestForShop(db: Db, mailer: Mailer, shop: Shop, today: string, config: DigestConfig): Promise<"sent" | "failed" | "skipped"> {
  const localDate = new Date(`${today}T00:00:00.000Z`);
  const claim = await db.digestLog
    .create({ data: { shopId: shop.id, localDate, count: 0 } })
    .catch((error: { code?: string }) => {
      if (error.code === "P2002") return null;
      throw error;
    });
  if (!claim) return "skipped";

  try {
    const recipients = recipientsFor(shop);
    const { overdue, today: dueToday } = await dueNow(db, shop.id, today);
    const toDigest = (t: (typeof overdue)[number]) => ({ id: t.id, title: t.title, dueOn: fromDbDate(t.dueOn), label: t.subjectName, assignee: t.assignee });
    const unsub = unsubscribeUrl(config.appUrl, config.secret, shop.id);
    const email = buildDigest({
      shopName: shop.name ?? "",
      shopDomain: shop.domain,
      today,
      overdue: overdue.map(toDigest),
      dueToday: dueToday.map(toDigest),
      queueUrl: queueUrl(shop, config.handle),
      unsubscribeUrl: unsub,
    });
    if (!email || recipients.length === 0) return "skipped";
    await mailer.send({ to: recipients, ...email, unsubscribeUrl: unsub });
    await db.digestLog.update({ where: { id: claim.id }, data: { count: overdue.length + dueToday.length } });
    return "sent";
  } catch (error) {
    log().error({ err: error, shop: shop.domain }, "digest send failed; will retry within the hour");
    await db.digestLog.delete({ where: { id: claim.id } }).catch(() => undefined);
    return "failed";
  }
}

/** Turns the digest off for the shop named in a verified unsubscribe token. */
export async function unsubscribeShop(db: Db, shopId: string): Promise<boolean> {
  const res = await db.shop.updateMany({ where: { id: shopId }, data: { digestEnabled: false } });
  return res.count > 0;
}
