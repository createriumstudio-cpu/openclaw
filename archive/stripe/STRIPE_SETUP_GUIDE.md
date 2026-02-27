# Stripe課金セットアップガイド（アーカイブ）

> このファイルは、Stripe決済から Apple IAP/キャリア決済への移行に伴い、
> ROADMAP.md Phase 9 から退避した内容です。
> Stripeに戻す場合は `archive/stripe/stripe-service.ts` と併せて復元してください。

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

- [x] `stripe-service.ts` にWebhook署名検証を追加（実装済み: `verifyWebhookSignature()`）
- [ ] `/subscribe` コマンドの実装（Checkout Sessionリンク生成）
- [ ] `/plan` コマンドの実装（現在のプラン表示）
- [ ] 課金ステータス変更時のLINE通知

### 検証方法

```bash
# Stripe CLIでWebhookテスト
stripe listen --forward-to localhost:3000/stripe/webhook
stripe trigger customer.subscription.created
```

### 環境変数

| 環境変数                   | 取得先           | 用途               |
| -------------------------- | ---------------- | ------------------ |
| `STRIPE_SECRET_KEY`        | Stripe Dashboard | API認証            |
| `STRIPE_STANDARD_PRICE_ID` | Stripe Dashboard | Standardプラン価格 |
| `STRIPE_PREMIUM_PRICE_ID`  | Stripe Dashboard | Premiumプラン価格  |
| `STRIPE_WEBHOOK_SECRET`    | Stripe Dashboard | Webhook署名検証    |
