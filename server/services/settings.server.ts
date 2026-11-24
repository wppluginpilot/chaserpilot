import type { PrismaClient, Shop } from "@prisma/client";
import { z } from "zod";

import type { PlanKey } from "../domain/plan";
import { settingsSchema } from "../domain/validation";
import { UserError } from "../errors";

type Db = PrismaClient;
export type SettingsInput = z.infer<typeof settingsSchema>;

export async function saveSettings(db: Db, shop: Shop, plan: PlanKey, input: SettingsInput): Promise<Shop> {
  if (plan !== "PAID" && (input.digestEnabled || input.digestExtraTo)) {
    throw new UserError("The daily digest is part of the Paid plan. Upgrade on the Plan page to turn it on.", 402, "digestEnabled");
  }
  return db.shop.update({
    where: { id: shop.id },
    data: {
      timezone: input.timezone,
      defaultDueDays: input.defaultDueDays,
      digestEnabled: input.digestEnabled,
      digestHour: input.digestHour,
      digestExtraTo: input.digestExtraTo || null,
    },
  });
}

export async function listAssignees(db: Db, shopId: string) {
  return db.assignee.findMany({ where: { shopId }, orderBy: { name: "asc" } });
}

export async function addAssignee(db: Db, shopId: string, plan: PlanKey, name: string): Promise<void> {
  if (plan !== "PAID") throw new UserError("Assignees are part of the Paid plan. Upgrade on the Plan page to use them.", 402);
  const clean = name.trim();
  if (!clean) throw new UserError("Type a name first.", 400, "assignee");
  if (clean.length > 60) throw new UserError("Names can be at most 60 characters.", 400, "assignee");
  await db.assignee.upsert({ where: { shopId_name: { shopId, name: clean } }, create: { shopId, name: clean }, update: {} });
}

export async function removeAssignee(db: Db, shopId: string, id: string): Promise<void> {
  await db.assignee.deleteMany({ where: { id, shopId } });
}
