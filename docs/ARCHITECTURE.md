# LINE AIパートナー アーキテクチャ設計書

> バージョン: 1.0
> 最終更新: 2026-02-25

---

## 1. システム全体像

```
┌─────────────────────────────────────────────────────┐
│                    LINE Platform                     │
│  (Messaging API / Webhook / Rich Menu / LIFF)       │
└──────────────┬──────────────────────┬───────────────┘
               │ Webhook POST         │ Push/Reply API
               ▼                      ▲
┌──────────────────────────────────────────────────────┐
│              OpenClaw Gateway                         │
│  ┌────────────────────────────────────────────────┐  │
│  │           LINE プラグイン層                      │  │
│  │         (extensions/line/)                      │  │
│  │  ・チャンネル登録  ・設定スキーマ  ・/card コマンド │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                              │
│  ┌────────────────────▼───────────────────────────┐  │
│  │           LINE コア実装                          │  │
│  │            (src/line/)                          │  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ Webhook  │  │ メッセージ │  │   送信       │ │  │
│  │  │ 受信処理  │  │ ハンドラ  │  │   エンジン   │ │  │
│  │  └──────────┘  └──────────┘  └──────────────┘ │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ Markdown │  │  Flex    │  │  アカウント   │ │  │
│  │  │ → Flex   │  │ テンプレ  │  │  管理        │ │  │
│  │  └──────────┘  └──────────┘  └──────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│                       │                              │
│  ┌────────────────────▼───────────────────────────┐  │
│  │         AI エージェント / ルーティング            │  │
│  │    (src/routing/, src/channels/)                │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 2. ディレクトリ構成

### コア実装 (`src/line/`)

```
src/line/
├── types.ts                  # 型定義（LineConfig, ResolvedLineAccount 等）
├── accounts.ts               # アカウント解決、トークン/シークレット取得
├── config-schema.ts          # Zod バリデーションスキーマ
├── bot.ts                    # LineBot ファクトリ、Webhook コールバック
├── bot-handlers.ts           # イベントディスパッチ、アクセス制御
├── bot-message-context.ts    # メッセージコンテキスト構築
├── bot-access.ts             # 許可リストヘルパー
├── webhook.ts                # Express ミドルウェア
├── webhook-node.ts           # Node.js 統合
├── webhook-utils.ts          # パース・検証ユーティリティ
├── signature.ts              # HMAC-SHA256 署名検証
├── monitor.ts                # Webhook 登録、イベントループ
├── send.ts                   # 全送信メソッド、クライアント初期化
├── auto-reply-delivery.ts    # 自動応答配信
├── reply-chunks.ts           # チャンク分割送信
├── download.ts               # メディアダウンロード（マジックバイト検出）
├── markdown-to-line.ts       # Markdown → Flex Message 変換
├── template-messages.ts      # テンプレートメッセージビルダー
├── actions.ts                # アクションビルダー
├── probe.ts                  # ボット情報ヘルスチェック
├── rich-menu.ts              # リッチメニュー CRUD
├── channel-access-token.ts   # トークン解決ユーティリティ
└── flex-templates/           # Flex Message テンプレート（19種以上）
    ├── info-card.ts
    ├── list-card.ts
    ├── image-card.ts
    ├── action-card.ts
    ├── carousel.ts
    ├── event-card.ts
    ├── agenda-card.ts
    ├── receipt-card.ts
    ├── media-player-card.ts
    ├── device-control-card.ts
    ├── apple-tv-remote-card.ts
    └── notification-bubble.ts
```

### プラグイン層 (`extensions/line/`)

```
extensions/line/
├── index.ts                  # プラグイン登録エントリポイント
├── package.json
└── src/
    ├── channel.ts            # ChannelPlugin インタフェース実装
    ├── runtime.ts            # ランタイムストレージ
    └── card-command.ts       # /card CLI コマンド
```

---

## 3. メッセージフロー

### 3.1 受信フロー（LINE → AI）

```
LINE ユーザーがメッセージ送信
    │
    ▼
Webhook POST /line/webhook
    │
    ├─ HMAC-SHA256 署名検証（定数時間比較）
    │
    ▼
parseLineWebhookBody()
    │
    ├─ HTTP 200 即時応答（非同期処理開始）
    │
    ▼
handleLineWebhookEvents()（各イベントを処理）
    │
    ├─ shouldProcessLineEvent()（アクセス制御チェック）
    │   ├─ ペアリング必要 → sendLinePairingReply() → 終了
    │   ├─ 許可リスト外 → 無視
    │   └─ 許可 → 続行
    │
    ▼
buildLineMessageContext()
    │
    ├─ メディアダウンロード（画像/動画/音声）
    ├─ スタンプ解析（100+ パッケージ対応）
    ├─ 位置情報抽出
    ├─ ルート解決
    │
    ▼
AI エージェントへディスパッチ
    │
    ├─ showLoadingAnimation()（18秒間隔）
    │
    ▼
AI 応答生成
```

### 3.2 送信フロー（AI → LINE）

```
AI エージェント応答
    │
    ▼
deliverLineAutoReply()
    │
    ├─ processLineMessage()
    │   ├─ テーブル検出 → Flex レシートカード
    │   ├─ コードブロック検出 → Flex コードカード
    │   └─ Markdown ストリップ → プレーンテキスト
    │
    ▼
