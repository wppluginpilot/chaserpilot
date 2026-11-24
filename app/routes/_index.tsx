/**
 * The app's entry point, and the URL Shopify itself loads.
 *
 * `application_url` points here. Inside the admin, Shopify loads this route
 * with `shop`, `host` and `embedded` in the query string; it is sent straight
 * on to the embedded app with the whole query string intact. A browser without
 * `shop` gets the public product page, whose only call to action is the App
 * Store listing (installs must start from Shopify).
 */
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect } from "react-router";

import { APP_STORE_URL, PublicPage } from "../components/public-page";
import { SITE_URL } from "../lib/links";
import { FREE_OPEN_LIMIT, PAID_FEATURES, PLAN_PRICE } from "../../server/domain/plan";

export const meta: MetaFunction = () => [
  { title: "ChaserPilot · Follow-up tasks for Shopify orders and customers" },
  {
    name: "description",
    content: "Add a follow-up to any Shopify order or customer, then work one list every morning: overdue, today, this week. Free for 25 open follow-ups.",
  },
  { property: "og:title", content: "ChaserPilot · Never forget what you promised a customer" },
  { property: "og:description", content: "Follow-up tasks on Shopify orders and customers, with one queue to work every morning." },
  { property: "og:image", content: `${SITE_URL}/og.png` },
  { name: "twitter:card", content: "summary_large_image" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // Preserved wholesale: Shopify adds parameters over time (id_token, locale, session).
  if (url.searchParams.get("shop")) return redirect(`/app?${url.searchParams.toString()}`);
  return null;
};

const STEPS = [
  { title: "Add it where the work happens", body: "On any order or customer page in Shopify admin, choose More actions > Add follow-up. Title, due date, done. No copying order numbers." },
  { title: "Work one list every morning", body: "Overdue, Today, This week and Later in one queue. Filter by assignee or tag. Mark done or snooze with one click." },
  { title: "Let it come to you", body: "Recurring follow-ups, reusable templates and the Today digest view with an optional daily email of what is due, so nothing slips." },
];

const FEATURES = [
  { title: "Follow-ups block on orders and customers", body: "See what is open for that order or customer right on its page, with Done and Snooze buttons." },
  { title: "Built for promises after the sale", body: "Chase a deposit, check a delivery, ask for a review, call back a wholesale enquiry. Templates for the ones you repeat." },
  { title: "Reads almost nothing", body: "ChaserPilot reads only the order number and customer ID it needs to link a follow-up. Never names, emails or addresses." },
];

const FAQS = [
  { q: "Do I need a heavy CRM?", a: "No. ChaserPilot is a to-do list that knows about your orders and customers, nothing more." },
  { q: "Can I see customer names?", a: "No, on purpose. ChaserPilot never asks Shopify for them. You can type a short label on a follow-up." },
  { q: "What does Free include?", a: `Up to ${FREE_OPEN_LIMIT} open follow-ups, the queue, the order and customer blocks and snooze. Finished follow-ups don't count.` },
  { q: "How does billing work?", a: `Paid is $${PLAN_PRICE.toFixed(2)} every 30 days through your Shopify bill. Switch back to Free any time.` },
];

export default function Landing() {
  return (
    <PublicPage>
      <section className="pw__hero">
        <span className="pw__pill">Shopify app for stores that make promises after the sale</span>
        <h1>Never forget what you promised a customer.</h1>
        <p className="pw__lead">
          ChaserPilot puts a follow-up with a due date on the order or customer page in Shopify admin and collects them into one queue. Custom orders, preorders,
          deposits, deliveries, review requests, wholesale callbacks.
        </p>
        <a className="pw__cta" href={APP_STORE_URL}>
          Get ChaserPilot on the Shopify App Store
        </a>
        <p className="pw__muted" style={{ marginTop: 14 }}>
          Free for {FREE_OPEN_LIMIT} open follow-ups. ${PLAN_PRICE.toFixed(2)}/month for the rest.
        </p>
      </section>

      <h2>How it works</h2>
      <section className="pw__grid" aria-label="How it works">
        {STEPS.map((s, i) => (
          <div className="pw__card" key={s.title}>
            <h3>
              {i + 1}. {s.title}
            </h3>
            <p>{s.body}</p>
          </div>
        ))}
      </section>

      <h2>Features</h2>
      <section className="pw__grid" aria-label="Features">
        {FEATURES.map((f) => (
          <div className="pw__card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <h2>Two plans</h2>
      <section className="pw__grid" aria-label="Plans">
        <div className="pw__card">
          <h3>Free</h3>
          <p>
            <strong>$0.</strong> Up to {FREE_OPEN_LIMIT} open follow-ups, the queue, order and customer blocks and actions, snooze and tags.
          </p>
        </div>
        <div className="pw__card">
          <h3>Paid: ${PLAN_PRICE.toFixed(2)} a month</h3>
          <p>Billed by Shopify every 30 days. {PAID_FEATURES.join(", ")}. No per-seat price, no add-ons.</p>
        </div>
      </section>

      <h2>Questions</h2>
      {FAQS.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </PublicPage>
  );
}
