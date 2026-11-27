import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exerciseToneEditor } from './cantonese-tone-flow.mjs';

const captures = resolve('artifacts/cantonese/packaged');
await mkdir(captures, { recursive: true });
// Launch the bundle's real entrypoint with Chromium sandboxing enabled.
const app = await electron.launch({
  executablePath: resolve('electron/release/mac-arm64/VoiceStudio.app/Contents/MacOS/cantonese-offline'),
  chromiumSandbox: true,
  acceptDownloads: true,
  env: { ...process.env, OMNIVOICE_PORT: '3920', OMNIVOICE_PRELOAD_TTS_ASR: '0',
    OMNIVOICE_PRELOAD_CAPTURE_ASR: '0', OMNIVOICE_PRELOAD_WATERMARK: '0' },
  timeout: 60000,
});
app.process().stderr?.on('data', chunk => process.stderr.write(chunk));
let page;
try {
  page = await app.firstWindow();
  await page.waitForURL('app://voicestudio/**');
  assert.equal(await app.evaluate(({ app }) => app.commandLine.hasSwitch('no-sandbox')), false);
  const window = await app.browserWindow(page);
  assert.equal(await window.evaluate(win => {
    win.webContents.setBackgroundThrottling(false);
    return win.webContents.getLastWebPreferences().sandbox;
  }), true);
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.equal(await app.evaluate(async ({ net }) => {
    try {
      await net.fetch('https://1.1.1.1/', { signal: AbortSignal.timeout(3000) });
      return false;
    } catch (error) {
      return String(error).includes('ERR_BLOCKED_BY_CLIENT');
    }
  }), true, 'Chromium must block external IP requests before connecting');
  const deadline = Date.now() + 180000;
  for (;;) {
    const status = await page.evaluate(() => window.voicestudio.backend.getStatus());
    if (status.stage === 'ready') {
      assert.equal(status.managed, true);
      const ready = await app.evaluate(async ({ net }, port) => {
        const response = await net.fetch(`http://127.0.0.1:${port}/health`);
        return response.ok;
      }, status.port);
      assert(ready, 'Chromium must reach the managed loopback backend');
      break;
    }
    assert(!['failed', 'crashed', 'setup_required', 'port_in_use'].includes(status.stage), JSON.stringify(status));
    assert(Date.now() < deadline, JSON.stringify(status));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  await exerciseToneEditor(page, 'app://voicestudio', captures);
  const exported = await readFile(resolve(captures, 'edited-speech.wav'));
  assert(exported.length > 44 && exported.toString('ascii', 0, 4) === 'RIFF' &&
    exported.toString('ascii', 8, 12) === 'WAVE', 'Export must be a nonempty WAV');
  console.log('PASS: sandboxed ARM64 app, bundled backend/ffmpeg, real pitch edit and export.');
} finally {
  if (page) await page.screenshot({ path: resolve(captures, 'last-screen.png'), fullPage: true }).catch(() => {});
  await app.close();
}
