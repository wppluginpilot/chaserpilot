/* global Headers, Response */
/**
 * CORS for the /ext endpoints called by the admin UI extensions.
 * Extensions run on extensions.shopifycdn.com, so every call is cross-origin.
 * Because the Authorization header is sent, the browser first makes an OPTIONS
 * preflight; React Router resource routes do not answer OPTIONS, so Express
 * answers it here, before the router. Authentication is a bearer session token
 * (no cookies), so a wildcard origin is safe.
 */
export const EXT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Express middleware: CORS headers on every /ext response, 204 for preflight. */
export function extCors(req, res, next) {
  for (const [k, v] of Object.entries(EXT_CORS_HEADERS)) res.setHeader(k, v);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
}

/** Copy of a Response with the CORS headers added (works on thrown 401/410 responses too). */
export function withExtCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(EXT_CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
