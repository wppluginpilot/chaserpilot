/**
 * Shell for the public pages (landing, privacy, terms, help). These render outside the
 * Shopify admin, so they use plain HTML and scoped CSS rather than Polaris web
 * components, which only exist inside the admin frame.
 */
import type { ReactNode } from "react";

export const SUPPORT_EMAIL = "support@wppluginpilot.com";
export const DEVELOPER = "WP Plugin Pilot";
export const APP_STORE_URL = "https://apps.shopify.com/chaserpilot";

export function PublicPage({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="pw">
      <header className="pw__bar">
        <div className="pw__wrap pw__bar-inner">
          <a href="/" className="pw__brand" aria-label="ChaserPilot home">
            <picture>
              <source srcSet="/brand/logo-on-dark.svg" media="(prefers-color-scheme: dark)" />
              <img src="/brand/logo.svg" alt="ChaserPilot" width="115" height="32" />
            </picture>
          </a>
          <nav className="pw__nav" aria-label="Site">
            <a href="/docs">Docs</a>
            <a href="/support">Support</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </header>
      <main className={`pw__wrap ${narrow ? "pw__wrap--narrow" : ""}`}>{children}</main>
      <footer className="pw__foot">
        <div className="pw__wrap">
          © {new Date().getFullYear()} {DEVELOPER} · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> ·{" "}
          <a href="/privacy">Privacy policy</a> · <a href="/terms">Terms</a> · <a href="/docs">Docs</a> ·{" "}
          <a href="/support">Support</a>
        </div>
      </footer>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.pw {
  --pw-blue: #4F46E5; --pw-blue-2: #6366F1; --pw-ink: #1B1A3A; --pw-aqua: #E0E7FF; --pw-amber: #FB7185;
  --pw-bg: #F7F7FE; --pw-card: #FFFFFF; --pw-text: #1B1A3A; --pw-muted: #55557A; --pw-line: #E2E2F3;
  min-height: 100dvh; display: flex; flex-direction: column;
  background: var(--pw-bg); color: var(--pw-text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 16px; line-height: 1.6;
}
@media (prefers-color-scheme: dark) {
  .pw { --pw-bg: #0E0D26; --pw-card: #19183A; --pw-text: #ECECFB; --pw-muted: #A9A8D0; --pw-line: #2A2958; --pw-blue: #818CF8; }
}
.pw a { color: var(--pw-blue); }
.pw__wrap { width: 100%; max-width: 1040px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
.pw__wrap--narrow { max-width: 760px; }
.pw main { flex: 1; padding-top: 40px; padding-bottom: 64px; }
.pw__bar { border-bottom: 1px solid var(--pw-line); background: var(--pw-card); }
.pw__bar-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.pw__brand img { display: block; height: 32px; width: auto; }
.pw__nav { display: flex; gap: 20px; font-size: 15px; }
@media (max-width: 520px) { .pw__nav { gap: 12px; font-size: 14px; } .pw__nav a[href="/privacy"], .pw__nav a[href="/terms"] { display: none; } }
.pw__nav a { color: var(--pw-text); text-decoration: none; }
.pw__nav a:hover { color: var(--pw-blue); }
.pw__foot { border-top: 1px solid var(--pw-line); padding: 24px 0; font-size: 14px; color: var(--pw-muted); }
.pw h1 { font-size: clamp(30px, 5vw, 44px); line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 16px; color: var(--pw-text); }
.pw h2 { font-size: 22px; line-height: 1.3; margin: 40px 0 12px; }
.pw h3 { font-size: 17px; margin: 24px 0 6px; }
.pw p, .pw li { color: var(--pw-text); }
.pw .pw__muted { color: var(--pw-muted); }
.pw__lead { font-size: 19px; color: var(--pw-muted); max-width: 640px; margin: 0 0 28px; }
.pw__cta { display: inline-block; background: var(--pw-blue); color: #fff !important; font-weight: 600; text-decoration: none; padding: 12px 22px; border-radius: 10px; }
.pw__cta:hover { background: var(--pw-blue-2); }
.pw__cta:focus-visible { outline: 2px solid var(--pw-blue-2); outline-offset: 3px; }
.pw__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 40px; }
.pw__card { background: var(--pw-card); border: 1px solid var(--pw-line); border-radius: 14px; padding: 20px; }
.pw__card h3 { margin-top: 0; }
.pw__card p { margin: 0; color: var(--pw-muted); font-size: 15px; }
.pw__hero { padding: 24px 0 8px; }
.pw__pill { display: inline-block; font-size: 13px; font-weight: 600; color: var(--pw-blue); background: color-mix(in srgb, var(--pw-blue) 12%, transparent); padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
.pw__doc h2:first-of-type { margin-top: 32px; }
.pw__doc ul { padding-left: 22px; }
.pw__doc table { width: 100%; border-collapse: collapse; font-size: 15px; margin: 12px 0; }
.pw__doc th, .pw__doc td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--pw-line); }
.pw__doc th { font-weight: 600; }
.pw__table-scroll { overflow-x: auto; }
.pw details { background: var(--pw-card); border: 1px solid var(--pw-line); border-radius: 12px; padding: 14px 18px; margin: 10px 0; }
.pw summary { font-weight: 600; cursor: pointer; }
.pw details p { margin: 10px 0 0; }
`;
