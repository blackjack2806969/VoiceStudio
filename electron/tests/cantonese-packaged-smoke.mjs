import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exerciseToneEditor } from './cantonese-tone-flow.mjs';

const captures = resolve('artifacts/cantonese/packaged');
await mkdir(captures, { recursive: true });
// Launch the bundle's real executable wrapper so the OS sandbox is inherited.
const app = await electron.launch({
  executablePath: resolve('electron/release/mac-arm64/VoiceStudio.app/Contents/MacOS/cantonese-offline'),
  env: { ...process.env, OMNIVOICE_PORT: '3920', OMNIVOICE_PRELOAD_TTS_ASR: '0',
    OMNIVOICE_PRELOAD_CAPTURE_ASR: '0', OMNIVOICE_PRELOAD_WATERMARK: '0' },
  timeout: 60000,
});
app.process().stderr?.on('data', chunk => process.stderr.write(chunk));
let page;
try {
  page = await app.firstWindow();
  await page.waitForURL('app://voicestudio/**');
  const deadline = Date.now() + 180000;
  for (;;) {
    const status = await page.evaluate(() => window.voicestudio.backend.getStatus());
    if (status.stage === 'ready') {
      assert.equal(status.managed, true);
      break;
    }
    assert(!['failed', 'crashed', 'setup_required', 'port_in_use'].includes(status.stage), JSON.stringify(status));
    assert(Date.now() < deadline, JSON.stringify(status));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  await exerciseToneEditor(page, 'app://voicestudio', captures);
  console.log('PASS: sandboxed ARM64 app, bundled backend/ffmpeg, real pitch edit and export.');
} finally {
  if (page) await page.screenshot({ path: resolve(captures, 'last-screen.png'), fullPage: true }).catch(() => {});
  await app.close();
}
