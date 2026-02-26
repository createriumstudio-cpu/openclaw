# LINE AIパートナー セットアップガイド

## 前提条件

- Node.js 22+
- pnpm または bun
- LINE Developersアカウント
- （オプション）Stripe、Google、Notionアカウント

## 1. LINE Developers Console 設定

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダーを作成（またはする既存プロバイダーを選択）
3. **Messaging API** チャネルを作成
4. チャネル基本設定から以下を取得:
   - **チャネルシークレット** → `LINE_CHANNEL_SECRET`
   - **チャネルアクセストークン**（長期）を発行 → `LINE_CHANNEL_ACCESS_TOKEN`
5. Webhook設定:
   - Webhook URL: `https://your-domain.com/webhook/line`
   - Webhookの利用: **ON**
   - 応答メッセージ: **OFF**（OpenClawが応答を管理するため）

## 2. 環境変数の設定

```bash
cp deploy/.env.example deploy/.env
```

最低限必要な環境変数:

| 変数名                      | 説明                       | 必須 |
| --------------------------- | -------------------------- | ---- |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging APIトークン | Yes  |
| `LINE_CHANNEL_SECRET`       | LINEチャネルシークレット   | Yes  |
| `ANTHROPIC_API_KEY`         | Claude APIキー             | Yes  |
| `OPENWEATHERMAP_API_KEY`    | 天気情報API                | No   |
| `STRIPE_SECRET_KEY`         | Stripe決済                 | No   |
| `GOOGLE_CLIENT_ID`          | Google OAuth               | No   |
| `NOTION_CLIENT_ID`          | Notion OAuth               | No   |

## 3. ローカル開発（Docker）

```bash
cd deploy
docker compose up -d
```

サービス構成:

- `app` — OpenClaw + LINE AI Partner (port 3000)
- `redis` — セッション＆キャッシュ (port 6379)

ヘルスチェック: `curl http://localhost:3000/health`

## 4. Fly.io デプロイ

```bash
# Fly CLIインストール（未導入の場合）
curl -L https://fly.io/install.sh | sh

# アプリ作成（東京リージョン）
fly launch --region nrt

# シークレット設定
fly secrets set LINE_CHANNEL_ACCESS_TOKEN=xxx
fly secrets set LINE_CHANNEL_SECRET=xxx
fly secrets set ANTHROPIC_API_KEY=xxx

# デプロイ
fly deploy
```

## 5. Stripe 設定（課金機能を使う場合）

1. [Stripe Dashboard](https://dashboard.stripe.com/) でアカウント作成
2. APIキー取得 → `STRIPE_SECRET_KEY`
3. 商品＆料金を作成:
   - Standard: 980円/月 → Price ID を `STRIPE_STANDARD_PRICE_ID` に設定
   - Premium: 1,980円/月 → Price ID を `STRIPE_PREMIUM_PRICE_ID` に設定
4. Webhook エンドポイント設定:
   - URL: `https://your-domain.com/webhook/stripe`
   - イベント: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Signing secret → `STRIPE_WEBHOOK_SECRET`

## 6. Google OAuth 設定（Calendar/Drive連携）

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. OAuth 2.0 クライアントID作成
3. リダイレクトURI: `https://your-domain.com/oauth/callback`
4. Calendar API と Drive API を有効化
5. クライアントID/シークレット → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## 7. Notion OAuth 設定

1. [Notion Integrations](https://www.notion.so/my-integrations) でインテグレーション作成
2. OAuth設定でリダイレクトURI追加
3. クライアントID/シークレット → `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`

## 動作確認

1. LINE公式アカウントを友だち追加
2. オンボーディングフローが開始されることを確認
3. 名前・性格・口調・関係性を設定
4. 通常の会話が動作することを確認
5. `/help` コマンドで全コマンド一覧を確認
