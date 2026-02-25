# LINE AIパートナー — 現時点の状態

> 最終更新: 2026-02-25

---

## ブランチ・コミット情報

| 項目                 | 値                                         |
| -------------------- | ------------------------------------------ |
| ブランチ             | `claude/line-ai-partner-setup-9hqMV`       |
| 最新コミットハッシュ | `b6e3ab4c246c18b78c9b072982ed3fc169239b7e` |
| コミット数           | 9（ベースブランチから）                    |
| ベースブランチ       | `main`                                     |

---

## ビルド状態

| チェック             | 状態                                   | コマンド                               |
| -------------------- | -------------------------------------- | -------------------------------------- |
| TypeScript型チェック | PASS (0エラー in src/line-ai-partner/) | `pnpm tsc --noEmit`                    |
| テスト               | PASS (36テスト, 4ファイル)             | `pnpm vitest run src/line-ai-partner/` |
| Lint                 | PASS (0エラー)                         | `pnpm check`                           |

### テスト内訳

| テストファイル           | テスト数 | 状態 |
| ------------------------ | -------- | ---- |
| `soul-generator.test.ts` | 18       | PASS |
| `onboarding.test.ts`     | 7        | PASS |
| `message-router.test.ts` | 5        | PASS |
| `billing/plans.test.ts`  | 6        | PASS |

---

## 何が動く状態か

### 動作するもの（テスト済み）

| 機能                        | ファイル             | 状態                                         |
| --------------------------- | -------------------- | -------------------------------------------- |
| SOUL.md動的生成             | `soul-generator.ts`  | 100通りの組み合わせでMarkdown生成            |
| オンボーディングフロー      | `onboarding.ts`      | 全遷移パス (new -> complete)                 |
| メッセージルーティング      | `message-router.ts`  | 意図検出+コマンド+会話ルーティング           |
| スラッシュコマンド          | `command-handler.ts` | /help, /setting, /weather, /remind等         |
| プラン定義+機能ゲーティング | `billing/plans.ts`   | Free/Standard/Premium                        |
| デイリーレポート生成        | `daily-assistant.ts` | 天気+予定+服装のフォーマット                 |
| Flex Messageテンプレート    | `flex-templates.ts`  | レポート/オンボーディング/リマインダーカード |
| OpenClaw型整合              | `types.ts`           | LineConfig/ResolvedLineAccount再エクスポート |
| OpenClaw Webhook橋渡し      | `integration.ts`     | processPartnerMessage(LineInboundContext)    |
| OpenClawメモリ検索          | `memory-manager.ts`  | searchConversationMemory()                   |

### まだ動かないもの（未接続/未実装）

| 機能                               | 理由                     | 必要な作業                                            |
| ---------------------------------- | ------------------------ | ----------------------------------------------------- |
| LINE Webhookからの実メッセージ受信 | LINE Developers未設定    | Phase 7: Console設定+Webhook URL                      |
| AI応答生成（LLM）                  | LLM呼び出し未実装        | `message-router.ts` の "conversation" ケースにLLM接続 |
| Cron実行（リマインダー/朝挨拶）    | 実行エンジン未実装       | setInterval/node-cronの導入                           |
| processPartnerMessageのgateway登録 | channel.tsへの接続未実施 | extensions/line/src/channel.tsに登録                  |
| 天気API実呼び出し                  | APIキー未設定            | OPENWEATHERMAP_API_KEY設定                            |
| Google Calendar/Drive              | OAuth未設定              | Google Cloud Console設定                              |
| Notion連携                         | OAuth未設定              | Notion Integration設定                                |
| Stripe課金                         | 本番キー未設定           | Stripe Dashboard設定                                  |
| Stripe Webhook署名検証             | 未実装                   | stripe-service.tsに追加                               |

---

## デプロイ状態

| 項目             | 状態                                                 |
| ---------------- | ---------------------------------------------------- |
| 本番環境         | **未デプロイ**                                       |
| ステージング環境 | **未構築**                                           |
| Docker Compose   | 設定ファイルあり（deploy/docker-compose.yml）※未検証 |
| fly.toml         | 設定ファイルあり（deploy/fly.toml）※未検証           |
| .env.example     | テンプレートあり（deploy/.env.example）              |

---

## 環境構築手順

### 必要なもの

- Node.js 22+
- pnpm

### セットアップ

```bash
# リポジトリクローン+ブランチ切り替え
git clone https://github.com/openclaw/openclaw.git
cd openclaw
git checkout claude/line-ai-partner-setup-9hqMV

# 依存関係インストール
pnpm install

# ビルド確認
pnpm tsc --noEmit

# テスト実行
pnpm vitest run src/line-ai-partner/

# Lint確認
pnpm check
```

### 必要なAPIキー（本番接続時）

| 環境変数                    | 取得先                  | 用途                 |
| --------------------------- | ----------------------- | -------------------- |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console | LINE Messaging API   |
| `LINE_CHANNEL_SECRET`       | LINE Developers Console | Webhook署名検証      |
| `OPENWEATHERMAP_API_KEY`    | openweathermap.org      | 天気情報             |
| `GOOGLE_CLIENT_ID`          | Google Cloud Console    | Calendar/Drive OAuth |
| `GOOGLE_CLIENT_SECRET`      | Google Cloud Console    | Calendar/Drive OAuth |
| `OAUTH_REDIRECT_URI`        | 自分のドメイン          | OAuth callback URL   |
| `NOTION_CLIENT_ID`          | Notion Integrations     | Notion OAuth         |
| `NOTION_CLIENT_SECRET`      | Notion Integrations     | Notion OAuth         |
| `STRIPE_SECRET_KEY`         | Stripe Dashboard        | 課金処理             |
| `STRIPE_STANDARD_PRICE_ID`  | Stripe Dashboard        | Standardプラン価格ID |
| `STRIPE_PREMIUM_PRICE_ID`   | Stripe Dashboard        | Premiumプラン価格ID  |

### .env設定例

```bash
# .env（deploy/.env.exampleを参照）
LINE_CHANNEL_ACCESS_TOKEN=your-token
LINE_CHANNEL_SECRET=your-secret
OPENWEATHERMAP_API_KEY=your-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_STANDARD_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
```
