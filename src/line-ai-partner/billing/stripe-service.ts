// LINE AI Partner – Stripe billing integration
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { type Plan, getPlanById, FREE_PLAN } from "./plans.js";

// ---------------------------------------------------------------------------
// Types
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
  customers: Record<string, string>; // userId → customerId
  subscriptions: Record<string, Subscription>; // subscriptionId → Subscription
  userPlans: Record<string, string>; // userId → planId
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function storePath(): string {
  return join(homedir(), ".openclaw", "line-ai-partner", "billing-store.json");
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
  const dir = join(homedir(), ".openclaw", "line-ai-partner");
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Stripe API helpers
// ---------------------------------------------------------------------------

const STRIPE_BASE = "https://api.stripe.com/v1";

function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

async function stripeFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${STRIPE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...init?.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a Stripe customer for a LINE user. */
export async function createCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const store = await loadStore();
  if (store.customers[userId]) return store.customers[userId];

  const res = await stripeFetch("/customers", {
    method: "POST",
    body: new URLSearchParams({
      email,
      metadata: JSON.stringify({ lineUserId: userId }),
    }),
  });

  if (!res.ok) throw new Error(`Stripe createCustomer failed: ${res.status}`);
  const data = (await res.json()) as { id: string };

  store.customers[userId] = data.id;
  await saveStore(store);
  return data.id;
}

/** Create a subscription for a customer. */
export async function createSubscription(
  customerId: string,
  planId: string,
): Promise<Subscription> {
  const plan = getPlanById(planId);
  if (!plan.stripePriceId) {
    throw new Error(`Plan ${planId} has no Stripe price ID`);
  }

  const res = await stripeFetch("/subscriptions", {
    method: "POST",
    body: new URLSearchParams({
      customer: customerId,
      "items[0][price]": plan.stripePriceId,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    }),
  });

  if (!res.ok) throw new Error(`Stripe createSubscription failed: ${res.status}`);
  const data = (await res.json()) as {
    id: string;
    status: string;
    current_period_end: number;
    metadata?: { lineUserId?: string };
  };

  const sub: Subscription = {
    id: data.id,
    customerId,
    userId: data.metadata?.lineUserId ?? "",
    planId,
    status: data.status as Subscription["status"],
    currentPeriodEnd: new Date(data.current_period_end * 1000).toISOString(),
  };

  const store = await loadStore();
  store.subscriptions[sub.id] = sub;
  // Find userId by customerId
  for (const [uid, cid] of Object.entries(store.customers)) {
    if (cid === customerId) {
      store.userPlans[uid] = planId;
      sub.userId = uid;
      break;
    }
  }
  await saveStore(store);
  return sub;
}

/** Cancel a subscription. */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<void> {
  const res = await stripeFetch(`/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Stripe cancelSubscription failed: ${res.status}`);

  const store = await loadStore();
  const sub = store.subscriptions[subscriptionId];
  if (sub) {
    sub.status = "canceled";
    store.userPlans[sub.userId] = "free";
  }
  await saveStore(store);
}

/** Handle Stripe webhook events. */
export async function handleWebhook(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<void> {
  const store = await loadStore();

  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const obj = event.data.object as {
        id: string;
        status: string;
        current_period_end?: number;
      };
      const sub = store.subscriptions[obj.id];
      if (sub) {
        sub.status = obj.status as Subscription["status"];
        if (obj.current_period_end) {
          sub.currentPeriodEnd = new Date(obj.current_period_end * 1000).toISOString();
        }
        if (sub.status === "canceled") {
          store.userPlans[sub.userId] = "free";
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const obj = event.data.object as { subscription?: string };
      if (obj.subscription) {
        const sub = store.subscriptions[obj.subscription];
        if (sub) sub.status = "past_due";
      }
      break;
    }
  }

  await saveStore(store);
}

/** Get the active plan for a user. */
export async function getActivePlan(userId: string): Promise<Plan> {
  const store = await loadStore();
  const planId = store.userPlans[userId] ?? "free";
  return getPlanById(planId);
}

/** Check if a user has access to a specific feature. */
export async function hasFeature(
  userId: string,
  feature: string,
): Promise<boolean> {
  const plan = await getActivePlan(userId);
  return plan.features.includes(feature as Plan["features"][number]);
}
