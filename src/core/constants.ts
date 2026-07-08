/**
 * core/constants.ts — 定数・デフォルト値・楽器マッピング
 */

import type { PartRole, VoiceRole, ChoirType, InstrumentChoice, ProgressState } from './types.ts';

// === デフォルト値 ===

/** 主役以外のパート音量デフォルト (%) */
export const DEFAULT_BACKGROUND_VOLUME = 50;

// === 合唱編成 ===

/** デフォルトの合唱種別 */
export const DEFAULT_CHOIR_TYPE: ChoirType = 'mixed';

/** 合唱種別の並び順（UIセレクトのoptions） */
export const CHOIR_TYPES: readonly ChoirType[] = ['mixed', 'women', 'men'] as const;

/** 合唱種別の日本語ラベル */
export const CHOIR_TYPE_LABELS: Record<ChoirType, string> = {
  mixed: '混声',
  women: '女声',
  men: '男声',
};

/**
 * 合唱種別ごとの声部セット（高音→低音の順）。
 * この順にトラックを配分し、同一声部が複数あれば上から採番する。
 */
export const CHOIR_VOICES: Record<ChoirType, readonly VoiceRole[]> = {
  mixed: ['Soprano', 'Alto', 'Tenor', 'Bass'],
  women: ['Soprano', 'Alto'],
  men: ['Tenor', 'Bass'],
};

/** MP3ビットレート (kbps) */
export const DEFAULT_MP3_BITRATE = 128;

/** サンプルレート (Hz) */
export const DEFAULT_SAMPLE_RATE = 44100;

/** MP3エンコードのチャンクサイズ（サンプル数） */
export const MP3_CHUNK_SIZE = 1152;

// === パート定義 ===

/** 利用可能なパートロール一覧（UIセレクトのoptions） */
export const PART_ROLES: readonly PartRole[] = [
  'Soprano',
  'Alto',
  'Tenor',
  'Bass',
  'Piano',
  'Percussion',
  'Excluded',
] as const;

/** ロールの表示ラベル（英名以外のもの） */
export const ROLE_LABELS: Partial<Record<PartRole, string>> = {
  Percussion: '打楽器',
  Excluded: '除外',
};

/** パートのデフォルト楽器 */
export const DEFAULT_INSTRUMENT_FOR_ROLE: Record<PartRole, InstrumentChoice> = {
  Soprano: 'clarinet',
  Alto: 'clarinet',
  Tenor: 'clarinet',
  Bass: 'clarinet',
  Piano: 'piano',
  Percussion: 'woodblock',
  Excluded: 'piano', // 使われないが型を満たすため
};

// === 楽器定義 ===

/** 利用可能な楽器一覧 */
export const INSTRUMENT_CHOICES: readonly InstrumentChoice[] = [
  'clarinet',
  'piano',
  'woodblock',
] as const;

/** 楽器の日本語ラベル */
export const INSTRUMENT_LABELS: Record<InstrumentChoice, string> = {
  clarinet: 'クラリネット',
  piano: 'ピアノ',
  woodblock: 'ウッドブロック',
};

/** パートの表示色（CSSカスタムプロパティ名） */
export const PART_COLORS: Record<Exclude<PartRole, 'Excluded'>, string> = {
  Soprano: 'var(--color-part-soprano)',
  Alto: 'var(--color-part-alto)',
  Tenor: 'var(--color-part-tenor)',
  Bass: 'var(--color-part-bass)',
  Piano: 'var(--color-part-piano)',
  Percussion: 'var(--color-part-percussion)',
};

/**
 * Tone.Sampler用の楽器サンプルURL構成
 * public/sounds 配下に配置したサンプルを参照する
 * baseUrl + instrument名 + "/" でサンプルディレクトリにアクセス
 *
 * GitHub Pagesのプロジェクトサイトでは配信ルートが `/リポジトリ名/` になるため、
 * Viteの BASE_URL を前置きして絶対パスのズレ（/sounds/... の404）を防ぐ。
 */
export const SOUNDFONT_BASE_URL = `${import.meta.env.BASE_URL}sounds/`;

/** 楽器名 → SoundFont ディレクトリ名 */
export const SOUNDFONT_INSTRUMENT_NAMES: Record<InstrumentChoice, string> = {
  clarinet: 'clarinet',
  piano: 'piano',
  woodblock: 'woodblock',
};

// === フェーズ表示 ===

/** フェーズごとの表示アイコン（絵文字は使わない） */
export const PHASE_ICONS: Record<string, string> = {
  idle: '',
  rendering: '',
  encoding: '',
  zipping: '',
  done: '',
  error: '',
};

/** フェーズごとの日本語ラベル */
export const PHASE_LABELS: Record<string, string> = {
  idle: '待機中',
  rendering: 'レンダリング中',
  encoding: 'MP3エンコード中',
  zipping: 'ZIP作成中',
  done: '完了',
  error: 'エラー',
};

// === 初期状態 ===

/** 進捗の初期状態 */
export const INITIAL_PROGRESS: ProgressState = {
  phase: 'idle',
  currentPartName: '',
  currentPartIndex: 0,
  totalParts: 0,
  partProgress: 0,
};
