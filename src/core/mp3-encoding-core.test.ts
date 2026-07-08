import { describe, expect, it } from 'vitest';
import { encodePcmToMp3, float32ToInt16 } from './mp3-encoding-core.ts';

describe('float32ToInt16', () => {
  it('clamps and scales float32 samples to int16', () => {
    const input = new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]);
    const result = float32ToInt16(input);

    expect(Array.from(result)).toEqual([
      -32768,
      -32768,
      -16384,
      0,
      16383,
      32767,
      32767,
    ]);
  });
});

describe('encodePcmToMp3', () => {
  it('encodes by chunks, reports progress, and merges encoded bytes', () => {
    const progress: number[] = [];
    const chunkSamples: Array<{ left: number[]; right: number[] }> = [];

    const result = encodePcmToMp3({
      leftChannel: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
      rightChannel: new Float32Array([-0.1, -0.2, -0.3, -0.4, -0.5]),
      sampleRate: 44100,
      bitrate: 128,
      chunkSize: 2,
      onProgress: (percent) => progress.push(percent),
      encoderFactory: () => ({
        encodeBuffer: (left, right) => {
          chunkSamples.push({
            left: Array.from(left),
            right: Array.from(right),
          });
          return [left.length, right.length];
        },
        flush: () => [9, 9],
      }),
    });

    expect(chunkSamples).toHaveLength(3);
    expect(chunkSamples[0].left).toHaveLength(2);
    expect(chunkSamples[1].left).toHaveLength(2);
    expect(chunkSamples[2].left).toHaveLength(1);
    expect(progress).toEqual([40, 80, 100]);
    expect(Array.from(result)).toEqual([2, 2, 2, 2, 1, 1, 9, 9]);
  });

  it('returns only flush result when encodeBuffer emits empty chunks', () => {
    const result = encodePcmToMp3({
      leftChannel: new Float32Array([0.1, 0.2]),
      rightChannel: new Float32Array([0.1, 0.2]),
      sampleRate: 44100,
      bitrate: 128,
      chunkSize: 1,
      encoderFactory: () => ({
        encodeBuffer: () => [],
        flush: () => [4, 5, 6],
      }),
    });

    expect(Array.from(result)).toEqual([4, 5, 6]);
  });
});
