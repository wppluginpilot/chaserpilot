/**
 * The queue: Overdue, Today, This week, Later and Done, with filters, one-click
 * Done and Snooze, and the getting-started checklist.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";

import { QUEUE_COLUMNS, TaskRow } from "../components/task-row";
import { ActionError, RowList, useActionToast } from "../components/ui";
import { fail, guard, str } from "../lib/action.server";
import { requireShop } from "../lib/context.server";
import { handleTaskAction, TASK_INTENTS } from "../lib/task-actions.server";
import { FREE_OPEN_LIMIT } from "../../server/domain/plan";
import { toView } from "../../server/domain/task-view";
import { emailConfigured } from "../../server/services/mailer.server";
import { markOnboarding } from "../../server/services/shop.server";
import { TABS, type QueueTab } from "../../server/domain/tabs";
import { knownFilters, listQueue, openCount, tabCounts } from "../../server/services/tasks.server";

const TAB_LABELS: Record<QueueTab, string> = { overdue: "Overdue", today: "Today", week: "This week", later: "Later", done: "Done" };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await requireShop(request);
  const url = new URL(request.url);
  const requested = url.searchParams.get("tab") as QueueTab | null;
  const today = ctx.today();
  const filters = {
    assignee: url.searchParams.get("assignee") || undefined,
    tag: url.searchParams.get("tag") || undefined,
    subjectType: (["ORDER", "CUSTOMER", "NONE"] as const).find((s) => s === url.searchParams.get("subject")),
    q: (url.searchParams.get("q") ?? "").trim().slice(0, 80) || undefined,
  };
  const counts = await tabCounts(ctx.db, ctx.shopId, filters, today);
  // Land on the most urgent tab that has something in it.
  const tab: QueueTab = requested && TABS.includes(requested) ? requested : counts.overdue ? "overdue" : counts.today ? "today" : counts.week ? "week" : counts.later ? "later" : "today";
  const [page, known, open, totalTasks] = await Promise.all([
    listQueue(ctx.db, ctx.shopId, tab, filters, today, url.searchParams.get("cursor")),
    knownFilters(ctx.db, ctx.shopId),
    openCount(ctx.db, ctx.shopId),
    ctx.db.task.count({ where: { shopId: ctx.shopId } }),
  ]);
  const done = (ctx.shop.onboardingDone ?? {}) as Record<string, boolean>;
  return {
    tab,
    counts,
    tasks: page.tasks.map((t) => toView(t, ctx.shop.domain, today)),
    nextCursor: page.nextCursor,
    filters: { assignee: filters.assignee ?? "", tag: filters.tag ?? "", subject: filters.subjectType ?? "", q: filters.q ?? "" },
    known,
    plan: ctx.plan,
    open,
    limit: FREE_OPEN_LIMIT,
    totalTasks,
    emailOn: emailConfigured(),
    checklist: {
      hidden: Boolean(done.hidden),
      step1: totalTasks > 0,
      step2: Boolean(done.sawBlock),
      step3: ctx.shop.digestEnabled,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const ctx = await requireShop(request);
  const form = await request.formData();
  const intent = str(form, "intent");
  if (TASK_INTENTS.includes(intent)) return handleTaskAction(ctx, form);
  return guard(async () => {
    if (intent === "saw-block") {
      await markOnboarding(ctx.db, ctx.shopId, "sawBlock");
      return { ok: true as const, message: "Great" };
    }
    if (intent === "hide-checklist") {
      await markOnboarding(ctx.db, ctx.shopId, "hidden");
      return { ok: true as const };
    }
    return fail("Unknown action.");
  });
};

export default function Queue() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  useActionToast(result);
  const filterQs = new URLSearchParams();
  if (d.filters.assignee) filterQs.set("assignee", d.filters.assignee);
  if (d.filters.tag) filterQs.set("tag", d.filters.tag);
  if (d.filters.subject) filterQs.set("subject", d.filters.subject);
  if (d.filters.q) filterQs.set("q", d.filters.q);
  const tabHref = (tab: QueueTab) => {
    const qs = new URLSearchParams(filterQs);
    qs.set("tab", tab);
    return `/app?${qs.toString()}`;
  };
  const filtered = Boolean(d.filters.assignee || d.filters.tag || d.filters.subject || d.filters.q);
  const checklistOpen = !d.checklist.hidden && !(d.checklist.step1 && d.checklist.step2 && d.checklist.step3);
  const atLimit = d.plan === "FREE" && d.open >= d.limit;

  return (
    <s-page heading="Follow-ups">
      <s-button slot="primary-action" variant="primary" href="/app/tasks/new">
        Add follow-up
      </s-button>
      <s-stack direction="block" gap="base">
        <ActionError result={result} />

        {d.plan === "FREE" ? (
          <s-banner tone={atLimit ? "warning" : "info"} heading={`Free plan: ${d.open} of ${d.limit} open follow-ups`}>
            <s-paragraph>
              {atLimit ? "You've reached the Free limit. Mark some done or upgrade for unlimited follow-ups." : "Done follow-ups don't count toward the limit."}{" "}
              <s-link href="/app/plan">See plans</s-link>
            </s-paragraph>
          </s-banner>
        ) : null}

        {checklistOpen ? (
          <s-section heading="Get started">
            <s-stack direction="block" gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-badge tone={d.checklist.step1 ? "success" : "neutral"}>{d.checklist.step1 ? "Done" : "1"}</s-badge>
                <s-text>Add your first follow-up.</s-text>
                {!d.checklist.step1 ? <s-link href="/app/tasks/new">Add one</s-link> : null}
              </s-stack>
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-badge tone={d.checklist.step2 ? "success" : "neutral"}>{d.checklist.step2 ? "Done" : "2"}</s-badge>
                <s-text>Open an order in Shopify and find the Follow-ups block (More actions &gt; Add follow-up).</s-text>
                {!d.checklist.step2 ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="saw-block" />
                    <s-button type="submit">I see it</s-button>
                  </Form>
                ) : null}
              </s-stack>
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-badge tone={d.checklist.step3 ? "success" : "neutral"}>{d.checklist.step3 ? "Done" : "3"}</s-badge>
                <s-text>Today digest view, with optional daily email.</s-text>
                {!d.checklist.step3 ? (
                  d.plan === "PAID" ? (
                    <s-link href="/app/settings">Open settings</s-link>
                  ) : (
                    <s-text color="subdued">
                      The Today digest view and optional daily email are part of the Paid plan. <s-link href="/app/plan">Upgrade</s-link>
                    </s-text>
                  )
                ) : null}
              </s-stack>
              <Form method="post">
                <input type="hidden" name="intent" value="hide-checklist" />
                <s-button type="submit" variant="tertiary">
                  Hide this checklist
                </s-button>
              </Form>
            </s-stack>
          </s-section>
        ) : null}

        <s-section padding="none">
          <s-stack direction="block">
            <s-box padding="base">
              <s-stack direction="inline" gap="small-200">
                {TABS.map((t) => (
                  <s-button key={t} href={tabHref(t)} variant={d.tab === t ? "primary" : "secondary"}>
                    {TAB_LABELS[t]} ({d.counts[t]})
                  </s-button>
                ))}
              </s-stack>
            </s-box>
            <s-box paddingInline="base" paddingBlockEnd="base">
              <Form method="get">
                <input type="hidden" name="tab" value={d.tab} />
                <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="small" alignItems="end">
                  <s-text-field name="q" label="Search" value={d.filters.q} placeholder="Title or order" />
                  <s-select name="subject" label="About" value={d.filters.subject}>
                    <s-option value="">Anything</s-option>
                    <s-option value="ORDER">Orders</s-option>
                    <s-option value="CUSTOMER">Customers</s-option>
                    <s-option value="NONE">General</s-option>
                  </s-select>
                  <s-select name="assignee" label="Assignee" value={d.filters.assignee}>
                    <s-option value="">Anyone</s-option>
                    {d.known.assignees.map((a) => (
                      <s-option key={a} value={a}>
                        {a}
                      </s-option>
                    ))}
                  </s-select>
                  <s-select name="tag" label="Tag" value={d.filters.tag}>
                    <s-option value="">Any tag</s-option>
                    {d.known.tags.map((t) => (
                      <s-option key={t} value={t}>
                        {t}
                      </s-option>
                    ))}
                  </s-select>
                  <s-stack direction="inline" gap="small-200">
                    <s-button type="submit" loading={navigation.state === "loading"}>
                      Filter
                    </s-button>
                    {filtered ? <s-button href={`/app?tab=${d.tab}`}>Clear</s-button> : null}
                  </s-stack>
                </s-grid>
              </Form>
            </s-box>

            {d.tasks.length === 0 ? (
              <s-box padding="large">
                <s-stack direction="block" gap="base" alignItems="center">
                  <s-heading>{filtered ? "No follow-ups match" : d.tab === "done" ? "Nothing finished in the last 30 days" : "Nothing is due. Add a follow-up"}</s-heading>
                  <s-text color="subdued">
                    {filtered
                      ? "Try clearing the filters."
                      : d.totalTasks === 0
                        ? "Or open any order in Shopify and use More actions > Add follow-up."
                        : "Anything you add for this period will show up here."}
                  </s-text>
                  <s-button variant="primary" href="/app/tasks/new">
                    Add follow-up
                  </s-button>
                </s-stack>
              </s-box>
            ) : (
              <RowList columns={QUEUE_COLUMNS} headers={["Follow-up", "About", "Assignee", d.tab === "done" ? "Finished" : "Due", ""]}>
                {d.tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </RowList>
            )}

            {d.nextCursor ? (
              <s-box padding="base">
                <s-stack direction="inline" justifyContent="center">
                  <s-button href={`${tabHref(d.tab)}&cursor=${encodeURIComponent(d.nextCursor)}`}>Next 25</s-button>
                </s-stack>
              </s-box>
            ) : null}
          </s-stack>
        </s-section>
        {!d.emailOn && d.plan === "PAID" ? (
          <s-text color="subdued">
            The daily digest email isn't available right now. Your <s-link href="/app/today">Today view</s-link> shows the same list every day.
          </s-text>
        ) : null}
      </s-stack>
    </s-page>
  );
}
