# LINE AIパートナー プロジェクト概要

> OpenClaw LINE インテグレーションの開発ガイド

---

## プロジェクト概要

LINE AIパートナーは、OpenClaw プラットフォーム上で LINE Messaging API を活用した AI アシスタントを提供するプロジェクトです。日本・台湾・タイ市場を主要ターゲットとし、ユーザーとの自然な対話を実現します。

### 目標

- LINE 上で高品質な AI パートナー体験を提供する
- Flex Message を活用したリッチな情報表示
- マルチアカウント・マルチグループ対応の柔軟な運用
- セキュアなアクセス制御とプライバシー保護

---

## クイックスタート

### 前提条件

- Node.js 22+
- pnpm（パッケージマネージャ）
- LINE Developers Console のアカウント
- LINE チャンネルアクセストークン・チャンネルシークレット

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発モードで起動
pnpm dev

# テスト実行
pnpm test

# 型チェック
pnpm tsgo

# Lint・フォーマットチェック
pnpm check
```

### LINE チャンネル設定

```json5
// openclaw 設定ファイル内
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "YOUR_CHANNEL_ACCESS_TOKEN",
      channelSecret: "YOUR_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

---

## プロジェクト構成

```
openclaw/
├── src/line/                  # LINE コア実装（約6,357 LOC）
│   ├── types.ts               #   型定義
│   ├── accounts.ts            #   アカウント管理
│   ├── bot.ts                 #   ボットファクトリ
│   ├── bot-handlers.ts        #   メッセージハンドラ
│   ├── send.ts                #   メッセージ送信
│   ├── markdown-to-line.ts    #   Markdown → Flex 変換
│   ├── flex-templates/        #   Flex テンプレート集
│   └── ...                    #   その他コンポーネント
│
├── extensions/line/           # LINE プラグイン層
│   ├── index.ts               #   エントリポイント
│   └── src/                   #   チャンネル登録・コマンド
│
├── tasks/                     # プロジェクト管理
│   ├── todo.md                #   タスク管理・進捗追跡
│   └── lessons.md             #   技術的知見・学びの記録
│
└── docs/                      # ドキュメント
    ├── ARCHITECTURE.md        #   アーキテクチャ設計書
    └── PROJECT_README.md      #   本ファイル
```

---

## 開発ワークフロー

### ブランチ戦略

- `main` - 安定版（本番）
- `claude/*` - 機能開発ブランチ
- コミットメッセージは簡潔なアクション指向で（例: `LINE: add postback handler`）

### コーディング規約

- **言語**: TypeScript (ESM)、厳密型付け、`any` 禁止
- **フォーマット**: Oxlint + Oxfmt（`pnpm check` で検証）
- **ファイルサイズ**: 目安500 LOC 以下、超える場合はリファクタリング検討
- **コメント**: 非自明なロジックに簡潔なコメントを付与
- **テスト**: ソースと同名の `*.test.ts` で colocate

### テスト

```bash
# 全テスト実行
pnpm test

# カバレッジ付き
pnpm test:coverage

# 特定ファイルのテスト
pnpm test src/line/send.test.ts
```

カバレッジ閾値: 70%（lines/branches/functions/statements）

### コミット

```bash
# 推奨: スクリプト経由でコミット（ステージングをスコープ限定）
scripts/committer "LINE: add postback handler" src/line/bot-handlers.ts

# プッシュ前チェック
pnpm check
pnpm test
```

---

## 主要機能

### 対応メッセージ種別

| 種別         | 受信 | 送信 | 備考                    |
| ------------ | ---- | ---- | ----------------------- |
| テキスト     | o    | o    | 5,000文字/メッセージ    |
| 画像         | o    | o    | mediaMaxMb でサイズ制限 |
| 動画         | o    | -    | 送信は未実装            |
| 音声         | o    | o    | -                       |
| 位置情報     | o    | o    | 座標 + 住所             |
| スタンプ     | o    | -    | 100+ パッケージ認識     |
| Flex Message | -    | o    | 19種以上のテンプレート  |
| テンプレート | -    | o    | 確認/ボタン/カルーセル  |
| Quick Reply  | -    | o    | 最大13アイテム          |

### アクセス制御

- **DM ポリシー**: `pairing` / `allowlist` / `open` / `disabled`
- **グループポリシー**: `allowlist` / `open` / `disabled`
- **グループ別設定**: ワイルドカード `*` または個別グループ ID で設定

### マルチアカウント

デフォルトアカウントに加え、名前付きアカウント（例: marketing, support）を設定可能。各アカウントは独自の Webhook パス・トークン・設定を持つ。

---

## トラブルシューティング

### よくある問題

| 症状                     | 原因                        | 対処                                    |
| ------------------------ | --------------------------- | --------------------------------------- |
| Webhook が応答しない     | 署名検証失敗                | `channelSecret` の設定を確認            |
| メッセージが届かない     | トークン無効                | `channelAccessToken` を再発行           |
| グループで反応しない     | `groupPolicy` が `disabled` | 設定を `allowlist` または `open` に変更 |
| メディアが処理されない   | サイズ超過                  | `mediaMaxMb` の値を確認                 |
| ボット情報が取得できない | トークン権限不足            | LINE Developers Console で権限確認      |

### ヘルスチェック

```bash
# チャンネルステータス確認
openclaw channels status --probe

# ボット情報の取得テスト
# probeLineBot() が getBotInfo() 経由でトークンを検証
```

---

## 関連ドキュメント

| ドキュメント           | 内容                       |
| ---------------------- | -------------------------- |
| `docs/ARCHITECTURE.md` | アーキテクチャ設計書       |
| `tasks/todo.md`        | タスク管理・進捗追跡       |
| `tasks/lessons.md`     | 技術的知見・学びの記録     |
| `docs/testing.md`      | テストガイド               |
| `docs/channels/`       | チャンネル共通ドキュメント |

---

## チーム・連絡先

- リポジトリ: https://github.com/openclaw/openclaw
- Issue 報告: GitHub Issues
- 対象市場: 日本 / 台湾 / タイ
