/**
 * The follow-up form, shared by "new" and the task page. Plain uncontrolled
 * Polaris fields inside a React Router <Form>; paid-only fields show an
 * upgrade note on the Free plan.
 */
import { Form } from "react-router";

import type { Recurrence } from "../../server/domain/recurrence";
import { WEEKDAY_NAMES } from "../../server/domain/recurrence";

export interface TaskFormValues {
  title: string;
  dueOn: string;
  notes: string;
  assignee: string;
  tags: string;
  subjectName: string;
  subjectType: string;
  subjectGid: string;
  recurrence: Recurrence | null;
}

export function TaskForm({
  values,
  errors,
  plan,
  submitting,
  submitLabel,
  intent,
  extra,
}: {
  values: TaskFormValues;
  errors: Record<string, string>;
  plan: "FREE" | "PAID";
  submitting: boolean;
  submitLabel: string;
  intent: string;
  extra?: React.ReactNode;
}) {
  const paid = plan === "PAID";
  const r = values.recurrence;
  return (
    <Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="subjectType" value={values.subjectType} />
      <input type="hidden" name="subjectGid" value={values.subjectGid} />
      <s-stack direction="block" gap="base">
        <s-text-field name="title" label="What do you need to follow up on?" value={values.title} maxLength={140} required error={errors.title} placeholder="Chase the deposit" />
        <s-date-field name="dueOn" label="Due date" value={values.dueOn} error={errors.dueOn} />
        <s-text-field
          name="subjectName"
          label={values.subjectType === "NONE" ? "About (optional label)" : "Label"}
          value={values.subjectName}
          maxLength={80}
          error={errors.subjectName}
          details={values.subjectType === "CUSTOMER" ? "ChaserPilot can't see customer names. Type one here if you want it in the queue." : "For example: Sam, wedding sash"}
        />
        <s-text-area name="notes" label="Notes" value={values.notes} rows={3} maxLength={2000} error={errors.notes} details="Don't paste card numbers or health data." />
        <s-text-field name="tags" label="Tags" value={values.tags} error={errors.tags} details="Up to 5, separated by commas." />
        {paid ? (
          <>
            <s-text-field name="assignee" label="Assignee" value={values.assignee} maxLength={60} error={errors.assignee} details="Who is responsible? A name or initials." />
            <s-stack direction="block" gap="small">
              <s-select name="repeat" label="Repeat" value={r?.kind ?? ""} error={errors.recurrence}>
                <s-option value="">Does not repeat</s-option>
                <s-option value="days">Every N days</s-option>
                <s-option value="weekly">Weekly on a weekday</s-option>
                <s-option value="monthly">Monthly on a day</s-option>
              </s-select>
              <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="small">
                <s-number-field name="repeatDays" label="Every N days" min={1} max={365} value={r?.kind === "days" ? String(r.n) : "7"} />
                <s-select name="repeatWeekday" label="Weekday" value={r?.kind === "weekly" ? String(r.weekday) : "1"}>
                  {WEEKDAY_NAMES.map((n, i) => (
                    <s-option key={n} value={String(i)}>
                      {n}
                    </s-option>
                  ))}
                </s-select>
                <s-number-field name="repeatMonthDay" label="Day of month" min={1} max={31} value={r?.kind === "monthly" ? String(r.monthDay) : "1"} details="Short months use their last day." />
              </s-grid>
              <s-text color="subdued">Only the option picked in Repeat is used. When you mark a repeating follow-up done, the next one is created automatically.</s-text>
            </s-stack>
          </>
        ) : (
          <s-banner tone="info" heading="Assignees and repeating follow-ups are Paid features">
            <s-paragraph>
              Upgrade for assignees, recurring follow-ups, templates, the daily digest and CSV export. <s-link href="/app/plan">See plans</s-link>
            </s-paragraph>
          </s-banner>
        )}
        <s-stack direction="inline" gap="small">
          <s-button type="submit" variant="primary" loading={submitting}>
            {submitLabel}
          </s-button>
          <s-button href="/app">Cancel</s-button>
        </s-stack>
        {extra}
      </s-stack>
    </Form>
  );
}
