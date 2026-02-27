---
name: daily-assistant
description: 毎日の天気・スケジュール・リマインダーを管理するスキル
metadata: { "openclaw": { "always": true, "emoji": "☀️" } }
---

# デイリーアシスタント

## 朝の挨拶（Cron: 毎朝7:00）

1. 天気APIから今日の天気・気温を取得
1. ユーザーの好みに合わせた服装を提案
1. 今日の予定（Google Calendar連携時）を確認
1. 朝の挨拶メッセージを生成

## 天気情報

- OpenWeatherMap APIを使用
- ユーザーの位置情報はメモリに保存
- 服装提案は気温・天気・ユーザーの好みを考慮

## リマインダー

- ユーザーが「〜時に教えて」と言ったらCronジョブを作成
- LINE Push APIで通知
