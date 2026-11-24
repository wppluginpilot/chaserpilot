/**
 * Resource route for the admin extensions (order and customer pages).
 * GET  /ext/tasks?subject=<gid>  open follow-ups (max 20) + last 3 done: one small request per render.
 * POST /ext/tasks                create a follow-up (the Free limit is enforced here, server side).
 * The extension sends its session token; requireShop verifies it and `cors`
 * adds the headers the extension's origin needs.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { extRoute } from "../lib/ext.server";
import { requireShop } from "../lib/context.server";
import { guard } from "../lib/action.server";
import { addDays } from "../../server/domain/dates";
import { parseGid } from "../../server/domain/gid";
import { FREE_OPEN_LIMIT } from "../../server/domain/plan";
import { toView } from "../../server/domain/task-view";
import { fieldErrors, taskInputSchema } from "../../server/domain/validation";
import { customerExists, fetchOrderName } from "../../server/shopify/admin.server";
import { createTask, listForSubject, openCount } from "../../server/services/tasks.server";

export const loader = ({ request }: LoaderFunctionArgs) =>
  extRoute(async () => {
    const ctx = await requireShop(request, { gate: false });
    const { cors } = ctx.auth;
    const gid = new URL(request.url).searchParams.get("subject") ?? "";
    if (!parseGid(gid)) return cors(Response.json({ ok: false, error: "Open this from an order or customer page." }, { status: 400 }));
    const today = ctx.today();
    const { open, done } = await listForSubject(ctx.db, ctx.shopId, gid);
    return cors(
      Response.json({
        ok: true,
        plan: ctx.effectivePlan,
        today,
        defaultDue: addDays(today, ctx.shop.defaultDueDays),
        tasks: open.map((t) => toView(t, ctx.shop.domain, today)),
        done: done.map((t) => toView(t, ctx.shop.domain, today)),
      }),
    );
  });

export const action = ({ request }: ActionFunctionArgs) =>
  extRoute(async () => {
    const ctx = await requireShop(request, { gate: false });
    const { cors } = ctx.auth;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const gid = typeof body.subjectGid === "string" ? body.subjectGid : "";
    const subject = parseGid(gid);
    if (!subject) return cors(Response.json({ ok: false, error: "Open this from an order or customer page." }, { status: 400 }));

    let subjectName: string | undefined = typeof body.subjectName === "string" ? body.subjectName : undefined;
    if (subject.kind === "ORDER") subjectName = (await fetchOrderName(ctx.admin, gid)) ?? subjectName;
    else await customerExists(ctx.admin, gid);

    const parsed = taskInputSchema.safeParse({
      title: body.title,
      dueOn: body.dueOn,
      notes: body.notes,
      assignee: body.assignee,
      tags: body.tags,
      subjectType: subject.kind,
      subjectGid: gid,
      subjectName,
    });
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      return cors(Response.json({ ok: false, error: Object.values(fields)[0] ?? "Check the form.", fields }, { status: 400 }));
    }
    const result = await guard(async () => {
      const task = await createTask(ctx.db, ctx.shopId, parsed.data, ctx.effectivePlan);
      return {
        ok: true as const,
        id: task.id,
        open: await openCount(ctx.db, ctx.shopId),
        limit: FREE_OPEN_LIMIT,
      };
    });
    return cors(Response.json(result, { status: result.ok ? 200 : 400 }));
  });
