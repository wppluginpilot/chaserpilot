/**
 * In-process background jobs (no external queue):
 *   - digest tick every 5 minutes
 *   - cleanup tick every 6 hours: shops uninstalled more than 48 h whose
 *     shop/redact never arrived are hard-deleted
 * Started once from the server entry (app/entry.server.tsx imports this lazily
 * on first request); each tick is single-flight and never throws.
 */
import { prisma } from "../db.server";
import { env } from "../env.server";
import { log } from "../logger.server";
import { runDigestTick } from "./digest.server";
import { getMailer } from "./mailer.server";
import { cleanupUninstalled } from "./shop.server";

declare global {
  var __chaserpilotJobs: boolean | undefined;
}

export const DIGEST_TICK_MS = 5 * 60_000;
export const CLEANUP_TICK_MS = 6 * 3600_000;

export function startJobs(): void {
  if (global.__chaserpilotJobs || env.NODE_ENV === "test") return;
  global.__chaserpilotJobs = true;

  const digest = async () => {
    try {
      const r = await runDigestTick(prisma, getMailer(), { appUrl: env.SHOPIFY_APP_URL, secret: env.SHOPIFY_API_SECRET });
      if (r.sent || r.failed) log().info({ ...r }, "digest tick");
    } catch (error) {
      log().error({ err: error }, "digest tick crashed");
    }
  };
  const cleanup = async () => {
    try {
      await cleanupUninstalled(prisma);
    } catch (error) {
      log().error({ err: error }, "cleanup tick crashed");
    }
  };
  setInterval(digest, DIGEST_TICK_MS).unref();
  setInterval(cleanup, CLEANUP_TICK_MS).unref();
  void cleanup();
  log().info({ mailer: getMailer() ? "smtp" : "none" }, "background jobs started");
}
