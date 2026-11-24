/**
 * Settings: timezone, default due offset, daily digest, known assignees and
 * "Delete all my data".
 */
import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useFetcher, useLoaderData, useNavigation } from "react-router";

import { ActionError, useActionToast } from "../components/ui";
import { ConfirmButton } from "../components/wc";
import { bool, fail, guard, str } from "../lib/action.server";
import { requireShop } from "../lib/context.server";
import { fieldErrors, settingsSchema } from "../../server/domain/validation";
import { emailConfigured } from "../../server/services/mailer.server";
import { addAssignee, listAssignees, removeAssignee, saveSettings } from "../../server/services/settings.server";
import { deleteAllData } from "../../server/services/shop.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await requireShop(request);
  const zones = Intl.supportedValuesOf("timeZone");
  if (!zones.includes(ctx.shop.timezone)) zones.unshift(ctx.shop.timezone);
  const assignees = await listAssignees(ctx.db, ctx.shopId);
  return {
    plan: ctx.effectivePlan,
    emailOn: emailConfigured(),
    zones,
    assignees: assignees.map((a) => ({ id: a.id, name: a.name })),
    s: {
      timezone: ctx.shop.timezone,
      defaultDueDays: ctx.shop.defaultDueDays,
      digestEnabled: ctx.shop.digestEnabled,
      digestHour: ctx.shop.digestHour,
      digestExtraTo: ctx.shop.digestExtraTo ?? "",
      ownerEmail: ctx.shop.ownerEmail ?? "",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const ctx = await requireShop(request);
  const form = await request.formData();
  const intent = str(form, "intent");
  if (intent === "save") {
    const parsed = settingsSchema.safeParse({
      timezone: str(form, "timezone"),
      defaultDueDays: str(form, "defaultDueDays"),
      digestEnabled: bool(form, "digestEnabled"),
      digestHour: str(form, "digestHour"),
      digestExtraTo: str(form, "digestExtraTo"),
    });
    if (!parsed.success) return { ok: false as const, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
    return guard(async () => {
      await saveSettings(ctx.db, ctx.shop, ctx.effectivePlan, parsed.data);
      return { ok: true as const, message: "Settings saved" };
    });
  }
  if (intent === "add-assignee") {
    return guard(async () => {
      const { added } = await addAssignee(ctx.db, ctx.shopId, ctx.effectivePlan, str(form, "name"));
      return { ok: true as const, message: added ? "Assignee added" : "That name is already on your list" };
    });
  }
  if (intent === "remove-assignee") {
    return guard(async () => {
      await removeAssignee(ctx.db, ctx.shopId, str(form, "id"));
      return { ok: true as const, message: "Assignee removed" };
    });
  }
  if (intent === "delete-all") {
    return guard(async () => {
      await deleteAllData(ctx.db, ctx.shopId);
      return { ok: true as const, message: "All follow-ups, templates and history were deleted" };
    });
  }
  return fail("Unknown action.");
};

export default function Settings() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher<{ ok: boolean; error?: string; message?: string }>();
  useActionToast(result);
  useActionToast(fetcher.data);
  const fields = result && !result.ok && "fields" in result && result.fields ? (result.fields as Record<string, string>) : {};
  const paid = d.plan === "PAID";
  const [nameKey, setNameKey] = useState(0);
  useEffect(() => {
    // Clear the "Add a name" box after a successful add (or a no-op duplicate).
    if (result && result.ok && "message" in result && /assignee added|already on your list/i.test(String(result.message))) setNameKey((k) => k + 1);
  }, [result]);
  const saving = navigation.state === "submitting" && navigation.formData?.get("intent") === "save";

  return (
    <s-page heading="Settings">
      <s-stack direction="block" gap="base">
        <ActionError result={result} />
        <ActionError result={fetcher.data} />
        <Form method="post">
          <input type="hidden" name="intent" value="save" />
          <s-stack direction="block" gap="base">
            <s-section heading="Dates">
              <s-stack direction="block" gap="base">
                <s-select name="timezone" label="Timezone" value={d.s.timezone} error={fields.timezone} details="Due dates, Today and Overdue follow this timezone. It starts as your Shopify timezone.">
                  {d.zones.map((z) => (
                    <s-option key={z} value={z}>
                      {z}
                    </s-option>
                  ))}
                </s-select>
                <s-number-field name="defaultDueDays" label="Default due date" suffix="days from today" min={0} max={30} value={String(d.s.defaultDueDays)} error={fields.defaultDueDays} />
              </s-stack>
            </s-section>

            <s-section heading="Today digest view, with optional daily email">
              {!paid ? (
                <s-banner tone="info" heading="The Today digest view and daily email are Paid features">
                  <s-paragraph>
                    Get one email each morning listing what is overdue and due today. <s-link href="/app/plan">See plans</s-link>
                  </s-paragraph>
                </s-banner>
              ) : null}
              {paid && !d.emailOn ? (
                <s-banner tone="warning" heading="The daily email is not available yet">
                  <s-paragraph>
                    Email sending isn&rsquo;t switched on for this app right now, so nothing will be emailed. Your <s-link href="/app/today">Today view</s-link> shows the same list. Your setting
                    is saved and takes effect once email is available.
                  </s-paragraph>
                </s-banner>
              ) : null}
              <s-stack direction="block" gap="base">
                <s-checkbox name="digestEnabled" value="on" label="Email me what is due every day" defaultChecked={d.s.digestEnabled} disabled={!paid} error={fields.digestEnabled} />
                <s-number-field name="digestHour" label="Send at (hour, 0-23)" min={0} max={23} value={String(d.s.digestHour)} disabled={!paid} error={fields.digestHour} details="In your timezone. Nothing is sent on days when nothing is due." />
                <s-text-field name="digestExtraTo" label="Also send to (optional)" value={d.s.digestExtraTo} disabled={!paid} error={fields.digestExtraTo} details={`The digest goes to your store owner email${d.s.ownerEmail ? ` (${d.s.ownerEmail})` : ""}. Add one more address if you want.`} />
              </s-stack>
            </s-section>

            <s-stack direction="inline" justifyContent="end">
              <s-button type="submit" variant="primary" loading={saving}>
                Save settings
              </s-button>
            </s-stack>
          </s-stack>
        </Form>

        <s-section heading="Assignees">
          {!paid ? (
            <s-text color="subdued">
              Assignees are part of the Paid plan. <s-link href="/app/plan">See plans</s-link>
            </s-text>
          ) : (
            <s-stack direction="block" gap="base">
              {d.assignees.length === 0 ? <s-text color="subdued">No assignees yet. Names you type on follow-ups are added here automatically.</s-text> : null}
              {d.assignees.map((a) => (
                <s-stack key={a.id} direction="inline" gap="small" alignItems="center">
                  <s-text>{a.name}</s-text>
                  <ConfirmButton onConfirm={() => fetcher.submit({ intent: "remove-assignee", id: a.id }, { method: "post" })} confirmLabel="Click again to remove">
                    Remove
                  </ConfirmButton>
                </s-stack>
              ))}
              <Form method="post">
                <input type="hidden" name="intent" value="add-assignee" />
                <s-stack direction="inline" gap="small" alignItems="end">
                  <s-text-field key={nameKey} name="name" label="Add a name" maxLength={60} />
                  <s-button type="submit">Add</s-button>
                </s-stack>
              </Form>
            </s-stack>
          )}
        </s-section>

        <s-section heading="Export">
          <s-stack direction="block" gap="small">
            <s-text color="subdued">Download your follow-ups as a CSV file (Paid plan).</s-text>
            <s-button href="/app/export">Export follow-ups</s-button>
          </s-stack>
        </s-section>

        <s-section heading="Delete all my data">
          <s-stack direction="block" gap="base">
            <s-text color="subdued">Deletes every follow-up, template, assignee and history entry for this store. This can&rsquo;t be undone. Your plan is not changed.</s-text>
            <ConfirmButton onConfirm={() => fetcher.submit({ intent: "delete-all" }, { method: "post" })} confirmLabel="Click again to delete everything">
              Delete all my data
            </ConfirmButton>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
