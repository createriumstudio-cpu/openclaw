# LINE AIパートナー — ロードマップ

> 最終更新: 2026-02-25

---

## 現在の状態

- **Phase 1-6 完了**: スケルトン実装+OpenClaw実結合済み
- **Phase 7 コード実装完了**: LLM接続・gateway登録・Cron実行・Stripe署名検証・天気API全て実装済み
- **本番未デプロイ**: LINE Developers設定・Webhook接続・APIキー設定が未実施
- **テスト**: 36テスト全パス、tsc --noEmit ゼロエラー、lint clean
- **AI応答**: `runEmbeddedPiAgent` + SOUL.md `extraSystemPrompt` で接続済み

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

## Phase 9: Apple IAP / キャリア決済 / LINE Pay 課金フロー

> Stripe実装は `archive/stripe/` に退避済み。若年層向けにクレカ不要の決済方式に移行。

### 決済プロバイダ

| プロバイダ   | 対象ユーザー             | 実装ファイル                 |
| ------------ | ------------------------ | ---------------------------- |
| Apple IAP    | iOSアプリユーザー        | `billing/payment-service.ts` |
| キャリア決済 | docomo/au/SoftBank契約者 | `billing/payment-service.ts` |
| LINE Pay     | LINEユーザー全般         | `billing/payment-service.ts` |

### 手順

1. **Apple IAP**: App Store Connect でサブスクリプション商品を作成
   - Standard: 月額980円 (Auto-Renewable Subscription)
   - Premium: 月額1,980円 (Auto-Renewable Subscription)
2. **キャリア決済**: 決済アグリゲーター（SB Payment Service等）と契約
3. **LINE Pay**: LINE Pay加盟店申請 + API連携設定

```bash
# Apple IAP
export APP_STORE_CONNECT_ISSUER_ID="..."
export APP_STORE_CONNECT_KEY_ID="..."
export APP_STORE_CONNECT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
export APP_STORE_BUNDLE_ID="com.yourapp.linepartner"

# キャリア決済（アグリゲーター経由）
export CARRIER_BILLING_API_KEY="..."
export CARRIER_BILLING_API_SECRET="..."
export CARRIER_BILLING_ENDPOINT="https://api.aggregator.example.com"

# LINE Pay
export LINE_PAY_CHANNEL_ID="..."
export LINE_PAY_CHANNEL_SECRET="..."
```

### 実装が必要な項目

- [x] `payment-service.ts` 統合インターフェース + スケルトン作成
- [ ] Apple App Store Server API v2 レシート検証の実装
- [ ] キャリア決済アグリゲーター連携の実装
- [ ] LINE Pay API v3 連携の実装
- [ ] `/subscribe` コマンドの実装（決済方法選択 → 各プロバイダへルーティング）
- [ ] `/plan` コマンドの実装（現在のプラン表示）
- [ ] App Store Server Notifications v2 Webhook処理
- [ ] 課金ステータス変更時のLINE通知

### 検証方法

```bash
# Apple IAP: Sandbox環境でテスト
# Xcode > StoreKit Configuration でローカルテスト可能

# LINE Pay: Sandbox環境
# https://sandbox-api-pay.line.me/ でテスト
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
