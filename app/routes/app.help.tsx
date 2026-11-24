/** Help: the shared guide, FAQ and contact details. */
import { FAQ, GUIDE, APP_VERSION } from "../../server/domain/guide";
import { SUPPORT_EMAIL } from "../components/public-page";
import { HELP_LINKS } from "../lib/links";

export default function Help() {
  return (
    <s-page heading="Help">
      <s-stack direction="block" gap="base">
        {GUIDE.map((section) => (
          <s-section key={section.id} heading={section.heading}>
            <s-stack direction="block" gap="small">
              {section.steps ? (
                <s-ordered-list>
                  {section.steps.map((step) => (
                    <s-list-item key={step}>{step}</s-list-item>
                  ))}
                </s-ordered-list>
              ) : null}
              {section.paragraphs?.map((p) => (
                <s-paragraph key={p}>{p}</s-paragraph>
              ))}
            </s-stack>
          </s-section>
        ))}
        <s-section heading="Questions">
          <s-stack direction="block" gap="base">
            {FAQ.map((item) => (
              <s-stack key={item.q} direction="block" gap="small-300">
                <s-text type="strong">{item.q}</s-text>
                <s-paragraph>{item.a}</s-paragraph>
              </s-stack>
            ))}
          </s-stack>
        </s-section>
        <s-section heading="Contact">
          <s-stack direction="block" gap="small">
            <s-paragraph>
              Email <s-link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</s-link>. We reply within one business day.
            </s-paragraph>
            <s-stack direction="inline" gap="small">
              <s-link href={HELP_LINKS.docs} target="_blank">
                Documentation
              </s-link>
              <s-link href={HELP_LINKS.support} target="_blank">
                Support page
              </s-link>
            </s-stack>
            <s-text color="subdued">ChaserPilot version {APP_VERSION}</s-text>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
