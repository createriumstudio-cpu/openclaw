// Lightweight console logger for standalone deployment.
// Mirrors the SubsystemLogger interface from src/logging/subsystem.ts
// so that line-ai-partner modules can run without the full logging stack.

export type StandaloneLogger = {
  subsystem: string;
  trace: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  child: (name: string) => StandaloneLogger;
};

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }
  return " " + JSON.stringify(meta);
}

export function createStandaloneLogger(subsystem: string): StandaloneLogger {
  const prefix = `[${subsystem}]`;
  return {
    subsystem,
    trace: (msg, meta) => console.debug(`${prefix} ${msg}${formatMeta(meta)}`),
    debug: (msg, meta) => console.debug(`${prefix} ${msg}${formatMeta(meta)}`),
    info: (msg, meta) => console.log(`${prefix} ${msg}${formatMeta(meta)}`),
    warn: (msg, meta) => console.warn(`${prefix} ${msg}${formatMeta(meta)}`),
    error: (msg, meta) => console.error(`${prefix} ${msg}${formatMeta(meta)}`),
    child: (name) => createStandaloneLogger(`${subsystem}:${name}`),
  };
}
