/**
 * Authentication for the /ext endpoints. Wraps a handler so that every
 * failure (401 bad/expired token, 410 app needs reinstall, 500) still carries
 * CORS headers and a merchant-readable JSON body. Without them the browser
 * hides the real status and the extension just spins.
 */
import { withExtCors } from "../../ext-cors.mjs";

export function extJson(body: Record<string, unknown>, status = 200): Response {
  return withExtCors(Response.json(body, { status }));
}

const MESSAGES: Record<number, string> = {
  401: "Your session expired. Reload the page and try again.",
  410: "ChaserPilot needs to be reopened from Apps in your admin before it can load follow-ups.",
};

/** Turn anything thrown while authenticating into a CORS-carrying Response. */
export function toExtErrorResponse(err: unknown): Response {
  if (err instanceof Response) {
    const type = err.headers.get("content-type") ?? "";
    if (err.status >= 300 && err.status < 400) return withExtCors(err);
    if (type.includes("application/json")) return withExtCors(err);
    return extJson(
      {
        ok: false,
        error: MESSAGES[err.status] ?? "Something went wrong. Please try again.",
      },
      err.status,
    );
  }
  console.error(
    JSON.stringify({
      level: "error",
      msg: "ext route failed",
      error: err instanceof Error ? err.message : String(err),
    }),
  );
  return extJson({ ok: false, error: "Something went wrong on our side. Please try again." }, 500);
}

/** Run a handler; anything thrown becomes a CORS-carrying error response. */
export async function extRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return withExtCors(await fn());
  } catch (err) {
    return toExtErrorResponse(err);
  }
}
