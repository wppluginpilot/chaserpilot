/**
 * The task actions shared by the queue, the task page and the Today view.
 * Each takes a form with `intent` and `id`.
 */
import { snoozeTarget } from "../../server/domain/snooze";
import { UserError } from "../../server/errors";
import { completeTask, deleteTask, reopenTask, snoozeTask, stopRepeating } from "../../server/services/tasks.server";
import { fail, guard, str } from "./action.server";
import type { AdminContext } from "./context.server";

export const TASK_INTENTS = ["done", "reopen", "snooze", "delete", "stop-repeating"];

export function handleTaskAction(ctx: AdminContext, form: FormData) {
  return guard(async () => {
    const intent = str(form, "intent");
    const id = str(form, "id");
    if (!id) return fail("Pick a follow-up first.");
    const today = ctx.today();
    switch (intent) {
      case "done": {
        const { next } = await completeTask(ctx.db, ctx.shopId, id, ctx.effectivePlan, today);
        return { ok: true as const, message: next ? "Done. The next one is on your list." : "Marked done" };
      }
      case "reopen":
        await reopenTask(ctx.db, ctx.shopId, id, ctx.effectivePlan);
        return { ok: true as const, message: "Reopened" };
      case "snooze": {
        const target = snoozeTarget(str(form, "when"), today, str(form, "date"));
        if (!target) throw new UserError("Pick a date to snooze until.", 400, "date");
        await snoozeTask(ctx.db, ctx.shopId, id, target);
        return { ok: true as const, message: `Snoozed to ${target}` };
      }
      case "delete":
        await deleteTask(ctx.db, ctx.shopId, id);
        return { ok: true as const, message: "Follow-up deleted", deleted: true as const };
      case "stop-repeating":
        await stopRepeating(ctx.db, ctx.shopId, id);
        return { ok: true as const, message: "This follow-up will not repeat any more" };
      default:
        return fail("Unknown action.");
    }
  });
}
