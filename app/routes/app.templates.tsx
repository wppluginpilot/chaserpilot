import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useFetcher, useLoaderData, useNavigation } from "react-router";

import { ActionError, Row, RowList, useActionToast } from "../components/ui";
import { ConfirmButton } from "../components/wc";
import { guard, str } from "../lib/action.server";
import { requireShop } from "../lib/context.server";
import { fieldErrors, templateInputSchema } from "../../server/domain/validation";
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from "../../server/services/templates.server";

const COLUMNS = "minmax(0,2fr) minmax(0,3fr) minmax(0,1fr) auto";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await requireShop(request);
  const url = new URL(request.url);
  const templates = await listTemplates(ctx.db, ctx.shopId);
  const editId = url.searchParams.get("edit");
  const editing = templates.find((t) => t.id === editId) ?? null;
  return {
    plan: ctx.effectivePlan,
    creating: url.searchParams.get("new") === "1",
    editing: editing ? { id: editing.id, name: editing.name, title: editing.title, dueDays: editing.dueDays, tags: editing.tags.join(", "), notes: editing.notes ?? "" } : null,
    templates: templates.map((t) => ({ id: t.id, name: t.name, title: t.title, dueDays: t.dueDays, tags: t.tags })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const ctx = await requireShop(request);
  const form = await request.formData();
  const intent = str(form, "intent");
  if (intent === "delete") {
    return guard(async () => {
      await deleteTemplate(ctx.db, ctx.shopId, ctx.effectivePlan, str(form, "id"));
      return { ok: true as const, message: "Template deleted. Existing follow-ups are unchanged." };
    });
  }
  const parsed = templateInputSchema.safeParse({
    name: str(form, "name"),
    title: str(form, "title"),
    dueDays: str(form, "dueDays"),
    tags: str(form, "tags"),
    notes: str(form, "notes"),
  });
  if (!parsed.success) return { ok: false as const, error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) };
  const result = await guard(async () => {
    if (intent === "update") await updateTemplate(ctx.db, ctx.shopId, ctx.effectivePlan, str(form, "id"), parsed.data);
    else await createTemplate(ctx.db, ctx.shopId, ctx.effectivePlan, parsed.data);
    return { ok: true as const, message: "Template saved" };
  });
  if (result.ok) throw redirect("/app/templates");
  return result;
};

type Tpl = { id: string; name: string; title: string; dueDays: number; tags: string[] };

function TemplateRow({ t, paid }: { t: Tpl; paid: boolean }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  if (fetcher.state !== "idle") return null;
  return (
    <>
      <ActionError result={fetcher.data} />
      <Row columns={COLUMNS}>
        <s-text type="strong">{t.name}</s-text>
        <s-text>{t.title}</s-text>
        <s-text color="subdued">{t.dueDays === 0 ? "Due today" : `${t.dueDays} day${t.dueDays === 1 ? "" : "s"}`}</s-text>
        {paid ? (
          <s-stack direction="inline" gap="small-200">
            <s-button href={`/app/templates?edit=${t.id}`}>Edit</s-button>
            <ConfirmButton onConfirm={() => fetcher.submit({ intent: "delete", id: t.id }, { method: "post" })} confirmLabel="Click again to delete">
              Delete
            </ConfirmButton>
          </s-stack>
        ) : (
          <span />
        )}
      </Row>
    </>
  );
}

export default function Templates() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  useActionToast(result);
  const paid = d.plan === "PAID";
  const fields = result && !result.ok && "fields" in result && result.fields ? (result.fields as Record<string, string>) : {};
  const formOpen = paid && (d.creating || d.editing);
  const v = d.editing ?? { id: "", name: "", title: "", dueDays: 3, tags: "", notes: "" };

  return (
    <s-page heading="Templates">
      {paid ? (
        <s-button slot="primary-action" variant="primary" href="/app/templates?new=1">
          Add template
        </s-button>
      ) : null}
      <s-stack direction="block" gap="base">
        <ActionError result={result} />
        {!paid ? (
          <s-banner tone="info" heading="Templates are a Paid feature">
            <s-paragraph>
              You can see the starter templates, but adding or changing them needs the Paid plan. <s-link href="/app/plan">See plans</s-link>
            </s-paragraph>
          </s-banner>
        ) : null}
        {formOpen ? (
          <s-section heading={d.editing ? "Edit template" : "New template"}>
            <Form method="post">
              <input type="hidden" name="intent" value={d.editing ? "update" : "create"} />
              <input type="hidden" name="id" value={v.id} />
              <s-stack direction="block" gap="base">
                <s-text-field name="name" label="Template name" value={v.name} maxLength={60} required error={fields.name} />
                <s-text-field name="title" label="Follow-up title" value={v.title} maxLength={140} required error={fields.title} />
                <s-number-field name="dueDays" label="Days until due" min={0} max={365} value={String(v.dueDays)} error={fields.dueDays} />
                <s-text-field name="tags" label="Tags" value={v.tags} error={fields.tags} details="Up to 5, separated by commas." />
                <s-text-area name="notes" label="Notes" value={v.notes} rows={3} maxLength={2000} error={fields.notes} />
                <s-stack direction="inline" gap="small">
                  <s-button type="submit" variant="primary" loading={navigation.state === "submitting"}>
                    Save template
                  </s-button>
                  <s-button href="/app/templates">Cancel</s-button>
                </s-stack>
              </s-stack>
            </Form>
          </s-section>
        ) : null}
        <s-section padding="none">
          {d.templates.length === 0 ? (
            <s-box padding="large">
              <s-stack direction="block" gap="base" alignItems="center">
                <s-heading>No templates yet</s-heading>
                <s-text color="subdued">A template fills in the title, due date and tags for follow-ups you create again and again.</s-text>
                {paid ? (
                  <s-button variant="primary" href="/app/templates?new=1">
                    Add template
                  </s-button>
                ) : null}
              </s-stack>
            </s-box>
          ) : (
            <RowList columns={COLUMNS} headers={["Name", "Follow-up title", "Due after", ""]}>
              {d.templates.map((t) => (
                <TemplateRow key={t.id} t={t} paid={paid} />
              ))}
            </RowList>
          )}
        </s-section>
      </s-stack>
    </s-page>
  );
}
