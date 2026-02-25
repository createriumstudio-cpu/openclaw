# LINE AIパートナー — ロードマップ

> 最終更新: 2026-02-25

---

## 現在の状態

- **Phase 1-6 完了**: スケルトン実装+OpenClaw実結合済み
- **本番未デプロイ**: LINE Developers設定・Webhook接続・APIキー設定が未実施
- **テスト**: 36テスト全パス、tsc --noEmit ゼロエラー、lint clean
- **AI応答**: SOUL.md生成は実装済みだが、実際のLLM呼び出しは未接続

---

## Phase 7: LINE Developers Console設定 + Webhook接続

### 手順

1. LINE Developers Console (https://developers.line.biz/) にログイン
2. 新規プロバイダーを作成（またはexisting provider使用）
3. Messaging APIチャンネルを作成
4. チャンネルアクセストークン（長期）を発行
5. チャンネルシークレットを控える
6. Webhook URLを設定: `https://<your-domain>/line/webhook`
7. Webhookの利用をONに切り替え
8. 応答メッセージをOFFに切り替え（OpenClawが応答するため）

### OpenClaw設定

```bash
# 環境変数設定
export LINE_CHANNEL_ACCESS_TOKEN="your-token-here"
export LINE_CHANNEL_SECRET="your-secret-here"

# または openclaw config で設定
openclaw config set channels.line.channelAccessToken "your-token-here"
openclaw config set channels.line.channelSecret "your-secret-here"
openclaw config set channels.line.dmPolicy "open"
```

### 検証方法

```bash
# チャンネルステータス確認
openclaw channels status --probe

# Webhook検証（LINE側からVerifyボタン）
# HTTP 200が返れば成功

# テストメッセージ送信
# LINEアプリからボットにメッセージを送信し、応答を確認
```

---

## Phase 8: 外部API実接続

### OpenWeatherMap

```bash
# https://openweathermap.org/api でAPIキー取得（無料枠あり）
export OPENWEATHERMAP_API_KEY="your-key-here"
```

検証: `/weather` コマンドをLINEで送信

### Google Calendar/Drive OAuth

1. Google Cloud Console (https://console.cloud.google.com/) でプロジェクト作成
2. OAuth2 同意画面を設定
3. OAuth2クライアントID（Web Application）を作成
4. リダイレクトURI: `https://<your-domain>/oauth/callback`

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export OAUTH_REDIRECT_URI="https://<your-domain>/oauth/callback"
```

検証: OAuth認可フローを実行し、カレンダーイベント取得を確認

### Notion

1. Notion Integrations (https://www.notion.so/my-integrations) で統合を作成
2. OAuth設定でリダイレクトURIを設定

```bash
export NOTION_CLIENT_ID="your-client-id"
export NOTION_CLIENT_SECRET="your-client-secret"
```

検証: Notionデータベースへの接続テスト

---

## Phase 9: Stripe本番設定 + サブスク課金フロー

### 手順

1. Stripe Dashboard (https://dashboard.stripe.com/) で本番モード有効化
2. 商品・価格を作成:
   - Standard: 月額980円
   - Premium: 月額1,980円
3. Webhook エンドポイントを設定: `https://<your-domain>/stripe/webhook`
4. Webhook署名シークレットを取得

```bash
export STRIPE_SECRET_KEY="sk_live_..."
export STRIPE_STANDARD_PRICE_ID="price_..."
export STRIPE_PREMIUM_PRICE_ID="price_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 実装が必要な項目

- [ ] `stripe-service.ts` にWebhook署名検証を追加
- [ ] `/subscribe` コマンドの実装（Checkout Sessionリンク生成）
- [ ] `/plan` コマンドの実装（現在のプラン表示）
- [ ] 課金ステータス変更時のLINE通知

### 検証方法

```bash
# Stripe CLIでWebhookテスト
stripe listen --forward-to localhost:3000/stripe/webhook
stripe trigger customer.subscription.created
```

---

## Phase 10: fly.io or Railwayデプロイ + CI/CD

### fly.io（推奨: 東京リージョン nrt）

```bash
# fly.io CLIインストール
curl -L https://fly.io/install.sh | sh

# アプリ作成
fly apps create line-ai-partner --region nrt

# シークレット設定
fly secrets set LINE_CHANNEL_ACCESS_TOKEN="..." \
  LINE_CHANNEL_SECRET="..." \
  STRIPE_SECRET_KEY="..." \
  OPENWEATHERMAP_API_KEY="..."

# デプロイ
fly deploy

# ログ確認
fly logs -a line-ai-partner
```

### Railway（代替）

```bash
# Railway CLIインストール
npm i -g @railway/cli

# プロジェクト作成+デプロイ
railway init
railway up
```

### CI/CD設定

- [ ] GitHub Actionsでmain pushごとに自動デプロイ
- [ ] テスト+lint+型チェックをCIパイプラインに追加
- [ ] ステージング環境の構築

### 検証方法

```bash
# ヘルスチェック
curl https://<your-domain>/health

# Webhookテスト
curl -X POST https://<your-domain>/line/webhook -H "Content-Type: application/json" -d '{}'
# 署名なしなので400/401が返れば正常
```

---

## Phase 11: E2Eテスト + ステージング検証

### テスト項目

- [ ] オンボーディングフロー（新規ユーザー → 名前 → 性格 → 口調 → 関係性 → 完了）
- [ ] 天気コマンド（`/weather`、「今日の天気」）
- [ ] リマインダー（「7時に薬を飲む」、`/remind 07:00 test`）
- [ ] スケジュール（`/schedule`、「今日の予定」）
- [ ] 設定変更（`/setting`、`/personality`、`/style`）
- [ ] 課金フロー（プランアップグレード、使用量制限到達）
- [ ] Flex Message表示確認（各カードテンプレート）
- [ ] Quick Reply動作確認
- [ ] エラーハンドリング（API障害時のフォールバック）

### テストコマンド

```bash
# ユニットテスト
pnpm vitest run src/line-ai-partner/

# LINE APIモックを使ったE2Eテスト（要実装）
# pnpm test:e2e:line
```

---

## Phase 12: 本番リリース + モニタリング

### リリースチェックリスト

- [ ] 全テストパス（ユニット+E2E）
- [ ] 型チェック+lintクリーン
- [ ] 環境変数が全て設定されていることを確認
- [ ] LINE Webhook接続確認
- [ ] Stripe Webhook接続確認
- [ ] SSL証明書の有効期限確認
- [ ] レート制限の設定確認

### モニタリング設定

- [ ] ログ監視（fly.io logs / Railway logs）
- [ ] エラーアラート（Sentry等の導入検討）
- [ ] 死活監視（UptimeRobot等）
- [ ] LINE APIレスポンスタイム監視
- [ ] Stripe Webhook配信失敗アラート
- [ ] 使用量レポート（月次）

### 運用コマンド

```bash
# ログ確認
fly logs -a line-ai-partner

# 再起動
fly machines restart -a line-ai-partner

# スケール
fly scale count 2 -a line-ai-partner
```
