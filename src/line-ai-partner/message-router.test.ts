// message-router.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("./memory-manager.js", () => ({
  getUserProfile: vi.fn(),
  getConversationMemory: vi.fn().mockResolvedValue(null),
}));

vi.mock("./onboarding.js", () => ({
  handleOnboarding: vi.fn().mockResolvedValue({
    text: "はじめまして！",
    nextState: "asking_name",
  }),
}));

vi.mock("./weather-service.js", () => ({
  getWeather: vi.fn().mockResolvedValue({
    temp: 22,
    feelsLike: 21,
    humidity: 55,
    description: "晴れ",
    icon: "01d",
  }),
  weatherIconToEmoji: vi.fn().mockReturnValue("☀️"),
}));

vi.mock("./cron-manager.js", () => ({
  registerReminder: vi.fn().mockResolvedValue("reminder-1"),
}));

vi.mock("./soul-generator.js", () => ({
  generateSoulMd: vi.fn().mockReturnValue("# SOUL"),
}));

vi.mock("./command-handler.js", () => ({
  isCommand: vi.fn((msg: string) => msg.startsWith("/")),
  handleCommand: vi.fn().mockResolvedValue({ text: "コマンド結果" }),
}));

vi.mock("./gemini-client.js", () => ({
  chatWithGemini: vi.fn().mockResolvedValue("こんにちは！元気？"),
}));

import { getUserProfile } from "./memory-manager.js";
import { routeMessage } from "./message-router.js";

const mockGetUserProfile = vi.mocked(getUserProfile);

describe("routeMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes slash commands to command handler", async () => {
    mockGetUserProfile.mockResolvedValue({
      userId: "U001",
      displayName: "太郎",
      personalityType: "gentle",
      communicationStyle: "casual",
      relationshipType: "friend",
      preferences: {},
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const result = await routeMessage("U001", "/help");
    expect(result.text).toBe("コマンド結果");
  });

  it("routes new users to onboarding", async () => {
    mockGetUserProfile.mockResolvedValue(null);

    const result = await routeMessage("U_NEW", "こんにちは");
    expect(result.text).toContain("はじめまして");
  });

  it("detects weather intent keywords", async () => {
    mockGetUserProfile.mockResolvedValue({
      userId: "U001",
      displayName: "太郎",
      personalityType: "gentle",
      communicationStyle: "casual",
      relationshipType: "friend",
      preferences: { weatherLocation: "東京" },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const result = await routeMessage("U001", "今日の天気は？");
    expect(result.text).toContain("℃");
  });

  it("detects reminder intent from natural language", async () => {
    mockGetUserProfile.mockResolvedValue({
      userId: "U001",
      displayName: "太郎",
      personalityType: "gentle",
      communicationStyle: "casual",
      relationshipType: "friend",
      preferences: {},
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const result = await routeMessage("U001", "7時に薬を飲むを教えて");
    expect(result.text).toContain("07:00");
    expect(result.text).toContain("リマインド");
  });

  it("falls back to conversation for general messages", async () => {
    mockGetUserProfile.mockResolvedValue({
      userId: "U001",
      displayName: "太郎",
      personalityType: "gentle",
      communicationStyle: "casual",
      relationshipType: "friend",
      preferences: {},
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const result = await routeMessage("U001", "最近どう？");
    expect(result.text).toBe("こんにちは！元気？");
  });
});
