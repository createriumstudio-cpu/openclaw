// plans.test.ts
import { describe, it, expect } from "vitest";
import { FREE_PLAN, STANDARD_PLAN, PREMIUM_PLAN, ALL_PLANS, getPlanById } from "./plans.js";

describe("Plan definitions", () => {
  it("FREE_PLAN has correct limits", () => {
    expect(FREE_PLAN.price).toBe(0);
    expect(FREE_PLAN.messageLimit).toBe(50);
    expect(FREE_PLAN.features).toContain("basic_chat");
    expect(FREE_PLAN.features).not.toContain("google_calendar");
  });

  it("STANDARD_PLAN has unlimited messages", () => {
    expect(STANDARD_PLAN.price).toBe(980);
    expect(STANDARD_PLAN.messageLimit).toBe(0);
    expect(STANDARD_PLAN.features).toContain("daily_report");
    expect(STANDARD_PLAN.features).toContain("weather");
    expect(STANDARD_PLAN.features).not.toContain("google_calendar");
  });

  it("PREMIUM_PLAN includes all features", () => {
    expect(PREMIUM_PLAN.price).toBe(1980);
    expect(PREMIUM_PLAN.messageLimit).toBe(0);
    expect(PREMIUM_PLAN.features).toContain("google_calendar");
    expect(PREMIUM_PLAN.features).toContain("notion");
    expect(PREMIUM_PLAN.features).toContain("priority_support");
  });

  it("ALL_PLANS contains all three plans", () => {
    expect(ALL_PLANS).toHaveLength(3);
    expect(ALL_PLANS.map((p) => p.id)).toEqual(["free", "standard", "premium"]);
  });
});

describe("getPlanById", () => {
  it("returns correct plan by id", () => {
    expect(getPlanById("free")).toBe(FREE_PLAN);
    expect(getPlanById("standard")).toBe(STANDARD_PLAN);
    expect(getPlanById("premium")).toBe(PREMIUM_PLAN);
  });

  it("defaults to FREE_PLAN for unknown id", () => {
    expect(getPlanById("unknown")).toBe(FREE_PLAN);
    expect(getPlanById("")).toBe(FREE_PLAN);
  });
});
