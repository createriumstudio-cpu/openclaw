// LINE AI Partner – Type definitions
//
// Integrates with OpenClaw's existing LINE types from src/line/types.ts.

import type {
  LineConfig,
  ResolvedLineAccount,
  LineWebhookContext,
  LineSendResult,
} from "../line/types.js";

// Re-export core LINE types for convenience
export type { LineConfig, ResolvedLineAccount, LineWebhookContext, LineSendResult };

/** AI Partner extension to LineConfig. */
export type LinePartnerConfig = {
  enabled?: boolean;
  defaultPersonality?: PersonalityType;
  defaultStyle?: CommunicationStyle;
  defaultRelationship?: RelationshipType;
};

/** Partner personality archetype. */
export type PersonalityType = "gentle" | "cheerful" | "cool" | "tsundere" | "intellectual";

/** Message tone / formality level. */
export type CommunicationStyle = "casual" | "polite" | "friendly" | "formal";

/** Relationship framing between user and AI partner. */
export type RelationshipType = "family" | "friend" | "lover" | "pet" | "assistant";

/** Onboarding wizard progress. */
export type OnboardingState =
  | "new"
  | "asking_name"
  | "asking_personality"
  | "asking_style"
  | "asking_relationship"
  | "complete";

/** User-level preferences stored in memory. */
export type UserPreferences = {
  weatherLocation?: string;
  wakeTime?: string;
  interests?: string[];
};

/** Persistent user profile. */
export type UserProfile = {
  userId: string;
  displayName: string;
  nickname?: string;
  personalityType: PersonalityType;
  communicationStyle: CommunicationStyle;
  relationshipType: RelationshipType;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
};

/** Quick Reply item used in onboarding prompts. */
export type QuickReplyItem = {
  label: string;
  value: string;
};

/** Return value from each onboarding step. */
export type OnboardingResponse = {
  text: string;
  nextState: OnboardingState;
  quickReplies?: QuickReplyItem[];
  profile?: UserProfile;
};

/** Daily report payload. */
export type DailyReport = {
  weather?: {
    description: string;
    temperature: number;
    humidity?: number;
    icon?: string;
  };
  schedule?: Array<{
    time: string;
    title: string;
  }>;
  reminders?: string[];
  outfitSuggestion?: string;
};
