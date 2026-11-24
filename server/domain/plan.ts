/**
 * Exactly two plans. Free has no Shopify subscription at all; Paid is one
 * recurring charge. Mirrored on the Partner pricing page.
 */
export const MONTHLY_PLAN = "ChaserPilot Monthly";
export const PLAN_PRICE = 9.95;
export const FREE_OPEN_LIMIT = 25;

export type PlanKey = "FREE" | "PAID";

export const PAID_FEATURES = [
  "Unlimited open follow-ups",
  "Assignees",
  "Recurring follow-ups",
  "Templates",
  "Daily digest email",
  "CSV export",
] as const;
