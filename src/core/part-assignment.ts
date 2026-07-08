/**
 * core/part-assignment.ts — パート自動割り当て・採番ロジック
 *
 * 合唱種別（混声/女声/男声）に応じて、MIDIトラックを声部へ配分し、
 * 同一声部に複数トラックがある場合は上（高音）から 1,2,3… と採番する。
 * DOMやブラウザAPIに依存しない純粋ロジック。
 */

import type {
  ChoirType,
  InstrumentChoice,
  ParsedTrack,
  PartRole,
  TrackConfig,
  VoiceRole,
} from './types.ts';
import { CHOIR_VOICES, DEFAULT_INSTRUMENT_FOR_ROLE } from './constants.ts';

/** トラックの平均ピッチ（ノートが無ければ -Infinity） */
export function averagePitch(track: ParsedTrack): number {
  if (track.notes.length === 0) return -Infinity;
  let sum = 0;
  for (const note of track.notes) sum += note.midi;
  return sum / track.notes.length;
}

function isPercussion(track: ParsedTrack): boolean {
  return track.channel === 9 || track.instrumentNumber === 115;
}

function isAccompaniment(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('piano') || n.includes('伴奏') || n.includes('accomp');
}

/** トラック名から声部を推定（判別できなければ null） */
function detectVoice(name: string): VoiceRole | null {
  const n = name.toLowerCase();
  if (n.includes('soprano') || n.includes('sop')) return 'Soprano';
  if (n.includes('alto') || n.includes('alt')) return 'Alto';
  if (n.includes('tenor') || n.includes('ten')) return 'Tenor';
  if (n.includes('bass') || n.includes('bas')) return 'Bass';
  return null;
}

/** items を buckets 個のグループへ、先頭（上）優先で均等配分する */
function distribute<T>(items: readonly T[], buckets: number): T[][] {
  const result: T[][] = Array.from({ length: buckets }, () => []);
  if (buckets <= 0) return result;
  const base = Math.floor(items.length / buckets);
  let remainder = items.length % buckets;
  let index = 0;
  for (let b = 0; b < buckets; b++) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    for (let k = 0; k < size; k++) {
      result[b].push(items[index++]);
    }
  }
  return result;
}

function defaultInstrument(track: ParsedTrack, role: PartRole): InstrumentChoice {
  if (isPercussion(track)) return 'woodblock';
  return DEFAULT_INSTRUMENT_FOR_ROLE[role];
}

/**
 * ロール（声部/伴奏/除外）を尊重したまま、パート名を採番し直す。
 * 同一ロールが複数なら高音→低音で 1,2,3… を付与し、単独ならロール名のみ。
 * 手動でロールを変えた後の再採番に使う。
 */
export function renumberByRole(
  tracks: readonly ParsedTrack[],
  configs: readonly TrackConfig[]
): TrackConfig[] {
  const pitchById = new Map<number, number>();
  for (const track of tracks) pitchById.set(track.id, averagePitch(track));

  const byRole = new Map<PartRole, TrackConfig[]>();
  for (const config of configs) {
    if (config.role === 'Excluded') continue;
    const group = byRole.get(config.role);
    if (group) group.push(config);
    else byRole.set(config.role, [config]);
  }

  const nameByTrackId = new Map<number, string>();
  for (const [role, group] of byRole) {
    const sorted = [...group].sort((a, b) => {
      const diff = (pitchById.get(b.trackId) ?? -Infinity) - (pitchById.get(a.trackId) ?? -Infinity);
      return diff !== 0 ? diff : a.trackId - b.trackId;
    });
    const multiple = sorted.length > 1;
    sorted.forEach((config, index) => {
      nameByTrackId.set(config.trackId, multiple ? `${role}${index + 1}` : String(role));
    });
  }

  return configs.map((config) =>
    config.role === 'Excluded'
      ? { ...config, partName: '' }
      : { ...config, partName: nameByTrackId.get(config.trackId) ?? String(config.role) }
  );
}

/**
 * 合唱種別に基づいてトラックへロール・楽器・パート名を自動割り当てする。
 *
 * - ノート無し / パーカッションは除外
 * - ピアノ・伴奏はPianoロールでBGM扱い
 * - 残りの声部トラックは高音→低音の順に声部へ配分（名前で全て判別できればそれを尊重）
 * - 採番は {@link renumberByRole} に委譲
 */
export function assignParts(
  tracks: readonly ParsedTrack[],
  choirType: ChoirType
): TrackConfig[] {
  const voices = CHOIR_VOICES[choirType];
  const roleByTrackId = new Map<number, PartRole>();
  const voiceTracks: ParsedTrack[] = [];

  for (const track of tracks) {
    if (track.notes.length === 0 || isPercussion(track)) {
      roleByTrackId.set(track.id, 'Excluded');
    } else if (isAccompaniment(track.name)) {
      roleByTrackId.set(track.id, 'Piano');
    } else {
      voiceTracks.push(track);
    }
  }

  // 高音→低音（同ピッチはid昇順で安定化）
  const sorted = [...voiceTracks].sort((a, b) => {
    const diff = averagePitch(b) - averagePitch(a);
    return diff !== 0 ? diff : a.id - b.id;
  });

  const detected = sorted.map((track) => detectVoice(track.name));
  const allNamed =
    sorted.length > 0 &&
    detected.every((voice) => voice !== null && voices.includes(voice));

  if (allNamed) {
    sorted.forEach((track, i) => roleByTrackId.set(track.id, detected[i] as VoiceRole));
  } else {
    const buckets = distribute(sorted, voices.length);
    buckets.forEach((bucket, b) => {
      for (const track of bucket) roleByTrackId.set(track.id, voices[b]);
    });
  }

  const configs: TrackConfig[] = tracks.map((track) => {
    const role = roleByTrackId.get(track.id) ?? 'Excluded';
    return {
      trackId: track.id,
      role,
      partName: '',
      instrument: defaultInstrument(track, role),
    };
  });

  return renumberByRole(tracks, configs);
}
