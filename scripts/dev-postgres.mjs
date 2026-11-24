/**
 * Private PostgreSQL cluster for local development (`npm run dev:db`).
 *
 * ChaserPilot targets real PostgreSQL in every environment — there is no SQLite
 * fallback, because the schema relies on Postgres-specific behaviour (partial
 * unique indexes, `citext`-style case-insensitive lookups via generated columns,
 * `SELECT ... FOR UPDATE` row locking in the receiving transaction, and pg-boss
 * for the job queue). Developing against SQLite would hide all of that.
 *
 * This script runs a throwaway cluster in ./.devpg using the PostgreSQL binaries
 * already installed on the machine, bound to 127.0.0.1 only, with trust auth.
 * It is never used in production: production points DATABASE_URL at a managed
 * PostgreSQL instance (see DEPLOYMENT.md).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.DEV_PG_PORT ?? 5438);
const dataDir = path.resolve(process.env.DEV_PG_DIR ?? ".devpg");
const superuser = process.env.DEV_PG_USER ?? "chaserpilot";
const database = process.env.DEV_PG_DATABASE ?? "chaserpilot";
const isWindows = process.platform === "win32";

const bin = process.env.PG_BIN ?? findPgBin();
const exe = (name) => path.join(bin, isWindows ? `${name}.exe` : name);

function findPgBin() {
  const candidates = [];
  for (const v of ["18", "17", "16", "15"]) {
    candidates.push(
      `C:/Program Files/PostgreSQL/${v}/bin`,
      `/usr/lib/postgresql/${v}/bin`,
      `/opt/homebrew/opt/postgresql@${v}/bin`,
      `/usr/local/opt/postgresql@${v}/bin`,
    );
  }
  const found = candidates.find((dir) =>
    existsSync(path.join(dir, isWindows ? "postgres.exe" : "postgres")),
  );
  if (!found) {
    console.error(
      [
        "PostgreSQL binaries were not found.",
        "",
        "Either install PostgreSQL 15+ and re-run, set PG_BIN to its bin directory,",
        "or point DATABASE_URL at an existing PostgreSQL server and skip `npm run dev:db`.",
      ].join("\n"),
    );
    process.exit(1);
  }
  return found;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  mkdirSync(dataDir, { recursive: true });
  console.log(`initialising dev cluster in ${dataDir}`);
  const status = run(exe("initdb"), [
    "-D",
    dataDir,
    "-U",
    superuser,
    "--auth=trust",
    "-E",
    "UTF8",
    "--no-locale",
  ]);
  if (status !== 0) process.exit(status);
  writeFileSync(
    path.join(dataDir, "postgresql.auto.conf"),
    `listen_addresses = '127.0.0.1'\nport = ${port}\nfsync = off\nsynchronous_commit = off\nfull_page_writes = off\n`,
  );
}

const pg = spawn(
  exe("postgres"),
  ["-D", dataDir, "-p", String(port), "-h", "127.0.0.1"],
  {
    stdio: ["ignore", "inherit", "inherit"],
  },
);

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  // A clean stop matters: an unclean kill leaves the cluster needing recovery on
  // next start, which shows up later as confusing "database is starting up" errors.
  run(exe("pg_ctl"), ["-D", dataDir, "-m", "fast", "stop"], { stdio: "ignore" });
  pg.kill(signal);
};

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => shutdown(signal));
}
process.on("exit", () => shutdown("SIGTERM"));

pg.on("exit", (code) => {
  if (!shuttingDown) process.exit(code ?? 0);
});

// Wait for readiness, then make sure the application database exists.
await waitForReady();
ensureDatabase();

console.log("");
console.log(`  PostgreSQL ready on 127.0.0.1:${port}`);
console.log(
  `  DATABASE_URL="postgresql://${superuser}@127.0.0.1:${port}/${database}?schema=public"`,
);
console.log("");

async function waitForReady() {
  const deadline = Date.now() + 30_000;
  for (;;) {
    const probe = spawnSync(exe("pg_isready"), ["-h", "127.0.0.1", "-p", String(port)], {
      stdio: "ignore",
    });
    if (probe.status === 0) return;
    if (Date.now() > deadline) {
      console.error("PostgreSQL did not become ready within 30s.");
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function ensureDatabase() {
  const exists = spawnSync(
    exe("psql"),
    [
      "-h",
      "127.0.0.1",
      "-p",
      String(port),
      "-U",
      superuser,
      "-d",
      "postgres",
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname = '${database}'`,
    ],
    { encoding: "utf8" },
  );
  if (exists.stdout?.trim() === "1") return;
  console.log(`creating database ${database}`);
  run(exe("createdb"), [
    "-h",
    "127.0.0.1",
    "-p",
    String(port),
    "-U",
    superuser,
    database,
  ]);
}
