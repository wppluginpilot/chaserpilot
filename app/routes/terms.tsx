import type { MetaFunction } from "react-router";

import { DEVELOPER, PublicPage, SUPPORT_EMAIL } from "../components/public-page";
import { FREE_OPEN_LIMIT, PLAN_PRICE } from "../../server/domain/plan";

export const meta: MetaFunction = () => [
  { title: "Terms of service · ChaserPilot" },
  { name: "description", content: "The terms for using the ChaserPilot Shopify app, including the data processing terms." },
];

const UPDATED = "November 23, 2026";

export default function Terms() {
  return (
    <PublicPage narrow>
      <article className="pw__doc">
        <h1>Terms of service</h1>
        <p className="pw__muted">Last updated {UPDATED}</p>

        <p>
          These terms are an agreement between {DEVELOPER} (“we”, “us”) and the business that installs the ChaserPilot Shopify app (“you”, the “Merchant”). By installing or using
          ChaserPilot you accept them. Shopify&rsquo;s own terms continue to apply to your Shopify store.
        </p>

        <h2>The service</h2>
        <ul>
          <li>ChaserPilot lets you attach follow-up tasks to orders and customers in Shopify admin and work them from a queue.</li>
          <li>The Free plan includes up to {FREE_OPEN_LIMIT} open follow-ups at no cost.</li>
          <li>
            The Paid plan costs US${PLAN_PRICE.toFixed(2)} every 30 days, billed by Shopify on your Shopify invoice. You can return to Free at any time from the Plan page; Shopify handles
            proration and refunds under its billing terms. We give at least 30 days&rsquo; notice of any price change.
          </li>
          <li>We aim for high availability but the service is provided on a free-hosting basis without an uptime guarantee. Support is by email within one business day.</li>
        </ul>

        <h2>Your responsibilities</h2>
        <ul>
          <li>You decide what you write in follow-ups. Don&rsquo;t put payment card numbers, passwords or health information in them.</li>
          <li>You are responsible for having a lawful basis to keep notes about your customers and for responding to your customers&rsquo; requests.</li>
          <li>Don&rsquo;t misuse the service, attempt to break its security or use it to send unwanted email.</li>
        </ul>

        <h2>Data processing terms (DPA)</h2>
        <p>These terms form a data processing agreement between you (controller) and us (processor) for personal data we process through ChaserPilot.</p>
        <ul>
          <li><strong>Roles.</strong> You are the controller of the follow-up content and of any personal data in it. We are the processor and act only on your documented instructions: your use of the App and these terms.</li>
          <li><strong>What we process.</strong> Follow-up text you type, order numbers and order and customer IDs, store name, domain, owner email and an optional extra digest address. We do not process customer names, emails, phone numbers or addresses.</li>
          <li><strong>Purpose and duration.</strong> To provide the service while the App is installed, and for 48 hours after uninstall, then it is deleted.</li>
          <li><strong>Sub-processors.</strong> Render (hosting), Neon (database) and a transactional email provider (Resend or Brevo) used only for the daily digest. We will update this list here before adding another.</li>
          <li><strong>Security.</strong> Encryption in transit, encryption at rest at the database, access limited to the developer, webhook signatures verified, and every query scoped to a single store.</li>
          <li><strong>Confidentiality.</strong> People with access to the data are bound by confidentiality.</li>
          <li><strong>Breach notice.</strong> We will tell you without undue delay, and within 72 hours of becoming aware, of a personal data breach affecting your data.</li>
          <li><strong>Data-subject requests.</strong> We process Shopify&rsquo;s customer data request and redact webhooks automatically and will help you answer any other request on written notice.</li>
          <li><strong>Deletion.</strong> You can delete all data in Settings at any time. On uninstall we delete everything after 48 hours.</li>
          <li><strong>Audits.</strong> On reasonable written request we will provide the information needed to show compliance with these terms.</li>
        </ul>

        <h2>Warranty and liability</h2>
        <p>
          The service is provided “as is”. To the extent the law allows, our total liability for any claim is limited to the amount you paid for the service in the three months before
          the claim, and we are not liable for indirect or consequential loss, such as a missed follow-up.
        </p>

        <h2>Ending the agreement</h2>
        <p>You can stop at any time by uninstalling the App. We may suspend access for misuse or if the service is discontinued, with notice where we can give it.</p>

        <h2>Changes</h2>
        <p>We may update these terms and will change the date above. Material changes are announced in the App.</p>

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
