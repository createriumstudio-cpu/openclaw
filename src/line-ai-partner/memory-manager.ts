// LINE AI Partner – Per-user memory manager
//
// Uses OpenClaw's logging infrastructure and storage conventions.
// Profile data is stored under ~/.openclaw/line-ai-partner/profiles/.
// Conversation memory is key/value stored under ~/.openclaw/line-ai-partner/memory/<userId>/.
// For semantic search over conversation history, delegates to OpenClaw's
// MemoryIndexManager when available.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "./data-dir.js";
import { createStandaloneLogger } from "./standalone-logger.js";
import type { UserProfile } from "./types.js";

const log = createStandaloneLogger("line-ai-partner");

// Inlined from ../memory/types.ts to avoid deep parent dependency chain
type MemorySearchResult = {
  path: string;
  startLine: number;
  endLine: number;
  score: number;
  snippet: string;
  source: "memory" | "sessions";
  citation?: string;
};

// ---------------------------------------------------------------------------
// Storage paths
// ---------------------------------------------------------------------------

function profileDir(): string {
  return join(dataDir(), "profiles");
}

function memoryDir(userId: string): string {
  return join(dataDir(), "memory", userId);
}

// ---------------------------------------------------------------------------
// Profile persistence
// ---------------------------------------------------------------------------

/** Load a user profile from disk. Returns `null` when not found. */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const raw = await readFile(join(profileDir(), `${userId}.json`), "utf-8");
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/** Persist a user profile to disk. */
export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  const dir = profileDir();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${userId}.json`), JSON.stringify(profile, null, 2), "utf-8");
  log.info(`saved profile for user ${userId}`);
}

// ---------------------------------------------------------------------------
// Generic conversation memory (key/value)
// ---------------------------------------------------------------------------

/** Retrieve a single memory entry for a user. */
export async function getConversationMemory(userId: string, key: string): Promise<string | null> {
  try {
    return await readFile(join(memoryDir(userId), `${key}.txt`), "utf-8");
  } catch {
    return null;
  }
}

/** Store a single memory entry for a user. */
export async function saveConversationMemory(
  userId: string,
  key: string,
  value: string,
): Promise<void> {
  const dir = memoryDir(userId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${key}.txt`), value, "utf-8");
  log.debug(`saved memory key="${key}" for user ${userId}`);
}

// ---------------------------------------------------------------------------
// Semantic search via OpenClaw's MemoryIndexManager
// ---------------------------------------------------------------------------

/**
 * Search conversation memory using OpenClaw's vector/hybrid search.
 * Falls back to empty results when the memory system is unavailable.
 */
export async function searchConversationMemory(
  query: string,
  opts?: { maxResults?: number; minScore?: number },
): Promise<MemorySearchResult[]> {
  try {
    // Lazy-import to avoid circular dependency and allow the memory system
    // to remain optional (it requires embedding providers to be configured).
    const { MemoryIndexManager } = await import("../memory/manager.js");
    const { loadConfig } = await import("../config/io.js");
    const cfg = loadConfig();

    const manager = await MemoryIndexManager.get({
      cfg,
      agentId: "line-ai-partner",
    });
    if (!manager) {
      log.debug("memory search: MemoryIndexManager not available");
      return [];
    }

    return await manager.search(query, {
      maxResults: opts?.maxResults ?? 5,
      minScore: opts?.minScore ?? 0.3,
    });
  } catch (err) {
    log.warn(`memory search failed: ${String(err)}`);
    return [];
  }
}
