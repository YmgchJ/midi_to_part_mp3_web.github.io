import { sanitizeFileName } from '../../core/file-name.ts';
import type { AppState, GeneratedPart, PartRole } from '../../core/types.ts';
import { addGeneratedPart, resetGeneration, setProgress } from '../../state/app-state.ts';

interface DownloadButtonOptions {
  button: HTMLButtonElement;
  getState: () => AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getActiveRoles(state: AppState): Array<Exclude<PartRole, 'Excluded'>> {
  const roles = state.trackConfigs
    .filter((config): config is typeof config & { role: Exclude<PartRole, 'Excluded'> } => config.role !== 'Excluded')
    .map((config) => config.role);
  return Array.from(new Set(roles));
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

      const activeRoles = getActiveRoles(current);
      if (activeRoles.length === 0) return;

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

        for (let i = 0; i < activeRoles.length; i++) {
          const role = activeRoles[i];
          const roleName = current.partNames[role];
          updateState((state) => setProgress(state, {
            phase: 'rendering',
            currentPartName: roleName,
            currentPartIndex: i,
            totalParts: activeRoles.length,
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
            role,
            latestState.backgroundVolumePercent
          );

          updateState((state) => setProgress(state, {
            phase: 'encoding',
            currentPartName: roleName,
            currentPartIndex: i,
            totalParts: activeRoles.length,
            partProgress: 0,
          }));

          const mp3Blob = await encodeToMp3(audioBuffer, undefined, (percent) => {
            updateState((state) => setProgress(state, {
              phase: 'encoding',
              currentPartName: roleName,
              currentPartIndex: i,
              totalParts: activeRoles.length,
              partProgress: percent,
            }));
          });

          const generated: GeneratedPart = {
            partName: roleName,
            mp3Blob,
            fileName: `${baseFileName}_${sanitizeFileName(roleName)}.mp3`,
          };
          generatedParts.push(generated);
          updateState((state) => addGeneratedPart(state, generated));
        }

        updateState((state) => setProgress(state, {
          phase: 'zipping',
          currentPartName: 'ZIP',
          currentPartIndex: Math.max(activeRoles.length - 1, 0),
          totalParts: activeRoles.length,
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
              currentPartIndex: Math.max(activeRoles.length - 1, 0),
              totalParts: activeRoles.length,
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
          currentPartIndex: activeRoles.length - 1,
          totalParts: activeRoles.length,
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
