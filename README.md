# ChaserPilot: Area & Tile Calculator

Shopify app by WP Plugin Pilot. Shoppers enter room sizes on the product page and get the exact boxes, rolls, cans or bags added to the cart. No AI: detection is regular expressions, the maths is deterministic.

## Stack
React Router 7 + `@shopify/shopify-app-react-router`, Polaris web components, App Bridge, Prisma + Postgres, vitest, Docker on Render (free) with Neon (free). Theme app extension with two blocks (`calculator`, `price-per-area`); storefront JS built with esbuild from `storefront/` and the shared domain module in `server/domain/`.

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
npm run verify          # typecheck + tests (unit + integration on the dev Postgres) + build
npm run build:storefront
shopify app build       # also runs theme check on the theme app extension
```

## Layout
- `server/domain/` pure logic shared by admin, server and storefront: units, calculator core (`calc-core.ts`), cheapest-mix optimizer, wallpaper strip method, coverage detection, metafield JSON, CSV.
- `server/services/` sync, suggestions, setup/bulk, publishing (metafieldsSet ≤ 25 per call), settings, analytics, CSV import/export, billing, jobs.
- `server/shopify/admin.server.ts` every Admin GraphQL operation (validated against 2026-07).
- `app/routes/` admin pages (`app.*`), app proxy (`proxy.*`), webhooks, public pages.
- `extensions/chaserpilot-storefront/` theme app extension (blocks, snippet, assets, locales en/fr/de/es).
- `brand/generate.mjs` icon, logos, favicons, social card. `brand/listing/listing-copy.md` App Store copy.

## Billing
One plan, ChaserPilot Monthly, $12.95 / 30 days, 14-day trial. `billing.check` always uses `isTest: true` (review stores' charges are test charges); `billing.request` uses `isTest` = development store. No plan → `/app/plan`.

## Deploy
`render.yaml` (free, Ohio, `/health` without DB). Set `DATABASE_URL` (Neon direct URL, `sslmode=require`), `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`. Then `shopify app config link` and `npm run deploy`.
