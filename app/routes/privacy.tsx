import type { MetaFunction } from "react-router";

import { DEVELOPER, PublicPage, SUPPORT_EMAIL } from "../components/public-page";

export const meta: MetaFunction = () => [
  { title: "Privacy policy · ChaserPilot" },
  { name: "description", content: "How the ChaserPilot Shopify app collects, uses and deletes data." },
];

const UPDATED = "November 23, 2026";

export default function Privacy() {
  return (
    <PublicPage narrow>
      <article className="pw__doc">
        <h1>Privacy policy</h1>
        <p className="pw__muted">Last updated {UPDATED}</p>

        <p>
          ChaserPilot (“the App”) is a Shopify app published by {DEVELOPER} (“we”, “us”). It lets a Shopify store (“Merchant”) attach follow-up tasks to orders and customers and work
          them from one queue. This policy explains what the App collects, why, where it is kept and how it is deleted.
        </p>

        <h2>The short version</h2>
        <p>
          ChaserPilot stores the text a Merchant types into a follow-up, the order number and the order and customer IDs it is attached to. It never reads or stores customer names,
          email addresses, phone numbers or addresses, or any order line, price or note.
        </p>

        <h2>Information we collect</h2>
        <div className="pw__table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Information</th>
                <th scope="col">Source</th>
                <th scope="col">Why we use it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Store name, domain, owner email address and time zone</td>
                <td>Shopify Admin API</td>
                <td>To identify the store, show dates in the right time zone and send the optional daily digest to the store owner.</td>
              </tr>
              <tr>
                <td>Follow-up text the Merchant types: title, notes, label, assignee, tags, due dates and history</td>
                <td>The Merchant, in the App</td>
                <td>To show and manage follow-ups. Please don&rsquo;t put card numbers or health data in notes.</td>
              </tr>
              <tr>
                <td>Order number (for example #1043) and the order or customer ID a follow-up is attached to</td>
                <td>Shopify Admin API (read_orders, read_customers) and the Shopify admin page the Merchant is on</td>
                <td>To link a follow-up to its order or customer.</td>
              </tr>
              <tr>
                <td>An extra digest email address, if the Merchant adds one</td>
                <td>The Merchant, in Settings</td>
                <td>To send the daily digest there.</td>
              </tr>
              <tr>
                <td>Staff session tokens</td>
                <td>Shopify OAuth</td>
                <td>To keep the Merchant signed in to the App.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Customers and shoppers</h2>
        <p>
          ChaserPilot does not collect anything from a store&rsquo;s shoppers and has no storefront component. A customer is only ever represented by the ID Shopify uses for them and a
          label the Merchant may type.
        </p>

        <h2>Email</h2>
        <p>
          On the Paid plan the Merchant can turn on a daily digest email listing follow-ups that are overdue or due today (titles, order numbers or labels, assignees). It is sent
          from our server through a transactional email provider and goes to the store owner address and the optional extra address. Each email has a link that turns the digest off.
        </p>

        <h2>Where data is kept and sub-processors</h2>
        <p>
          On servers of our sub-processors: Render (application hosting, United States), Neon (PostgreSQL database, United States) and the transactional email provider used to
          send the digest (Resend or Brevo, depending on how the service is configured; it receives the recipient address and the digest text). Data is encrypted in transit and at
          rest at the database. We do not sell or share data, and we do not use it for advertising or to train any model.
        </p>

        <h2>Retention and deletion</h2>
        <ul>
          <li>When the App is uninstalled, its access tokens are deleted immediately and the daily digest is switched off.</li>
          <li>Follow-ups are kept for 48 hours after uninstall in case of a reinstall. Then Shopify sends a <code>shop/redact</code> request and we permanently delete all data held for the store (we also delete it ourselves if that request never arrives).</li>
          <li>Merchants can delete all their follow-ups, templates and history at any time in Settings.</li>
          <li>Shopify&rsquo;s <code>customers/redact</code> request deletes the follow-ups attached to that customer and their orders. <code>customers/data_request</code> is answered with the follow-ups attached to that customer and orders.</li>
        </ul>

        <h2>Your rights</h2>
        <p>
          Merchants can ask for a copy of their data or its deletion at any time by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Customers should contact the store
          they bought from.
        </p>

        <h2>Changes</h2>
        <p>We will update the date above when this policy changes and tell installed Merchants in the App about material changes.</p>

        <h2>Contact</h2>
        <p>
          {DEVELOPER}
          <br />
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </article>
    </PublicPage>
  );
}
