import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";

import { TaskForm } from "../components/task-form";
import { ActionError } from "../components/ui";
import { Select } from "../components/wc";
import { guard, taskFormValues } from "../lib/action.server";
import { requireShop } from "../lib/context.server";
import { addDays } from "../../server/domain/dates";
import { FREE_OPEN_LIMIT } from "../../server/domain/plan";
import { fieldErrors, taskInputSchema } from "../../server/domain/validation";
import { createTask, openCount } from "../../server/services/tasks.server";
import { applyTemplate, listTemplates } from "../../server/services/templates.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await requireShop(request);
  const url = new URL(request.url);
  const today = ctx.today();
  const templates = ctx.effectivePlan === "PAID" ? await listTemplates(ctx.db, ctx.shopId) : [];
  const picked = templates.find((t) => t.id === url.searchParams.get("template"));
  const fill = picked ? applyTemplate(picked, today) : null;
  const open = await openCount(ctx.db, ctx.shopId);
  return {
    plan: ctx.effectivePlan,
    templates: templates.map((t) => ({ id: t.id, name: t.name })),
    pickedId: picked?.id ?? "",
    open,
    limit: FREE_OPEN_LIMIT,
    values: {
      title: fill?.title ?? "",
      dueOn: fill?.dueOn ?? addDays(today, ctx.shop.defaultDueDays),
      notes: fill?.notes ?? "",
      assignee: "",
      tags: (fill?.tags ?? []).join(", "),
      subjectName: "",
      subjectType: "NONE",
      subjectGid: "",
      recurrence: null,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const ctx = await requireShop(request);
  const form = await request.formData();
  const parsed = taskInputSchema.safeParse(taskFormValues(form));
  if (!parsed.success) return { ok: false as const, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const result = await guard(async () => {
    const task = await createTask(ctx.db, ctx.shopId, parsed.data, ctx.effectivePlan);
    return { ok: true as const, id: task.id };
  });
  if (result.ok) throw redirect("/app?tab=today");
  return result;
};

export default function NewTask() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const fields = result && !result.ok && "fields" in result && result.fields ? (result.fields as Record<string, string>) : {};
  const atLimit = d.plan === "FREE" && d.open >= d.limit;
  return (
    <s-page heading="Add follow-up">
      <s-link slot="breadcrumb-actions" href="/app">
        Follow-ups
      </s-link>
      <s-section>
        <s-stack direction="block" gap="base">
          <ActionError result={result} />
          {atLimit ? (
            <s-banner tone="warning" heading="You're at the Free limit">
              <s-paragraph>
                You have {d.limit} open follow-ups. Mark some done, or <s-link href="/app/plan">upgrade</s-link> for unlimited.
              </s-paragraph>
            </s-banner>
          ) : null}
          {d.templates.length ? (
            <Select label="Start from a template" value={d.pickedId} onChange={(e) => navigate(e.currentTarget.value ? `/app/tasks/new?template=${e.currentTarget.value}` : "/app/tasks/new")}>
              <s-option value="">No template</s-option>
              {d.templates.map((t) => (
                <s-option key={t.id} value={t.id}>
                  {t.name}
                </s-option>
              ))}
            </Select>
          ) : null}
          <TaskForm
            key={d.pickedId}
            values={d.values}
            errors={fields}
            plan={d.plan}
            intent="create"
            submitLabel="Add follow-up"
            submitting={navigation.state === "submitting"}
          />
        </s-stack>
      </s-section>
    </s-page>
  );
}
