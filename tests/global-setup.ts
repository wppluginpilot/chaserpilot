import { execSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

/**
 * Creates the test database if it does not exist and applies migrations with
 * the non-destructive `migrate deploy`. Nothing is ever reset: every test makes
 * its own shop, and tenant isolation keeps tests from seeing each other's rows.
 */
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://chaserpilot@127.0.0.1:5438/chaserpilot_test?schema=public";
  const admin = new PrismaClient({ datasources: { db: { url: url.replace(/\/[^/?]+(\?|$)/, "/postgres$1") } } });
  const name = new URL(url).pathname.slice(1);
  const exists = await admin.$queryRawUnsafe<{ n: number }[]>(`SELECT 1 AS n FROM pg_database WHERE datname = $1`, name);
  if (exists.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${name.replace(/"/g, "")}"`);
  await admin.$disconnect();
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
