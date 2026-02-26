// soul-generator.test.ts
import { describe, it, expect } from "vitest";
import { generateSoulMd } from "./soul-generator.js";
import type {
  UserProfile,
  PersonalityType,
  CommunicationStyle,
  RelationshipType,
} from "./types.js";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: "U001",
    displayName: "テスト太郎",
    personalityType: "gentle",
    communicationStyle: "casual",
    relationshipType: "friend",
    preferences: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("generateSoulMd", () => {
  it("generates markdown with user and partner names", () => {
    const md = generateSoulMd(makeProfile({ nickname: "アイ" }));
    expect(md).toContain("パートナー名: アイ");
    expect(md).toContain("ユーザーを「テスト太郎」と呼ぶ");
    expect(md).toContain("自分を「アイ」と名乗る");
  });

  it("defaults partner name when nickname is absent", () => {
    const md = generateSoulMd(makeProfile());
    expect(md).toContain("パートナー名: パートナー");
  });

  const personalityTypes: PersonalityType[] = [
    "gentle",
    "cheerful",
    "cool",
    "tsundere",
    "intellectual",
  ];

  for (const pt of personalityTypes) {
    it(`includes personality template for ${pt}`, () => {
      const md = generateSoulMd(makeProfile({ personalityType: pt }));
      expect(md).toContain("## 性格・口調");
      expect(md.length).toBeGreaterThan(100);
    });
  }

  const styles: CommunicationStyle[] = ["casual", "polite", "friendly", "formal"];

  for (const style of styles) {
    it(`includes communication style for ${style}`, () => {
      const md = generateSoulMd(makeProfile({ communicationStyle: style }));
      expect(md).toContain("## 話し方のルール");
    });
  }

  const relationships: RelationshipType[] = ["family", "friend", "lover", "pet", "assistant"];

  for (const rel of relationships) {
    it(`includes relationship rules for ${rel}`, () => {
      const md = generateSoulMd(makeProfile({ relationshipType: rel }));
      expect(md).toContain(`関係性: ${rel}`);
    });
  }

  it("includes interests section when preferences.interests is set", () => {
    const md = generateSoulMd(
      makeProfile({ preferences: { interests: ["プログラミング", "料理"] } }),
    );
    expect(md).toContain("## ユーザーの興味・関心");
    expect(md).toContain("プログラミング");
    expect(md).toContain("料理");
  });

  it("omits interests section when empty", () => {
    const md = generateSoulMd(makeProfile());
    expect(md).not.toContain("## ユーザーの興味・関心");
  });
});
