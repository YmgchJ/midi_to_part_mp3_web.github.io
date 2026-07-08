# MIDI to Part MP3 — 合唱練習用音源自動生成ツール

合唱の各パート（Soprano / Alto / Tenor / Bass / Piano）が**強調された練習用MP3**を、MIDIファイルから自動生成するWebアプリケーションです。

## 特徴

- 🎵 **MIDIアップロード** — 総譜でもパート別でも対応
- 🎤 **パート割り当て** — トラックごとにパート名を設定
- 🎹 **楽器選択** — クラリネット・ピアノ・ウッドブロックから選択
- 🔊 **音量バランス** — 主役パート以外の音量を自由に調整
- 📦 **ZIP一括ダウンロード** — 全パートのMP3をまとめてダウンロード
- 🌐 **完全クライアントサイド** — サーバー不要、GitHub Pagesで動作

## 技術スタック

| 領域 | 技術 |
|---|---|
| ビルド | Vite + TypeScript |
| MIDI解析 | @tonejs/midi |
| 音声合成 | Tone.js + OfflineAudioContext |
| 楽器音源 | gleitz/midi-js-soundfonts (フリー) |
| MP3エンコード | @breezystack/lamejs (Web Worker) |
| ZIP生成 | JSZip |

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # プロダクションビルド
npm run test     # テスト実行
```

## ドキュメント

| ファイル | 内容 |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | AI開発者向け指示書 |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | フェーズ別進捗 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 技術設計 |
| [docs/SPEC.md](./docs/SPEC.md) | 中核ロジック仕様 |
| [docs/DESIGN.md](./docs/DESIGN.md) | デザイン仕様 |

## ステータス

🚧 開発中 — P1 足場構築フェーズ

## ライセンス

MIT
