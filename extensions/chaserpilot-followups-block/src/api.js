/**
 * Backend calls for the admin extensions. Identical in all four extensions
 * (a test enforces it). Relative paths resolve against the app's application_url
 * (documented), the Bearer session token is sent explicitly via auth.idToken(),
 * every call has a timeout, and api() NEVER throws: callers always get
 * { ok, status, body } with a merchant-readable body.error on failure.
 */
export const REQUEST_TIMEOUT_MS = 15000;

export const tasksUrl = (subjectGid) => `/ext/tasks?subject=${encodeURIComponent(subjectGid)}`;
export const TEMPLATES_URL = "/ext/templates";
export const taskUrl = (id) => `/ext/tasks/${encodeURIComponent(id)}`;

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Build an api() function from injectable dependencies (so it can be unit tested). */
export function createApi({ fetchFn, getToken, timeoutMs = REQUEST_TIMEOUT_MS }) {
  return async function api(path, options = {}) {
    try {
      let token = "";
      try {
        token = (await withTimeout(Promise.resolve(getToken()), timeoutMs, "token timeout")) ?? "";
      } catch {
        token = "";
      }
      const headers = { ...(options.headers ?? {}) };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await withTimeout(fetchFn(path, { ...options, headers }), timeoutMs, "timeout");
      const body = (await withTimeout(res.json(), timeoutMs, "timeout").catch(() => null)) ?? {};
      const ok = res.ok && body.ok !== false;
      if (!ok && !body.error) {
        body.error = res.status === 401 ? "Your session expired. Reload the page and try again." : "ChaserPilot couldn't be reached. Please try again.";
      }
      return { ok, status: res.status, body };
    } catch (err) {
      const timedOut = err instanceof Error && /timeout/.test(err.message);
      return {
        ok: false,
        status: 0,
        body: {
          ok: false,
          error: timedOut
            ? "ChaserPilot took too long to answer. Please try again."
            : "ChaserPilot couldn't be reached. Check your connection and try again.",
        },
      };
    }
  };
}

export const api = (path, options) => createApi({ fetchFn: (p, o) => fetch(p, o), getToken: () => shopify.auth.idToken() })(path, options);
