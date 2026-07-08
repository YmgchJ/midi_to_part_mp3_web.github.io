import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseMidiFiles, sanitizeFileName } from './midi-parser.ts';

function midiToArrayBuffer(midi: Midi): ArrayBuffer {
  const bytes = midi.toArray();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function createMidiBuffer(
  build: (midi: Midi) => void
): ArrayBuffer {
  const midi = new Midi();
  build(midi);
  return midiToArrayBuffer(midi);
}

describe('sanitizeFileName', () => {
  it('removes midi extension and replaces unsafe characters', () => {
    expect(sanitizeFileName('Ave Maria.mid')).toBe('Ave_Maria');
    expect(sanitizeFileName('gloria?.midi')).toBe('gloria_');
    expect(sanitizeFileName('日本語_テスト.mid')).toBe('日本語_テスト');
  });
});

describe('parseMidiFiles', () => {
  it('throws when no files are provided', () => {
    expect(() => parseMidiFiles([])).toThrow('MIDIファイルが選択されていません');
  });

  it('throws when midi has no playable notes', () => {
    const emptyMidi = createMidiBuffer((midi) => {
      midi.addTrack();
    });

    expect(() => parseMidiFiles([
      { buffer: emptyMidi, name: 'empty.mid' },
    ])).toThrow('有効なトラックがありません');
  });

  it('parses one track with one note', () => {
    const singleTrack = createMidiBuffer((midi) => {
      const track = midi.addTrack();
      track.name = 'Lead';
      track.instrument.number = 71;
      track.addNote({
        midi: 60,
        time: 0,
        duration: 0.5,
        velocity: 0.9,
      });
    });

    const parsed = parseMidiFiles([{ buffer: singleTrack, name: 'sample.mid' }]);

    expect(parsed.fileName).toBe('sample');
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].name).toBe('Lead');
    expect(parsed.tracks[0].notes).toHaveLength(1);
    expect(parsed.tracks[0].notes[0].midi).toBe(60);
  });

  it('generates fallback names for unnamed tracks', () => {
    const unnamed = createMidiBuffer((midi) => {
      const trackA = midi.addTrack();
      trackA.addNote({ midi: 60, time: 0, duration: 0.25, velocity: 0.8 });

      const trackB = midi.addTrack();
      trackB.addNote({ midi: 64, time: 0.1, duration: 0.25, velocity: 0.8 });
    });

    const parsed = parseMidiFiles([{ buffer: unnamed, name: 'untitled.mid' }]);

    expect(parsed.tracks[0].name).toBe('Track 0');
    expect(parsed.tracks[1].name).toBe('Track 1');
  });

  it('merges multiple files and renumbers track ids', () => {
    const first = createMidiBuffer((midi) => {
      const track = midi.addTrack();
      track.name = 'Soprano';
      track.addNote({ midi: 72, time: 0, duration: 0.5, velocity: 1 });
    });

    const second = createMidiBuffer((midi) => {
      const track = midi.addTrack();
      track.name = 'Alto';
      track.addNote({ midi: 69, time: 0.2, duration: 0.5, velocity: 0.8 });
    });

    const parsed = parseMidiFiles([
      { buffer: first, name: 'first.mid' },
      { buffer: second, name: 'second.mid' },
    ]);

    expect(parsed.fileName).toBe('first');
    expect(parsed.tracks).toHaveLength(2);
    expect(parsed.tracks.map((t) => t.id)).toEqual([0, 1]);
    expect(parsed.tracks.map((t) => t.sourceFileName)).toEqual(['first.mid', 'second.mid']);
  });

  it('maps channel 10 track to woodblock instrument number', () => {
    const percussion = createMidiBuffer((midi) => {
      const track = midi.addTrack();
      track.channel = 9;
      track.instrument.number = 0;
      track.addNote({ midi: 35, time: 0, duration: 0.2, velocity: 1 });
    });

    const parsed = parseMidiFiles([{ buffer: percussion, name: 'drums.mid' }]);

    expect(parsed.tracks[0].channel).toBe(9);
    expect(parsed.tracks[0].instrumentNumber).toBe(115);
  });
});
