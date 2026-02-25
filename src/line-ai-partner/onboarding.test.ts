// onboarding.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleOnboarding } from "./onboarding.js";

// Mock memory-manager to avoid filesystem writes
vi.mock("./memory-manager.js", () => ({
  getUserProfile: vi.fn().mockResolvedValue(null),
  saveUserProfile: vi.fn().mockResolvedValue(undefined),
}));

describe("handleOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns greeting on 'new' state", async () => {
    const result = await handleOnboarding("U001", "", "new");
    expect(result.nextState).toBe("asking_name");
    expect(result.text).toContain("はじめまして");
  });

  it("accepts name and transitions to asking_personality", async () => {
    const result = await handleOnboarding("U001", "太郎", "asking_name");
    expect(result.nextState).toBe("asking_personality");
    expect(result.text).toContain("太郎");
    expect(result.quickReplies).toBeDefined();
    expect(result.quickReplies!.length).toBe(5);
  });

  it("accepts personality by label and transitions to asking_style", async () => {
    // First set up partial profile via asking_name
    await handleOnboarding("U001", "太郎", "asking_name");
    const result = await handleOnboarding("U001", "やさしい", "asking_personality");
    expect(result.nextState).toBe("asking_style");
    expect(result.quickReplies).toBeDefined();
  });

  it("accepts personality by value", async () => {
    await handleOnboarding("U001", "太郎", "asking_name");
    const result = await handleOnboarding("U001", "cheerful", "asking_personality");
    expect(result.nextState).toBe("asking_style");
  });

  it("accepts style and transitions to asking_relationship", async () => {
    await handleOnboarding("U001", "太郎", "asking_name");
    await handleOnboarding("U001", "gentle", "asking_personality");
    const result = await handleOnboarding("U001", "カジュアル（タメ口）", "asking_style");
    expect(result.nextState).toBe("asking_relationship");
    expect(result.quickReplies).toBeDefined();
  });

  it("completes onboarding and returns profile", async () => {
    await handleOnboarding("U001", "太郎", "asking_name");
    await handleOnboarding("U001", "gentle", "asking_personality");
    await handleOnboarding("U001", "casual", "asking_style");
    const result = await handleOnboarding("U001", "親友みたいに", "asking_relationship");

    expect(result.nextState).toBe("complete");
    expect(result.profile).toBeDefined();
    expect(result.profile!.displayName).toBe("太郎");
    expect(result.profile!.personalityType).toBe("gentle");
    expect(result.profile!.communicationStyle).toBe("casual");
    expect(result.profile!.relationshipType).toBe("friend");
    expect(result.text).toContain("設定完了");
  });

  it("handles 'complete' state with no profile by restarting", async () => {
    const result = await handleOnboarding("U002", "", "complete");
    expect(result.nextState).toBe("asking_name");
    expect(result.text).toContain("はじめまして");
  });
});
