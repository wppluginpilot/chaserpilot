/** Queue tabs. Lives in the domain layer so route components can import it without pulling in server code. */
export type QueueTab = "overdue" | "today" | "week" | "later" | "done";
export const TABS: QueueTab[] = ["overdue", "today", "week", "later", "done"];
