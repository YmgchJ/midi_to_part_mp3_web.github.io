/**
 * main.ts — アプリケーションエントリーポイント
 * 全層を組み立てる唯一の場所
 */

import './styles/main.css';

/**
 * アプリケーションの初期化
 * DOM構築は ui/renderer.ts に委譲する（P3で実装）
 */
function initApp(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('Root element #app not found');
  }

  app.innerHTML = `
    <header class="header">
      <h1 class="header__title">🎵 MIDI to Part MP3</h1>
      <p class="header__subtitle">合唱練習用音源を自動生成</p>
    </header>

    <section class="card" id="step-upload">
      <span class="card__label">Step 1</span>
      <h2 class="card__title">MIDIファイルをアップロード</h2>
      <div class="drop-zone" id="drop-zone">
        <div class="drop-zone__icon">📁</div>
        <p class="drop-zone__text">ここにMIDIファイルをドラッグ＆ドロップ</p>
        <p class="drop-zone__hint">または、クリックしてファイルを選択（.mid / .midi）</p>
      </div>
      <div class="file-tags" id="file-tags"></div>
    </section>

    <section class="card hidden" id="step-config">
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

    <section class="card hidden" id="step-generate">
      <span class="card__label">Step 3</span>
      <h2 class="card__title">生成 & ダウンロード</h2>
      <button class="btn btn--primary" id="generate-btn" disabled>
        🎵 練習音源を生成
      </button>
      <div class="progress hidden" id="progress-container">
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

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
