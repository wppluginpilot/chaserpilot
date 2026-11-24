/** GET /ext/templates: the template picker in the Add follow-up action (Paid). */
import type { LoaderFunctionArgs } from "react-router";

import { extRoute } from "../lib/ext.server";
import { requireShop } from "../lib/context.server";
import { addDays } from "../../server/domain/dates";
import { listTemplates } from "../../server/services/templates.server";

export const loader = ({ request }: LoaderFunctionArgs) =>
  extRoute(async () => {
    const ctx = await requireShop(request, { gate: false });
    if (ctx.effectivePlan !== "PAID") return ctx.auth.cors(Response.json({ ok: true, plan: "FREE", templates: [] }));
    const today = ctx.today();
    const templates = await listTemplates(ctx.db, ctx.shopId);
    return ctx.auth.cors(
      Response.json({
        ok: true,
        plan: "PAID",
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          title: t.title,
          dueOn: addDays(today, t.dueDays),
          tags: t.tags.join(", "),
          notes: t.notes ?? "",
        })),
      }),
    );
  });
