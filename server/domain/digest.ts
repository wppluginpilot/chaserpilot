import { createHmac, timingSafeEqual } from "node:crypto";

import { dueText } from "./dates";

export interface DigestTask {
  id: string;
  title: string;
  dueOn: string;
  label: string | null;
  assignee: string | null;
}

export interface DigestInput {
  shopName: string;
  shopDomain: string;
  today: string;
  overdue: DigestTask[];
  dueToday: DigestTask[];
  queueUrl: string;
  unsubscribeUrl: string;
}

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Null when nothing is due: no email is sent on a quiet day. */
export function buildDigest(input: DigestInput): DigestEmail | null {
  const total = input.overdue.length + input.dueToday.length;
  if (total === 0) return null;
  const name = input.shopName || input.shopDomain;
  const subject = `${total} follow-up${total === 1 ? "" : "s"} due for ${name}`;

  const line = (t: DigestTask) => {
    const who = t.assignee ? ` [${t.assignee}]` : "";
    const about = t.label ? ` (${t.label})` : "";
    return `- ${t.title}${about}${who} - ${dueText(t.dueOn, input.today)}`;
  };
  const section = (title: string, tasks: DigestTask[]) => (tasks.length ? `${title} (${tasks.length})\n${tasks.map(line).join("\n")}\n\n` : "");
  const text =
    `ChaserPilot daily digest for ${name}\n\n` +
    section("Overdue", input.overdue) +
    section("Due today", input.dueToday) +
    `Open your queue: ${input.queueUrl}\n\n` +
    `You get this email because the daily digest is on in ChaserPilot for ${name}.\nTurn it off: ${input.unsubscribeUrl}\n`;

  const li = (t: DigestTask) =>
    `<li>${esc(t.title)}${t.label ? ` <span style="color:#667">(${esc(t.label)})</span>` : ""}${t.assignee ? ` <span style="color:#667">[${esc(t.assignee)}]</span>` : ""} <strong>${esc(dueText(t.dueOn, input.today))}</strong></li>`;
  const hsec = (title: string, tasks: DigestTask[]) =>
    tasks.length ? `<h3 style="margin:18px 0 6px">${title} (${tasks.length})</h3><ul style="padding-left:20px">${tasks.map(li).join("")}</ul>` : "";
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1c1b2e;max-width:560px">` +
    `<h2 style="margin:0 0 4px">Follow-ups due for ${esc(name)}</h2>` +
    hsec("Overdue", input.overdue) +
    hsec("Due today", input.dueToday) +
    `<p><a href="${esc(input.queueUrl)}" style="background:#4F46E5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Open your queue</a></p>` +
    `<p style="color:#667;font-size:13px">You get this email because the daily digest is on in ChaserPilot for ${esc(name)}. <a href="${esc(input.unsubscribeUrl)}">Turn it off</a>.</p></div>`;
  return { subject, text, html };
}

/** The digest goes out during the configured local hour. */
export function isDigestHour(localHour: number, digestHour: number): boolean {
  return localHour === digestHour;
}

// ─── Unsubscribe links ───────────────────────────────────────────────────────

function sign(secret: string, shopId: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${shopId}`).digest("base64url");
}

/** `<shopId>.<signature>`: the signature binds the link to one shop. */
export function makeUnsubscribeToken(secret: string, shopId: string): string {
  return `${shopId}.${sign(secret, shopId)}`;
}

export function verifyUnsubscribeToken(secret: string, token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const shopId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(secret, shopId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return shopId;
}
