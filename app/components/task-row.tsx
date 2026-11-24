/**
 * One follow-up row with Done, Snooze and Edit. Rows are a grid (RowList/Row),
 * never s-table cells, and the buttons use native listeners (wc.tsx).
 *
 * Done and Snooze go through a fetcher so the page does not reload. The row is
 * hidden optimistically while the request is in flight and comes back with a
 * banner if the save fails.
 */
import { useState } from "react";
import { useFetcher } from "react-router";

import type { TaskView } from "../../server/domain/task-view";
import { Row } from "./ui";
import { Button, DateField } from "./wc";

export const QUEUE_COLUMNS = "minmax(0,3fr) minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.1fr) auto";

type Result = { ok: boolean; error?: string } | undefined;

export function TaskRow({ task, showSnooze = true }: { task: TaskView; showSnooze?: boolean }) {
  const fetcher = useFetcher<Result>();
  const [snoozing, setSnoozing] = useState(false);
  const [date, setDate] = useState("");

  const submitting = fetcher.state !== "idle" ? String(fetcher.formData?.get("intent") ?? "") : "";
  if (submitting === "done" || submitting === "snooze" || submitting === "reopen") return null;

  const send = (fields: Record<string, string>) => {
    setSnoozing(false);
    fetcher.submit({ id: task.id, ...fields }, { method: "post" });
  };
  const failed = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  return (
    <>
      {failed ? (
        <s-banner tone="critical" heading="That didn't save">
          <s-paragraph>{failed} The follow-up is back on your list.</s-paragraph>
        </s-banner>
      ) : null}
      <Row columns={QUEUE_COLUMNS}>
        <s-stack direction="block" gap="small-300">
          <s-link href={`/app/tasks/${task.id}`}>{task.title}</s-link>
          {task.tags.length ? (
            <s-stack direction="inline" gap="small-300">
              {task.tags.map((t) => (
                <s-badge key={t}>{t}</s-badge>
              ))}
              {task.repeats ? <s-badge tone="info">Repeats</s-badge> : null}
            </s-stack>
          ) : task.repeats ? (
            <s-badge tone="info">Repeats</s-badge>
          ) : null}
        </s-stack>
        {task.subjectUrl ? (
          <s-link href={task.subjectUrl} target="_top">
            {task.subjectLabel}
          </s-link>
        ) : (
          <s-text color="subdued">{task.subjectLabel}</s-text>
        )}
        <s-text color="subdued">{task.assignee ?? ""}</s-text>
        {task.status === "DONE" ? (
          <s-text color="subdued">Done {task.completedOn}</s-text>
        ) : task.overdue ? (
          <s-text tone="critical">{task.dueText}</s-text>
        ) : (
          <s-text>{task.dueText}</s-text>
        )}
        <s-stack direction="inline" gap="small-200">
          {task.status === "OPEN" ? (
            <>
              <Button variant="primary" onClick={() => send({ intent: "done" })}>
                Done
              </Button>
              {showSnooze ? <Button onClick={() => setSnoozing((v) => !v)}>Snooze</Button> : null}
            </>
          ) : (
            <Button onClick={() => send({ intent: "reopen" })}>Reopen</Button>
          )}
          <s-button href={`/app/tasks/${task.id}`}>Edit</s-button>
        </s-stack>
      </Row>
      {snoozing ? (
        <s-box paddingInline="base" paddingBlockEnd="small">
          <s-stack direction="inline" gap="small" alignItems="end">
            <Button onClick={() => send({ intent: "snooze", when: "tomorrow" })}>Tomorrow</Button>
            <Button onClick={() => send({ intent: "snooze", when: "3days" })}>In 3 days</Button>
            <Button onClick={() => send({ intent: "snooze", when: "monday" })}>Next Monday</Button>
            <DateField label="Pick a date" labelAccessibilityVisibility="exclusive" value={date} onChange={(e) => setDate(e.currentTarget.value)} />
            <Button onClick={() => send({ intent: "snooze", when: "date", date })} disabled={!date}>
              Snooze to date
            </Button>
          </s-stack>
        </s-box>
      ) : null}
    </>
  );
}
