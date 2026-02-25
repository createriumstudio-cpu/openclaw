// LINE AI Partner – barrel export

// Types
export type {
  PersonalityType,
  CommunicationStyle,
  RelationshipType,
  OnboardingState,
  UserProfile,
  UserPreferences,
  QuickReplyItem,
  OnboardingResponse,
  DailyReport,
} from "./types.js";

// Phase 2-A: Core engine
export { generateSoulMd } from "./soul-generator.js";
export { handleOnboarding } from "./onboarding.js";
export {
  getUserProfile,
  saveUserProfile,
  getConversationMemory,
  saveConversationMemory,
} from "./memory-manager.js";

// Phase 2-B: Daily assistant & cron
export type { WeatherInfo } from "./weather-service.js";
export {
  getWeather,
  translateWeatherDescription,
  weatherIconToEmoji,
} from "./weather-service.js";
export {
  generateDailyReport,
  generateOutfitSuggestion,
  formatDailyReportMessage,
} from "./daily-assistant.js";
export type { Reminder } from "./cron-manager.js";
export {
  registerMorningGreeting,
  getMorningGreetingTime,
  registerReminder,
  cancelReminder,
  listReminders,
} from "./cron-manager.js";
export {
  createDailyReportCard,
  createOnboardingCard,
  createReminderCard,
} from "./flex-templates.js";

// Phase 2-C: Message routing & integration
export { routeMessage, type RouterResponse } from "./message-router.js";
export {
  isCommand,
  handleCommand,
  type CommandResponse,
} from "./command-handler.js";
export type { LinePartnerEvent, LineOutboundMessage } from "./integration.js";
export {
  processEvent,
  getSoulContext,
  buildMorningGreeting,
} from "./integration.js";
