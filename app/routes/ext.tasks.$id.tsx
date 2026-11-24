/** POST /ext/tasks/:id  { intent: "done" | "snooze", when?, date? }  from the Follow-ups block. */
import type { ActionFunctionArgs } from "react-router";

import { requireShop } from "../lib/context.server";
import { handleTaskAction } from "../lib/task-actions.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const ctx = await requireShop(request, { gate: false });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const intent = String(body.intent ?? "");
  if (intent !== "done" && intent !== "snooze") return ctx.auth.cors(Response.json({ ok: false, error: "Unknown action." }, { status: 400 }));
  const form = new FormData();
  form.set("intent", intent);
  form.set("id", params.id ?? "");
  form.set("when", String(body.when ?? ""));
  form.set("date", String(body.date ?? ""));
  const result = await handleTaskAction(ctx, form);
  return ctx.auth.cors(Response.json(result, { status: result.ok ? 200 : 400 }));
};
