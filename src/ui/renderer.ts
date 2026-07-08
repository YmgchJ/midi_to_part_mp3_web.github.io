import { INSTRUMENT_LABELS, PART_COLORS } from '../core/constants.ts';
import type { AppState, PartRole } from '../core/types.ts';
import { renderProgressDisplay } from './components/progress-display.ts';

function roleLabel(role: PartRole): string {
  return role === 'Excluded' ? '除外' : role;
}

function roleColor(role: PartRole): string {
  if (role === 'Excluded') return 'var(--color-text-muted)';
  return PART_COLORS[role];
}

function renderPartNameInputs(state: AppState): string {
  const roles = Array.from(new Set(
    state.trackConfigs
      .filter((config): config is typeof config & { role: Exclude<PartRole, 'Excluded'> } => config.role !== 'Excluded')
      .map((config) => config.role)
  ));
  if (roles.length === 0) return '';

  const rows = roles.map((role) => `
    <label class="part-name-field">
      <span class="part-name-field__label">${role} 名</span>
      <input
        type="text"
        class="part-name-input js-part-name-input"
        data-role="${role}"
        value="${state.partNames[role]}"
      />
    </label>
  `).join('');
  return `
    <section class="part-name-grid" aria-label="パート名カスタマイズ">
      ${rows}
    </section>
  `;
}

export function renderAppShell(root: HTMLDivElement): void {
  root.innerHTML = `
    <header class="header">
      <h1 class="header__title">🎵 MIDI to Part MP3</h1>
      <p class="header__subtitle">合唱練習用音源を自動生成</p>
    </header>

    <section class="card" id="step-upload">
      <span class="card__label">Step 1</span>
      <h2 class="card__title">MIDIファイルをアップロード</h2>
      <div
        class="drop-zone"
        id="drop-zone"
        role="button"
        tabindex="0"
        aria-label="MIDIファイルを選択またはドロップ"
      >
        <div class="drop-zone__icon">📁</div>
        <p class="drop-zone__text">ここにMIDIファイルをドラッグ＆ドロップ</p>
        <p class="drop-zone__hint">または、クリックしてファイルを選択（.mid / .midi）</p>
      </div>
      <div class="file-tags" id="file-tags"></div>
      <p class="drop-zone__hint" id="upload-status" role="status" aria-live="polite"></p>
    </section>

    <section class="card hidden" id="step-config" aria-hidden="true">
      <span class="card__label">Step 2</span>
      <h2 class="card__title">トラック設定</h2>
      <div id="track-config-container"></div>
      <div class="volume-control">
        <label class="volume-control__label" for="volume-slider">主役以外の音量</label>
        <input
          type="range"
          id="volume-slider"
          class="volume-control__slider"
          min="0"
          max="100"
          step="5"
          value="50"
        />
        <span class="volume-control__value" id="volume-value">50%</span>
      </div>
    </section>

    <section class="card hidden" id="step-generate" aria-hidden="true">
      <span class="card__label">Step 3</span>
      <h2 class="card__title">生成 & ダウンロード</h2>
      <button class="btn btn--primary" id="generate-btn" disabled>
        🎵 練習音源を生成
      </button>
      <div class="progress hidden" id="progress-container" role="status" aria-live="polite">
        <div class="progress__bar-container">
          <div class="progress__bar" id="progress-bar" style="transform: scaleX(0)"></div>
        </div>
        <div class="progress__text">
          <span id="progress-label"></span>
          <span class="progress__percent" id="progress-percent">0%</span>
        </div>
      </div>
    </section>

    <footer class="footer">
      <p>MIDI to Part MP3 — 合唱練習用音源自動生成ツール</p>
      <p>すべての処理はブラウザ内で完結します。サーバーへのデータ送信はありません。</p>
    </footer>
  `;
}

