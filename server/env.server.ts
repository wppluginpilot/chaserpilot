/**
 * Environment, validated once at boot.
 *
 * Production refuses to start with a missing or placeholder value: a Shopify app
 * that boots half-configured fails later, inside a merchant's admin, with an
 * error nobody can see. The MAIL_* / SMTP_* variables are optional: without
 * them (MAIL_PROVIDER=none) the daily digest email is off and the in-app
 * Today view is shown instead.
 */
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SHOPIFY_API_KEY: z.string().default(""),
  SHOPIFY_API_SECRET: z.string().default(""),
  SHOPIFY_APP_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default(""),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  MAIL_PROVIDER: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() || undefined : v), z.enum(["resend", "brevo", "smtp", "none"]).default("none")),
  MAIL_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.parse(process.env);
  if (parsed.NODE_ENV === "production") {
    const problems: string[] = [];
    if (!parsed.SHOPIFY_API_KEY) problems.push("SHOPIFY_API_KEY is not set");
    if (!parsed.SHOPIFY_API_SECRET) problems.push("SHOPIFY_API_SECRET is not set");
    if (!parsed.DATABASE_URL) problems.push("DATABASE_URL is not set");
    if (!/^https:\/\//.test(parsed.SHOPIFY_APP_URL)) {
      problems.push("SHOPIFY_APP_URL must be the app's public https:// origin");
    }
    if (problems.length > 0) {
      console.error(`ChaserPilot refused to start:\n  - ${problems.join("\n  - ")}`);
      process.exit(1);
    }
  }
  return parsed;
}

export const env = load();
