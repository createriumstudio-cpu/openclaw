# LINE AIパートナー 開発タスク管理

> 最終更新: 2026-02-25

## ステータス凡例

- [ ] 未着手
- [x] 完了
- [~] 進行中
- [!] ブロック中

---

## Phase 1: 基盤整備・現状把握 [完了]

- [x] 既存 LINE インテグレーションのコード調査
- [x] アーキテクチャ全体像の把握（コア層 `src/line/` + プラグイン層 `extensions/line/`）
- [x] テストカバレッジの確認（15テストファイル、約2,249 LOC）
- [x] プロジェクト管理ファイルの作成
- [x] マルチテナント対応設定ファイル作成
- [x] オンボーディングフローのスキル作成
- [x] SOUL.md テンプレート作成
- [x] デイリーアシスタントスキル作成

## Phase 2-A: AIパートナーコアエンジン [完了]

- [x] 型定義の実装（`src/line-ai-partner/types.ts`）
- [x] SOUL.md 動的生成エンジン（`src/line-ai-partner/soul-generator.ts`）
- [x] オンボーディングフロー実装（`src/line-ai-partner/onboarding.ts`）
- [x] ユーザーメモリ管理（`src/line-ai-partner/memory-manager.ts`）
- [x] エクスポートバレル（`src/line-ai-partner/index.ts`）

## Phase 2-B: デイリーアシスタント+Cron通知 [完了]

- [x] 天気情報取得サービス（`weather-service.ts`）
- [x] デイリーレポート生成（`daily-assistant.ts`）
- [x] Cronジョブ管理・リマインダー（`cron-manager.ts`）
- [x] Flex Messageテンプレート集（`flex-templates.ts`）

## Phase 2-C: メッセージルーティング+統合 [完了]

- [x] メッセージルーター（`message-router.ts`）
- [x] スラッシュコマンドハンドラ（`command-handler.ts`）
- [x] OpenClaw統合レイヤー（`integration.ts`）

## Phase 3: 外部サービス統合レイヤー [完了]

- [x] OAuth2フロー管理（`integrations/oauth-manager.ts`）
- [x] Google Calendar連携（`integrations/google-calendar.ts`）
- [x] Google Drive連携（`integrations/google-drive.ts`）
- [x] Notion連携（`integrations/notion.ts`）
- [x] 統合バレルエクスポート（`integrations/index.ts`）

## Phase 4: マネタイズ+デプロイ設定 [完了]

- [x] プラン定義+機能ゲーティング（`billing/plans.ts`）
- [x] Stripe決済連携（`billing/stripe-service.ts`）
- [x] 使用量トラッキング（`billing/usage-tracker.ts`）
- [x] Docker Compose設定
- [x] Fly.ioデプロイ設定
- [x] 環境変数テンプレート

## Phase 5: テスト+ドキュメント [完了]

- [x] SOUL.md生成テスト（18テスト）
- [x] オンボーディングフローテスト（7テスト）
- [x] メッセージルーターテスト（5テスト）
- [x] プラン定義テスト（6テスト）
- [x] セットアップガイド
- [x] APIリファレンス

## Phase 6: OpenClaw実結合+型整合 [完了]

- [x] `types.ts`: LineConfig/ResolvedLineAccount/LineWebhookContext再エクスポート
- [x] `types.ts`: LinePartnerConfig拡張型追加
- [x] `memory-manager.ts`: OpenClaw SubsystemLogger統合
- [x] `memory-manager.ts`: searchConversationMemory() — MemoryIndexManager橋渡し
- [x] `integration.ts`: processPartnerMessage(LineInboundContext) 実装
- [x] `integration.ts`: sendMessageLine/pushFlexMessage/showLoadingAnimation接続
- [x] `integration.ts`: pushMorningGreeting() — ResolvedLineAccount対応
- [x] `billing/stripe-service.ts`: URLSearchParams型エラー修正
- [x] `billing/stripe-service.ts`: lintエラー修正（未使用import、spread）
- [x] `index.ts`: 新API公開（processPartnerMessage等）
- [x] 全36テストパス、tsc --noEmitゼロエラー

