// LINE AI Partner – Per-user cron job manager
//
// Provides:
//   - Persistence layer for reminders and morning greetings
//   - setInterval-based execution engine that checks reminders every minute
//   - pushMorningGreeting integration via a callback

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Reminder = {
  id: string;
  userId: string;
  cronExpression: string;
  message: string;
  createdAt: string;
};

type CronStore = {
  version: 1;
  reminders: Record<string, Reminder[]>;
  morningGreetings: Record<string, string>; // userId → wakeTime (HH:MM)
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function storePath(): string {
  return join(homedir(), ".openclaw", "line-ai-partner", "cron-store.json");
}

async function loadStore(): Promise<CronStore> {
  try {
    const raw = await readFile(storePath(), "utf-8");
    return JSON.parse(raw) as CronStore;
  } catch {
    return { version: 1, reminders: {}, morningGreetings: {} };
  }
}

async function saveStore(store: CronStore): Promise<void> {
  const dir = join(homedir(), ".openclaw", "line-ai-partner");
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Morning greeting
// ---------------------------------------------------------------------------

/**
 * Register a daily morning greeting + report for a user.
 * @param wakeTime HH:MM format (e.g. "07:00")
 */
export async function registerMorningGreeting(userId: string, wakeTime: string): Promise<void> {
  const store = await loadStore();
  store.morningGreetings[userId] = wakeTime;
  await saveStore(store);
}

/** Get the registered wake time for a user. */
export async function getMorningGreetingTime(userId: string): Promise<string | null> {
  const store = await loadStore();
  return store.morningGreetings[userId] ?? null;
}

// ---------------------------------------------------------------------------
// Custom reminders
// ---------------------------------------------------------------------------

/** Register a custom reminder for a user. Returns the reminder id. */
export async function registerReminder(
  userId: string,
  cronExpression: string,
  message: string,
): Promise<string> {
  const store = await loadStore();
  const reminder: Reminder = {
    id: randomUUID(),
    userId,
    cronExpression,
    message,
    createdAt: new Date().toISOString(),
  };
  const list = store.reminders[userId] ?? [];
  list.push(reminder);
  store.reminders[userId] = list;
  await saveStore(store);
  return reminder.id;
}

/** Cancel a reminder by id. */
export async function cancelReminder(userId: string, reminderId: string): Promise<boolean> {
  const store = await loadStore();
  const list = store.reminders[userId];
  if (!list) {
    return false;
  }

  const idx = list.findIndex((r) => r.id === reminderId);
  if (idx === -1) {
    return false;
  }

  list.splice(idx, 1);
  store.reminders[userId] = list;
  await saveStore(store);
  return true;
}

/** List all reminders for a user. */
export async function listReminders(userId: string): Promise<Reminder[]> {
  const store = await loadStore();
  return store.reminders[userId] ?? [];
}

// ---------------------------------------------------------------------------
// Execution engine (setInterval-based, checks every 60s)
// ---------------------------------------------------------------------------

export type CronCallbacks = {
  /** Called when a morning greeting should fire for a user. */
  onMorningGreeting: (userId: string, hhmm: string) => Promise<void>;
  /** Called when a custom reminder fires. */
  onReminder: (userId: string, message: string) => Promise<void>;
};

let cronTimer: ReturnType<typeof setInterval> | null = null;
let cronCallbacks: CronCallbacks | null = null;

/** Parse a simple cron expression "MM HH * * *" and test against current time. */
function matchesCronNow(cronExpression: string, now: Date): boolean {
  const parts = cronExpression.split(/\s+/);
  if (parts.length < 5) {
    return false;
  }
  const [cronMin, cronHour] = parts;
  const nowMin = now.getMinutes();
  const nowHour = now.getHours();
  if (cronMin !== "*" && Number(cronMin) !== nowMin) {
    return false;
  }
  if (cronHour !== "*" && Number(cronHour) !== nowHour) {
    return false;
  }
  return true;
}

/** Format current time as HH:MM. */
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * The tick function that runs every minute.
 * Checks all morning greetings and reminders, fires callbacks as needed.
 */
async function cronTick(): Promise<void> {
  if (!cronCallbacks) {
    return;
  }
  const store = await loadStore();
  const hhmm = nowHHMM();
  const now = new Date();

  // Morning greetings
  for (const [userId, wakeTime] of Object.entries(store.morningGreetings)) {
    if (wakeTime === hhmm) {
      try {
        await cronCallbacks.onMorningGreeting(userId, hhmm);
      } catch {
        // Silently continue on failure
      }
    }
  }

  // Custom reminders
  for (const [userId, reminders] of Object.entries(store.reminders)) {
    for (const reminder of reminders) {
      if (matchesCronNow(reminder.cronExpression, now)) {
        try {
          await cronCallbacks.onReminder(userId, reminder.message);
        } catch {
          // Silently continue on failure
        }
      }
    }
  }
}

/**
 * Start the cron execution engine. Fires once per minute.
 * Call this on gateway startup; call `stopCronEngine()` on shutdown.
 */
export function startCronEngine(callbacks: CronCallbacks): void {
  if (cronTimer) {
    clearInterval(cronTimer);
  }
  cronCallbacks = callbacks;
  // Run the first tick immediately, then every 60 seconds
  void cronTick();
  cronTimer = setInterval(() => void cronTick(), 60_000);
}

/** Stop the cron execution engine. */
export function stopCronEngine(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
  cronCallbacks = null;
}
