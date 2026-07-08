# ROADMAP — フェーズ別進捗チェックリスト

> このファイルが唯一の進捗台帳。実装と同じコミットでチェックを更新すること。

## P1: 足場（Scaffolding）

- [x] Git初期化
- [x] ドキュメント群作成（README, CLAUDE.md, docs/*）
- [ ] Vite + vanilla-ts プロジェクト生成
- [ ] npm依存インストール（@tonejs/midi, tone, @breezystack/lamejs, jszip, vitest）
- [ ] vite.config.ts 設定（GitHub Pages base、Worker format）
- [ ] tsconfig.json 調整
- [ ] .gitignore 作成
- [ ] デザイントークン定義（src/styles/tokens.css）
- [ ] 空アプリがビルド ＆ `npm run dev` で表示されることを確認
- [ ] GitHub Actions デプロイワークフロー作成
- [ ] 初回コミット & push

## P2: コアロジック（UIなし）

- [ ] `src/core/types.ts` — 全型定義
- [ ] `src/core/constants.ts` — デフォルト値・楽器マッピング
- [ ] `src/core/midi-parser.ts` — MIDI解析→内部データ変換 + テスト
- [ ] 楽器サンプル取得・配置（public/sounds/）
- [ ] `src/core/audio-renderer.ts` — Tone.Offline + Sampler合成 + 手動テスト
- [ ] `src/workers/mp3-encoder.worker.ts` — MP3エンコードWorker + 手動テスト
- [ ] `src/core/mp3-encoder.ts` — Worker通信ラッパー

## P3: 最小の使えるアプリ（Walking Skeleton）

- [ ] `src/state/app-state.ts` — 状態管理
- [ ] `src/ui/components/file-upload.ts` — MIDIファイルアップロードUI
- [ ] `src/ui/components/track-config.ts` — トラック↔パート紐付けUI
- [ ] `src/ui/components/volume-control.ts` — 音量設定UI
- [ ] `src/ui/components/progress-display.ts` — 進捗プログレスUI
- [ ] `src/ui/components/download-button.ts` — ダウンロードボタン
- [ ] `src/ui/renderer.ts` — UIレンダリング統括
- [ ] `src/main.ts` — 全体接続
- [ ] 入力→合成→MP3→ZIP→ダウンロードの縦一本を通す
- [ ] デプロイして実環境確認

## P4: 機能拡充

- [ ] 複数MIDIファイルアップロード対応
- [ ] 楽器選択UI（クラリネット/ピアノ/ウッドブロック）トラックごと
- [ ] エラーハンドリング（不正MIDI、0トラック、巨大ファイル）
- [ ] パート名カスタマイズ

## P5: 磨き

- [ ] アニメーション・トランジション・マイクロインタラクション
- [ ] ダークモード対応
- [ ] モバイルレスポンシブ
- [ ] a11y（フォーカス順、ARIA、コントラスト、prefers-reduced-motion）
- [ ] README更新・デモスクリーンショット
- [ ] OGP・メタタグ
