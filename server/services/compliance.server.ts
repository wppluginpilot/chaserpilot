/** Compliance webhook logic (customers/data_request, customers/redact). Shop-scoped by domain. */
import type { PrismaClient } from "@prisma/client";

import { redactCustomerTasks, tasksForDataRequest } from "./tasks.server";

type Db = PrismaClient;

interface CustomerPayload {
  customer?: { id?: number | string };
  orders_requested?: (number | string)[];
  orders_to_redact?: (number | string)[];
}

async function shopId(db: Db, domain: string): Promise<string | null> {
  return (await db.shop.findUnique({ where: { domain }, select: { id: true } }))?.id ?? null;
}

export async function handleDataRequest(db: Db, domain: string, payload: CustomerPayload) {
  const id = await shopId(db, domain);
  if (!id) return [];
  return tasksForDataRequest(db, id, payload.customer?.id ?? null, payload.orders_requested ?? []);
}

export async function handleCustomerRedact(db: Db, domain: string, payload: CustomerPayload): Promise<number> {
  const id = await shopId(db, domain);
  if (!id) return 0;
  return redactCustomerTasks(db, id, payload.customer?.id ?? null, payload.orders_to_redact ?? []);
}
