/**
 * The embedded app shell: navigation, the plan check and the error boundary
 * for everything under /app. Stores that have not chosen a plan land on
 * /app/plan (Plan and Help stay reachable).
 */
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, isRouteErrorResponse, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { env } from "../../server/env.server";
import { requireShop } from "../lib/context.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Authenticates, provisions the shop and sends a store with no plan to /app/plan.
  await requireShop(request);
  return { apiKey: env.SHOPIFY_API_KEY };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        <a href="/app" rel="home">
          Queue
        </a>
        <s-link href="/app/today">Today</s-link>
        <s-link href="/app/templates">Templates</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/plan">Plan</s-link>
        <s-link href="/app/help">Help</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <s-page heading="Not found">
        <s-section>
          <s-paragraph>That follow-up or page doesn&rsquo;t exist, or it was deleted.</s-paragraph>
          <s-button href="/app">Back to follow-ups</s-button>
        </s-section>
      </s-page>
    );
  }

  // Shopify's re-authorization and billing responses must reach the library untouched.
  if (isRouteErrorResponse(error) || (error && typeof error === "object" && "headers" in error)) {
    return boundary.error(error);
  }

  return (
    <s-page heading="Something went wrong">
      <s-section>
        <s-banner tone="critical" heading="Unexpected error">
          <s-paragraph>ChaserPilot hit a problem loading this page. Try again; if it keeps happening, email support@wppluginpilot.com.</s-paragraph>
        </s-banner>
        <s-button href="/app">Back to follow-ups</s-button>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
