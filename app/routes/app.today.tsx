/**
 * Today digest, in the app. The same list the daily email contains, for stores
 * where email isn't available (or who prefer to look).
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData } from "react-router";

import { QUEUE_COLUMNS, TaskRow } from "../components/task-row";
import { ActionError, RowList, useActionToast } from "../components/ui";
import { requireShop } from "../lib/context.server";
import { handleTaskAction } from "../lib/task-actions.server";
import { toView } from "../../server/domain/task-view";
import { emailConfigured } from "../../server/services/mailer.server";
import { dueNow } from "../../server/services/tasks.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await requireShop(request);
  const today = ctx.today();
  const { overdue, today: due } = await dueNow(ctx.db, ctx.shopId, today);
  return {
    overdue: overdue.map((t) => toView(t, ctx.shop.domain, today)),
    due: due.map((t) => toView(t, ctx.shop.domain, today)),
    emailOn: emailConfigured(),
    digestOn: ctx.shop.digestEnabled,
    plan: ctx.plan,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const ctx = await requireShop(request);
  return handleTaskAction(ctx, await request.formData());
};

export default function Today() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  useActionToast(result);
  const empty = d.overdue.length + d.due.length === 0;
  return (
    <s-page heading="Today">
      <s-stack direction="block" gap="base">
        <ActionError result={result} />
        {d.plan === "PAID" && !d.emailOn ? (
          <s-banner tone="info" heading="Daily email isn't available right now">
            <s-paragraph>This page shows what the daily digest email would list: everything overdue and due today.</s-paragraph>
          </s-banner>
        ) : null}
        {d.plan === "FREE" ? (
          <s-banner tone="info" heading="Want this in your inbox every morning?">
            <s-paragraph>
              The daily digest email is part of the Paid plan. <s-link href="/app/plan">See plans</s-link>
            </s-paragraph>
          </s-banner>
        ) : null}
        {empty ? (
          <s-section>
            <s-stack direction="block" gap="base" alignItems="center">
              <s-heading>Nothing is due. Add a follow-up</s-heading>
              <s-button variant="primary" href="/app/tasks/new">
                Add follow-up
              </s-button>
            </s-stack>
          </s-section>
        ) : (
          <>
            {d.overdue.length ? (
              <s-section padding="none" heading={`Overdue (${d.overdue.length})`}>
                <RowList columns={QUEUE_COLUMNS} headers={["Follow-up", "About", "Assignee", "Due", ""]}>
                  {d.overdue.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </RowList>
              </s-section>
            ) : null}
            {d.due.length ? (
              <s-section padding="none" heading={`Due today (${d.due.length})`}>
                <RowList columns={QUEUE_COLUMNS} headers={["Follow-up", "About", "Assignee", "Due", ""]}>
                  {d.due.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </RowList>
              </s-section>
            ) : null}
          </>
        )}
      </s-stack>
    </s-page>
  );
}
