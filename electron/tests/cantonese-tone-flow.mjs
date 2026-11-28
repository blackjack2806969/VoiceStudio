import assert from 'node:assert/strict';
import { resolve } from 'node:path';

export async function exerciseToneEditor(page, baseUrl, captures) {
  await page.goto(baseUrl + '/#/tools');
  const imported = page.waitForResponse(response =>
    response.request().method() === 'POST' && response.url().endsWith('/tools/lexical-pitch/import'));
  await page.getByLabel('Import recording', { exact: true }).setInputFiles(resolve(import.meta.dirname, '../../backend/assets/samples/dictation/en_conversational.wav'));
  assert.equal((await imported).status(), 200);
  await page.getByRole('button', { name: 'Add pitch points', exact: true })
    .and(page.locator('button:enabled')).waitFor();
  const graph = page.getByRole('img', { name: /Speech waveform/ });
  await graph.scrollIntoViewIfNeeded();
  const rect = await graph.boundingBox();
  await page.mouse.move(rect.x + rect.width * .11, rect.y + 50);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .3, rect.y + 50, { steps: 8 });
  await page.mouse.up();
  assert(Number(await page.getByRole('spinbutton', { name: 'End (seconds)' }).inputValue()) > 1.5);
  await page.getByRole('button', { name: 'Add pitch points', exact: true }).click();
  const point = page.locator('circle[data-point="1"]');
  const pointBox = await point.boundingBox();
  const originalHz = Number(await page.getByRole('spinbutton', { name: 'Pitch point 2 Hz' }).inputValue());
  await page.mouse.move(pointBox.x + pointBox.width / 2, pointBox.y + pointBox.height / 2);
  await page.mouse.down(); await page.mouse.move(pointBox.x + pointBox.width / 2, pointBox.y - 15, { steps: 5 }); await page.mouse.up();
  assert(Number(await page.getByRole('spinbutton', { name: 'Pitch point 2 Hz' }).inputValue()) > originalHz);
  const exportLink = page.getByRole('link', { name: 'Export WAV', exact: true });
  const originalUrl = await exportLink.getAttribute('href');
  const renderResponse = page.waitForResponse(r => r.url().endsWith('/render') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Apply pitch edit', exact: true }).click();
  assert.equal((await renderResponse).status(), 200);
  await page.getByRole('button', { name: 'Undo', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(oldUrl => {
    const edited = document.querySelector('audio[aria-label="After (edited)"]');
    return edited?.src.startsWith('blob:') && edited.src !== oldUrl;
  }, originalUrl, { polling: 100 });
  for (const name of ['Before (original)', 'After (edited)']) {
    await page.getByLabel(name, { exact: true }).evaluate(async player => {
      // A CI window may not receive animation frames while audio is playing.
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          finish(new Error(`${player.ariaLabel}: playback stalled at ${player.currentTime}s (readyState ${player.readyState})`));
        }, 10000);
        function finish(error) {
          clearTimeout(timer);
          player.removeEventListener('timeupdate', onTimeUpdate);
          player.pause();
          if (error) reject(error);
          else resolve();
        }
        function onTimeUpdate() {
          if (!player.paused && player.currentTime > 0.05) finish();
        }
        player.addEventListener('timeupdate', onTimeUpdate);
        player.play().catch(finish);
      });
    });
  }
  await page.screenshot({ path: resolve(captures, 'editor-en.png'), fullPage: true });
  const download = page.waitForEvent('download');
  await exportLink.click();
  await (await download).saveAs(resolve(captures, 'edited-speech.wav'));
  const undoResponse = page.waitForResponse(r => r.url().endsWith('/render') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal((await (await undoResponse).json()).take, 'source');
  await page.evaluate(() => localStorage.setItem('voicestudio.locale', 'zh-TW'));
  await page.reload();
  await page.getByRole('button', { name: '重開上次編輯', exact: true }).click();
  await page.getByRole('button', { name: '加入音高控制點', exact: true }).waitFor();
  await page.screenshot({ path: resolve(captures, 'editor-zh-TW.png'), fullPage: true });
  console.log('PASS: real speech upload, pointer region, draggable F0 point, Praat render, before/after playback, WAV download, exact undo and Traditional Chinese restore.');
}
