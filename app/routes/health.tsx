/**
 * /health — process liveness only. Render's health checks and the cPanel
 * keep-awake cron both hit this every few minutes, so it deliberately does not
 * touch the database: a query here would keep Neon's compute from ever
 * suspending and burn the free plan's compute hours. A broken DATABASE_URL
 * still fails the deploy, because `prisma migrate deploy` runs before start.
 */
export const loader = async () => {
  return Response.json(
    { status: "ok", release: (process.env.RENDER_GIT_COMMIT ?? "").slice(0, 7) || null, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
};
