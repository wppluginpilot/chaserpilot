/**
 * CSV export (Paid). A resource route: the admin page fetches it with the
 * session token and hands the browser a blob (see downloadCsv in ui.tsx).
 * Rows stream in batches of 500.
 */
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useState } from "react";

import { downloadCsv } from "../components/ui";
import { Button, DateField, Select } from "../components/wc";
import { requireShop } from "../lib/context.server";
import { fromDbDate, isIsoDate } from "../../server/domain/dates";
import { csvRow } from "../../server/domain/validation";
import { exportBatches } from "../../server/services/tasks.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await requireShop(request);
  const url = new URL(request.url);
  if (!url.searchParams.has("download")) return { plan: ctx.effectivePlan };
  if (ctx.effectivePlan !== "PAID") return new Response("CSV export is part of the Paid plan.", { status: 402 });
  const status = url.searchParams.get("status") === "done" ? "done" : "all";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const filter = { status, ...(isIsoDate(from) ? { from } : {}), ...(isIsoDate(to) ? { to } : {}) } as const;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(csvRow(["id", "title", "subject type", "subject label", "order name", "assignee", "tags", "due date", "completed date", "notes"])));
        for await (const batch of exportBatches(ctx.db, ctx.shopId, filter)) {
          controller.enqueue(
            encoder.encode(
              batch
                .map((t) =>
                  csvRow([
                    t.id,
                    t.title,
                    t.subjectType,
                    t.subjectName ?? "",
                    t.subjectType === "ORDER" ? (t.subjectName ?? "") : "",
                    t.assignee ?? "",
                    t.tags.join(" "),
                    fromDbDate(t.dueOn),
                    t.completedAt ? t.completedAt.toISOString().slice(0, 10) : "",
                    t.notes ?? "",
                  ]),
                )
                .join(""),
            ),
          );
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="chaserpilot-follow-ups.csv"', "Cache-Control": "no-store" },
  });
};

export default function Export() {
  const d = useLoaderData<typeof loader>() as { plan: "FREE" | "PAID" };
  const [status, setStatus] = useState("done");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const paid = d.plan === "PAID";
  const qs = new URLSearchParams({ download: "1", status });
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  return (
    <s-page heading="Export">
      <s-link slot="breadcrumb-actions" href="/app/settings">
        Settings
      </s-link>
      <s-section heading="Download follow-ups as CSV">
        {!paid ? (
          <s-banner tone="info" heading="CSV export is a Paid feature">
            <s-paragraph>
              <s-link href="/app/plan">See plans</s-link>
            </s-paragraph>
          </s-banner>
        ) : (
          <s-stack direction="block" gap="base">
            <s-text color="subdued">Columns: id, title, subject type, subject label, order name, assignee, tags, due date, completed date, notes.</s-text>
            <Select label="Which follow-ups" value={status} onChange={(e) => setStatus(e.currentTarget.value)}>
              <s-option value="done">Finished follow-ups</s-option>
              <s-option value="all">All follow-ups</s-option>
            </Select>
            <s-stack direction="inline" gap="base">
              <DateField label="Due from (optional)" value={from} onChange={(e) => setFrom(e.currentTarget.value)} />
              <DateField label="Due to (optional)" value={to} onChange={(e) => setTo(e.currentTarget.value)} />
            </s-stack>
            <Button variant="primary" onClick={() => void downloadCsv(`/app/export?${qs.toString()}`, "chaserpilot-follow-ups.csv")}>
              Download CSV
            </Button>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
