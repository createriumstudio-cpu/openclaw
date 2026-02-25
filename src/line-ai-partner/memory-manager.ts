// LINE AI Partner – Per-user memory manager
//
// Wraps OpenClaw's built-in memory primitives to provide a simple
// key/value store scoped per LINE user.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { UserProfile } from "./types.js";

// ---------------------------------------------------------------------------
// Storage paths
// ---------------------------------------------------------------------------

function baseDir(): string {
  return join(homedir(), ".openclaw", "line-ai-partner");
}

function profileDir(): string {
  return join(baseDir(), "profiles");
}

function memoryDir(userId: string): string {
  return join(baseDir(), "memory", userId);
}

// ---------------------------------------------------------------------------
// Profile persistence
// ---------------------------------------------------------------------------

/** Load a user profile from disk. Returns `null` when not found. */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  try {
    const raw = await readFile(
      join(profileDir(), `${userId}.json`),
      "utf-8",
    );
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/** Persist a user profile to disk. */
export async function saveUserProfile(
  userId: string,
  profile: UserProfile,
): Promise<void> {
  const dir = profileDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${userId}.json`),
    JSON.stringify(profile, null, 2),
    "utf-8",
  );
}

// ---------------------------------------------------------------------------
// Generic conversation memory (key/value)
// ---------------------------------------------------------------------------

/** Retrieve a single memory entry for a user. */
export async function getConversationMemory(
  userId: string,
  key: string,
): Promise<string | null> {
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
}
