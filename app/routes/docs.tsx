import type { MetaFunction } from "react-router";

import { PublicPage, SUPPORT_EMAIL } from "../components/public-page";
import { FAQ, GUIDE } from "../../server/domain/guide";

export const meta: MetaFunction = () => [
  { title: "Documentation · ChaserPilot" },
  { name: "description", content: "Set up ChaserPilot: the Add follow-up action, the Follow-ups block, the queue, recurring follow-ups, templates, the daily digest and CSV export." },
];

export default function Docs() {
  return (
    <PublicPage narrow>
      <article className="pw__doc">
        <h1>ChaserPilot documentation</h1>
        <p className="pw__lead">From install to your first follow-up in about two minutes.</p>

        {GUIDE.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.heading}</h2>
            {section.steps ? (
              <ol>
                {section.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            ) : null}
            {section.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          </section>
        ))}

        <h2>Server setup for the daily digest (self-hosting and operators)</h2>
        <p>The digest email is sent from the ChaserPilot server. Choose a provider with the MAIL_PROVIDER environment variable:</p>
        <ul>
          <li>
            <code>resend</code> (primary) or <code>brevo</code>: sent over HTTPS. Set <code>MAIL_PROVIDER=resend</code>, <code>MAIL_API_KEY</code> and <code>MAIL_FROM</code> (for example <code>ChaserPilot &lt;digest@your-domain&gt;</code>
            ). Works on hosts that block outbound SMTP, such as Render&rsquo;s free web service.
          </li>
          <li>
            <code>smtp</code>: set <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> and <code>MAIL_FROM</code>. For local development and hosts that allow SMTP.
          </li>
          <li>
            <code>none</code> (default): no email is sent and the in-app Today page is the digest.
          </li>
        </ul>

        <h2>Questions</h2>
        {FAQ.map((item) => (
          <section key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </section>
        ))}
        <p>
          Still stuck? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </article>
    </PublicPage>
  );
}
