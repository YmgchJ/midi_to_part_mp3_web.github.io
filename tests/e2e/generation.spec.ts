import { expect, test } from '@playwright/test';
import midiPkg from '@tonejs/midi';

const { Midi } = midiPkg;

function createDemoMidiBuffer(): Buffer {
  const midi = new Midi();
  const track = midi.addTrack();
  track.name = 'Soprano';
  track.addNote({
    midi: 60,
    time: 0,
    duration: 0.5,
    velocity: 0.8,
  });
  return Buffer.from(midi.toArray());
}

test('generation smoke: upload -> generate -> complete', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', {
    name: 'demo.mid',
    mimeType: 'audio/midi',
    buffer: createDemoMidiBuffer(),
  });

  await expect(page.locator('#step-config')).toBeVisible();
  await expect(page.locator('#generate-btn')).toBeEnabled();

  await page.click('#generate-btn');
  await expect(page.locator('#generate-btn')).toHaveText('📥 ZIPを再ダウンロード', {
    timeout: 120000,
  });
});
