import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { exerciseToneEditor } from './cantonese-tone-flow.mjs';

const captures = resolve('artifacts/cantonese/packaged');
await mkdir(captures, { recursive: true });
const data = await mkdtemp(resolve(tmpdir(), 'cantonese-packaged-'));
// Launch the bundle's real entrypoint with Chromium sandboxing enabled.
const app = await electron.launch({
  executablePath: resolve('electron/release/mac-arm64/VoiceStudio.app/Contents/MacOS/cantonese-offline'),
  chromiumSandbox: true,
  acceptDownloads: true,
  env: { ...process.env, OMNIVOICE_DATA_DIR: data, OMNIVOICE_PORT: '3920', OMNIVOICE_PRELOAD_TTS_ASR: '0',
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
  await page.goto('app://voicestudio/#/clone');
  const install = page.getByRole('button', { name: 'Download CosyVoice 3', exact: true });
  await install.waitFor();
  const empty = await page.evaluate(async () => {
    const [tts, catalogue] = await Promise.all(['/api/engines/tts', '/api/models'].map(async path => {
      const response = await fetch(path, { signal: AbortSignal.timeout(15_000) }).catch(error => {
        throw new Error(`${path}: ${error.message}`);
      });
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    }));
    return { engine: tts.active, ready: tts.backends[0].available, model: catalogue.models[0] };
  });
  assert.deepEqual([empty.engine, empty.ready], ['cosyvoice', false]);
  assert.equal(empty.model.repo_id, 'FunAudioLLM/Fun-CosyVoice3-0.5B-2512');
  assert.equal(empty.model.installed, false);
  await page.screenshot({ path: resolve(captures, 'clone-no-model.png') });
  console.log('PASS: packaged Clone opens without weights and shows the download action.');

  // Accept only the real installer confirmation. The signed app still launches
  // its actual download worker and restarts the offline backend.
  await app.evaluate(({ dialog }) => {
    const show = dialog.showMessageBox.bind(dialog);
    dialog.showMessageBox = (owner, options) => options.message === 'Go online to install CosyVoice 3?'
      ? Promise.resolve({ response: 0, checkboxChecked: false })
      : show(owner, options);
  });
  await install.click();
  const downloadFailed = page.getByText('CosyVoice setup failed.', { exact: false });
  const voice = page.getByRole('main').getByRole('button', { name: 'Demo Voice', exact: true });
  await Promise.race([
    page.waitForFunction(async () => {
      try {
        const response = await fetch('/api/engines/tts', { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return false;
        const tts = await response.json();
        return tts.active === 'cosyvoice' && tts.backends.some(engine => engine.id === tts.active && engine.available);
      } catch {
        return false; // The backend restarts once the downloader has completed.
      }
    }, null, { polling: 5000, timeout: 45 * 60 * 1000 }),
    downloadFailed.waitFor({ timeout: 45 * 60 * 1000 }).then(() => {
      throw new Error('CosyVoice download from the packaged app failed');
    }),
  ]);
  console.log('PASS: local backend recognizes the installed CosyVoice runtime and weights.');
  await voice.click();
  await page.locator('[data-clone-script]').fill('你好，聽日見。');
  const synthesize = page.getByRole('button', { name: 'Synthesize audio', exact: true });
  const deadlineTts = Date.now() + 30000;
  while (!(await synthesize.isEnabled())) {
    assert(Date.now() < deadlineTts, 'Installed CosyVoice did not unblock Clone');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await synthesize.click();
  // A saved take proves the UI submitted real synthesis and received its result.
  await page.waitForFunction(async () => {
    const response = await fetch('/api/history', { signal: AbortSignal.timeout(5000) });
    return response.ok && (await response.json()).some(take => take.audio_path);
  }, null, { polling: 1500, timeout: 12 * 60 * 1000 });
  const take = await page.evaluate(async () => {
    const history = await (await fetch('/api/history')).json();
    const response = await fetch('/api/audio/' + encodeURIComponent(history.find(take => take.audio_path).audio_path));
    if (!response.ok) throw new Error(`Clone WAV: ${response.status}`);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  const speech = Buffer.from(take);
  assert(speech.length > 44 && speech.toString('ascii', 0, 4) === 'RIFF');
  await writeFile(resolve(captures, 'clone-generated.wav'), speech);
  await page.screenshot({ path: resolve(captures, 'clone-installed.png') });
  console.log('PASS: packaged installer downloaded CosyVoice and Clone synthesized a local WAV.');

  await exerciseToneEditor(page, 'app://voicestudio', captures);
  const exported = await readFile(resolve(captures, 'edited-speech.wav'));
  assert(exported.length > 44 && exported.toString('ascii', 0, 4) === 'RIFF' &&
    exported.toString('ascii', 8, 12) === 'WAVE', 'Export must be a nonempty WAV');
  console.log('PASS: sandboxed ARM64 app, bundled backend/ffmpeg, real pitch edit and export.');
} finally {
  if (page) await page.screenshot({ path: resolve(captures, 'last-screen.png'), fullPage: true }).catch(() => {});
  await app.close();
}
