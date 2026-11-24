/**
 * Unsubscribe link in every digest email. The link carries a signed token for
 * one shop. GET shows a confirmation button (mail scanners open links, so a GET
 * must not change anything); POST turns the digest off, and also serves the
 * one-click List-Unsubscribe-Post header.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { PublicPage, SUPPORT_EMAIL } from "../components/public-page";
import { prisma } from "../../server/db.server";
import { verifyUnsubscribeToken } from "../../server/domain/digest";
import { env } from "../../server/env.server";
import { unsubscribeShop } from "../../server/services/digest.server";

export const meta: MetaFunction = () => [{ title: "Turn off the daily digest · ChaserPilot" }, { name: "robots", content: "noindex" }];

function shopFromRequest(request: Request): string | null {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  return verifyUnsubscribeToken(env.SHOPIFY_API_SECRET, token);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shopId = shopFromRequest(request);
  if (!shopId) return { valid: false as const, name: "" };
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true, domain: true } });
  return { valid: Boolean(shop), name: shop?.name || shop?.domain || "" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shopId = shopFromRequest(request);
  if (!shopId) return new Response("This link isn't valid.", { status: 400 });
  await unsubscribeShop(prisma, shopId);
  return { done: true };
};

export default function Unsubscribe() {
  const d = useLoaderData<typeof loader>();
  const done = useActionData<typeof action>();
  const isDone = Boolean(done && typeof done === "object" && "done" in done);
  return (
    <PublicPage narrow>
      <article className="pw__doc">
        <h1>Daily digest</h1>
        {!d.valid ? (
          <p>This unsubscribe link isn&rsquo;t valid or has expired. Open ChaserPilot in your Shopify admin, go to Settings and switch the daily digest off, or email {SUPPORT_EMAIL}.</p>
        ) : isDone ? (
          <p>Done. The ChaserPilot daily digest for {d.name} is turned off. You can turn it back on any time in Settings.</p>
        ) : (
          <>
            <p>Turn off the daily digest email for {d.name}?</p>
            <Form method="post">
              <button className="pw__cta" type="submit" style={{ border: 0, cursor: "pointer", font: "inherit" }}>
                Turn off the digest
              </button>
            </Form>
          </>
        )}
      </article>
    </PublicPage>
  );
}
