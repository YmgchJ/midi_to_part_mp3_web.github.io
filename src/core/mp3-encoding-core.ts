import { Mp3Encoder } from '@breezystack/lamejs';
import { MP3_CHUNK_SIZE } from './constants.ts';

interface Mp3EncoderLike {
  encodeBuffer(left: Int16Array, right: Int16Array): Int8Array | Uint8Array | number[];
  flush(): Int8Array | Uint8Array | number[];
}

export interface EncodePcmOptions {
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  sampleRate: number;
  bitrate: number;
  onProgress?: (percent: number) => void;
  chunkSize?: number;
  encoderFactory?: (channels: number, sampleRate: number, bitrate: number) => Mp3EncoderLike;
}

/** Float32Array → Int16Array 変換（-1.0〜1.0 → -32768〜32767） */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return int16;
}

/** Stereo PCMをMP3バイト列へエンコードする（Worker非依存） */
export function encodePcmToMp3(options: EncodePcmOptions): Uint8Array {
  const {
    leftChannel,
    rightChannel,
    sampleRate,
    bitrate,
    onProgress,
    chunkSize = MP3_CHUNK_SIZE,
    encoderFactory = (channels, rate, kbps) => new Mp3Encoder(channels, rate, kbps),
  } = options;

  const encoder = encoderFactory(2, sampleRate, bitrate);
  const leftInt16 = float32ToInt16(leftChannel);
  const rightInt16 = float32ToInt16(rightChannel);

  const mp3Chunks: Uint8Array[] = [];
  const totalSamples = leftInt16.length;
  let offset = 0;

  while (offset < totalSamples) {
    const end = Math.min(offset + chunkSize, totalSamples);
    const leftChunk = leftInt16.subarray(offset, end);
    const rightChunk = rightInt16.subarray(offset, end);

    const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
    if (encoded.length > 0) {
      mp3Chunks.push(new Uint8Array(encoded));
    }

    offset = end;
    onProgress?.(Math.round((offset / totalSamples) * 100));
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) {
    mp3Chunks.push(new Uint8Array(flushed));
  }

  const totalLength = mp3Chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const mp3Data = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of mp3Chunks) {
    mp3Data.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return mp3Data;
}
