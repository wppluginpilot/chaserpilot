import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { toExtErrorResponse, extRoute } from "../../app/lib/ext.server";
import { EXT_CORS_HEADERS, extCors, withExtCors } from "../../ext-cors.mjs";
import { createApi, taskUrl, tasksUrl, TEMPLATES_URL } from "../../extensions/chaserpilot-add-followup/src/api.js";

const root = path.resolve(__dirname, "../..");
const dirs = ["chaserpilot-add-followup", "chaserpilot-add-followup-customer", "chaserpilot-followups-block", "chaserpilot-followups-block-customer"];

describe("CORS on /ext responses", () => {
  it("adds the headers to 401, 410 and 500 style responses, with merchant-readable JSON", async () => {
    for (const status of [401, 410]) {
      const res = toExtErrorResponse(new Response("Unauthorized", { status }));
      expect(res.status).toBe(status);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/\w+ \w+/);
    }
    const boom = toExtErrorResponse(new Error("db down"));
    expect(boom.status).toBe(500);
    expect(boom.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("extRoute adds CORS on success and converts thrown errors", async () => {
    const ok = await extRoute(async () => Response.json({ ok: true }));
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const thrown = await extRoute(async () => {
      throw new Response("nope", { status: 401 });
    });
    expect(thrown.status).toBe(401);
    expect(thrown.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("withExtCors keeps status and body", async () => {
    const res = withExtCors(Response.json({ a: 1 }, { status: 400 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("the Express middleware answers OPTIONS preflight with 204 and passes other methods on", () => {
    const set: Record<string, string> = {};
    const res = { statusCode: 0, setHeader: (k: string, v: string) => (set[k] = v), end: vi.fn() };
    const next = vi.fn();
    extCors({ method: "OPTIONS" }, res, next);
    expect(res.statusCode).toBe(204);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(set["Access-Control-Allow-Headers"]).toBe(EXT_CORS_HEADERS["Access-Control-Allow-Headers"]);
    extCors({ method: "GET" }, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("server.mjs mounts the middleware before the router", () => {
    const s = readFileSync(path.join(root, "server.mjs"), "utf8");
    expect(s.indexOf('app.use("/ext", extCors)')).toBeGreaterThan(0);
    expect(s.indexOf('app.use("/ext", extCors)')).toBeLessThan(s.indexOf("createRequestHandler({"));
    expect(readFileSync(path.join(root, "Dockerfile"), "utf8")).toContain("ext-cors.mjs");
  });
});

describe("extension fetch helper", () => {
  it("builds relative /ext URLs with an encoded subject", () => {
    expect(tasksUrl("gid://shopify/Order/1?x=1&y")).toBe("/ext/tasks?subject=gid%3A%2F%2Fshopify%2FOrder%2F1%3Fx%3D1%26y");
    expect(TEMPLATES_URL).toBe("/ext/templates");
    expect(taskUrl("a/b")).toBe("/ext/tasks/a%2Fb");
  });

  it("sends the session token as a Bearer header", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, x: 1 })));
    const api = createApi({ fetchFn, getToken: async () => "tok" });
    const res = await api("/ext/templates", { method: "POST", headers: { "Content-Type": "application/json" } });
    expect(res).toMatchObject({ ok: true, status: 200 });
    const [, opts] = fetchFn.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(opts.headers.Authorization).toBe("Bearer tok");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("never throws: network failure, 401 and non-JSON bodies give readable errors", async () => {
    const down = createApi({ fetchFn: async () => Promise.reject(new TypeError("Failed to fetch")), getToken: async () => "t" });
    const r1 = await down("/x");
    expect(r1.ok).toBe(false);
    expect(r1.body.error).toMatch(/couldn't be reached/);
    const unauth = createApi({ fetchFn: async () => new Response("no", { status: 401 }), getToken: async () => "t" });
    expect((await unauth("/x")).body.error).toMatch(/session expired/);
    const noToken = createApi({ fetchFn: async () => new Response("{}"), getToken: async () => Promise.reject(new Error("x")) });
    expect((await noToken("/x")).ok).toBe(true);
  });

  it("times out instead of spinning forever", async () => {
    const hang = createApi({ fetchFn: () => new Promise(() => {}), getToken: async () => "t", timeoutMs: 20 });
    const res = await hang("/x");
    expect(res.ok).toBe(false);
    expect(res.body.error).toMatch(/too long/);
  });

  it("keeps the four extension copies identical, and every effect clears loading in a finally", () => {
    const base = readFileSync(path.join(root, "extensions", dirs[0]!, "src/api.js"), "utf8");
    for (const d of dirs) expect(readFileSync(path.join(root, "extensions", d, "src/api.js"), "utf8")).toBe(base);
    for (const d of dirs) {
      const file = d.includes("followups-block") ? "BlockExtension.jsx" : "ActionExtension.jsx";
      const src = readFileSync(path.join(root, "extensions", d, "src", file), "utf8");
      expect(src).toContain('from "./api"');
      expect(src).not.toMatch(/\bfetch\(/);
      if (file === "ActionExtension.jsx") expect(src).toMatch(/finally \{\s*if \(alive\) setLoading\(false\)/);
    }
  });
});
