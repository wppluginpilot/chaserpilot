import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useActionData, useFetcher, useLoaderData, useNavigation } from "react-router";

import { TaskForm } from "../components/task-form";
import { ActionError, useActionToast } from "../components/ui";
import { Button, ConfirmButton } from "../components/wc";
import { guard, str, taskFormValues } from "../lib/action.server";
import { requireShop } from "../lib/context.server";
import { handleTaskAction, TASK_INTENTS } from "../lib/task-actions.server";
import { fromDbDate } from "../../server/domain/dates";
import { adminUrl } from "../../server/domain/gid";
import { describeRecurrence, parseRecurrence } from "../../server/domain/recurrence";
import { subjectLabel } from "../../server/domain/task-view";
import { fieldErrors, taskInputSchema } from "../../server/domain/validation";
import { getTask, listEvents, updateTask } from "../../server/services/tasks.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const ctx = await requireShop(request);
  const task = await getTask(ctx.db, ctx.shopId, params.id ?? "");
  const events = await listEvents(ctx.db, ctx.shopId, task.id);
  const rule = parseRecurrence(task.recurrence);
  return {
    plan: ctx.effectivePlan,
    id: task.id,
    status: task.status,
    subject: { label: subjectLabel(task), url: task.subjectGid ? adminUrl(ctx.shop.domain, task.subjectGid) : null, type: task.subjectType },
    repeatText: describeRecurrence(rule),
    repeats: Boolean(rule),
    values: {
      title: task.title,
      dueOn: fromDbDate(task.dueOn),
      notes: task.notes ?? "",
      assignee: task.assignee ?? "",
      tags: task.tags.join(", "),
      subjectName: task.subjectName ?? "",
      subjectType: task.subjectType,
      subjectGid: task.subjectGid ?? "",
      recurrence: rule,
    },
    events: events.map((e) => ({ id: e.id, kind: e.kind, detail: e.detail, at: e.at.toISOString() })),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const ctx = await requireShop(request);
  const form = await request.formData();
  const id = params.id ?? "";
  const intent = str(form, "intent");
  form.set("id", id);
  if (TASK_INTENTS.includes(intent)) {
    const result = await handleTaskAction(ctx, form);
    if (result.ok && "deleted" in result) throw redirect("/app");
    return result;
  }
  if (intent !== "save") return { ok: false as const, error: "Unknown action." };
  const parsed = taskInputSchema.safeParse(taskFormValues(form));
  if (!parsed.success) return { ok: false as const, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  return guard(async () => {
    await updateTask(ctx.db, ctx.shopId, id, parsed.data, ctx.effectivePlan);
    return { ok: true as const, message: "Saved" };
  });
};

export default function TaskPage() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher<{ ok: boolean; error?: string; message?: string }>();
  useActionToast(result);
  const fields = result && !result.ok && "fields" in result && result.fields ? (result.fields as Record<string, string>) : {};
  const act = (intent: string) => fetcher.submit({ intent }, { method: "post" });
  return (
    <s-page heading={d.values.title}>
      <s-link slot="breadcrumb-actions" href="/app">
        Follow-ups
      </s-link>
      <s-stack direction="block" gap="base">
        <ActionError result={result} />
        <s-section heading="Details">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-badge tone={d.status === "DONE" ? "success" : "caution"}>{d.status === "DONE" ? "Done" : "Open"}</s-badge>
              {d.subject.url ? (
                <s-link href={d.subject.url} target="_top">
                  {d.subject.label}
                </s-link>
              ) : (
                <s-text color="subdued">{d.subject.label}</s-text>
              )}
              {d.repeats ? <s-badge tone="info">{d.repeatText}</s-badge> : null}
            </s-stack>
            <s-stack direction="inline" gap="small">
              {d.status === "OPEN" ? (
                <Button variant="primary" onClick={() => act("done")}>
                  Mark done
                </Button>
              ) : (
                <Button onClick={() => act("reopen")}>Reopen</Button>
              )}
              {d.repeats ? <Button onClick={() => act("stop-repeating")}>Stop repeating</Button> : null}
              <ConfirmButton onConfirm={() => act("delete")} confirmLabel="Click again to delete">
                Delete
              </ConfirmButton>
            </s-stack>
            <ActionError result={fetcher.data} />
            <TaskForm values={d.values} errors={fields} plan={d.plan} intent="save" submitLabel="Save changes" submitting={navigation.state === "submitting"} />
          </s-stack>
        </s-section>
        <s-section heading="Activity">
          {d.events.length === 0 ? (
            <s-text color="subdued">No activity yet.</s-text>
          ) : (
            <s-stack direction="block" gap="small-200">
              {d.events.map((e) => (
                <s-text key={e.id}>
                  {new Date(e.at).toLocaleString()} - {e.kind}
                  {e.detail ? ` (${e.detail})` : ""}
                </s-text>
              ))}
            </s-stack>
          )}
        </s-section>
      </s-stack>
    </s-page>
  );
}
