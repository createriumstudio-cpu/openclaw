// LINE AI Partner – Slash command handler

import type { QuickReplyItem } from "./types.js";
import { getUserProfile } from "./memory-manager.js";
import { getWeather, weatherIconToEmoji } from "./weather-service.js";
import { generateDailyReport, formatDailyReportMessage } from "./daily-assistant.js";
import { listReminders, registerReminder } from "./cron-manager.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandResponse = {
  text: string;
  quickReplies?: QuickReplyItem[];
};

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

type CommandDef = {
  aliases: string[];
  description: string;
  handler: (userId: string, args: string) => Promise<CommandResponse>;
};

const commands: CommandDef[] = [
  {
    aliases: ["/help", "/ヘルプ"],
    description: "使い方ガイド",
    handler: handleHelp,
  },
  {
    aliases: ["/setting", "/設定"],
    description: "設定メニュー表示",
    handler: handleSetting,
  },
  {
    aliases: ["/personality", "/性格"],
    description: "性格変更",
    handler: handlePersonality,
  },
  {
    aliases: ["/style", "/口調"],
    description: "コミュニケーションスタイル変更",
    handler: handleStyle,
  },
  {
    aliases: ["/weather", "/天気"],
    description: "天気情報表示",
    handler: handleWeather,
  },
  {
    aliases: ["/schedule", "/予定"],
    description: "今日の予定表示",
    handler: handleSchedule,
  },
  {
    aliases: ["/remind", "/リマインダー"],
    description: "リマインダー設定・一覧",
    handler: handleRemind,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Check if a message is a slash command. */
export function isCommand(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return commands.some((c) => c.aliases.some((a) => lower.startsWith(a)));
}

/** Handle a slash command and return a response. */
export async function handleCommand(
  userId: string,
  message: string,
): Promise<CommandResponse> {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  for (const cmd of commands) {
    for (const alias of cmd.aliases) {
      if (lower.startsWith(alias)) {
        const args = trimmed.slice(alias.length).trim();
        return cmd.handler(userId, args);
      }
    }
  }

  return { text: "不明なコマンドです。/help で使い方を確認できます。" };
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function handleHelp(
  _userId: string,
  _args: string,
): Promise<CommandResponse> {
  const lines = [
    "📖 使い方ガイド",
    "",
    "【コマンド一覧】",
    ...commands.map((c) => `${c.aliases[0]} — ${c.description}`),
    "",
    "【自然な言葉でもOK】",
    '・「今日の天気」→ 天気情報',
    '・「7時に起こして」→ リマインダー設定',
    '・「予定教えて」→ 今日の予定',
    '・「設定変更」→ 性格・口調の変更',
    "",
    "それ以外のメッセージは普通に会話できるよ！",
  ];
  return { text: lines.join("\n") };
}

async function handleSetting(
  userId: string,
  _args: string,
): Promise<CommandResponse> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    return { text: "まだ設定が完了していません。まず初期設定を行いましょう！" };
  }

  const lines = [
    "⚙️ 現在の設定",
    "",
    `名前: ${profile.displayName}`,
    `性格: ${profile.personalityType}`,
    `口調: ${profile.communicationStyle}`,
    `関係性: ${profile.relationshipType}`,
    "",
    "変更するには下のボタンを選んでね",
  ];

  return {
    text: lines.join("\n"),
    quickReplies: [
      { label: "性格変更", value: "/personality" },
      { label: "口調変更", value: "/style" },
      { label: "閉じる", value: "ありがとう" },
    ],
  };
}

async function handlePersonality(
  _userId: string,
  _args: string,
): Promise<CommandResponse> {
  return {
    text: "どの性格にする？ ✨",
    quickReplies: [
      { label: "やさしい", value: "gentle" },
      { label: "元気いっぱい", value: "cheerful" },
      { label: "クール", value: "cool" },
      { label: "ツンデレ", value: "tsundere" },
      { label: "知的", value: "intellectual" },
    ],
  };
}

async function handleStyle(
  _userId: string,
  _args: string,
): Promise<CommandResponse> {
  return {
    text: "どんな口調がいい？ 🗣️",
    quickReplies: [
      { label: "カジュアル", value: "casual" },
      { label: "丁寧語", value: "polite" },
      { label: "フレンドリー", value: "friendly" },
      { label: "フォーマル", value: "formal" },
    ],
  };
}

async function handleWeather(
  userId: string,
  _args: string,
): Promise<CommandResponse> {
  const profile = await getUserProfile(userId);
  const location = profile?.preferences.weatherLocation;
  if (!location) {
    return { text: "天気を表示するには位置情報を設定してね。\n例: 「東京に住んでるよ」" };
  }

  try {
    const weather = await getWeather(location);
    const emoji = weatherIconToEmoji(weather.icon);
    const lines = [
      `${emoji} ${location}の天気`,
      "",
      `天気: ${weather.description}`,
      `気温: ${weather.temp}℃（体感 ${weather.feelsLike}℃）`,
      `湿度: ${weather.humidity}%`,
    ];
    return { text: lines.join("\n") };
  } catch {
    return { text: "天気情報を取得できませんでした。しばらくしてからもう一度試してね。" };
  }
}

async function handleSchedule(
  userId: string,
  _args: string,
): Promise<CommandResponse> {
  const report = await generateDailyReport(userId);
  return { text: formatDailyReportMessage(report) };
}

async function handleRemind(
  userId: string,
  args: string,
): Promise<CommandResponse> {
  if (!args) {
    const reminders = await listReminders(userId);
    if (reminders.length === 0) {
      return { text: "リマインダーは設定されていません。\n例: /remind 07:00 薬を飲む" };
    }
    const lines = [
      "🔔 リマインダー一覧",
      "",
      ...reminders.map((r, i) => `${i + 1}. ${r.cronExpression} — ${r.message}`),
    ];
    return { text: lines.join("\n") };
  }

  // Parse: /remind HH:MM message
  const match = /^(\d{1,2}):(\d{2})\s+(.+)$/.exec(args);
  if (!match) {
    return { text: "形式: /remind HH:MM メッセージ\n例: /remind 07:00 薬を飲む" };
  }

  const hour = match[1].padStart(2, "0");
  const min = match[2];
  const msg = match[3];
  const cron = `${min} ${hour} * * *`;
  await registerReminder(userId, cron, msg);

  return { text: `✅ ${hour}:${min} に「${msg}」をリマインドするね！` };
}
