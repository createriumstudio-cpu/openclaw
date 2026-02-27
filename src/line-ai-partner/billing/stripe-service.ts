// LINE AI Partner – Billing service (stub)
//
// Stripe実装は archive/stripe/stripe-service.ts に退避済み。
// Apple IAP / キャリア決済 / LINE Pay に移行予定。
// 新しい決済サービスは payment-service.ts を参照。
//
// このファイルは既存のインポートを壊さないためにシグネチャのみ維持。

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../data-dir.js";
import { type Plan, getPlanById } from "./plans.js";

// ---------------------------------------------------------------------------
// Types (maintained for backward compatibility)
// ---------------------------------------------------------------------------

export type Subscription = {
  id: string;
  customerId: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodEnd: string;
};

type BillingStore = {
  version: 1;
  customers: Record<string, string>;
  subscriptions: Record<string, Subscription>;
  userPlans: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Persistence (shared with payment-service.ts)
// ---------------------------------------------------------------------------

function storePath(): string {
  return join(dataDir(), "billing-store.json");
}

async function loadStore(): Promise<BillingStore> {
  try {
    const raw = await readFile(storePath(), "utf-8");
    return JSON.parse(raw) as BillingStore;
  } catch {
    return { version: 1, customers: {}, subscriptions: {}, userPlans: {} };
  }
}

async function saveStore(store: BillingStore): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Stub API (Apple IAP/キャリア決済に移行予定)
// ---------------------------------------------------------------------------

/** @deprecated Stripe removed. Use payment-service.ts instead. */
export async function createCustomer(_userId: string, _email: string): Promise<string> {
  throw new Error(
    "Stripe integration removed. Use payment-service.ts (Apple IAP/carrier billing).",
  );
}

/** @deprecated Stripe removed. Use payment-service.ts instead. */
export async function createSubscription(
  _customerId: string,
  _planId: string,
): Promise<Subscription> {
  throw new Error(
    "Stripe integration removed. Use payment-service.ts (Apple IAP/carrier billing).",
  );
}

/** @deprecated Stripe removed. Use payment-service.ts instead. */
export async function cancelSubscription(_subscriptionId: string): Promise<void> {
  throw new Error(
    "Stripe integration removed. Use payment-service.ts (Apple IAP/carrier billing).",
  );
}

/** @deprecated Stripe removed. Use payment-service.ts instead. */
export async function verifyWebhookSignature(
  _rawBody: string,
  _signatureHeader: string,
  _webhookSecret?: string,
  _toleranceSec?: number,
): Promise<{ valid: boolean; error?: string }> {
  return { valid: false, error: "Stripe integration removed. Use payment-service.ts." };
}

/** @deprecated Stripe removed. Use payment-service.ts instead. */
export async function handleWebhook(
  _event: { type: string; data: { object: Record<string, unknown> } },
  _opts?: { rawBody?: string; signatureHeader?: string; webhookSecret?: string },
): Promise<void> {
  throw new Error(
    "Stripe integration removed. Use payment-service.ts (Apple IAP/carrier billing).",
  );
}

/** Get the active plan for a user. Still functional (reads local billing store). */
export async function getActivePlan(userId: string): Promise<Plan> {
  const store = await loadStore();
  const planId = store.userPlans[userId] ?? "free";
  return getPlanById(planId);
}

/** Check if a user has access to a specific feature. Still functional. */
export async function hasFeature(userId: string, feature: string): Promise<boolean> {
  const plan = await getActivePlan(userId);
  return plan.features.includes(feature as Plan["features"][number]);
}

/**
 * Set a user's plan directly (used by payment-service.ts after receipt validation).
 */
export async function setUserPlan(userId: string, planId: string): Promise<void> {
  const store = await loadStore();
  store.userPlans[userId] = planId;
  await saveStore(store);
}
