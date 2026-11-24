/**
 * Plan and billing: exactly two plans, Free and Paid.
 *
 * A store that has not chosen lands here (app.tsx / context.server.ts). The
 * upgrade action runs appSubscriptionCreate itself and returns the
 * confirmationUrl; the client opens it in the top window. billing.request is
 * never used in an action. Declining on Shopify's page returns here, where Free
 * is always one click away, so there is no redirect loop.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";

import { Button, ConfirmButton } from "../components/wc";
import { requireShop } from "../lib/context.server";
import { FREE_OPEN_LIMIT, MONTHLY_PLAN, PAID_FEATURES, PLAN_PRICE } from "../../server/domain/plan";
import { chooseFree, startUpgrade } from "../../server/services/billing.server";
import { openCount } from "../../server/services/tasks.server";
import { UserError } from "../../server/errors";
import { log } from "../../server/logger.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // Coming back from Shopify's approval page: read the fresh plan, not the 60 s cache.
  const ctx = await requireShop(request, { fresh: true });
  const open = await openCount(ctx.db, ctx.shopId);
  return {
    current: ctx.planState.plan,
    test: ctx.planState.test,
    waived: ctx.planState.waived,
    open,
    returned: url.searchParams.has("charge_id"),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const ctx = await requireShop(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  try {
    if (intent === "upgrade") {
      if (ctx.planState.plan === "PAID") return { already: true as const };
      return await startUpgrade(ctx.db, ctx.admin, ctx.shop);
    }
    if (intent === "free") {
      const res = await chooseFree(ctx.db, ctx.admin, ctx.shop);
      return res.error ? { error: res.error } : { chose: "free" as const };
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    log().error({ err: error, shop: ctx.shop.domain }, "plan change failed");
    return { error: error instanceof UserError ? error.message : "Something went wrong changing your plan. Please try again." };
  }
  return { error: "Unknown action." };
};

export default function Plan() {
  const d = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const data = fetcher.data;
  const confirmationUrl = data && "confirmationUrl" in data ? data.confirmationUrl : null;
  const error = data && "error" in data ? data.error : null;
  const busy = fetcher.state !== "idle" || Boolean(confirmationUrl);

  useEffect(() => {
    // Shopify's approval page can't load inside the app iframe.
    if (confirmationUrl) window.open(confirmationUrl, "_top");
    else if (data && ("waived" in data || "already" in data || "chose" in data)) window.location.reload();
  }, [confirmationUrl, data]);

  const isPaid = d.current === "PAID";
  const isFree = d.current === "FREE";

  return (
    <s-page heading="Plan">
      <s-stack direction="block" gap="base">
        {d.current === null ? (
          <s-banner tone="info" heading="Choose a plan to get started">
            <s-paragraph>
              {d.returned ? "The upgrade wasn't completed. " : ""}Free costs nothing and needs no card. You can upgrade or go back to Free at any time.
            </s-paragraph>
          </s-banner>
        ) : null}
        {error ? (
          <s-banner tone="critical" heading="Couldn't change your plan">
            <s-paragraph>{error}</s-paragraph>
          </s-banner>
        ) : null}
        {isPaid && d.waived ? (
          <s-banner tone="info" heading="Development store">
            <s-paragraph>Shopify only allows charges once the app is public, so every feature is unlocked on this store for now.</s-paragraph>
          </s-banner>
        ) : null}

        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap="base">
          <s-section heading="Free">
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-heading>$0</s-heading>
                {isFree ? <s-badge tone="success">Current plan</s-badge> : null}
              </s-stack>
              <s-text>Up to {FREE_OPEN_LIMIT} open follow-ups</s-text>
              <s-text color="subdued">Queue, order and customer blocks and actions, snooze and tags.</s-text>
              {isFree ? (
                <s-text color="subdued">
                  {d.open} of {FREE_OPEN_LIMIT} open follow-ups used
                </s-text>
              ) : isPaid ? (
                <ConfirmButton onConfirm={() => fetcher.submit({ intent: "free" }, { method: "post" })} confirmLabel="Click again to switch to Free">
                  Downgrade to Free
                </ConfirmButton>
              ) : (
                <Button variant="primary" loading={busy} onClick={() => fetcher.submit({ intent: "free" }, { method: "post" })}>
                  Choose Free
                </Button>
              )}
            </s-stack>
          </s-section>

          <s-section heading="Paid">
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-heading>${PLAN_PRICE.toFixed(2)} a month</s-heading>
                {isPaid ? <s-badge tone="success">Current plan</s-badge> : null}
                {isPaid && d.waived ? <s-badge>Development store, billing waived</s-badge> : isPaid && d.test ? <s-badge>Test charge</s-badge> : null}
              </s-stack>
              <s-text color="subdued">{MONTHLY_PLAN}: billed by Shopify every 30 days. Cancel any time from this page.</s-text>
              <s-stack direction="block" gap="small-300">
                {PAID_FEATURES.map((f) => (
                  <s-text key={f}>{f}</s-text>
                ))}
              </s-stack>
              {isPaid ? (
                <s-text color="subdued">You&rsquo;re on the Paid plan.</s-text>
              ) : (
                <Button variant="primary" loading={busy} onClick={() => fetcher.submit({ intent: "upgrade" }, { method: "post" })}>
                  Upgrade to Paid
                </Button>
              )}
            </s-stack>
          </s-section>
        </s-grid>

        <s-text color="subdued">After a downgrade everything is kept: paid fields on existing follow-ups stay visible, repeating follow-ups stop creating new ones and the daily email is switched off (the Today view stays available).</s-text>
        <s-button href="/app">Back to follow-ups</s-button>
      </s-stack>
    </s-page>
  );
}
