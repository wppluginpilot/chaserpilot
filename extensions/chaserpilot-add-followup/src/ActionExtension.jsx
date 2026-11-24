/** @jsxImportSource preact */
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

import { TEMPLATES_URL, api, tasksUrl } from "./api";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { close, data } = shopify;
  const subjectGid = data.selected[0]?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [tasks, tpl] = await Promise.all([api(tasksUrl(subjectGid)), api(TEMPLATES_URL)]);
        if (!alive) return;
        if (tasks.ok) {
          setDueOn(tasks.body.defaultDue ?? "");
          setPaid(tasks.body.plan === "PAID");
        } else {
          setError(tasks.body.error ?? "Couldn't load ChaserPilot. You can still try saving.");
        }
        if (tpl.ok) setTemplates(tpl.body.templates ?? []);
      } catch {
        if (alive) setError("Couldn't load ChaserPilot. You can still try saving.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [subjectGid]);

  const applyTemplate = (id) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title);
    setDueOn(t.dueOn);
    setTags(t.tags);
    setNotes(t.notes);
  };

  const save = async () => {
    setError("");
    if (!title.trim()) {
      setError("Add a title for the follow-up.");
      return;
    }
    setSaving(true);
    try {
      const res = await api("/ext/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueOn, notes, assignee, tags, subjectGid }),
      });
      if (!res.ok) {
        setError(res.body.error ?? "Couldn't save the follow-up. Please try again.");
        return;
      }
      close();
    } catch {
      setError("Couldn't save the follow-up. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <s-admin-action heading="Add follow-up" loading={loading}>
      <s-stack direction="block" gap="base">
        {error ? (
          <s-banner tone="critical">
            <s-text>{error}</s-text>
          </s-banner>
        ) : null}
        {templates.length ? (
          <s-select label="Template" onChange={(e) => applyTemplate(e.currentTarget.value)}>
            <s-option value="">No template</s-option>
            {templates.map((t) => (
              <s-option key={t.id} value={t.id}>
                {t.name}
              </s-option>
            ))}
          </s-select>
        ) : null}
        <s-text-field label="What do you need to follow up on?" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
        <s-date-field label="Due date" value={dueOn} onChange={(e) => setDueOn(e.currentTarget.value)} />
        <s-text-area label="Notes" value={notes} rows={3} onInput={(e) => setNotes(e.currentTarget.value)} details="Don't paste card numbers or health data." />
        <s-text-field label="Tags" value={tags} onInput={(e) => setTags(e.currentTarget.value)} details="Up to 5, separated by commas." />
        {paid ? <s-text-field label="Assignee" value={assignee} onInput={(e) => setAssignee(e.currentTarget.value)} /> : null}
      </s-stack>
      <s-button slot="primary-action" variant="primary" loading={saving} onClick={save}>
        Save
      </s-button>
      <s-button slot="secondary-actions" onClick={() => close()}>
        Cancel
      </s-button>
    </s-admin-action>
  );
}
