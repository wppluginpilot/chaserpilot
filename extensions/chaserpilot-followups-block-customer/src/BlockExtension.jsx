import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";

import { api, taskUrl, tasksUrl } from "./api";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { data } = shopify;
  const subjectGid = data.selected[0]?.id ?? "";
  const [state, setState] = useState({ loading: true, error: "", tasks: [], done: [] });
  const [busy, setBusy] = useState("");

  // One small request per refresh. Never leaves the block in a loading state.
  const load = useCallback(async () => {
    try {
      const res = await api(tasksUrl(subjectGid));
      setState(
        res.ok
          ? { loading: false, error: "", tasks: res.body.tasks ?? [], done: res.body.done ?? [] }
          : { loading: false, error: res.body.error ?? "Couldn't load follow-ups.", tasks: [], done: [] },
      );
    } catch {
      setState({ loading: false, error: "Couldn't load follow-ups.", tasks: [], done: [] });
    }
  }, [subjectGid]);

  useEffect(() => {
    load();
  }, [load]);

  // There is no documented "action closed" callback for blocks, so refresh when the
  // merchant returns to the page (focus / visibility) and poll briefly after they open
  // the Add follow-up modal.
  const [watchUntil, setWatchUntil] = useState(0);
  useEffect(() => {
    const refresh = () => {
      if (typeof document === "undefined" || document.visibilityState !== "hidden") load();
    };
    const target = typeof window !== "undefined" ? window : null;
    target?.addEventListener?.("focus", refresh);
    if (typeof document !== "undefined") document.addEventListener?.("visibilitychange", refresh);
    return () => {
      target?.removeEventListener?.("focus", refresh);
      if (typeof document !== "undefined") document.removeEventListener?.("visibilitychange", refresh);
    };
  }, [load]);
  useEffect(() => {
    if (!watchUntil) return undefined;
    const timer = setInterval(() => {
      if (Date.now() > watchUntil) clearInterval(timer);
      else load();
    }, 3000);
    return () => clearInterval(timer);
  }, [watchUntil, load]);

  const act = async (id, payload) => {
    setBusy(id);
    try {
      const res = await api(taskUrl(id), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) setState((s) => ({ ...s, error: res.body.error ?? "That didn't save. Please try again." }));
      else await load();
    } finally {
      setBusy("");
    }
  };

  // Opens this page's "Add follow-up" action extension: documented `extension:<handle>/<target>` protocol.
  const actionTarget = shopify.extension.target.replace(".block.", ".action.");

  const actionHandle = actionTarget.includes("customer") ? "chaserpilot-add-followup-customer" : "chaserpilot-add-followup";

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
        <s-button href={`extension:${actionHandle}/${actionTarget}`} onClick={() => setWatchUntil(Date.now() + 120000)}>Add follow-up</s-button>
      </s-stack>
    </s-admin-block>
  );
}