---

## Phase 7: LINE Developers Console設定 + Webhook接続 [未着手]

- [ ] LINE Developers Consoleでチャンネル作成
- [ ] チャンネルアクセストークン発行
- [ ] チャンネルシークレット取得
- [ ] Webhook URL設定（`https://<domain>/line/webhook`）
- [ ] Webhookの利用をONに切り替え
- [ ] 応答メッセージをOFFに切り替え
- [ ] OpenClaw config設定（channelAccessToken, channelSecret）
- [ ] `openclaw channels status --probe` で接続確認
- [ ] processPartnerMessageをextensions/line/src/channel.tsに登録

## Phase 8: 外部API実接続 [未着手]

- [ ] OpenWeatherMap APIキー取得+設定
- [ ] `/weather` コマンドで天気取得テスト
- [ ] Google Cloud ConsoleでOAuth2クライアント作成
- [ ] Google Calendar連携テスト
- [ ] Google Drive連携テスト
- [ ] Notion Integration作成+OAuth設定
- [ ] Notion連携テスト
- [ ] AI応答生成のLLM接続（message-router.ts "conversation" ケース）
- [ ] Cron実行エンジン実装（setInterval/node-cron）

## Phase 9: Stripe本番設定 + サブスク課金フロー [未着手]

- [ ] Stripe Dashboardで商品・価格作成（Standard 980円, Premium 1980円）
- [ ] Stripe本番キー取得+設定
- [ ] Stripe Webhook署名検証の実装
- [ ] `/subscribe` コマンド実装
- [ ] `/plan` コマンド実装
- [ ] 課金ステータス変更時のLINE通知実装
- [ ] 使用量制限到達時のメッセージ実装

## Phase 10: fly.io or Railwayデプロイ + CI/CD [未着手]

- [ ] fly.ioアプリ作成（東京リージョン nrt）
- [ ] シークレット設定（環境変数）
- [ ] 初回デプロイ+動作確認
- [ ] GitHub Actions CI/CDパイプライン構築
- [ ] ステージング環境構築

## Phase 11: E2Eテスト + ステージング検証 [未着手]

- [ ] オンボーディングフローE2Eテスト
- [ ] 天気/スケジュール/リマインダーE2Eテスト
- [ ] 設定変更E2Eテスト
- [ ] 課金フローE2Eテスト
- [ ] Flex Message表示確認
- [ ] エラーハンドリングテスト

## Phase 12: 本番リリース + モニタリング [未着手]

- [ ] 全テストパス確認
- [ ] 環境変数設定完了確認
- [ ] LINE/Stripe Webhook接続確認
- [ ] SSL証明書確認
- [ ] 本番デプロイ
- [ ] ログ監視設定
- [ ] エラーアラート設定（Sentry等）
- [ ] 死活監視設定
- [ ] 月次使用量レポート設定

---

## 優先度の高い課題

| 課題                        | 優先度 | 備考                                         |
| --------------------------- | ------ | -------------------------------------------- |
| LINE Developers Console設定 | 最高   | Phase 7 — 本番接続の前提                     |
| AI応答生成のLLM接続         | 高     | message-router.ts "conversation" ケース      |
| processPartnerMessage登録   | 高     | channel.tsのprocessMessageコールバックに接続 |
| fly.ioデプロイ              | 高     | Phase 10                                     |
| Stripe Webhook署名検証      | 高     | セキュリティ必須                             |
| Cron実行エンジン            | 中     | リマインダー/朝挨拶の実行基盤                |

---

## メモ

- 対象市場: 日本/台湾/タイ
- LINE Messaging API のレート制限に注意
- Flex Message は LINE バージョンにより表示が異なる場合がある
- リプライトークンは1回限り使用可能（5メッセージまで）
- 詳細なロードマップ: `ROADMAP.md`
- 現在の状態: `CURRENT_STATUS.md`
- トラブルシューティング: `DEBUG_GUIDE.md`
- 引き継ぎ情報: `HANDOFF.md`
