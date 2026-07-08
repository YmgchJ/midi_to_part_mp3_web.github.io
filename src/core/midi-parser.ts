/**
 * core/midi-parser.ts — MIDI解析モジュール
 * SPEC.md §1 準拠
 *
 * 入力: ArrayBuffer（.midファイル）× 1以上
 * 出力: ParsedMidi（全トラック統合）
 */

import { Midi } from '@tonejs/midi';
import type { ParsedMidi, ParsedNote, ParsedTrack } from './types.ts';
import { sanitizeFileName } from './file-name.ts';

export { sanitizeFileName };

/**
 * 単一MIDIファイル（ArrayBuffer）を解析し、ParsedTrack[]を返す
 * Type 0 MIDIの場合はチャンネルごとに分割する
 */
function parseSingleMidi(
  buffer: ArrayBuffer,
  fileName: string,
  trackIdOffset: number
): { tracks: ParsedTrack[]; durationSeconds: number; bpm: number } {
  const midi = new Midi(buffer);

  // テンポ: 最初のテンポイベント（なければ120）
  const bpm = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
  const durationSeconds = midi.duration;

  // @tonejs/midi 側で Type 0 のチャンネル分割は済んでいる
  const rawTracks = midi.tracks;
  const tracks: ParsedTrack[] = [];

  for (const [trackIndex, track] of rawTracks.entries()) {
    const fallbackName = `Track ${trackIndex}`;
    const channel = track.channel ?? 0;
    const instrumentNumber = channel === 9 ? 115 : (track.instrument?.number ?? 0);

    if (track.notes.length === 0) {
      // ノートが空のトラックも一覧には出す（警告付き）
      const parsedTrack: ParsedTrack = {
        id: trackIdOffset + trackIndex,
        name: track.name || fallbackName,
        channel,
        notes: [],
        instrumentNumber,
        sourceFileName: fileName,
      };
      tracks.push(parsedTrack);
      continue;
    }

    const notes: ParsedNote[] = track.notes.map((note) => ({
      midi: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity,
    }));

    const parsedTrack: ParsedTrack = {
      id: trackIdOffset + trackIndex,
      name: track.name || fallbackName,
      channel,
      notes,
      instrumentNumber,
      sourceFileName: fileName,
    };
    tracks.push(parsedTrack);
  }

  return { tracks, durationSeconds, bpm };
}

/**
 * 1つ以上のMIDIファイルを解析して統合したParsedMidiを返す
 *
 * @param files - { buffer: ArrayBuffer, name: string }[] のリスト
 * @throws 有効なトラック・ノートがまったくない場合
 */
export function parseMidiFiles(
  files: Array<{ buffer: ArrayBuffer; name: string }>
): ParsedMidi {
  if (files.length === 0) {
    throw new Error('MIDIファイルが選択されていません');
  }

  const allTracks: ParsedTrack[] = [];
  let maxDuration = 0;
  let primaryBpm = 120;
  const primaryFileName = sanitizeFileName(files[0].name);

  for (const file of files) {
    const { tracks, durationSeconds, bpm } = parseSingleMidi(
      file.buffer,
      file.name,
      allTracks.length
    );
    allTracks.push(...tracks);
    if (durationSeconds > maxDuration) {
      maxDuration = durationSeconds;
      primaryBpm = bpm;
    }
  }

  // 全トラックのIDを0からの連番に振り直す（既に parseSingleMidi でoffset付きで振っているので不要だが念のため）
  allTracks.forEach((t, i) => { t.id = i; });

  // ノートが1つもないMIDIは無効とみなす
  const hasAnyNote = allTracks.some((track) => track.notes.length > 0);
  if (!hasAnyNote) {
    throw new Error('有効なトラックがありません');
  }

  return {
    fileName: primaryFileName,
    durationSeconds: maxDuration,
    bpm: primaryBpm,
    tracks: allTracks,
  };
}
