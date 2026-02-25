# LINE AIパートナー 開発タスク管理

> 最終更新: 2026-02-25

## ステータス凡例

- [ ] 未着手
- [x] 完了
- [~] 進行中
- [!] ブロック中

---

## フェーズ 1: 基盤整備・現状把握

- [x] 既存 LINE インテグレーションのコード調査
- [x] アーキテクチャ全体像の把握（コア層 `src/line/` + プラグイン層 `extensions/line/`）
- [x] テストカバレッジの確認（15テストファイル、約2,249 LOC）
- [x] プロジェクト管理ファイルの作成
- [x] マルチテナント対応設定ファイル作成（`config/line-ai-partner.json`）
- [x] オンボーディングフローのスキル作成（`skills/line-onboarding/SKILL.md`）
- [x] SOUL.md テンプレート作成（`templates/SOUL_TEMPLATE.md`）
- [x] デイリーアシスタントスキル作成（`skills/daily-assistant/SKILL.md`）
- [ ] 開発環境のセットアップ手順書作成
- [ ] LINE Developers Console の設定確認

## フェーズ 2: コア機能の強化

### メッセージング基盤

- [ ] Postback イベントハンドリングの拡充（現状カバレッジが薄い）
- [ ] グループ参加/退出イベント（`JoinEvent`/`LeaveEvent`）の処理追加
- [ ] Quick Reply アイテム数の上限バリデーション追加（LINE API上限: 13件）
- [ ] Flex Message の事前バリデーション機能追加
- [ ] 動画メッセージ送信（`createVideoMessage`）の実装

### AI パートナー機能（Phase 2-A）

- [x] 型定義の実装（`src/line-ai-partner/types.ts`）
- [x] SOUL.md 動的生成エンジン（`src/line-ai-partner/soul-generator.ts`）
- [x] オンボーディングフロー実装（`src/line-ai-partner/onboarding.ts`）
- [x] ユーザーメモリ管理（`src/line-ai-partner/memory-manager.ts`）
- [x] エクスポートバレル（`src/line-ai-partner/index.ts`）
- [ ] コンテキスト管理（会話履歴の保持・要約）
- [ ] マルチターン会話の最適化
- [ ] 感情分析に基づく応答調整

### デイリーアシスタント＆Cron通知（Phase 2-B）

- [x] 天気情報取得サービス（`src/line-ai-partner/weather-service.ts`）
- [x] デイリーレポート生成（`src/line-ai-partner/daily-assistant.ts`）
- [x] Cronジョブ管理・リマインダー（`src/line-ai-partner/cron-manager.ts`）
- [x] Flex Messageテンプレート集（`src/line-ai-partner/flex-templates.ts`）

### メッセージルーティング＆統合（Phase 2-C）

- [x] メッセージルーター（`src/line-ai-partner/message-router.ts`）
- [x] スラッシュコマンドハンドラ（`src/line-ai-partner/command-handler.ts`）
- [x] OpenClaw統合レイヤー（`src/line-ai-partner/integration.ts`）

### 外部サービス統合（Phase 3）

- [x] OAuth2フロー管理（`integrations/oauth-manager.ts`）
- [x] Google Calendar連携（`integrations/google-calendar.ts`）
- [x] Google Drive連携（`integrations/google-drive.ts`）
- [x] Notion連携（`integrations/notion.ts`）
- [x] 統合バレルエクスポート（`integrations/index.ts`）

### マネタイズ＆デプロイ（Phase 4）

- [x] プラン定義＆機能ゲーティング（`billing/plans.ts`）
- [x] Stripe決済連携（`billing/stripe-service.ts`）
- [x] 使用量トラッキング（`billing/usage-tracker.ts`）
- [x] Docker Compose設定（`deploy/docker-compose.yml`）
- [x] Fly.ioデプロイ設定（`deploy/fly.toml`）
- [x] 環境変数テンプレート（`deploy/.env.example`）

### テスト＆ドキュメント（Phase 5）

- [x] SOUL.md生成テスト（`soul-generator.test.ts`）
- [x] オンボーディングフローテスト（`onboarding.test.ts`）
- [x] メッセージルーターテスト（`message-router.test.ts`）
- [x] プラン定義テスト（`billing/plans.test.ts`）
- [x] セットアップガイド（`docs/line-ai-partner/SETUP_GUIDE.md`）
- [x] APIリファレンス（`docs/line-ai-partner/API_REFERENCE.md`）

### リッチ UI（残タスク）

- [ ] Flex Message テンプレートの拡張（対話型カード等）
- [ ] リッチメニューの動的切り替え機能
- [ ] カルーセルを活用した情報表示の改善
- [ ] LIFF（LINE Front-end Framework）連携の検討

## フェーズ 3: 運用・品質改善（残タスク）

### テスト

- [ ] Postback ハンドラのテスト追加
- [ ] グループイベント処理のテスト追加
- [ ] E2E テストシナリオの拡充
- [ ] 負荷テストの実施

### 運用

- [ ] レート制限の実装（LINE API制限への対応）
- [ ] ユーザープロファイルキャッシュの改善（現状5分TTL）
- [ ] エラーメッセージの多言語対応（日本語/英語/タイ語/中国語）
- [ ] モニタリング・アラートの設計
- [ ] ログ出力の標準化

### ドキュメント

- [ ] API リファレンスの整備
- [ ] 運用手順書の作成
- [ ] トラブルシューティングガイドの作成

## フェーズ 4: 拡張機能

- [ ] ブロードキャスト配信機能
- [ ] LINE ログイン連携
- [ ] LINE Pay 連携の検討
- [ ] LINE Beacon 連携の検討
- [ ] Audience 管理（ユーザーセグメント）

---

## 優先度の高い課題

| 課題 | 優先度 | 担当 | 備考 |
|------|--------|------|------|
| Postback ハンドリング拡充 | 高 | - | テストカバレッジも不足 |
| AI パートナーペルソナ設計 | 高 | - | Phase 2-A で基盤実装済み |
| Quick Reply バリデーション | 中 | - | LINE API 上限13件の制約 |
| 動画メッセージ送信 | 中 | - | 受信は対応済み、送信が未実装 |
| グループイベント処理 | 低 | - | 現状 Webhook は受信可能だが未処理 |

---

## メモ

- 対象市場: 日本/台湾/タイ
- LINE Messaging API のレート制限に注意
- Flex Message は LINE バージョンにより表示が異なる場合がある
- リプライトークンは1回限り使用可能（5メッセージまで）
