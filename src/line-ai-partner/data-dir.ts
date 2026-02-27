// Shared data directory for LINE AI Partner.
// Respects DATA_DIR env var (e.g. Fly.io volume at /data).

import { homedir } from "node:os";
import { join } from "node:path";

export function dataDir(): string {
  const envDir = process.env.DATA_DIR?.trim();
  return envDir ? join(envDir, "line-ai-partner") : join(homedir(), ".openclaw", "line-ai-partner");
}
