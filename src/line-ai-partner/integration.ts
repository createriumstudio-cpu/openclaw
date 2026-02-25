// LINE AI Partner – OpenClaw integration layer
//
// Bridges the LINE AI Partner module with OpenClaw's gateway/plugin system.
// Handles: webhook reception → message routing → LINE reply/push.

import { routeMessage, type RouterResponse } from "./message-router.js";
import { getUserProfile } from "./memory-manager.js";
import { generateSoulMd } from "./soul-generator.js";
import { getMorningGreetingTime } from "./cron-manager.js";
import { generateDailyReport } from "./daily-assistant.js";
import { createDailyReportCard } from "./flex-templates.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal LINE webhook event shape (text messages only). */
export type LinePartnerEvent = {
  type: "message" | "postback" | "follow" | "unfollow";
  userId: string;
  replyToken?: string;
  message?: {
    type: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
};

/** Outbound message to send via LINE API. */
export type LineOutboundMessage = {
  type: "text" | "flex";
  text?: string;
  flexContent?: unknown;
  altText?: string;
  quickReplies?: string[];
};

// ---------------------------------------------------------------------------
// Event processing
// ---------------------------------------------------------------------------

/** Process a single LINE webhook event and return messages to send. */
export async function processEvent(
  event: LinePartnerEvent,
): Promise<LineOutboundMessage[]> {
  const { userId } = event;

  // Follow event → start onboarding
  if (event.type === "follow") {
    const result = await routeMessage(userId, "");
    return [toOutbound(result)];
  }

  // Unfollow → no response
  if (event.type === "unfollow") {
    return [];
  }

  // Postback → extract data and route
  if (event.type === "postback" && event.postback) {
    const result = await routeMessage(userId, event.postback.data);
    return [toOutbound(result)];
  }

  // Text message
  if (event.type === "message" && event.message?.type === "text" && event.message.text) {
    const result = await routeMessage(userId, event.message.text);
    return [toOutbound(result)];
  }

  // Non-text messages (sticker, image, etc.) → generic reply
  return [{ type: "text", text: "ごめんね、テキストメッセージだけ対応しているよ 📝" }];
}

function toOutbound(result: RouterResponse): LineOutboundMessage {
  return {
    type: result.flexMessage ? "flex" : "text",
    text: result.text,
    flexContent: result.flexMessage,
    quickReplies: result.quickReplies,
  };
}

// ---------------------------------------------------------------------------
// SOUL.md context for AI calls
// ---------------------------------------------------------------------------

/** Get the SOUL.md system prompt for a given user. */
export async function getSoulContext(userId: string): Promise<string | null> {
  const profile = await getUserProfile(userId);
  if (!profile) return null;
  return generateSoulMd(profile);
}

// ---------------------------------------------------------------------------
// Morning greeting push
// ---------------------------------------------------------------------------

/**
 * Check if a user should receive a morning greeting at the given time,
 * and return the Flex Message payload if so.
 */
export async function buildMorningGreeting(
  userId: string,
  currentHHMM: string,
): Promise<LineOutboundMessage | null> {
  const wakeTime = await getMorningGreetingTime(userId);
  if (!wakeTime || wakeTime !== currentHHMM) return null;

  const report = await generateDailyReport(userId);
  const card = createDailyReportCard(report);

  return {
    type: "flex",
    altText: "おはようレポート",
    flexContent: card.contents,
  };
}
