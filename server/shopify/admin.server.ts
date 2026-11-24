/**
 * Every Admin API call ChaserPilot makes, in one file so the scope justification
 * in shopify.app.toml can be checked against it at a glance:
 *
 *   shop profile      - no scope needed
 *   order(id) { name } - read_orders, the order number only
 *   customer(id) { id } - read_customers, existence check only
 *
 * No customer name, email, phone or address field is ever selected. Every
 * document here was validated against Admin API 2026-07.
 */
import { UserError } from "../errors";
import { log } from "../logger.server";

export interface AdminGraphql {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}

interface GraphqlResult<T> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
}

async function run<T>(admin: AdminGraphql, query: string, variables?: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await admin.graphql(query, variables ? { variables } : undefined);
  } catch (error) {
    if (error instanceof Response) throw error;
    const body = (error as { body?: { errors?: unknown } }).body;
    const detail = graphqlMessage(body?.errors) ?? (error instanceof Error ? error.message : "");
    log().error({ err: error, graphqlErrors: body?.errors }, "admin api request failed");
    throw new UserError(detail ? `Shopify rejected the request: ${detail}` : "Shopify didn't respond. Please try again in a moment.", 502);
  }
  const body = (await response.json()) as GraphqlResult<T>;
  if (body.errors?.length || !body.data) {
    const throttled = body.errors?.some((e) => e.extensions?.code === "THROTTLED" || /throttl/i.test(e.message));
    log().error({ errors: body.errors }, "admin api returned errors");
    throw new UserError(throttled ? "Shopify is throttling requests (THROTTLED)." : "Shopify rejected the request. Please try again.", 502);
  }
  return body.data;
}

function graphqlMessage(errors: unknown): string | null {
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) {
    const messages = errors.map((e) => (e && typeof e === "object" && "message" in e ? String(e.message) : "")).filter(Boolean);
    return messages.length ? messages.join("; ").slice(0, 400) : null;
  }
  if (errors && typeof errors === "object") {
    const nested = (errors as { graphQLErrors?: unknown }).graphQLErrors;
    if (nested) return graphqlMessage(nested);
    if ("message" in errors) return String((errors as { message: unknown }).message).slice(0, 400);
  }
  return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries Shopify's rate limiting with exponential backoff. */
export async function runThrottled<T>(admin: AdminGraphql, query: string, variables?: Record<string, unknown>, baseDelayMs = 1000): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run<T>(admin, query, variables);
    } catch (error) {
      const throttled = error instanceof UserError && /throttl/i.test(error.message);
      if (!throttled || attempt >= 6) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

// --- Shop -------------------------------------------------------------------

export interface ShopProfile {
  name: string;
  email: string | null;
  ianaTimezone: string;
  devStore: boolean;
}

export const SHOP_QUERY = `#graphql
  query ChaserShop { shop { name email ianaTimezone plan { partnerDevelopment } } }`;

export async function fetchShopProfile(admin: AdminGraphql): Promise<ShopProfile> {
  const data = await run<{ shop: { name: string; email: string | null; ianaTimezone: string; plan: { partnerDevelopment: boolean } } }>(admin, SHOP_QUERY);
  return { name: data.shop.name, email: data.shop.email, ianaTimezone: data.shop.ianaTimezone, devStore: data.shop.plan.partnerDevelopment };
}

// --- Subjects (Level 1 data only) ---------------------------------------------

export const ORDER_QUERY = `#graphql
  query ChaserOrder($id: ID!) { order(id: $id) { id name } }`;

export const CUSTOMER_QUERY = `#graphql
  query ChaserCustomer($id: ID!) { customer(id: $id) { id } }`;

/** The order name such as "#1043". Null for orders older than 60 days (read_orders limit) or on any lookup problem. */
export async function fetchOrderName(admin: AdminGraphql, gid: string): Promise<string | null> {
  try {
    const data = await run<{ order: { id: string; name: string } | null }>(admin, ORDER_QUERY, { id: gid });
    return data.order?.name ?? null;
  } catch (error) {
    log().warn({ err: error }, "order name lookup failed; continuing without it");
    return null;
  }
}

export async function customerExists(admin: AdminGraphql, gid: string): Promise<boolean | null> {
  try {
    const data = await run<{ customer: { id: string } | null }>(admin, CUSTOMER_QUERY, { id: gid });
    return Boolean(data.customer);
  } catch (error) {
    log().warn({ err: error }, "customer lookup failed; continuing");
    return null;
  }
}

// --- Billing ----------------------------------------------------------------

export const SUBSCRIBE_MUTATION = `#graphql
  mutation ChaserSubscribe($name: String!, $returnUrl: URL!, $test: Boolean!, $lineItems: [AppSubscriptionLineItemInput!]!) {
    appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, lineItems: $lineItems) {
      confirmationUrl
      appSubscription { id status }
      userErrors { field message }
    }
  }`;

export const CANCEL_MUTATION = `#graphql
  mutation ChaserCancel($id: ID!) {
    appSubscriptionCancel(id: $id) { appSubscription { id status } userErrors { field message } }
  }`;

export const ACTIVE_SUBSCRIPTION_QUERY = `#graphql
  query ChaserActiveSubscription {
    currentAppInstallation { activeSubscriptions { id name status test createdAt currentPeriodEnd } }
  }`;

export interface ActiveSubscription {
  id: string;
  name: string;
  status: string;
  test: boolean;
  createdAt: string;
  currentPeriodEnd: string | null;
}

export async function fetchActiveSubscriptions(admin: AdminGraphql): Promise<ActiveSubscription[]> {
  const data = await run<{ currentAppInstallation: { activeSubscriptions: ActiveSubscription[] } }>(admin, ACTIVE_SUBSCRIPTION_QUERY);
  return data.currentAppInstallation.activeSubscriptions;
}

export async function createSubscription(
  admin: AdminGraphql,
  input: { name: string; returnUrl: string; test: boolean; price: number },
): Promise<{ confirmationUrl: string } | { error: string; unlisted: boolean }> {
  try {
    const data = await run<{ appSubscriptionCreate: { confirmationUrl: string | null; userErrors: { message: string }[] } }>(admin, SUBSCRIBE_MUTATION, {
      name: input.name,
      returnUrl: input.returnUrl,
      test: input.test,
      lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: input.price, currencyCode: "USD" }, interval: "EVERY_30_DAYS" } } }],
    });
    const result = data.appSubscriptionCreate;
    if (result.confirmationUrl) return { confirmationUrl: result.confirmationUrl };
    const message = result.userErrors[0]?.message ?? "Shopify couldn't start the subscription. Try again.";
    return { error: message, unlisted: /public distribution/i.test(message) };
  } catch (error) {
    const message = error instanceof UserError ? error.message : "Shopify couldn't start the subscription. Try again.";
    return { error: message, unlisted: /public distribution/i.test(message) };
  }
}

export async function cancelSubscription(admin: AdminGraphql, id: string): Promise<string | null> {
  const data = await run<{ appSubscriptionCancel: { userErrors: { message: string }[] } }>(admin, CANCEL_MUTATION, { id });
  return data.appSubscriptionCancel.userErrors[0]?.message ?? null;
}
