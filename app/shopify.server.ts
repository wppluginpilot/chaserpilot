/**
 * Shopify app configuration.
 *
 * Scopes live in shopify.app.toml and are granted through Shopify managed
 * installation, so declared and granted scopes cannot drift apart.
 */
import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  LogSeverity,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

import { env } from "../server/env.server";
import { prisma } from "../server/db.server";
import { MONTHLY_PLAN, PLAN_PRICE } from "../server/domain/plan";

/** Must match `api_version` in shopify.app.toml; a unit test asserts it. */
export const API_VERSION = ApiVersion.July26;

export { MONTHLY_PLAN } from "../server/domain/plan";

const shopify = shopifyApp({
  logger: { level: env.LOG_LEVEL === "debug" ? LogSeverity.Debug : LogSeverity.Warning },
  apiKey: env.SHOPIFY_API_KEY,
  apiSecretKey: env.SHOPIFY_API_SECRET,
  appUrl: env.SHOPIFY_APP_URL,
  apiVersion: API_VERSION,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [MONTHLY_PLAN]: {
      lineItems: [{ amount: PLAN_PRICE, currencyCode: "USD", interval: BillingInterval.Every30Days }],
    },
  },
  // Offline tokens only, expiring (required before 2027-01-01); the library
  // refreshes them with the stored refresh token.
  useOnlineTokens: false,
  future: {
    expiringOfflineAccessTokens: true,
  },
});

export default shopify;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const sessionStorage = shopify.sessionStorage;
