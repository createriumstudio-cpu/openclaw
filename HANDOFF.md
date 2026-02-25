# LINE AIパートナー — AIエージェント引き継ぎドキュメント

> 最終更新: 2026-02-25（Phase 7補完後）
> ブランチ: `claude/line-ai-partner-setup-9hqMV`
> 最新コミット: `4dd0d52`

---

## 1. プロジェクト概要

LINE AIパートナーは、OpenClawプラットフォーム上でLINE Messaging APIを活用した
パーソナライズ可能なAIアシスタントを提供するプロジェクト。

### 7つのコアコンセプト

1. **SOUL.md動的生成** — ユーザーが選んだ性格(5種)×口調(4種)×関係性(5種)=100通りの
   パーソナリティをMarkdownプロンプトとして動的生成し、AI応答の人格を制御する

2. **対話型オンボーディング** — LINE上でQuick Replyを使った段階的セットアップウィザード
   （名前→性格→口調→関係性）。途中離脱しても次回メッセージで続行可能

3. **デイリーアシスタント** — 天気情報・スケジュール・服装提案をFlex Messageカードで
   毎朝プッシュ配信。OpenWeatherMap API連携

4. **Cron通知エンジン** — ユーザー個別のリマインダーと朝の挨拶時刻を管理。
   自然言語（「7時に薬を飲む」）からのリマインダー自動登録

5. **インテリジェントメッセージルーティング** — キーワードベースの意図検出（天気/予定/
   リマインダー/設定変更）＋スラッシュコマンド＋AI会話のハイブリッドルーター

6. **外部サービス統合** — OAuth2共通マネージャーによるGoogle Calendar/Drive/Notion連携。
   Premiumプランで解放される段階的機能ゲーティング

7. **Stripe課金システム** — Free(50msg/月)/Standard(980円無制限)/Premium(1,980円全機能)
   の3段階プラン。使用量トラッキングと月次リセット

---

## 2. アーキテクチャ概要

```
LINE ユーザー
    |
    v (HTTPS)
LINE Platform (Messaging API)
    |
    | Webhook POST /line/webhook
    v
+------------------------------------------+
| OpenClaw Gateway                          |
|                                          |
|  extensions/line/     LINE プラグイン層    |
|       |                                  |
|       v                                  |
|  src/line/            LINE コア層         |
|  +-- signature.ts     署名検証           |
|  +-- bot-handlers.ts  イベントディスパッチ |
|  +-- bot-message-context.ts コンテキスト  |
|  +-- send.ts          送信エンジン        |
|       |                                  |
|       v  processMessage(LineInboundContext)|
|  src/line-ai-partner/ AIパートナー層      |
|  +-- integration.ts   Webhook橋渡し       |
|  +-- message-router.ts ルーティング       |
|  +-- soul-generator.ts SOUL.md生成        |
|  +-- onboarding.ts    初期設定ウィザード   |
|  +-- daily-assistant.ts デイリーレポート   |
|  +-- memory-manager.ts プロファイル永続化  |
|       |                                  |
|       v  sendMessageLine/pushFlexMessage  |
|  src/line/send.ts     LINE API送信        |
+------------------------------------------+
    |
    v (HTTPS)
LINE Platform -> ユーザーに配信
```

### メッセージフロー

1. **受信**: LINE Webhook → HMAC署名検証 → `handleLineWebhookEvents()` → `processMessage()`
2. **AI Partner処理**: `processPartnerMessage(LineInboundContext)` → `routeMessage()` → 各ハンドラ
3. **送信**: `sendMessageLine()` / `pushFlexMessage()` / `pushTextMessageWithQuickReplies()`

---

## 3. 技術スタック