export function renderTrackConfigTable(state: AppState): string {
  if (!state.parsedMidi) return '';

  const configMap = new Map(state.trackConfigs.map((c) => [c.trackId, c]));
  const rows = state.parsedMidi.tracks.map((track) => {
    const config = configMap.get(track.id);
    if (!config) return '';

    const noteCount = track.notes.length;
    return `
      <tr>
        <td data-label="Track">
          <div class="track-name">
            <span class="track-name__dot" style="background:${roleColor(config.role)}"></span>
            <span class="track-name__label">${track.name}</span>
            <span class="track-name__notes">(${noteCount} notes)</span>
          </div>
        </td>
        <td data-label="Part">
          <select class="select js-role-select" data-track-id="${track.id}">
            <option value="Soprano" ${config.role === 'Soprano' ? 'selected' : ''}>Soprano</option>
            <option value="Alto" ${config.role === 'Alto' ? 'selected' : ''}>Alto</option>
            <option value="Tenor" ${config.role === 'Tenor' ? 'selected' : ''}>Tenor</option>
            <option value="Bass" ${config.role === 'Bass' ? 'selected' : ''}>Bass</option>
            <option value="Piano" ${config.role === 'Piano' ? 'selected' : ''}>Piano</option>
            <option value="Excluded" ${config.role === 'Excluded' ? 'selected' : ''}>除外</option>
          </select>
        </td>
        <td data-label="Instrument">
          <select class="select js-instrument-select" data-track-id="${track.id}">
            <option value="clarinet" ${config.instrument === 'clarinet' ? 'selected' : ''}>${INSTRUMENT_LABELS.clarinet}</option>
            <option value="piano" ${config.instrument === 'piano' ? 'selected' : ''}>${INSTRUMENT_LABELS.piano}</option>
            <option value="woodblock" ${config.instrument === 'woodblock' ? 'selected' : ''}>${INSTRUMENT_LABELS.woodblock}</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="track-table">
      <thead>
        <tr>
          <th scope="col">Track</th>
          <th scope="col">Part</th>
          <th scope="col">Instrument</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function renderAppState(state: AppState): void {
  const stepConfig = document.querySelector<HTMLElement>('#step-config');
  const stepGenerate = document.querySelector<HTMLElement>('#step-generate');
  const trackConfigContainer = document.querySelector<HTMLDivElement>('#track-config-container');
  const volumeSlider = document.querySelector<HTMLInputElement>('#volume-slider');
  const volumeValue = document.querySelector<HTMLSpanElement>('#volume-value');
  const generateBtn = document.querySelector<HTMLButtonElement>('#generate-btn');

  if (!stepConfig || !stepGenerate || !trackConfigContainer || !volumeSlider || !volumeValue || !generateBtn) {
    return;
  }

  const hasMidi = state.parsedMidi !== null;
  stepConfig.classList.toggle('hidden', !hasMidi);
  stepGenerate.classList.toggle('hidden', !hasMidi);
  stepConfig.setAttribute('aria-hidden', String(!hasMidi));
  stepGenerate.setAttribute('aria-hidden', String(!hasMidi));

  if (hasMidi) {
    trackConfigContainer.innerHTML = renderTrackConfigTable(state);
    trackConfigContainer.insertAdjacentHTML('beforeend', renderPartNameInputs(state));
    volumeSlider.value = String(state.backgroundVolumePercent);
    volumeValue.textContent = `${state.backgroundVolumePercent}%`;

    const activeRoleCount = new Set(
      state.trackConfigs
        .filter((config) => config.role !== 'Excluded')
        .map((config) => roleLabel(config.role))
    ).size;
    const isBusy = state.progress.phase === 'rendering'
      || state.progress.phase === 'encoding'
      || state.progress.phase === 'zipping';
    const isDone = state.progress.phase === 'done';
    generateBtn.disabled = activeRoleCount === 0 || isBusy;
    generateBtn.setAttribute('aria-busy', String(isBusy));
    generateBtn.classList.remove('btn--primary', 'btn--success');
    if (isBusy) {
      generateBtn.textContent = '処理中...';
      generateBtn.classList.add('btn--primary');
    } else if (isDone) {
      generateBtn.textContent = '📥 ZIPを再ダウンロード';
      generateBtn.classList.add('btn--success');
    } else {
      generateBtn.textContent = '🎵 練習音源を生成';
      generateBtn.classList.add('btn--primary');
    }
  }

  renderProgressDisplay(state.progress);
}

export function setUploadStatus(message: string, isError = false): void {
  const status = document.querySelector<HTMLElement>('#upload-status');
  const dropZone = document.querySelector<HTMLElement>('#drop-zone');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? 'var(--color-error)' : '';

  if (dropZone && isError) {
    dropZone.classList.remove('shake');
    // restart animation
    void dropZone.offsetWidth;
    dropZone.classList.add('shake');
  }
}
