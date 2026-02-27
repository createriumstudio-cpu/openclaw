# LINE AIパートナー — トラブルシューティングガイド

> 最終更新: 2026-02-25

---

## TypeScriptビルドエラー時

### 症状: `pnpm tsc --noEmit` でエラー

```bash
# まず依存関係を再インストール
pnpm install

# 再度チェック
pnpm tsc --noEmit 2>&1 | grep "src/line-ai-partner"
```

### よくあるエラーと対処

| エラー                                               | 原因                           | 対処                                                      |
| ---------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `Cannot find module 'node:fs/promises'`              | `@types/node` 未インストール   | `pnpm install` を実行                                     |
| `Cannot find module 'vitest'`                        | vitest未インストール           | `pnpm install` を実行（テストファイルのみの場合は無視可） |
| `Cannot find module '../line/types.js'`              | src/line/types.ts が存在しない | mainブランチが最新か確認: `git pull origin main`          |
| `Type 'X' is not assignable to type 'FlexContainer'` | `@line/bot-sdk` の型不一致     | `as messagingApi.FlexContainer` でキャスト                |
| `Cannot find name 'process'`                         | `@types/node` 未インストール   | `pnpm install` を実行                                     |

### 型チェックの範囲を限定する

```bash
# line-ai-partnerのみチェック（extensions/のエラーを除外）
pnpm tsc --noEmit 2>&1 | grep "src/line-ai-partner"

# 特定ファイルのみ
pnpm tsc --noEmit 2>&1 | grep "integration.ts"
```

---

## LINE Webhook接続エラー時

### 症状: LINEからメッセージが届かない

1. **Webhook URLの確認**
   - LINE Developers Console → チャンネル設定 → Webhook URL
   - `https://` 必須（HTTPは不可）
   - 末尾: `/line/webhook`

2. **署名検証の確認**
   - `channelSecret` が正しく設定されているか
   - 環境変数 `LINE_CHANNEL_SECRET` またはconfig

3. **Webhookの利用がONか**
   - LINE Developers Console → Webhook設定 → 「Webhookの利用」がON

4. **デバッグコマンド**

```bash
# チャンネルステータス確認
openclaw channels status --probe

# ログ確認
tail -f /tmp/openclaw-gateway.log | grep line

# Webhook手動テスト（署名なしのため400が正常）
curl -X POST https://<your-domain>/line/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

### 症状: LINE Developers ConsoleでVerify失敗

- OpenClaw Gatewayが起動しているか確認
- ポートが正しく公開されているか確認
- SSL証明書が有効か確認

---

## Stripe Webhook検証エラー時

### 症状: Stripe Webhookイベントが処理されない

1. **Webhook署名検証**
   - 現状: `stripe-service.ts` のWebhook署名検証は**未実装**
   - 本番実装時に `stripe.webhooks.constructEvent()` を追加する必要あり

2. **Webhookエンドポイント設定**
   - Stripe Dashboard → 開発者 → Webhook
   - エンドポイントURL: `https://<your-domain>/stripe/webhook`
   - イベント: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

3. **ローカルテスト**

```bash
# Stripe CLI
stripe listen --forward-to localhost:3000/stripe/webhook
stripe trigger customer.subscription.updated
```

---

## pnpm install失敗時

### 症状: 依存関係インストールエラー

```bash
# lockファイル再生成
rm -rf node_modules
pnpm install

# それでも失敗する場合
pnpm store prune
pnpm install
```

### node-gyp関連エラー

```bash
# Pythonとビルドツールが必要
# macOS:
xcode-select --install

# Linux:
sudo apt-get install build-essential python3
```

### `@line/bot-sdk` のインストール問題

- `@line/bot-sdk` はOpenClawのルートpackage.jsonに含まれている
- 個別インストールは不要

---

## メモリ/ログ関連の問題

### 症状: プロファイルが保存されない

```bash
# ストレージディレクトリの存在確認
ls -la ~/.openclaw/line-ai-partner/
ls -la ~/.openclaw/line-ai-partner/profiles/

# パーミッション確認
stat ~/.openclaw/line-ai-partner/

# 手動でディレクトリ作成
mkdir -p ~/.openclaw/line-ai-partner/profiles
mkdir -p ~/.openclaw/line-ai-partner/memory
```

### 症状: ログが出力されない

- `createSubsystemLogger("line-ai-partner")` を使用
- OpenClawのログレベル設定を確認

```bash
# verbose ログ有効化
openclaw config set log.verbose true
```

### 症状: searchConversationMemory() が常に空を返す

- OpenClawのメモリシステムが設定されている必要がある
- `agentId: "line-ai-partner"` に対応するメモリ設定が必要
- メモリシステムが未設定の場合は空配列を返す（正常動作）

---

## テスト関連の問題

### 症状: テストが失敗する

```bash
# 単一テストファイルの実行
pnpm vitest run src/line-ai-partner/soul-generator.test.ts

# verbose出力
pnpm vitest run src/line-ai-partner/ --reporter=verbose

# watchモードで開発
pnpm vitest src/line-ai-partner/
```

### 症状: vi.mock が効かない

- `vi.mock()` はファイルトップレベルに配置する必要がある
- import文よりも前に記述されている必要がある（Vitestが自動で巻き上げる）
- モック対象のパスは相対パス（`.js` 拡張子付き）

---

## Claude Code使用時の注意

### API Error 500対処法

1. **リトライ**: 数秒待ってから再実行
2. **コンテキストリセット**: `/clear` でコンテキストをクリア
3. **セッション再開**: 新しいセッションを開始

### セッション切れ対処

1. **作業状態の確認**: `git status` と `git log --oneline -5` で現在の状態を把握
2. **新セッションでの引き継ぎ**: このドキュメント (HANDOFF.md) を読むよう指示
3. **ブランチの確認**: `claude/line-ai-partner-setup-9hqMV` にいることを確認

```bash
git branch --show-current
# claude/line-ai-partner-setup-9hqMV であること

git status
# 未コミットの変更がないか確認
```

### 大きな変更を行う前の安全策

```bash
# 現在の状態をコミット
git add -A && git commit -m "wip: セーブポイント"

# または stash
git stash push -m "作業中のセーブポイント"
```

---

## よくある質問

### Q: extensions/line/ と src/line-ai-partner/ の関係は？

- `extensions/line/` はOpenClawのLINEチャンネルプラグイン（全LINE機能の基盤）
- `src/line-ai-partner/` はAIパートナー固有のロジック（性格・課金等）
- `src/line-ai-partner/` は `src/line/` のコア型・関数をimportして使用
- `processPartnerMessage()` が両者を橋渡し

### Q: なぜ src/line-ai-partner/ は extensions/ に入っていないのか？

- AIパートナーはOpenClawコアの `src/line/` 型を直接参照する必要がある
- extensionsは独立したnpmパッケージとして動作する設計
- 将来的にextensionに移行する可能性はあるが、現時点ではsrc/内が適切

### Q: テストを追加するには？

- `src/line-ai-partner/` 内にソースと同名の `*.test.ts` を作成
- `vi.mock()` でI/O依存（memory-manager, weather API）を分離
- `pnpm vitest run src/line-ai-partner/` で実行確認