| 項目           | 技術                        | 用途                              |
| -------------- | --------------------------- | --------------------------------- |
| ランタイム     | Node.js 22+ / Bun           | サーバー実行                      |
| 言語           | TypeScript (ESM)            | 全ソースコード                    |
| パッケージ管理 | pnpm                        | 依存関係管理                      |
| LINE SDK       | `@line/bot-sdk`             | Messaging API型定義・クライアント |
| 決済           | Stripe API                  | サブスクリプション課金            |
| カレンダー     | Google Calendar API v3      | スケジュール連携                  |
| ストレージ     | Google Drive API v3         | ファイル検索・内容取得            |
| ノート         | Notion API                  | データベース連携                  |
| 天気           | OpenWeatherMap API          | 天気予報・服装提案                |
| テスト         | Vitest + V8 coverage        | ユニットテスト                    |
| Lint/Format    | Oxlint + Oxfmt              | コード品質                        |
| メモリ検索     | OpenClaw MemoryIndexManager | ベクトル/ハイブリッド検索         |
| ログ           | OpenClaw SubsystemLogger    | 構造化ログ                        |

---

## 4. 重要な設計判断とその理由

| 決定事項                 | 理由                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **LINE as UI**           | 日本/台湾/タイでのLINE普及率が圧倒的。ネイティブアプリ開発不要。Flex Message + Quick Replyでリッチなインタラクション実現    |
| **Reply API無料活用**    | Reply APIは無料（Push APIは従量課金）。`sendMessageLine()` がreplyTokenを優先使用しコスト最適化                             |
| **session.dmScope**      | DM/グループをポリシーベースで分離。`dmPolicy`と`groupPolicy`で多層アクセス制御                                              |
| **SOUL.md動的生成**      | Recordルックアップテーブル方式で性格・口調・関係性を独立軸で組み合わせ。100通りの組み合わせを少ないコードで実現             |
| **Stripe課金**           | Free/Standard/Premium の3段階。`hasFeature()` による機能単位のゲーティングでアップセル                                      |
| **ファイルベースメモリ** | シンプルで依存なし。`~/.openclaw/line-ai-partner/` 配下にユーザー別ディレクトリ。OpenClawメモリシステムとの橋渡しも実装済み |
| **OpenClaw実結合**       | `src/line/` の既存型・送信関数を直接import。型の二重管理を避け、LINE APIとの実接続を確保                                    |

---

## 5. 残タスク一覧

| タスク                              | 状態     | 優先度 |
| ----------------------------------- | -------- | ------ |
| LINE Developers Console設定         | 未着手   | 最高   |
| Webhook URL設定（ドメイン取得+SSL） | 未着手   | 最高   |
| Stripe本番キー取得・設定            | 未着手   | 高     |
| Google OAuth設定（Calendar/Drive）  | 未着手   | 中     |
| Notion統合設定（OAuth App登録）     | 未着手   | 中     |
| OpenWeatherMap APIキー取得          | 未着手   | 中     |
| fly.io / Railwayデプロイ            | 未着手   | 高     |
| ~~AI応答生成のLLM接続~~             | **完了** | ~~高~~ |
| ~~Cron実行エンジン実装~~            | **完了** | ~~中~~ |
| ~~processPartnerMessage登録~~       | **完了** | ~~高~~ |
| ~~Stripe Webhook署名検証~~          | **完了** | ~~高~~ |
| E2Eテスト                           | 未着手   | 中     |
| 本番監視・アラート設定              | 未着手   | 高     |

---

## 6. リポジトリ構造（全ファイルと役割）

