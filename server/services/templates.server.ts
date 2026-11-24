import type { PrismaClient, Template } from "@prisma/client";
import { z } from "zod";

import { addDays } from "../domain/dates";
import type { PlanKey } from "../domain/plan";
import { templateInputSchema } from "../domain/validation";
import { notFound, UserError } from "../errors";

type Db = PrismaClient;
export type TemplateInput = z.infer<typeof templateInputSchema>;

function requirePaid(plan: PlanKey) {
  if (plan !== "PAID") throw new UserError("Templates are part of the Paid plan. Upgrade on the Plan page to add or change them.", 402);
}

export async function listTemplates(db: Db, shopId: string): Promise<Template[]> {
  return db.template.findMany({ where: { shopId }, orderBy: { name: "asc" } });
}

export async function getTemplate(db: Db, shopId: string, id: string): Promise<Template> {
  const t = await db.template.findFirst({ where: { id, shopId } });
  if (!t) throw notFound("That template");
  return t;
}

async function guardDuplicate<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw new UserError("You already have a template with that name.", 409, "name");
    throw error;
  }
}

export async function createTemplate(db: Db, shopId: string, plan: PlanKey, input: TemplateInput): Promise<Template> {
  requirePaid(plan);
  return guardDuplicate(() => db.template.create({ data: { shopId, name: input.name, title: input.title, dueDays: input.dueDays, tags: input.tags, notes: input.notes || null } }));
}

export async function updateTemplate(db: Db, shopId: string, plan: PlanKey, id: string, input: TemplateInput): Promise<Template> {
  requirePaid(plan);
  await getTemplate(db, shopId, id);
  return guardDuplicate(() => db.template.update({ where: { id }, data: { name: input.name, title: input.title, dueDays: input.dueDays, tags: input.tags, notes: input.notes || null } }));
}

/** Deleting a template never touches tasks made from it. */
export async function deleteTemplate(db: Db, shopId: string, plan: PlanKey, id: string): Promise<void> {
  requirePaid(plan);
  await getTemplate(db, shopId, id);
  await db.template.deleteMany({ where: { id, shopId } });
}

/** What a template fills into the new-follow-up form. */
export function applyTemplate(t: Pick<Template, "title" | "dueDays" | "tags" | "notes">, today: string) {
  return { title: t.title, dueOn: addDays(today, t.dueDays), tags: t.tags, notes: t.notes ?? "" };
}
