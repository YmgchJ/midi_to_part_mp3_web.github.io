import { describe, expect, it } from 'vitest';
import type { ParsedNote, ParsedTrack } from './types.ts';
import { assignParts, renumberByRole } from './part-assignment.ts';

function note(midi: number): ParsedNote {
  return { midi, time: 0, duration: 0.5, velocity: 0.8 };
}

function track(
  id: number,
  name: string,
  midis: number[],
  extra: Partial<ParsedTrack> = {}
): ParsedTrack {
  return {
    id,
    name,
    channel: 0,
    instrumentNumber: 0,
    sourceFileName: 'demo.mid',
    notes: midis.map(note),
    ...extra,
  };
}

/** trackId -> {role, partName} の簡易ビュー */
function view(configs: ReturnType<typeof assignParts>) {
  return configs.map((c) => ({ trackId: c.trackId, role: c.role, partName: c.partName }));
}

describe('assignParts (mixed)', () => {
  it('maps 4 named SATB tracks 1:1 without numbering', () => {
    const tracks = [
      track(0, 'Soprano', [72]),
      track(1, 'Alto', [67]),
      track(2, 'Tenor', [55]),
      track(3, 'Bass', [43]),
    ];
    expect(view(assignParts(tracks, 'mixed'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano' },
      { trackId: 1, role: 'Alto', partName: 'Alto' },
      { trackId: 2, role: 'Tenor', partName: 'Tenor' },
      { trackId: 3, role: 'Bass', partName: 'Bass' },
    ]);
  });

  it('numbers divisi voices from the top (SSAATTBB)', () => {
    const tracks = [
      track(0, 'Sop 1', [76]),
      track(1, 'Sop 2', [72]),
      track(2, 'Alto 1', [69]),
      track(3, 'Alto 2', [65]),
      track(4, 'Ten 1', [59]),
      track(5, 'Ten 2', [55]),
      track(6, 'Bass 1', [48]),
      track(7, 'Bass 2', [43]),
    ];
    expect(view(assignParts(tracks, 'mixed'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano1' },
      { trackId: 1, role: 'Soprano', partName: 'Soprano2' },
      { trackId: 2, role: 'Alto', partName: 'Alto1' },
      { trackId: 3, role: 'Alto', partName: 'Alto2' },
      { trackId: 4, role: 'Tenor', partName: 'Tenor1' },
      { trackId: 5, role: 'Tenor', partName: 'Tenor2' },
      { trackId: 6, role: 'Bass', partName: 'Bass1' },
      { trackId: 7, role: 'Bass', partName: 'Bass2' },
    ]);
  });

  it('distributes unnamed tracks by track order (top to bottom), not by pitch', () => {
    // わざとピッチ順とトラック順を食い違わせても、トラックの並び順で割り当てる
    const tracks = [
      track(0, 'Track 0', [40]),
      track(1, 'Track 1', [90]),
      track(2, 'Track 2', [50]),
      track(3, 'Track 3', [80]),
    ];
    expect(view(assignParts(tracks, 'mixed'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano' },
      { trackId: 1, role: 'Alto', partName: 'Alto' },
      { trackId: 2, role: 'Tenor', partName: 'Tenor' },
      { trackId: 3, role: 'Bass', partName: 'Bass' },
    ]);
  });

  it('classifies percussion as Percussion and empty tracks as Excluded', () => {
    const tracks = [
      track(0, 'Soprano', [72]),
      track(1, 'Piano', [48, 55]),
      track(2, 'Drums', [76, 77], { channel: 9, instrumentNumber: 115 }),
      track(3, 'Blank', []),
    ];
    const configs = assignParts(tracks, 'mixed');
    expect(view(configs)).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano' },
      { trackId: 1, role: 'Piano', partName: 'Piano' },
      { trackId: 2, role: 'Percussion', partName: 'Percussion' },
      { trackId: 3, role: 'Excluded', partName: '' },
    ]);
    expect(configs[2].instrument).toBe('woodblock');
  });
});

describe('assignParts (men / women)', () => {
  it('men choir uses Tenor/Bass and redistributes non-matching voices', () => {
    const tracks = [
      track(0, 'Melody', [60]),
      track(1, 'Low', [45]),
    ];
    expect(view(assignParts(tracks, 'men'))).toEqual([
      { trackId: 0, role: 'Tenor', partName: 'Tenor' },
      { trackId: 1, role: 'Bass', partName: 'Bass' },
    ]);
  });

  it('women choir numbers two sopranos in track order', () => {
    const tracks = [
      track(0, 'Soprano A', [76]),
      track(1, 'Soprano B', [72]),
    ];
    expect(view(assignParts(tracks, 'women'))).toEqual([
      { trackId: 0, role: 'Soprano', partName: 'Soprano1' },
      { trackId: 1, role: 'Soprano', partName: 'Soprano2' },
    ]);
  });
});

describe('renumberByRole', () => {
  it('renumbers within a role by track order after a manual role change', () => {
    const tracks = [
      track(0, 'A', [48]),
      track(1, 'B', [60]),
      track(2, 'C', [72]),
    ];
    // user forced all three to Bass; numbering follows track order (top to bottom)
    const configs = tracks.map((t) => ({
      trackId: t.id,
      role: 'Bass' as const,
      partName: 'Bass',
      instrument: 'clarinet' as const,
    }));
    expect(view(renumberByRole(tracks, configs))).toEqual([
      { trackId: 0, role: 'Bass', partName: 'Bass1' },
      { trackId: 1, role: 'Bass', partName: 'Bass2' },
      { trackId: 2, role: 'Bass', partName: 'Bass3' },
    ]);
  });
});