```
src/line-ai-partner/
+-- index.ts                    # バレルエクスポート（全公開API）
+-- types.ts                    # 型定義（LineConfig/ResolvedLineAccount再エクスポート含む）
+-- integration.ts              # OpenClaw Webhook橋渡し（processPartnerMessage）
+-- message-router.ts           # メッセージルーター（意図検出+ディスパッチ）
+-- command-handler.ts          # /help /setting /weather等スラッシュコマンド
+-- onboarding.ts               # 対話型オンボーディングウィザード
+-- soul-generator.ts           # SOUL.md動的生成エンジン
+-- memory-manager.ts           # プロファイル永続化+OpenClawメモリ検索橋渡し
+-- daily-assistant.ts          # デイリーレポート生成（天気・予定・服装）
+-- weather-service.ts          # OpenWeatherMap APIクライアント
+-- cron-manager.ts             # リマインダー+朝挨拶時刻管理
+-- flex-templates.ts           # Flex Messageカードテンプレート
+-- billing/
|   +-- plans.ts                # Free/Standard/Premium プラン定義
|   +-- plans.test.ts           # プランテスト（6テスト）
|   +-- stripe-service.ts       # Stripe API連携（顧客・サブスク・Webhook）
|   +-- usage-tracker.ts        # 月次使用量トラッキング
+-- integrations/
|   +-- index.ts                # 統合バレルエクスポート
|   +-- oauth-manager.ts        # OAuth2共通フローマネージャー
|   +-- google-calendar.ts      # Google Calendar API v3
|   +-- google-drive.ts         # Google Drive API v3
|   +-- notion.ts               # Notion API
+-- message-router.test.ts      # ルーターテスト（5テスト）
+-- onboarding.test.ts          # オンボーディングテスト（7テスト）
+-- soul-generator.test.ts      # SOUL生成テスト（18テスト）
```

### 関連するOpenClawコアファイル

| ファイル                          | 役割                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `src/line/types.ts`               | LineConfig, ResolvedLineAccount, LineWebhookContext等        |
| `src/line/bot-handlers.ts`        | handleLineWebhookEvents(), LineHandlerContext                |
| `src/line/bot-message-context.ts` | LineInboundContext, buildLineMessageContext()                |
| `src/line/send.ts`                | sendMessageLine(), pushFlexMessage(), showLoadingAnimation() |
| `src/line/signature.ts`           | HMAC-SHA256署名検証                                          |
| `src/memory/types.ts`             | MemorySearchManager, MemorySearchResult                      |
| `src/memory/manager.ts`           | MemoryIndexManager（ベクトル/ハイブリッド検索）              |
| `src/logging/subsystem.ts`        | createSubsystemLogger()                                      |
| `extensions/line/src/channel.ts`  | LINE ChannelPlugin（gateway.startAccount等）                 |

---

## 7. コミット履歴サマリー（11コミット）

| #   | ハッシュ  | メッセージ                                                   | 内容                                                                       |
| --- | --------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | `8a86d6f` | LINE AIパートナー: プロジェクト管理ファイルを追加            | tasks/todo.md, lessons.md, ARCHITECTURE.md, PROJECT_README.md              |
| 2   | `f7011fc` | feat: マルチテナント設定、オンボーディングフロー、スキル追加 | config, SOUL_TEMPLATE.md, スキル定義                                       |
| 3   | `00c61ff` | feat: Phase 2-A AIパートナーコアエンジン実装                 | types.ts, soul-generator.ts, onboarding.ts, memory-manager.ts              |
| 4   | `8c2aff1` | feat: Phase 2-B デイリーアシスタント+Cron通知エンジン        | weather-service.ts, daily-assistant.ts, cron-manager.ts, flex-templates.ts |
| 5   | `ede26a0` | feat: Phase 2-C メッセージルーティング+統合レイヤー          | message-router.ts, command-handler.ts, integration.ts                      |
| 6   | `31e7cdf` | feat: Phase 3 外部サービス統合レイヤー                       | oauth-manager.ts, google-calendar.ts, google-drive.ts, notion.ts           |
| 7   | `2269750` | feat: Phase 4 マネタイズ（Stripe）+デプロイ設定              | billing/_.ts, deploy/_                                                     |
| 8   | `34b9197` | feat: Phase 5 テスト+ドキュメント完成                        | \*.test.ts (4ファイル, 36テスト), docs/                                    |
| 9   | `b6e3ab4` | fix: OpenClaw既存コードとの実結合+型整合                     | types/memory/integrationをOpenClawコアに接続                               |
| 10  | `b64902f` | docs: AIエージェント引き継ぎドキュメント完備                 | HANDOFF.md, ROADMAP.md, CURRENT_STATUS.md, DEBUG_GUIDE.md                  |
| 11  | `4dd0d52` | feat: Phase 7補完 — LLM接続・gateway登録・Cron・Stripe・天気 | monitor.ts processMessage, channel.ts aiPartner, LLM callLLM, cron engine  |

