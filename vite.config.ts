import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// The Shopify CLI passes HOST; Vite treats HOST as its own bind address, which breaks
// the dev server. Normalise it into SHOPIFY_APP_URL before Vite reads its config.
// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname;

const hmrConfig =
  host === "localhost"
    ? { protocol: "ws", host: "localhost", port: 64999, clientPort: 64999 }
    : {
        protocol: "wss",
        host,
        port: Number(process.env.FRONTEND_PORT) || 8002,
        clientPort: 443,
      };

export default defineConfig({
  server: {
    allowedHosts: [host],
    cors: { preflightContinue: true },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: { allow: ["app", "server", "node_modules"] },
  },
  plugins: [reactRouter(), tsconfigPaths()],
  build: {
    // Shopify serves app assets from a CDN that does not rewrite inlined data URIs.
    assetsInlineLimit: 0,
    // Deliberately off. React Router bundles the server with the client build, so
    // production source maps would publish the server source — including the shape
    // of every query — to anyone who opens devtools.
    sourcemap: false,
  },
  ssr: {
    // These are CommonJS/Node-only and must not be pre-bundled into the SSR graph.
    noExternal: [],
    external: ["@prisma/client"],
  },
  optimizeDeps: {
    include: ["@shopify/app-bridge-react"],
  },
}) satisfies UserConfig;
