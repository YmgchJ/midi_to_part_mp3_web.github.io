/**
 * core/audio-renderer.ts — 音声レンダリングモジュール
 * SPEC.md §2 準拠
 *
 * Tone.js の Offline + Sampler を使って MIDI ノートを AudioBuffer にレンダリングする
 * OfflineAudioContext はメインスレッドで動作（Web Worker非対応）
 */

import * as Tone from 'tone';
import type { ParsedMidi, ParsedNote, PartRole, TrackConfig } from './types.ts';
import { SOUNDFONT_BASE_URL, SOUNDFONT_INSTRUMENT_NAMES } from './constants.ts';
import type { InstrumentChoice } from './types.ts';

// ノート番号 → 音名変換テーブル（Tone.js形式: "C4", "A#3" など）
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

/**
 * 楽器ごとのサンプルURL辞書を生成する
 * gleitz/midi-js-soundfonts から各オクターブのCノートを取得
 */
function getSampleUrls(instrument: InstrumentChoice): Record<string, string> {
  const dir = SOUNDFONT_INSTRUMENT_NAMES[instrument];
  const baseUrl = `${SOUNDFONT_BASE_URL}${dir}/`;

  switch (instrument) {
    case 'piano':
      return {
        'A0': `${baseUrl}A0.mp3`,
        'C1': `${baseUrl}C1.mp3`,
        'D#1': `${baseUrl}Ds1.mp3`,
        'F#1': `${baseUrl}Fs1.mp3`,
        'A1': `${baseUrl}A1.mp3`,
        'C2': `${baseUrl}C2.mp3`,
        'D#2': `${baseUrl}Ds2.mp3`,
        'F#2': `${baseUrl}Fs2.mp3`,
        'A2': `${baseUrl}A2.mp3`,
        'C3': `${baseUrl}C3.mp3`,
        'D#3': `${baseUrl}Ds3.mp3`,
        'F#3': `${baseUrl}Fs3.mp3`,
        'A3': `${baseUrl}A3.mp3`,
        'C4': `${baseUrl}C4.mp3`,
        'D#4': `${baseUrl}Ds4.mp3`,
        'F#4': `${baseUrl}Fs4.mp3`,
        'A4': `${baseUrl}A4.mp3`,
        'C5': `${baseUrl}C5.mp3`,
        'D#5': `${baseUrl}Ds5.mp3`,
        'F#5': `${baseUrl}Fs5.mp3`,
        'A5': `${baseUrl}A5.mp3`,
        'C6': `${baseUrl}C6.mp3`,
        'D#6': `${baseUrl}Ds6.mp3`,
        'F#6': `${baseUrl}Fs6.mp3`,
        'A6': `${baseUrl}A6.mp3`,
        'C7': `${baseUrl}C7.mp3`,
      };
    case 'clarinet':
      return {
        'D3': `${baseUrl}D3.mp3`,
        'D4': `${baseUrl}D4.mp3`,
        'D5': `${baseUrl}D5.mp3`,
        'D6': `${baseUrl}D6.mp3`,
      };
    case 'woodblock':
      return {
        'G5': `${baseUrl}G5.mp3`,
      };
  }
}

/**
 * 指定パートを強調したAudioBufferをレンダリングする
 *
 * @param parsedMidi - 解析済みMIDIデータ
 * @param trackConfigs - 各トラックの設定
 * @param targetRole - 強調するパート
 * @param backgroundVolumePercent - 背景パートの音量 (0-100)
 * @param sampleRate - 出力サンプルレート
 * @returns レンダリング済みAudioBuffer
 */
export async function renderPartAudio(
  parsedMidi: ParsedMidi,
  trackConfigs: TrackConfig[],
  targetRole: PartRole,
  backgroundVolumePercent: number,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const duration = parsedMidi.durationSeconds;
  // 末尾に0.5秒の余白を追加（最終ノートのリリースのため）
  const renderDuration = duration + 0.5;

  // 有効なトラック（Excluded以外）に対応する設定のみ取得
  const configMap = new Map<number, TrackConfig>();
  for (const config of trackConfigs) {
    if (config.role !== 'Excluded') {
      configMap.set(config.trackId, config);
    }
  }

  const toneBuffer = await Tone.Offline(async () => {
    const samplers: Array<{ sampler: Tone.Sampler; gainNode: Tone.Gain; notes: ParsedNote[] }> = [];

    // 各トラックのSamplerを作成
    for (const track of parsedMidi.tracks) {
      const config = configMap.get(track.id);
      if (!config || track.notes.length === 0) continue;

      const gainValue = config.role === targetRole
        ? 1.0
        : backgroundVolumePercent / 100;

      const gainNode = new Tone.Gain(gainValue).toDestination();
      const sampleUrls = getSampleUrls(config.instrument);

      const sampler = new Tone.Sampler({
        urls: sampleUrls,
      }).connect(gainNode);

      samplers.push({ sampler, gainNode, notes: track.notes });
    }

    // 全サンプルのロードを待つ
    await Tone.loaded();

    // ノートをスケジュール
    for (const { sampler, notes } of samplers) {
      for (const note of notes) {
        const noteName = midiToNoteName(note.midi);
        try {
          sampler.triggerAttackRelease(
            noteName,
            Math.max(note.duration, 0.05), // 最小デュレーションを保証
            note.time,
            note.velocity
          );
        } catch {
          // 音域外のノートは無視
        }
      }
    }
  }, renderDuration, 2, sampleRate);

  // ToneAudioBuffer → AudioBuffer
  return toneBuffer.get() as AudioBuffer;
}