---

## 8. 既知の問題・注意点

### コード上の制約

- **外部APIキー未設定**: Google/Notion/Weather（実API）/Stripe（本番）はAPIキー設定後に動作する
- `@line/bot-sdk` の `messagingApi.FlexContainer` 型へのキャストが必要な箇所あり

### Phase 7補完で実装済み（以前は未実装だったもの）

- **LLM会話応答**: `message-router.ts` の `"conversation"` ケースが `runEmbeddedPiAgent` に接続済み。SOUL.mdを `extraSystemPrompt` として渡す
- **Gateway登録**: `src/line/monitor.ts` に `processMessage` option追加、`extensions/line/src/channel.ts` で `channels.line.aiPartner.enabled` config対応
- **Cron実行エンジン**: `cron-manager.ts` に `startCronEngine(callbacks)` / `stopCronEngine()` 追加。60秒間隔で朝挨拶+リマインダーを発火
- **Stripe Webhook署名検証**: `verifyWebhookSignature()` でHMAC-SHA256+timing-safe comparison
- **天気API mock fallback**: APIキー未設定時は季節ベースmockデータ、`getWeatherForecast()` も追加

### OpenClaw統合の注意点

- `searchConversationMemory()` はOpenClawのメモリシステムが設定されている場合のみ動作
- `showLoadingAnimation()` はLINE APIのローディングアニメーション機能を使用（18秒間隔）
- `@line/bot-sdk` の `messagingApi.FlexContainer` 型へのキャストが必要な箇所あり

### データ保存先

| データ        | パス                                                    |
| ------------- | ------------------------------------------------------- |
| プロファイル  | `~/.openclaw/line-ai-partner/profiles/<userId>.json`    |
| 会話メモリ    | `~/.openclaw/line-ai-partner/memory/<userId>/<key>.txt` |
| Cronストア    | `~/.openclaw/line-ai-partner/cron-store.json`           |
| 課金ストア    | `~/.openclaw/line-ai-partner/billing-store.json`        |
| 使用量ストア  | `~/.openclaw/line-ai-partner/usage-store.json`          |
| OAuthトークン | `~/.openclaw/line-ai-partner/oauth-tokens.json`         |

---

## 9. 重要ファイルパスのクイックリファレンス

### 引き継ぎ時に最初に読むべきファイル

| ファイル                                | 理由                                       |
| --------------------------------------- | ------------------------------------------ |
| `src/line-ai-partner/integration.ts`    | Webhook統合の核心                          |
| `src/line-ai-partner/types.ts`          | 全型定義（OpenClaw型の再エクスポート含む） |
| `src/line-ai-partner/message-router.ts` | メッセージフローの全体像                   |
| `src/line-ai-partner/index.ts`          | 公開API一覧                                |

### テスト・ビルドコマンド

```bash
pnpm vitest run src/line-ai-partner/    # 全36テスト
pnpm tsc --noEmit                       # 型チェック
pnpm check                              # Lint+Format
```

### 関連ドキュメント

| ファイル                 | 内容                   |
| ------------------------ | ---------------------- |
| `docs/ARCHITECTURE.md`   | アーキテクチャ設計書   |
| `docs/PROJECT_README.md` | プロジェクトREADME     |
| `tasks/todo.md`          | タスク管理             |
| `tasks/lessons.md`       | 技術的知見             |
| `ROADMAP.md`             | 今後のロードマップ     |
| `CURRENT_STATUS.md`      | 現時点の状態           |
| `DEBUG_GUIDE.md`         | トラブルシューティング |
