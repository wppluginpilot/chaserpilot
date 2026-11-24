import type { MetaFunction } from "react-router";

import { PublicPage, SUPPORT_EMAIL } from "../components/public-page";
import { FAQ } from "../../server/domain/guide";
import { FREE_OPEN_LIMIT, PLAN_PRICE } from "../../server/domain/plan";

export const meta: MetaFunction = () => [
  { title: "Support · ChaserPilot" },
  { name: "description", content: "Get help with ChaserPilot: setup, common fixes and how to contact support." },
];

const FIXES = [
  { q: "I don't see the Follow-ups block on an order.", a: "Open the order, then the page's block settings in Shopify admin, and add ChaserPilot's Follow-ups block to the page. The Add follow-up action is under More actions." },
  { q: "The queue shows the wrong day.", a: "Due dates follow the timezone in ChaserPilot's Settings, which starts as your Shopify timezone. Change it there." },
  { q: "I can't add another follow-up.", a: `The Free plan allows ${FREE_OPEN_LIMIT} open follow-ups. Finished ones don't count; mark some done or upgrade on the Plan page.` },
  { q: "I don't get the daily email.", a: "The daily email is optional on the Paid plan (Today digest view, with optional daily email), and it is not switched on for the app yet, so nothing is emailed for now. The Today page in the app shows the same list. Once email is live, check it is switched on in Settings, look in your spam folder, and note nothing is sent on days when nothing is due." },
  { q: "How much does ChaserPilot cost?", a: `Free for ${FREE_OPEN_LIMIT} open follow-ups. Paid is $${PLAN_PRICE.toFixed(2)} every 30 days, billed through your Shopify invoice.` },
];

export default function Support() {
  return (
    <PublicPage narrow>
      <article className="pw__doc">
        <h1>Support</h1>
        <p className="pw__lead">
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We reply within one business day, Monday to Friday. Include your store&rsquo;s myshopify.com address and what you
          were trying to do. New here? Read the <a href="/docs">documentation</a>.
        </p>

        <h2>Common fixes</h2>
        {FIXES.map((item) => (
          <section key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </section>
        ))}

        <h2>Questions</h2>
        {FAQ.map((item) => (
          <section key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </section>
        ))}
      </article>
    </PublicPage>
  );
}
