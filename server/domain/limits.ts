import { FREE_OPEN_LIMIT, type PlanKey } from "./plan";

export function freeLimitMessage(): string {
  return `You have ${FREE_OPEN_LIMIT} open follow-ups, the Free limit. Mark some done or upgrade.`;
}

/** Only open tasks count toward the Free limit; done tasks never do. */
export function canAddOpen(plan: PlanKey, openCount: number): boolean {
  return plan === "PAID" || openCount < FREE_OPEN_LIMIT;
}
