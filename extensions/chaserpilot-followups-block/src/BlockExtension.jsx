import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.ok !== false, body };
}

function Extension() {
  const { data } = shopify;
  const subjectGid = data.selected[0]?.id ?? "";
  const [state, setState] = useState({ loading: true, error: "", tasks: [], done: [] });
  const [busy, setBusy] = useState("");

  // One small request per render.
  const load = useCallback(async () => {
    const res = await api(`/ext/tasks?subject=${encodeURIComponent(subjectGid)}`);
    setState(
      res.ok
        ? { loading: false, error: "", tasks: res.body.tasks, done: res.body.done }
        : { loading: false, error: res.body.error ?? "Couldn't load follow-ups.", tasks: [], done: [] },
    );
  }, [subjectGid]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, payload) => {
    setBusy(id);
    const res = await api(`/ext/tasks/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy("");
    if (!res.ok) setState((s) => ({ ...s, error: res.body.error ?? "That didn't save. Please try again." }));
    else await load();
  };

  // Opens this page's "Add follow-up" action extension: documented `extension:<handle>/<target>` protocol.
  const actionTarget = shopify.extension.target.replace(".block.", ".action.");

  return (
    <s-admin-block heading="Follow-ups">
      <s-stack direction="block" gap="small">
        {state.error ? (
          <s-banner tone="critical">
            <s-text>{state.error}</s-text>
          </s-banner>
        ) : null}
        {!state.loading && !state.error && state.tasks.length === 0 ? <s-text color="subdued">No follow-ups yet</s-text> : null}
        {state.tasks.map((t) => (
          <s-stack key={t.id} direction="inline" gap="small" alignItems="center" justifyContent="space-between">
            <s-stack direction="block" gap="small-300">
              <s-text type="strong">{t.title}</s-text>
              <s-stack direction="inline" gap="small-200">
                {t.overdue ? <s-badge tone="critical">Overdue</s-badge> : null}
                <s-text color="subdued">{t.dueText}</s-text>
                {t.assignee ? <s-text color="subdued">{t.assignee}</s-text> : null}
              </s-stack>
            </s-stack>
            <s-stack direction="inline" gap="small-200">
              <s-button disabled={busy === t.id} onClick={() => act(t.id, { intent: "done" })}>
                Done
              </s-button>
              <s-button disabled={busy === t.id} onClick={() => act(t.id, { intent: "snooze", when: "tomorrow" })}>
                Snooze
              </s-button>
            </s-stack>
          </s-stack>
        ))}
        {state.done.length ? (
          <s-stack direction="block" gap="small-300">
            <s-text color="subdued">Recently done</s-text>
            {state.done.map((t) => (
              <s-text key={t.id} color="subdued">
                {t.title}
              </s-text>
            ))}
          </s-stack>
        ) : null}
        <s-button href={`extension:chaserpilot-add-followup/${actionTarget}`}>Add follow-up</s-button>
      </s-stack>
    </s-admin-block>
  );
}
