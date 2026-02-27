// LINE AI Partner – Plan definitions & feature gating

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanFeature =
  | "basic_chat"
  | "personality_change"
  | "daily_report"
  | "reminders"
  | "weather"
  | "google_calendar"
  | "google_drive"
  | "notion"
  | "priority_support";

export type Plan = {
  id: string;
  name: string;
  nameJa: string;
  price: number; // JPY per month
  messageLimit: number; // 0 = unlimited
  features: PlanFeature[];
  stripePriceId?: string;
};

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export const FREE_PLAN: Plan = {
  id: "free",
  name: "Free",
  nameJa: "フリー",
  price: 0,
  messageLimit: 50,
  features: ["basic_chat", "personality_change"],
};

export const STANDARD_PLAN: Plan = {
  id: "standard",
  name: "Standard",
  nameJa: "スタンダード",
  price: 980,
  messageLimit: 0,
  features: ["basic_chat", "personality_change", "daily_report", "reminders", "weather"],
  stripePriceId: process.env.STRIPE_STANDARD_PRICE_ID,
};

export const PREMIUM_PLAN: Plan = {
  id: "premium",
  name: "Premium",
  nameJa: "プレミアム",
  price: 1980,
  messageLimit: 0,
  features: [
    "basic_chat",
    "personality_change",
    "daily_report",
    "reminders",
    "weather",
    "google_calendar",
    "google_drive",
    "notion",
    "priority_support",
  ],
  stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
};

export const ALL_PLANS: Plan[] = [FREE_PLAN, STANDARD_PLAN, PREMIUM_PLAN];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a plan by id. Defaults to FREE. */
export function getPlanById(planId: string): Plan {
  return ALL_PLANS.find((p) => p.id === planId) ?? FREE_PLAN;
}
