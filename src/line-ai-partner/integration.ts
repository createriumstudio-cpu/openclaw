// LINE AI Partner – OpenClaw integration layer
//
// Bridges the LINE AI Partner module with OpenClaw's gateway/plugin system.
// Connects to:
//   - src/line/bot-handlers.ts   (webhook event handling)
//   - src/line/bot-message-context.ts (inbound context types)
//   - src/line/send.ts            (outbound messaging)

import { messagingApi } from "@line/bot-sdk";
import type { LineInboundContext } from "../line/bot-message-context.js";
import {
  sendMessageLine,
  pushFlexMessage,
  pushTextMessageWithQuickReplies,
  showLoadingAnimation,
} from "../line/send.js";
import type { ResolvedLineAccount } from "../line/types.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { getMorningGreetingTime } from "./cron-manager.js";
import { generateDailyReport } from "./daily-assistant.js";
import { createDailyReportCard } from "./flex-templates.js";
import { getUserProfile } from "./memory-manager.js";
import { routeMessage, type RouterResponse } from "./message-router.js";
import { generateSoulMd } from "./soul-generator.js";

const log = createSubsystemLogger("line-ai-partner");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Outbound message to send via LINE API. */
export type LineOutboundMessage = {
  type: "text" | "flex";
  text?: string;
  flexContent?: unknown;
  altText?: string;
  quickReplies?: string[];
};

// Re-export LineInboundContext for consumers
export type { LineInboundContext };

// ---------------------------------------------------------------------------
// Webhook flow integration
// ---------------------------------------------------------------------------

/**
 * Process an inbound LINE message through the AI Partner pipeline.
 *
 * This function is designed to be called from within the `processMessage`
 * callback of `LineHandlerContext` (see src/line/bot-handlers.ts).
 *
 * Flow:
 *   1. Extract userId and raw text from the LineInboundContext
 *   2. Show loading animation while processing
 *   3. Route through message-router (onboarding, commands, intents, AI)
 *   4. Send reply via LINE Messaging API using src/line/send.ts
 */
export async function processPartnerMessage(ctx: LineInboundContext): Promise<void> {
  const userId = ctx.userId ?? "";
  const accountId = ctx.accountId;
  const replyToken = ctx.replyToken;
  const rawText = ctx.ctxPayload.RawBody ?? ctx.ctxPayload.Body ?? "";

  if (!userId) {
    log.warn("processPartnerMessage: no userId in context, skipping");
    return;
  }

  // Determine the reply target (group or DM)
  const replyTo = ctx.isGroup
    ? ctx.groupId
      ? `line:group:${ctx.groupId}`
      : `line:room:${ctx.roomId ?? ""}`
    : `line:${userId}`;

  // Show loading animation (non-blocking, best-effort)
  void showLoadingAnimation(userId, { accountId }).catch(() => {});

  try {
    // Route the message through the AI Partner pipeline
    const result = await routeMessage(userId, rawText);
    await sendPartnerReply(replyTo, result, { accountId, replyToken });
  } catch (err) {
    log.warn(`processPartnerMessage failed for user=${userId}: ${String(err)}`);
    // Send a fallback error message
    try {
      await sendMessageLine(replyTo, "すみません、エラーが発生しました。もう一度試してね。", {
        accountId,
        replyToken,
      });
    } catch {
      // Silently ignore send failures for the error message
    }
  }
}

/**
 * Send a router response back to the user via LINE API.
 */
async function sendPartnerReply(
  to: string,
  result: RouterResponse,
  opts: { accountId: string; replyToken?: string },
): Promise<void> {
  // Flex message response
  if (result.flexMessage) {
    const flexContainer = result.flexMessage as messagingApi.FlexContainer;
    await pushFlexMessage(to, result.text || "メッセージ", flexContainer, {
      accountId: opts.accountId,
    });
    return;
  }

  // Text with quick replies
  if (result.quickReplies?.length) {
    await pushTextMessageWithQuickReplies(to, result.text, result.quickReplies, {
      accountId: opts.accountId,
    });
    return;
  }

  // Plain text response (can use reply token for lower latency)
  await sendMessageLine(to, result.text, {
    accountId: opts.accountId,
    replyToken: opts.replyToken,
  });
}

// ---------------------------------------------------------------------------
// Legacy event processing (standalone, for backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use processPartnerMessage with LineInboundContext instead. */
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

/** @deprecated Use processPartnerMessage instead. */
export async function processEvent(event: LinePartnerEvent): Promise<LineOutboundMessage[]> {
  const { userId } = event;

  if (event.type === "follow") {
    const result = await routeMessage(userId, "");
    return [toOutbound(result)];
  }

  if (event.type === "unfollow") {
    return [];
  }

  if (event.type === "postback" && event.postback) {
    const result = await routeMessage(userId, event.postback.data);
    return [toOutbound(result)];
  }

  if (event.type === "message" && event.message?.type === "text" && event.message.text) {
    const result = await routeMessage(userId, event.message.text);
    return [toOutbound(result)];
  }

  return [{ type: "text", text: "ごめんね、テキストメッセージだけ対応しているよ" }];
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
  if (!profile) {
    return null;
  }
  return generateSoulMd(profile);
}

// ---------------------------------------------------------------------------
// Morning greeting push (uses real LINE send API)
// ---------------------------------------------------------------------------

/**
 * Check if a user should receive a morning greeting at the given time,
 * and push the Flex Message via LINE API.
 *
 * @param account - The resolved LINE account to send from
 */
export async function pushMorningGreeting(
  userId: string,
  currentHHMM: string,
  account: ResolvedLineAccount,
): Promise<boolean> {
  const wakeTime = await getMorningGreetingTime(userId);
  if (!wakeTime || wakeTime !== currentHHMM) {
    return false;
  }

  const report = await generateDailyReport(userId);
  const card = createDailyReportCard(report);

  await pushFlexMessage(
    `line:${userId}`,
    "おはようレポート",
    card.contents as messagingApi.FlexContainer,
    { accountId: account.accountId },
  );

  log.info(`pushed morning greeting to user=${userId}`);
  return true;
}

/**
 * Build a morning greeting payload (without sending).
 * @deprecated Use pushMorningGreeting for real integration.
 */
export async function buildMorningGreeting(
  userId: string,
  currentHHMM: string,
): Promise<LineOutboundMessage | null> {
  const wakeTime = await getMorningGreetingTime(userId);
  if (!wakeTime || wakeTime !== currentHHMM) {
    return null;
  }

  const report = await generateDailyReport(userId);
  const card = createDailyReportCard(report);

  return {
    type: "flex",
    altText: "おはようレポート",
    flexContent: card.contents,
  };
}
