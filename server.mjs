/**
 * Production HTTP server.
 *
 * Replaces `react-router-serve` for one reason: behind Render's (or any) TLS
 * proxy the app is reached over http internally, so without `trust proxy` every
 * request URL is http:// while the browser's Origin header is https://. React
 * Router's CSRF guard then rejects every form submission with 400 Bad Request.
 * Trusting X-Forwarded-Proto/Host makes request.url match what the browser used.
 */
import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";

import { extCors } from "./ext-cors.mjs";

const build = await import("./build/server/index.js");
const app = express();

app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(compression());

// Fingerprinted assets can be cached forever; everything else briefly.
app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
app.use(express.static("build/client", { maxAge: "1h" }));

// Access log, minus the health check Render polls every few seconds and minus
// query strings, which carry Shopify's signed parameters.
morgan.token("path", (req) => req.originalUrl.split("?")[0]);
app.use(
  morgan(":method :path :status :response-time ms", {
    skip: (req) => req.path === "/health",
  }),
);

// Admin-extension API: CORS + preflight before the router.
app.use("/ext", extCors);

app.use(createRequestHandler({ build, mode: process.env.NODE_ENV }));

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => {
  console.log(JSON.stringify({ level: "info", msg: "server listening", port }));
});

// Let in-flight requests finish when the platform stops the instance.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