sendLineReplyChunks()
    │
    ├─ リプライトークン使用（1回限り、最大5メッセージ）
    ├─ トークン失敗時 → プッシュメッセージにフォールバック
    ├─ Quick Reply 添付（最終チャンクに）
    │
    ▼
LINE ユーザーにメッセージ配信
    │
    ├─ recordChannelActivity()
    └─ ローディングアニメーション停止
```

---

## 4. アクセス制御モデル

### DM ポリシー

| ポリシー | 動作 |
|----------|------|
| `pairing` | 未知ユーザーにはペアリングリクエストを送信。承認後にメッセージ処理開始 |
| `allowlist` | `allowFrom` に含まれるユーザーのみ処理 |
| `open` | 全ユーザーのメッセージを処理 |
| `disabled` | DM を完全に無効化 |

### グループポリシー

| ポリシー | 動作 |
|----------|------|
| `allowlist` | `groupAllowFrom` に含まれるグループ/ユーザーのみ処理 |
| `open` | 全グループのメッセージを処理 |
| `disabled` | グループメッセージを完全に無効化 |

### 階層構造

```
グローバル設定
  └─ チャンネル設定（channels.line）
       ├─ dmPolicy / groupPolicy
       ├─ allowFrom / groupAllowFrom
       └─ groups（グループ別オーバーライド）
            ├─ "*"（ワイルドカード: 全グループ共通設定）
            └─ "C12345..."（特定グループ設定）
                 ├─ requireMention
                 ├─ allowFrom
                 └─ systemPrompt
```

---

## 5. マルチアカウント設計

```
channels.line
├── （デフォルトアカウント）
│   ├─ channelAccessToken
│   ├─ channelSecret
│   ├─ webhookPath: "/line/webhook"
│   └─ dmPolicy, groupPolicy, ...
│
└── accounts
    ├── "marketing"
    │   ├─ channelAccessToken（専用トークン）
    │   ├─ channelSecret（専用シークレット）
    │   └─ webhookPath: "/line/marketing"
    │
    └── "support"
        ├─ channelAccessToken
        ├─ channelSecret
        └─ webhookPath: "/line/support"
```

### トークン解決の優先順位

1. 直接設定値（`channelAccessToken` / `channelSecret`）
2. トークンファイル（`tokenFile` / `secretFile`）
3. 環境変数（デフォルトアカウントのみ: `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET`）

---

## 6. LINE ID フォーマット

| 種別 | フォーマット | 例 |
|------|-------------|-----|
| ユーザー | `U` + 32桁16進数 | `U1234567890abcdef1234567890abcdef` |
| グループ | `C` + 32桁16進数 | `C1234567890abcdef1234567890abcdef` |
| ルーム | `R` + 32桁16進数 | `R1234567890abcdef1234567890abcdef` |
| 内部プレフィックス | `line:[type:]<id>` | `line:user:U...` または `line:C...` |

---

## 7. Flex Message テンプレート一覧

| テンプレート | 関数名 | 用途 |
|-------------|--------|------|
| 情報カード | `createInfoCard()` | タイトル + 本文 + フッター |
| リストカード | `createListCard()` | 箇条書きリスト（最大8項目） |
| 画像カード | `createImageCard()` | 画像メイン表示 |
| アクションカード | `createActionCard()` | タイトル + 本文 + アクションボタン |
| カルーセル | `createCarousel()` | 横スクロール複数カラム |
| イベントカード | `createEventCard()` | 日時/場所付きイベント |
| アジェンダカード | `createAgendaCard()` | 複数イベント一覧 |
| レシートカード | `createReceiptCard()` | テーブル形式（合計行付き） |
| メディアプレーヤー | `createMediaPlayerCard()` | 再生コントロール付き |
| デバイスコントロール | `createDeviceControlCard()` | スマートデバイス操作 |
| Apple TV リモート | `createAppleTvRemoteCard()` | D-pad + トランスポート |
| 通知バブル | - | シンプル通知テキスト |

---

## 8. セキュリティ設計

### 実装済み対策

- **Webhook 署名検証**: HMAC-SHA256 + 定数時間比較（タイミング攻撃対策）
- **メディアファイル保護**: ランダムファイル名生成、サイズ制限（`mediaMaxMb`）
- **アクセス制御**: ペアリング、許可リスト、ポリシーベースの多層防御
- **アカウント分離**: マルチアカウント間でトークン・設定を完全分離
- **LINE ID 大文字小文字区別**: 厳密な文字列比較

### 注意事項

- LINE API のレート制限はSDKレベルで委譲（アプリ側での制限実装は未対応）
- リプライトークンの有効期限トラッキングは未実装
- ユーザープロファイルキャッシュの TTL は5分（長時間稼働で陳腐化の可能性）

---

## 9. 技術スタック

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript (ESM) |
| ランタイム | Node.js 22+ / Bun |
| テスト | Vitest + V8 カバレッジ |
| バリデーション | Zod |
| Lint/Format | Oxlint + Oxfmt |
| パッケージ管理 | pnpm |
| LINE SDK | `@line/bot-sdk` |

---

## 10. 今後の拡張ポイント

1. **AI パートナー機能**: 会話コンテキスト管理、ペルソナ設計、感情分析
2. **リッチ UI 拡張**: LIFF 連携、動的リッチメニュー、対話型 Flex カード
3. **運用基盤**: レート制限、多言語エラーメッセージ、監視・アラート
4. **プラットフォーム連携**: LINE ログイン、LINE Pay、LINE Beacon
