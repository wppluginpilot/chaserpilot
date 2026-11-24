# ChaserPilot: Follow-up Tasks

Shopify app by WP Plugin Pilot. Add a follow-up to any order or customer from the Shopify admin and work one due-today queue. Plain deterministic logic: no AI.

## Stack
React Router 7 + `@shopify/shopify-app-react-router`, Polaris web components, App Bridge, Prisma + Postgres, vitest, Docker on Render (free) with Neon (free). Two admin UI extensions (Add follow-up action, Follow-ups block) on the order and customer pages. No storefront code.

## Local development
```bash
npm install
npm run dev:db          # private Postgres on 127.0.0.1:5438 (Ctrl-C to stop cleanly)
cp .env.example .env
npx prisma migrate deploy
npm run dev             # shopify app dev
```

## Checks
```bash
npm run verify          # typecheck + lint + tests (unit + integration on the dev Postgres) + build
```

## Layout
- `server/domain/` pure logic: dates, recurrence, validation (CSV escaping), limits, digest + unsubscribe token.
- `server/services/` tasks, templates, settings, digest, mailer, billing, jobs, compliance.
- `server/shopify/admin.server.ts` every Admin GraphQL operation (API 2026-07).
- `app/routes/` admin pages (`app.*`), extension endpoints (`ext.*`), webhooks, public pages.
- `extensions/` the action and block admin UI extensions.

## Billing
Two plans. Free: 25 open follow-ups, no subscription. Paid: "ChaserPilot Monthly", $9.95 every 30 days, no trial. `billing.check` always uses `isTest: true`; the subscription is created by `appSubscriptionCreate` inside the plan action (test = development store). A store with no plan goes to `/app/plan`.

## Deploy
`render.yaml` (free, Ohio, `/health` without DB). Set `DATABASE_URL` (Neon direct URL, `sslmode=require`), `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, and optionally `MAIL_PROVIDER`/`MAIL_API_KEY`/`MAIL_FROM`. Then `shopify app config link` and `npm run deploy`.
