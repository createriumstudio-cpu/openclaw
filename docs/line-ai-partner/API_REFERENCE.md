# LINE AIパートナー APIリファレンス

## モジュール一覧

### types.ts — 型定義

| 型名                 | 説明                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `PersonalityType`    | `'gentle' \| 'cheerful' \| 'cool' \| 'tsundere' \| 'intellectual'`                                        |
| `CommunicationStyle` | `'casual' \| 'polite' \| 'friendly' \| 'formal'`                                                          |
| `RelationshipType`   | `'family' \| 'friend' \| 'lover' \| 'pet' \| 'assistant'`                                                 |
| `OnboardingState`    | `'new' \| 'asking_name' \| 'asking_personality' \| 'asking_style' \| 'asking_relationship' \| 'complete'` |
| `UserProfile`        | ユーザープロファイル（userId, displayName, personalityType, etc.）                                        |
| `DailyReport`        | デイリーレポート（weather, schedule, reminders, outfitSuggestion）                                        |

### soul-generator.ts — SOUL.md動的生成

| 関数             | 引数                   | 戻り値   | 説明                          |
| ---------------- | ---------------------- | -------- | ----------------------------- |
| `generateSoulMd` | `profile: UserProfile` | `string` | ユーザー設定からSOUL.mdを生成 |

### onboarding.ts — オンボーディングフロー

| 関数               | 引数                                                      | 戻り値                        | 説明                            |
| ------------------ | --------------------------------------------------------- | ----------------------------- | ------------------------------- |
| `handleOnboarding` | `userId: string, message: string, state: OnboardingState` | `Promise<OnboardingResponse>` | ステートマシンを1ステップ進める |

### memory-manager.ts — メモリ管理

| 関数                     | 引数                                         | 戻り値                         | 説明             |
| ------------------------ | -------------------------------------------- | ------------------------------ | ---------------- |
| `getUserProfile`         | `userId: string`                             | `Promise<UserProfile \| null>` | プロファイル取得 |
| `saveUserProfile`        | `userId: string, profile: UserProfile`       | `Promise<void>`                | プロファイル保存 |
| `getConversationMemory`  | `userId: string, key: string`                | `Promise<string \| null>`      | 会話メモリ取得   |
| `saveConversationMemory` | `userId: string, key: string, value: string` | `Promise<void>`                | 会話メモリ保存   |

### weather-service.ts — 天気情報

| 関数                          | 引数               | 戻り値                 | 説明                             |
| ----------------------------- | ------------------ | ---------------------- | -------------------------------- |
| `getWeather`                  | `location: string` | `Promise<WeatherInfo>` | OpenWeatherMap API経由で天気取得 |
| `translateWeatherDescription` | `desc: string`     | `string`               | 英語→日本語天気表現変換          |
| `weatherIconToEmoji`          | `icon: string`     | `string`               | 天気アイコン→絵文字変換          |

### daily-assistant.ts — デイリーアシスタント

| 関数                       | 引数                                           | 戻り値                 | 説明                             |
| -------------------------- | ---------------------------------------------- | ---------------------- | -------------------------------- |
| `generateDailyReport`      | `userId: string`                               | `Promise<DailyReport>` | 天気+予定+リマインダーを集約     |
| `generateOutfitSuggestion` | `weather: WeatherInfo, prefs: UserPreferences` | `string`               | 気温に基づく服装提案             |
| `formatDailyReportMessage` | `report: DailyReport`                          | `string`               | テキストメッセージにフォーマット |

### cron-manager.ts — Cronジョブ管理

| 関数                      | 引数                                            | 戻り値                    | 説明                       |
| ------------------------- | ----------------------------------------------- | ------------------------- | -------------------------- |
| `registerMorningGreeting` | `userId: string, wakeTime: string`              | `Promise<void>`           | 朝の挨拶登録               |
| `getMorningGreetingTime`  | `userId: string`                                | `Promise<string \| null>` | 起床時間取得               |
| `registerReminder`        | `userId: string, cron: string, message: string` | `Promise<string>`         | リマインダー登録（ID返却） |
| `cancelReminder`          | `userId: string, reminderId: string`            | `Promise<boolean>`        | リマインダー取消           |
| `listReminders`           | `userId: string`                                | `Promise<Reminder[]>`     | リマインダー一覧           |

