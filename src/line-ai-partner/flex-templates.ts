// LINE AI Partner – Flex Message templates
//
// Follows the pattern from src/line/flex-templates/.
// All functions return LINE Flex Message container objects.

import type { DailyReport, OnboardingState } from "./types.js";
import type { Reminder } from "./cron-manager.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type FlexBox = { type: "box"; layout: string; contents: unknown[]; [k: string]: unknown };
type FlexText = { type: "text"; text: string; [k: string]: unknown };
type FlexButton = { type: "button"; action: unknown; [k: string]: unknown };
type FlexBubble = { type: "bubble"; body?: FlexBox; footer?: FlexBox; [k: string]: unknown };
type FlexMessage = { type: "flex"; altText: string; contents: FlexBubble };

function text(t: string, opts: Record<string, unknown> = {}): FlexText {
  return { type: "text", text: t, ...opts };
}

function separator(): { type: "separator" } {
  return { type: "separator" };
}

// ---------------------------------------------------------------------------
// Daily report card
// ---------------------------------------------------------------------------

/** Create a Flex Message card for a daily report. */
export function createDailyReportCard(report: DailyReport): FlexMessage {
  const contents: unknown[] = [
    text("おはようレポート ☀️", { weight: "bold", size: "lg" }),
    separator(),
  ];

  if (report.weather) {
    contents.push(
      text(`天気: ${report.weather.description}`, { size: "sm", margin: "md" }),
      text(`気温: ${report.weather.temperature}℃`, { size: "sm" }),
    );
    if (report.weather.humidity != null) {
      contents.push(text(`湿度: ${report.weather.humidity}%`, { size: "sm" }));
    }
  }

  if (report.outfitSuggestion) {
    contents.push(separator());
    contents.push(
      text("服装アドバイス", { weight: "bold", size: "sm", margin: "md" }),
      text(report.outfitSuggestion, { size: "sm", wrap: true }),
    );
  }

  if (report.schedule?.length) {
    contents.push(separator());
    contents.push(text("今日の予定", { weight: "bold", size: "sm", margin: "md" }));
    for (const item of report.schedule) {
      contents.push(text(`${item.time}  ${item.title}`, { size: "sm" }));
    }
  }

  if (report.reminders?.length) {
    contents.push(separator());
    contents.push(text("リマインダー", { weight: "bold", size: "sm", margin: "md" }));
    for (const r of report.reminders) {
      contents.push(text(`・${r}`, { size: "sm" }));
    }
  }

  return {
    type: "flex",
    altText: "おはようレポート",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents,
        spacing: "sm",
        paddingAll: "lg",
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Onboarding card
// ---------------------------------------------------------------------------

const onboardingTitles: Record<OnboardingState, string> = {
  new: "はじめまして！",
  asking_name: "お名前を教えてください",
  asking_personality: "性格を選んでください",
  asking_style: "口調を選んでください",
  asking_relationship: "関係性を選んでください",
  complete: "設定完了！",
};

/** Create a Flex Message card for an onboarding step. */
export function createOnboardingCard(
  step: OnboardingState,
  options: string[],
): FlexMessage {
  const title = onboardingTitles[step];

  const buttons: FlexButton[] = options.map((label) => ({
    type: "button",
    action: { type: "message", label, text: label },
    style: "primary",
    color: "#6C5CE7",
    margin: "sm",
  }));

  return {
    type: "flex",
    altText: title,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          text(title, { weight: "bold", size: "lg" }),
          text("下のボタンから選んでね", { size: "sm", color: "#999999", margin: "sm" }),
        ],
        paddingAll: "lg",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: buttons,
        spacing: "sm",
        paddingAll: "lg",
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Reminder card
// ---------------------------------------------------------------------------

/** Create a Flex Message card for a reminder notification. */
export function createReminderCard(reminder: Reminder): FlexMessage {
  return {
    type: "flex",
    altText: `リマインダー: ${reminder.message}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          text("🔔 リマインダー", { weight: "bold", size: "lg" }),
          separator(),
          text(reminder.message, { size: "md", wrap: true, margin: "md" }),
        ],
        paddingAll: "lg",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "postback",
              label: "完了",
              data: `reminder_done:${reminder.id}`,
              displayText: "完了しました！",
            },
            style: "primary",
            color: "#00B900",
          } as FlexButton,
        ],
        paddingAll: "lg",
      },
    },
  };
}
