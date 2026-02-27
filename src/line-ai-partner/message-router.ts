// LINE AI Partner – Message router
//
// Routes incoming LINE messages to the appropriate handler:
// - New users → onboarding
// - Slash commands → command-handler
// - Daily/weather/reminder keywords → daily-assistant / cron-manager
// - Everything else → AI conversation (SOUL.md + Gemini)

import { handleCommand, isCommand, type CommandResponse } from "./command-handler.js";
import { registerReminder } from "./cron-manager.js";
import { generateDailyReport, formatDailyReportMessage } from "./daily-assistant.js";
import { chatWithGemini } from "./gemini-client.js";
import { getUserProfile } from "./memory-manager.js";
import { handleOnboarding } from "./onboarding.js";
import { generateSoulMd } from "./soul-generator.js";
import type { OnboardingState } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RouterResponse = {
  text: string;
  quickReplies?: string[];
  flexMessage?: unknown;
};

// ---------------------------------------------------------------------------
// Onboarding state tracking (in-memory; persisted via memory-manager)
// ---------------------------------------------------------------------------

const onboardingStates = new Map<string, OnboardingState>();

// ---------------------------------------------------------------------------
// Natural language intent detection (keyword-based)
// ---------------------------------------------------------------------------

const weatherKeywords = ["天気", "気温", "weather", "傘"];
const scheduleKeywords = ["予定", "スケジュール", "schedule", "今日の予定"];
const reminderPattern =
  /(\d{1,2})[時:：](\d{0,2})?\s*に\s*(.+?)(?:を?(?:教えて|リマインド|通知)|$)/;
const settingKeywords = ["設定変更", "性格変えて", "口調変えて", "リセット"];

function detectIntent(
  message: string,
): "weather" | "schedule" | "reminder" | "setting_reset" | "conversation" {
  if (weatherKeywords.some((k) => message.includes(k))) {
    return "weather";
  }
  if (scheduleKeywords.some((k) => message.includes(k))) {
    return "schedule";
  }
  if (reminderPattern.test(message)) {
    return "reminder";
  }
  if (settingKeywords.some((k) => message.includes(k))) {
    return "setting_reset";
  }
  return "conversation";
}

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

/**
 * Route an incoming text message to the appropriate handler.
 */
export async function routeMessage(userId: string, message: string): Promise<RouterResponse> {
  const text = message.trim();

  // 1. Slash commands take highest priority
  if (isCommand(text)) {
    const cmdResult: CommandResponse = await handleCommand(userId, text);
    return {
      text: cmdResult.text,
      quickReplies: cmdResult.quickReplies?.map((q) => q.label),
    };
  }

  // 2. Check onboarding state
  const profile = await getUserProfile(userId);
  const obState = onboardingStates.get(userId);

  if (!profile || (obState && obState !== "complete")) {
    const state: OnboardingState = obState ?? "new";
    const result = await handleOnboarding(userId, text, state);
    onboardingStates.set(userId, result.nextState);

    return {
      text: result.text,
      quickReplies: result.quickReplies?.map((q) => q.label),
    };
  }

  // 3. Natural language intent routing
  const intent = detectIntent(text);

  switch (intent) {
    case "weather": {
      const report = await generateDailyReport(userId);
      if (report.weather) {
        const emoji = report.weather.description;
        let msg = `${emoji}\n気温: ${report.weather.temperature}℃`;
        if (report.weather.humidity != null) {
          msg += `\n湿度: ${report.weather.humidity}%`;
        }
        if (report.outfitSuggestion) {
          msg += `\n\n${report.outfitSuggestion}`;
        }
        return { text: msg };
      }
      return { text: "天気情報を取得できませんでした。位置情報を設定してね。" };
    }

    case "schedule": {
      const report = await generateDailyReport(userId);
      return { text: formatDailyReportMessage(report) };
    }

    case "reminder": {
      const match = reminderPattern.exec(text);
      if (match) {
        const hour = match[1].padStart(2, "0");
        const min = (match[2] ?? "00").padStart(2, "0");
        const msg = match[3].trim();
        const cron = `${min} ${hour} * * *`;
        await registerReminder(userId, cron, msg);
        return { text: `${hour}:${min} にリマインドするね！「${msg}」` };
      }
      return {
        text: "リマインダーの形式がわかりませんでした。「7時に薬を飲む」のように教えてね。",
      };
    }

    case "setting_reset": {
      onboardingStates.set(userId, "asking_personality");
      const result = await handleOnboarding(userId, text, "asking_personality");
      onboardingStates.set(userId, result.nextState);
      return {
        text: "設定を変更するね！\n\n" + result.text,
        quickReplies: result.quickReplies?.map((q) => q.label),
      };
    }

    case "conversation":
    default: {
      const soulPrompt = generateSoulMd(profile);
      const reply = await chatWithGemini(userId, text, soulPrompt);
      return { text: reply };
    }
  }
}
