// LINE AI Partner – Usage tracking & rate limiting
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../data-dir.js";
import { getActivePlan } from "./stripe-service.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UsageStats = {
  userId: string;
  messageCount: number;
  messageLimit: number;
  periodStart: string;
  periodEnd: string;
  remaining: number;
  isLimited: boolean;
};

type UsageStore = {
  version: 1;
  usage: Record<string, { count: number; periodStart: string }>;
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function storePath(): string {
  return join(dataDir(), "usage-store.json");
}

async function loadStore(): Promise<UsageStore> {
  try {
    const raw = await readFile(storePath(), "utf-8");
    return JSON.parse(raw) as UsageStore;
  } catch {
    return { version: 1, usage: {} };
  }
}

async function saveStore(store: UsageStore): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function currentPeriodEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track a message and check if the user is within their plan limit.
 * Returns `true` if the message is allowed, `false` if limit exceeded.
 */
export async function trackMessage(userId: string): Promise<boolean> {
  const plan = await getActivePlan(userId);
  const store = await loadStore();
  const period = currentPeriodStart();

  let entry = store.usage[userId];
  if (!entry || entry.periodStart !== period) {
    entry = { count: 0, periodStart: period };
  }

  // Unlimited plan (messageLimit === 0)
  if (plan.messageLimit === 0) {
    entry.count++;
    store.usage[userId] = entry;
    await saveStore(store);
    return true;
  }

  if (entry.count >= plan.messageLimit) {
    return false;
  }

  entry.count++;
  store.usage[userId] = entry;
  await saveStore(store);
  return true;
}

/** Get usage statistics for a user. */
export async function getUsage(userId: string): Promise<UsageStats> {
  const plan = await getActivePlan(userId);
  const store = await loadStore();
  const period = currentPeriodStart();

  const entry = store.usage[userId];
  const count = entry?.periodStart === period ? entry.count : 0;
  const limit = plan.messageLimit;
  const remaining = limit === 0 ? -1 : Math.max(0, limit - count);

  return {
    userId,
    messageCount: count,
    messageLimit: limit,
    periodStart: period,
    periodEnd: currentPeriodEnd(),
    remaining,
    isLimited: limit > 0 && count >= limit,
  };
}

/** Reset all usage counters (for monthly cron job). */
export async function resetMonthlyUsage(): Promise<void> {
  const store = await loadStore();
  store.usage = {};
  await saveStore(store);
}
