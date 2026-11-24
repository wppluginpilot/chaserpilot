import { PrismaClient } from "@prisma/client";

import { ensureShop } from "../server/services/shop.server";

export const db = new PrismaClient();

let counter = 0;

/** A fresh tenant per test, so tests never see each other's rows. */
export async function makeShop(overrides: { timeZone?: string } = {}) {
  counter += 1;
  const domain = `test-${Date.now()}-${counter}.myshopify.com`;
  const ctx = await ensureShop(db, domain, async () => ({
    name: "Test Shop",
    email: "owner@example.com",
    ianaTimezone: overrides.timeZone ?? "America/New_York",
    devStore: false,
  }));
  return { ...ctx, domain };
}
