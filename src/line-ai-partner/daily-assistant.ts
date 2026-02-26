import { getUserProfile, getConversationMemory } from "./memory-manager.js";
// LINE AI Partner – Daily assistant logic
import type { DailyReport, UserPreferences } from "./types.js";
import { type WeatherInfo, getWeather, weatherIconToEmoji } from "./weather-service.js";

// ---------------------------------------------------------------------------
// Outfit suggestion
// ---------------------------------------------------------------------------

/** Generate a Japanese outfit suggestion based on weather and preferences. */
export function generateOutfitSuggestion(
  weather: WeatherInfo,
  _preferences: UserPreferences,
): string {
  const t = weather.temp;

  if (t >= 30) {
    return "暑いので半袖・短パンがおすすめ！日焼け止めも忘れずに 🧴";
  }
  if (t >= 25) {
    return "Tシャツ1枚で快適に過ごせそう 👕";
  }
  if (t >= 20) {
    return "薄手の長袖やカーディガンがちょうどいいかも 🧥";
  }
  if (t >= 15) {
    return "ジャケットや軽めのアウターがあると安心 🧥";
  }
  if (t >= 10) {
    return "しっかりめのアウターが必要です。マフラーもあると◎ 🧣";
  }
  if (t >= 5) {
    return "コートにマフラー、手袋があると快適です 🧤";
  }
  return "真冬の装備で！ダウンコート必須、防寒対策をしっかり ❄️";
}

// ---------------------------------------------------------------------------
// Daily report generation
// ---------------------------------------------------------------------------

/** Build a daily report for a user. */
export async function generateDailyReport(userId: string): Promise<DailyReport> {
  const profile = await getUserProfile(userId);
  const report: DailyReport = {};

  // Weather
  const location = profile?.preferences.weatherLocation;
  if (location) {
    try {
      const weather = await getWeather(location);
      const emoji = weatherIconToEmoji(weather.icon);
      report.weather = {
        description: `${emoji} ${weather.description}`,
        temperature: weather.temp,
        humidity: weather.humidity,
      };
      report.outfitSuggestion = generateOutfitSuggestion(weather, profile?.preferences ?? {});
    } catch {
      report.weather = {
        description: "天気情報を取得できませんでした",
        temperature: 0,
      };
    }
  }

  // Reminders from memory
  const remindersRaw = await getConversationMemory(userId, "reminders");
  if (remindersRaw) {
    try {
      report.reminders = JSON.parse(remindersRaw) as string[];
    } catch {
      // ignore parse errors
    }
  }

  return report;
}

/** Format a daily report into a text message. */
export function formatDailyReportMessage(report: DailyReport): string {
  const lines: string[] = ["おはよう！今日のレポートだよ ☀️", ""];

  if (report.weather) {
    lines.push("【天気】");
    lines.push(`${report.weather.description} ${report.weather.temperature}℃`);
    if (report.weather.humidity != null) {
      lines.push(`湿度: ${report.weather.humidity}%`);
    }
    lines.push("");
  }

  if (report.outfitSuggestion) {
    lines.push("【服装】");
    lines.push(report.outfitSuggestion);
    lines.push("");
  }

  if (report.schedule?.length) {
    lines.push("【予定】");
    for (const item of report.schedule) {
      lines.push(`${item.time} ${item.title}`);
    }
    lines.push("");
  }

  if (report.reminders?.length) {
    lines.push("【リマインダー】");
    for (const r of report.reminders) {
      lines.push(`・${r}`);
    }
    lines.push("");
  }

  lines.push("今日も頑張ろうね！💪");
  return lines.join("\n");
}
