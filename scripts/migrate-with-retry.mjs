/**
 * `prisma migrate deploy`, retried while the database wakes up.
 *
 * Neon's free tier suspends idle databases; the first connection after a
 * suspend can take longer than Prisma's connect timeout and fails with P1001.
 * A few spaced retries let the container start instead of crash-looping.
 */
import { spawnSync } from "node:child_process";

const ATTEMPTS = 6;

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status === 0) process.exit(0);
  if (attempt === ATTEMPTS) break;
  const wait = attempt * 5;
  console.error(`migrate deploy failed (attempt ${attempt}/${ATTEMPTS}); retrying in ${wait}s`);
  await new Promise((resolve) => setTimeout(resolve, wait * 1000));
}
console.error("migrate deploy failed; check DATABASE_URL");
process.exit(1);
