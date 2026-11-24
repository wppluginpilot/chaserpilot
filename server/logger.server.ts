/**
 * Structured JSON logging to stdout, which is what Render collects.
 * No dependency: one line per event, machine-parseable, never a stack trace in
 * a response body.
 */
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? "info") as Level;
  return ORDER[configured] ?? ORDER.info;
}

function serialise(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function write(level: Level, fields: Record<string, unknown>, message: string) {
  if (ORDER[level] < threshold()) return;
  const entry: Record<string, unknown> = { level, time: new Date().toISOString(), msg: message };
  for (const [key, value] of Object.entries(fields)) entry[key] = serialise(value);
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") console.error(line);
  // eslint-disable-next-line no-console
  else console.log(line);
}

const logger = {
  debug: (fields: Record<string, unknown>, message: string) => write("debug", fields, message),
  info: (fields: Record<string, unknown>, message: string) => write("info", fields, message),
  warn: (fields: Record<string, unknown>, message: string) => write("warn", fields, message),
  error: (fields: Record<string, unknown>, message: string) => write("error", fields, message),
};

export function log() {
  return logger;
}
