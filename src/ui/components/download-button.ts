import { sanitizeFileName } from '../../core/file-name.ts';
import type { AppState, GeneratedPart } from '../../core/types.ts';
import { addGeneratedPart, resetGeneration, setProgress } from '../../state/app-state.ts';

interface DownloadButtonOptions {
  button: HTMLButtonElement;
  getState: () => AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}

/** 生成対象の1パート（同名トラックはまとめて1出力にする） */
interface PartGroup {
  partName: string;
  trackIds: number[];
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Excluded以外のトラックをパート名でグルーピングする（出力順はトラック順を維持） */
export function getPartGroups(state: AppState): PartGroup[] {
  const groups: PartGroup[] = [];
  const indexByName = new Map<string, number>();
  for (const config of state.trackConfigs) {
    if (config.role === 'Excluded') continue;
    const partName = config.partName || String(config.role);
    const existing = indexByName.get(partName);
    if (existing === undefined) {
      indexByName.set(partName, groups.length);
      groups.push({ partName, trackIds: [config.trackId] });
    } else {
      groups[existing].trackIds.push(config.trackId);
    }
  }
  return groups;
}

export function setupDownloadButton(options: DownloadButtonOptions): void {
  const { button, getState, updateState } = options;
  let latestZipBlob: Blob | null = null;
  let latestZipFileName = '';

  button.addEventListener('click', () => {
    void (async () => {
      const current = getState();
      if (!current.parsedMidi) return;

      if (current.progress.phase === 'done' && latestZipBlob && latestZipFileName) {
        downloadBlob(latestZipBlob, latestZipFileName);
        return;
      }

      const parts = getPartGroups(current);
      if (parts.length === 0) return;

      const baseFileName = sanitizeFileName(current.parsedMidi.fileName);
      latestZipBlob = null;
      latestZipFileName = '';
      updateState((state) => resetGeneration(state));

      try {
        const [
          { default: JSZip },
          { renderPartAudio },
          { encodeToMp3 },
        ] = await Promise.all([
          import('jszip'),
          import('../../core/audio-renderer.ts'),
          import('../../core/mp3-encoder.ts'),
        ]);
        const generatedParts: GeneratedPart[] = [];

        for (let i = 0; i < parts.length; i++) {
          const { partName, trackIds } = parts[i];
          updateState((state) => setProgress(state, {
            phase: 'rendering',
            currentPartName: partName,
            currentPartIndex: i,
            totalParts: parts.length,
            partProgress: 0,
            errorMessage: undefined,
          }));

          const latestState = getState();
          if (!latestState.parsedMidi) {
            throw new Error('MIDIデータが見つかりません');
          }

          const audioBuffer = await renderPartAudio(
            latestState.parsedMidi,
            latestState.trackConfigs,
            trackIds,
            latestState.backgroundVolumePercent
          );

          updateState((state) => setProgress(state, {
            phase: 'encoding',
            currentPartName: partName,
            currentPartIndex: i,
            totalParts: parts.length,
            partProgress: 0,
          }));

          const mp3Blob = await encodeToMp3(audioBuffer, undefined, (percent) => {
            updateState((state) => setProgress(state, {
              phase: 'encoding',
              currentPartName: partName,
              currentPartIndex: i,
              totalParts: parts.length,
              partProgress: percent,
            }));
          });

          const generated: GeneratedPart = {
            partName,
            mp3Blob,
            fileName: `${baseFileName}_${sanitizeFileName(partName)}.mp3`,
          };
          generatedParts.push(generated);
          updateState((state) => addGeneratedPart(state, generated));
        }

        updateState((state) => setProgress(state, {
          phase: 'zipping',
          currentPartName: 'ZIP',
          currentPartIndex: Math.max(parts.length - 1, 0),
          totalParts: parts.length,
          partProgress: 0,
        }));

        const zip = new JSZip();
        for (const part of generatedParts) {
          zip.file(part.fileName, part.mp3Blob);
        }

        const zipBlob = await zip.generateAsync(
          { type: 'blob' },
          (metadata) => {
            updateState((state) => setProgress(state, {
              phase: 'zipping',
              currentPartName: 'ZIP',
              currentPartIndex: Math.max(parts.length - 1, 0),
              totalParts: parts.length,
              partProgress: metadata.percent,
            }));
          }
        );

        latestZipBlob = zipBlob;
        latestZipFileName = `${baseFileName}_parts.zip`;
        downloadBlob(zipBlob, latestZipFileName);
        updateState((state) => setProgress(state, {
          phase: 'done',
          currentPartName: '完了',
          currentPartIndex: parts.length - 1,
          totalParts: parts.length,
          partProgress: 100,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateState((state) => setProgress(state, {
          phase: 'error',
          currentPartName: '',
          partProgress: 0,
          errorMessage: message,
        }));
      }
    })();
  });
}
