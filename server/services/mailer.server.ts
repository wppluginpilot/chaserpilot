/**
 * Outbound email for the daily digest. A small interface with providers chosen
 * by MAIL_PROVIDER:
 *
 *   resend | brevo  send over HTTPS (works on Render's free web service, which
 *                   blocks outbound SMTP ports 25/465/587). Needs MAIL_API_KEY
 *                   and MAIL_FROM.
 *   smtp            optional, for local development and paid hosts. Needs
 *                   SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS) and MAIL_FROM.
 *   none            (default) no email; the in-app Today view is the digest.
 *
 * A provider that is selected but incomplete behaves like "none" and nothing
 * crashes.
 */
import nodemailer from "nodemailer";

import { env } from "../env.server";

export interface MailMessage {
  to: string[];
  subject: string;
  text: string;
  html: string;
  /** One-click unsubscribe target for the List-Unsubscribe header. */
  unsubscribeUrl?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export type MailProvider = "resend" | "brevo" | "smtp" | "none";

export interface MailConfig {
  provider: MailProvider;
  from: string;
  apiKey: string;
  smtp: { host: string; port: number; user: string; pass: string };
}

export function mailConfig(e: Pick<typeof env, "MAIL_PROVIDER" | "MAIL_FROM" | "MAIL_API_KEY" | "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS">): MailConfig {
  return { provider: e.MAIL_PROVIDER, from: e.MAIL_FROM, apiKey: e.MAIL_API_KEY, smtp: { host: e.SMTP_HOST, port: e.SMTP_PORT, user: e.SMTP_USER, pass: e.SMTP_PASS } };
}

/** The provider that will actually be used: "none" unless its settings are complete. */
export function effectiveProvider(c: MailConfig): MailProvider {
  if (!c.from) return "none";
  if ((c.provider === "resend" || c.provider === "brevo") && c.apiKey) return c.provider;
  if (c.provider === "smtp" && c.smtp.host) return "smtp";
  return "none";
}

/** "Name <a@b.com>" or "a@b.com" into parts. */
export function parseFrom(from: string): { name: string | null; email: string } {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return m ? { name: m[1] || null, email: m[2]! } : { name: null, email: from.trim() };
}

function unsubscribeHeaders(url?: string): Record<string, string> {
  return url ? { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {};
}

type Fetch = typeof fetch;

async function postJson(fetchImpl: Fetch, url: string, headers: Record<string, string>, body: unknown, provider: string): Promise<void> {
  const res = await fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`${provider} rejected the email (${res.status}) ${detail}`);
  }
}

export function createResendMailer(apiKey: string, from: string, fetchImpl: Fetch = fetch): Mailer {
  return {
    send: (m) =>
      postJson(
        fetchImpl,
        "https://api.resend.com/emails",
        { Authorization: `Bearer ${apiKey}` },
        { from, to: m.to, subject: m.subject, text: m.text, html: m.html, headers: unsubscribeHeaders(m.unsubscribeUrl) },
        "Resend",
      ),
  };
}

export function createBrevoMailer(apiKey: string, from: string, fetchImpl: Fetch = fetch): Mailer {
  const sender = parseFrom(from);
  return {
    send: (m) =>
      postJson(
        fetchImpl,
        "https://api.brevo.com/v3/smtp/email",
        { "api-key": apiKey },
        {
          sender: { email: sender.email, ...(sender.name ? { name: sender.name } : {}) },
          to: m.to.map((email) => ({ email })),
          subject: m.subject,
          textContent: m.text,
          htmlContent: m.html,
          headers: unsubscribeHeaders(m.unsubscribeUrl),
        },
        "Brevo",
      ),
  };
}

export function createSmtpMailer(smtp: MailConfig["smtp"], from: string): Mailer {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    ...(smtp.user ? { auth: { user: smtp.user, pass: smtp.pass } } : {}),
  });
  return {
    async send(m) {
      await transport.sendMail({ from, to: m.to, subject: m.subject, text: m.text, html: m.html, headers: unsubscribeHeaders(m.unsubscribeUrl) });
    },
  };
}

export function createMailer(c: MailConfig, fetchImpl: Fetch = fetch): Mailer | null {
  switch (effectiveProvider(c)) {
    case "resend":
      return createResendMailer(c.apiKey, c.from, fetchImpl);
    case "brevo":
      return createBrevoMailer(c.apiKey, c.from, fetchImpl);
    case "smtp":
      return createSmtpMailer(c.smtp, c.from);
    default:
      return null;
  }
}

let cached: Mailer | null | undefined;

/** The configured mailer, or null when email is not set up. */
export function getMailer(): Mailer | null {
  if (cached === undefined) cached = createMailer(mailConfig(env));
  return cached;
}

export function emailConfigured(): boolean {
  return effectiveProvider(mailConfig(env)) !== "none";
}
