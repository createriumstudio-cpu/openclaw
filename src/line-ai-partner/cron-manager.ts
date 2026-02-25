// LINE AI Partner – Per-user cron job manager
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

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
export async function registerMorningGreeting(
  userId: string,
  wakeTime: string,
): Promise<void> {
  const store = await loadStore();
  store.morningGreetings[userId] = wakeTime;
  await saveStore(store);
}

/** Get the registered wake time for a user. */
export async function getMorningGreetingTime(
  userId: string,
): Promise<string | null> {
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
export async function cancelReminder(
  userId: string,
  reminderId: string,
): Promise<boolean> {
  const store = await loadStore();
  const list = store.reminders[userId];
  if (!list) return false;

  const idx = list.findIndex((r) => r.id === reminderId);
  if (idx === -1) return false;

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
