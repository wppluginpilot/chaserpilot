import { describe, expect, it, vi } from "vitest";

import { createBrevoMailer, createMailer, createResendMailer, effectiveProvider, parseFrom, type MailConfig } from "../../server/services/mailer.server";

const msg = { to: ["owner@example.com"], subject: "S", text: "T", html: "<p>H</p>", unsubscribeUrl: "https://x/u?t=1" };
const cfg = (over: Partial<MailConfig> = {}): MailConfig => ({
  provider: "none",
  from: "ChaserPilot <digest@wppluginpilot.com>",
  apiKey: "",
  smtp: { host: "", port: 587, user: "", pass: "" },
  ...over,
});
const okFetch = () => vi.fn(async () => new Response("{}", { status: 200 }));

describe("provider selection", () => {
  it("is none by default and when incomplete", () => {
    expect(effectiveProvider(cfg())).toBe("none");
    expect(effectiveProvider(cfg({ provider: "resend" }))).toBe("none");
    expect(effectiveProvider(cfg({ provider: "resend", apiKey: "k", from: "" }))).toBe("none");
    expect(effectiveProvider(cfg({ provider: "smtp" }))).toBe("none");
    expect(createMailer(cfg())).toBeNull();
  });
  it("is resend, brevo or smtp when complete", () => {
    expect(effectiveProvider(cfg({ provider: "resend", apiKey: "k" }))).toBe("resend");
    expect(effectiveProvider(cfg({ provider: "brevo", apiKey: "k" }))).toBe("brevo");
    expect(effectiveProvider(cfg({ provider: "smtp", smtp: { host: "localhost", port: 1025, user: "", pass: "" } }))).toBe("smtp");
  });
});

describe("HTTPS providers", () => {
  it("Resend posts to its REST API with a bearer key and unsubscribe headers", async () => {
    const f = okFetch();
    await createResendMailer("re_key", "ChaserPilot <digest@wppluginpilot.com>", f as never).send(msg);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_key");
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe("ChaserPilot <digest@wppluginpilot.com>");
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.headers["List-Unsubscribe"]).toBe("<https://x/u?t=1>");
  });
  it("Brevo posts to its REST API with an api-key header", async () => {
    const f = okFetch();
    await createBrevoMailer("br_key", "ChaserPilot <digest@wppluginpilot.com>", f as never).send(msg);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("br_key");
    const body = JSON.parse(init.body as string);
    expect(body.sender).toEqual({ email: "digest@wppluginpilot.com", name: "ChaserPilot" });
    expect(body.to).toEqual([{ email: "owner@example.com" }]);
  });
  it("throws a readable error when the provider rejects the email", async () => {
    const f = vi.fn(async () => new Response("domain not verified", { status: 403 }));
    await expect(createResendMailer("k", "a@b.co", f as never).send(msg)).rejects.toThrow(/Resend rejected the email \(403\)/);
  });
  it("parses sender addresses", () => {
    expect(parseFrom("A B <a@b.co>")).toEqual({ name: "A B", email: "a@b.co" });
    expect(parseFrom("a@b.co")).toEqual({ name: null, email: "a@b.co" });
  });
});
