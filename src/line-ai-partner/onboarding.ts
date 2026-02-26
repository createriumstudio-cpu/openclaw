import { saveUserProfile, getUserProfile } from "./memory-manager.js";
import { generateSoulMd } from "./soul-generator.js";
// LINE AI Partner – Onboarding flow
import type {
  OnboardingState,
  OnboardingResponse,
  UserProfile,
  PersonalityType,
  CommunicationStyle,
  RelationshipType,
  QuickReplyItem,
} from "./types.js";

// ---------------------------------------------------------------------------
// Quick Reply option sets
// ---------------------------------------------------------------------------

const personalityOptions: QuickReplyItem[] = [
  { label: "やさしい", value: "gentle" },
  { label: "元気いっぱい", value: "cheerful" },
  { label: "クール", value: "cool" },
  { label: "ツンデレ", value: "tsundere" },
  { label: "知的", value: "intellectual" },
];

const styleOptions: QuickReplyItem[] = [
  { label: "カジュアル（タメ口）", value: "casual" },
  { label: "丁寧語", value: "polite" },
  { label: "フレンドリー", value: "friendly" },
  { label: "フォーマル", value: "formal" },
];

const relationshipOptions: QuickReplyItem[] = [
  { label: "親友みたいに", value: "friend" },
  { label: "家族みたいに", value: "family" },
  { label: "恋人みたいに", value: "lover" },
  { label: "ペットみたいに", value: "pet" },
  { label: "秘書みたいに", value: "assistant" },
];

// ---------------------------------------------------------------------------
// Partial profile built up during onboarding
// ---------------------------------------------------------------------------

const partialProfiles = new Map<string, Partial<UserProfile> & { userId: string }>();

function getPartial(userId: string) {
  let p = partialProfiles.get(userId);
  if (!p) {
    p = { userId };
    partialProfiles.set(userId, p);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Handlers per state
// ---------------------------------------------------------------------------

function handleNew(_userId: string, _message: string): OnboardingResponse {
  return {
    text:
      "はじめまして！あなただけのAIパートナーです 😊\n" +
      "まずは少しだけ教えてください。\n\n" +
      "あなたのことは何とお呼びすればいいですか？",
    nextState: "asking_name",
  };
}

function handleAskingName(userId: string, message: string): OnboardingResponse {
  const partial = getPartial(userId);
  partial.displayName = message.trim();

  return {
    text: `${partial.displayName} さんですね！\n\n私の性格を選んでください ✨`,
    nextState: "asking_personality",
    quickReplies: personalityOptions,
  };
}

function handleAskingPersonality(userId: string, message: string): OnboardingResponse {
  const partial = getPartial(userId);
  const match = personalityOptions.find((o) => o.value === message || o.label === message);
  partial.personalityType = (match?.value ?? "gentle") as PersonalityType;

  return {
    text: "了解！次は、どんな口調で話しましょうか？ 🗣️",
    nextState: "asking_style",
    quickReplies: styleOptions,
  };
}

function handleAskingStyle(userId: string, message: string): OnboardingResponse {
  const partial = getPartial(userId);
  const match = styleOptions.find((o) => o.value === message || o.label === message);
  partial.communicationStyle = (match?.value ?? "friendly") as CommunicationStyle;

  return {
    text: "最後に、私とどんな関係がいいですか？ 💫",
    nextState: "asking_relationship",
    quickReplies: relationshipOptions,
  };
}

async function handleAskingRelationship(
  userId: string,
  message: string,
): Promise<OnboardingResponse> {
  const partial = getPartial(userId);
  const match = relationshipOptions.find((o) => o.value === message || o.label === message);
  partial.relationshipType = (match?.value ?? "friend") as RelationshipType;

  const now = new Date().toISOString();
  const profile: UserProfile = {
    userId,
    displayName: partial.displayName ?? "ユーザー",
    nickname: partial.nickname,
    personalityType: partial.personalityType ?? "gentle",
    communicationStyle: partial.communicationStyle ?? "friendly",
    relationshipType: partial.relationshipType ?? "friend",
    preferences: {},
    createdAt: now,
    updatedAt: now,
  };

  await saveUserProfile(userId, profile);

  // Generate SOUL.md content (can be stored/used by the runtime)
  const _soul = generateSoulMd(profile);

  partialProfiles.delete(userId);

  return {
    text:
      `設定完了！これからよろしくね、${profile.displayName}！ 🎉\n\n` +
      "いつでも「設定変更」と送ってくれれば、性格や口調を変えられるよ。",
    nextState: "complete",
    profile,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const stateHandlers: Record<
  Exclude<OnboardingState, "complete">,
  (userId: string, message: string) => OnboardingResponse | Promise<OnboardingResponse>
> = {
  new: handleNew,
  asking_name: handleAskingName,
  asking_personality: handleAskingPersonality,
  asking_style: handleAskingStyle,
  asking_relationship: handleAskingRelationship,
};

/**
 * Drive the onboarding state machine one step forward.
 *
 * @returns response text, next state, and optional quick replies
 */
export async function handleOnboarding(
  userId: string,
  message: string,
  state: OnboardingState,
): Promise<OnboardingResponse> {
  if (state === "complete") {
    const existing = await getUserProfile(userId);
    if (existing) {
      return {
        text: `${existing.displayName} の設定は完了済みです。「設定変更」で再設定できます。`,
        nextState: "complete",
      };
    }
    // Profile missing – restart
    return handleNew(userId, message);
  }

  const handler = stateHandlers[state];
  return handler(userId, message);
}
