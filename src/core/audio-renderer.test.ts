import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParsedMidi, TrackConfig } from './types.ts';
import { renderPartAudio } from './audio-renderer.ts';

const toneMockState = vi.hoisted(() => ({
  loadedCalls: 0,
  offlineArgs: null as null | { duration: number; channels: number; sampleRate: number },
  gainValues: [] as number[],
  samplerUrls: [] as Array<Record<string, string>>,
  triggerCalls: [] as Array<{ noteName: string; duration: number; time: number; velocity: number }>,
  throwOnNoteName: null as string | null,
  returnBuffer: { kind: 'mock-audio-buffer' } as unknown,
}));

vi.mock('tone', () => {
  class MockGain {
    constructor(value: number) {
      toneMockState.gainValues.push(value);
    }

    toDestination(): this {
      return this;
    }
  }

  class MockSampler {
    constructor(options: { urls: Record<string, string> }) {
      toneMockState.samplerUrls.push(options.urls);
    }

    connect(_gainNode: MockGain): this {
      return this;
    }

    triggerAttackRelease(
      noteName: string,
      duration: number,
      time: number,
      velocity: number
    ): void {
      if (toneMockState.throwOnNoteName === noteName) {
        throw new Error('out of range');
      }
      toneMockState.triggerCalls.push({ noteName, duration, time, velocity });
    }
  }

  return {
    Gain: MockGain,
    Sampler: MockSampler,
    loaded: vi.fn(async () => {
      toneMockState.loadedCalls += 1;
    }),
    Offline: vi.fn(async (
      callback: () => Promise<void> | void,
      duration: number,
      channels: number,
      sampleRate: number
    ) => {
      toneMockState.offlineArgs = { duration, channels, sampleRate };
      await callback();
      return {
        get: () => toneMockState.returnBuffer,
      };
    }),
  };
});

function makeParsedMidi(): ParsedMidi {
  return {
    fileName: 'demo',
    bpm: 120,
    durationSeconds: 10,
    tracks: [
      {
        id: 0,
        name: 'Soprano',
        channel: 0,
        instrumentNumber: 71,
        sourceFileName: 'demo.mid',
        notes: [
          { midi: 60, time: 1, duration: 0.01, velocity: 0.8 },
        ],
      },
      {
        id: 1,
        name: 'Alto',
        channel: 1,
        instrumentNumber: 71,
        sourceFileName: 'demo.mid',
        notes: [
          { midi: 62, time: 2, duration: 0.5, velocity: 0.7 },
        ],
      },
      {
        id: 2,
        name: 'Empty',
        channel: 2,
        instrumentNumber: 0,
        sourceFileName: 'demo.mid',
        notes: [],
      },
    ],
  };
}

describe('renderPartAudio', () => {
  beforeEach(() => {
    toneMockState.loadedCalls = 0;
    toneMockState.offlineArgs = null;
    toneMockState.gainValues = [];
    toneMockState.samplerUrls = [];
    toneMockState.triggerCalls = [];
    toneMockState.throwOnNoteName = null;
    toneMockState.returnBuffer = { kind: 'mock-audio-buffer' } as unknown;
  });

  it('renders target and background tracks with proper gain and note scheduling', async () => {
    const parsedMidi = makeParsedMidi();
    const trackConfigs: TrackConfig[] = [
      { trackId: 0, role: 'Soprano', instrument: 'clarinet' },
      { trackId: 1, role: 'Alto', instrument: 'piano' },
      { trackId: 2, role: 'Excluded', instrument: 'woodblock' },
    ];

    const result = await renderPartAudio(parsedMidi, trackConfigs, 'Soprano', 30, 48000);

    expect(result).toBe(toneMockState.returnBuffer);
    expect(toneMockState.offlineArgs).toEqual({
      duration: 10.5,
      channels: 2,
      sampleRate: 48000,
    });
    expect(toneMockState.loadedCalls).toBe(1);
    expect(toneMockState.gainValues).toEqual([1.0, 0.3]);
    expect(toneMockState.triggerCalls).toEqual([
      { noteName: 'C4', duration: 0.05, time: 1, velocity: 0.8 },
      { noteName: 'D4', duration: 0.5, time: 2, velocity: 0.7 },
    ]);
    expect(Object.keys(toneMockState.samplerUrls[0])).toContain('D3');
    expect(Object.keys(toneMockState.samplerUrls[1])).toContain('A0');
  });

  it('ignores tracks without config and continues when sampler rejects out-of-range notes', async () => {
    const parsedMidi = makeParsedMidi();
    const trackConfigs: TrackConfig[] = [
      { trackId: 0, role: 'Soprano', instrument: 'clarinet' },
    ];
    toneMockState.throwOnNoteName = 'C4';

    await expect(
      renderPartAudio(parsedMidi, trackConfigs, 'Soprano', 50)
    ).resolves.toBe(toneMockState.returnBuffer);

    expect(toneMockState.gainValues).toEqual([1.0]);
    expect(toneMockState.triggerCalls).toEqual([]);
  });
});
