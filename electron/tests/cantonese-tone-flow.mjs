import assert from 'node:assert/strict';
import { resolve } from 'node:path';

export async function exerciseToneEditor(page, baseUrl, captures) {
  await page.goto(baseUrl + '/#/tools');
  await page.getByLabel('Import recording', { exact: true }).setInputFiles(resolve(import.meta.dirname, '../../backend/assets/samples/dictation/en_conversational.wav'));
  await page.getByRole('button', { name: 'Add pitch points', exact: true }).waitFor();
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
  const renderResponse = page.waitForResponse(r => r.url().endsWith('/render') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Apply pitch edit', exact: true }).click();
  assert.equal((await renderResponse).status(), 200);
  await page.getByRole('button', { name: 'Undo', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const players = [...document.querySelectorAll('audio')];
    return players.length === 2 && players.every(p => p.readyState >= 2 && p.duration > 0);
  });
  for (const player of await page.locator('audio').all()) {
    await player.evaluate(p => p.play());
    await page.waitForFunction(() => [...document.querySelectorAll('audio')].some(p => !p.paused && p.currentTime > 0.05));
    await player.evaluate(p => p.pause());
  }
  await page.screenshot({ path: resolve(captures, 'editor-en.png'), fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Export WAV', exact: true }).click();
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