### message-router.ts — メッセージルーター

| 関数           | 引数                              | 戻り値                    | 説明                                 |
| -------------- | --------------------------------- | ------------------------- | ------------------------------------ |
| `routeMessage` | `userId: string, message: string` | `Promise<RouterResponse>` | メッセージを適切なハンドラに振り分け |

### command-handler.ts — コマンドハンドラ

| 関数            | 引数                              | 戻り値                     | 説明                   |
| --------------- | --------------------------------- | -------------------------- | ---------------------- |
| `isCommand`     | `message: string`                 | `boolean`                  | スラッシュコマンド判定 |
| `handleCommand` | `userId: string, message: string` | `Promise<CommandResponse>` | コマンド実行           |

**対応コマンド:** `/help`, `/setting`, `/personality`, `/style`, `/weather`, `/schedule`, `/remind`

### integration.ts — OpenClaw統合

| 関数                   | 引数                                  | 戻り値                                 | 説明                |
| ---------------------- | ------------------------------------- | -------------------------------------- | ------------------- |
| `processEvent`         | `event: LinePartnerEvent`             | `Promise<LineOutboundMessage[]>`       | Webhookイベント処理 |
| `getSoulContext`       | `userId: string`                      | `Promise<string \| null>`              | AIコンテキスト取得  |
| `buildMorningGreeting` | `userId: string, currentHHMM: string` | `Promise<LineOutboundMessage \| null>` | 朝の挨拶生成        |

### flex-templates.ts — Flex Messageテンプレート

| 関数                    | 引数                                       | 戻り値        | 説明                       |
| ----------------------- | ------------------------------------------ | ------------- | -------------------------- |
| `createDailyReportCard` | `report: DailyReport`                      | `FlexMessage` | 天気+予定+服装カード       |
| `createOnboardingCard`  | `step: OnboardingState, options: string[]` | `FlexMessage` | オンボーディング選択カード |
| `createReminderCard`    | `reminder: Reminder`                       | `FlexMessage` | リマインダー通知カード     |

### billing/plans.ts — プラン定義

| 定数/関数         | 説明                                       |
| ----------------- | ------------------------------------------ |
| `FREE_PLAN`       | フリー（0円/月, 50メッセージ）             |
| `STANDARD_PLAN`   | スタンダード（980円/月, 無制限メッセージ） |
| `PREMIUM_PLAN`    | プレミアム（1,980円/月, 全機能+外部連携）  |
| `getPlanById(id)` | プランID → Plan                            |

### billing/stripe-service.ts — Stripe連携

| 関数                 | 引数                 | 戻り値                  | 説明                 |
| -------------------- | -------------------- | ----------------------- | -------------------- |
| `createCustomer`     | `userId, email`      | `Promise<string>`       | Stripe顧客作成       |
| `createSubscription` | `customerId, planId` | `Promise<Subscription>` | サブスク作成         |
| `cancelSubscription` | `subscriptionId`     | `Promise<void>`         | サブスク解約         |
| `handleWebhook`      | `event`              | `Promise<void>`         | Stripe Webhook処理   |
| `getActivePlan`      | `userId`             | `Promise<Plan>`         | 有効プラン取得       |
| `hasFeature`         | `userId, feature`    | `Promise<boolean>`      | 機能アクセスチェック |

### billing/usage-tracker.ts — 使用量管理

| 関数                | 引数     | 戻り値                | 説明                                   |
| ------------------- | -------- | --------------------- | -------------------------------------- |
| `trackMessage`      | `userId` | `Promise<boolean>`    | メッセージカウント（制限チェック付き） |
| `getUsage`          | `userId` | `Promise<UsageStats>` | 使用量統計取得                         |
| `resetMonthlyUsage` | —        | `Promise<void>`       | 月次リセット                           |

## Webhookエンドポイント

| パス              | メソッド | 説明                       |
| ----------------- | -------- | -------------------------- |
| `/webhook/line`   | POST     | LINE Messaging API Webhook |
| `/webhook/stripe` | POST     | Stripe Webhook             |
| `/oauth/callback` | GET      | OAuth2コールバック         |
| `/health`         | GET      | ヘルスチェック             |
