// LINE AI Partner – barrel export

// Core LINE types (re-exported from src/line/types.ts via types.ts)
export type {
  LineConfig,
  ResolvedLineAccount,
  LineWebhookContext,
  LineSendResult,
  LinePartnerConfig,
} from "./types.js";

// AI Partner types
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
  searchConversationMemory,
} from "./memory-manager.js";

// Phase 2-B: Daily assistant & cron
export type { WeatherInfo } from "./weather-service.js";
export {
  getWeather,
  getWeatherForecast,
  translateWeatherDescription,
  weatherIconToEmoji,
} from "./weather-service.js";
export {
  generateDailyReport,
  generateOutfitSuggestion,
  formatDailyReportMessage,
} from "./daily-assistant.js";
export type { Reminder } from "./cron-manager.js";
export type { CronCallbacks } from "./cron-manager.js";
export {
  registerMorningGreeting,
  getMorningGreetingTime,
  registerReminder,
  cancelReminder,
  listReminders,
  startCronEngine,
  stopCronEngine,
} from "./cron-manager.js";
export {
  createDailyReportCard,
  createOnboardingCard,
  createReminderCard,
} from "./flex-templates.js";

// Phase 2-C: Message routing & integration
export { routeMessage, type RouterResponse } from "./message-router.js";
export { isCommand, handleCommand, type CommandResponse } from "./command-handler.js";
export type { LinePartnerEvent, LineOutboundMessage, LineInboundContext } from "./integration.js";
export {
  processPartnerMessage,
  processEvent,
  getSoulContext,
  pushMorningGreeting,
  buildMorningGreeting,
} from "./integration.js";

// Phase 4: Billing & usage
export type { Plan, PlanFeature } from "./billing/plans.js";
export { FREE_PLAN, STANDARD_PLAN, PREMIUM_PLAN, getPlanById, ALL_PLANS } from "./billing/plans.js";
export type { Subscription } from "./billing/stripe-service.js";
export {
  createCustomer,
  createSubscription,
  cancelSubscription,
  handleWebhook,
  verifyWebhookSignature,
  getActivePlan,
  hasFeature,
} from "./billing/stripe-service.js";
export type { UsageStats } from "./billing/usage-tracker.js";
export { trackMessage, getUsage, resetMonthlyUsage } from "./billing/usage-tracker.js";

// Phase 3: External service integrations
export type { TokenSet, CalendarEvent, DriveFile, NotionPage } from "./integrations/index.js";
export {
  initiateOAuth,
  handleCallback,
  getConnectedServices,
  getTodaySchedule,
  createEvent,
  searchFiles,
  getFileContent,
  queryDatabase,
  createPage,
} from "./integrations/index.js";
