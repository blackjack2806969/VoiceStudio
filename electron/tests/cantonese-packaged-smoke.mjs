import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { exerciseToneEditor } from './cantonese-tone-flow.mjs';

const captures = resolve('artifacts/cantonese/packaged');
await mkdir(captures, { recursive: true });
const data = await mkdtemp(resolve(tmpdir(), 'cantonese-packaged-'));

async function pollUntil(check, timeout, message) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(message);
}
// Launch the bundle's real entrypoint with Chromium sandboxing enabled.
const launch = () => electron.launch({
  executablePath: resolve('electron/release/mac-arm64/VoiceStudio.app/Contents/MacOS/cantonese-offline'),
  chromiumSandbox: true,
  acceptDownloads: true,
  env: { ...process.env, OMNIVOICE_DATA_DIR: data, OMNIVOICE_PORT: '3920', OMNIVOICE_PRELOAD_TTS_ASR: '0',
    OMNIVOICE_PRELOAD_CAPTURE_ASR: '0', OMNIVOICE_PRELOAD_WATERMARK: '0' },
  timeout: 60000,
});
let app = await launch();
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
  const install = page.getByRole('button', { name: 'Download OmniVoice', exact: true });
  await install.waitFor();
  const empty = await page.evaluate(async () => {
    const [tts, catalogue] = await Promise.all(['/api/engines/tts', '/api/models'].map(async path => {
      const response = await fetch(path, { signal: AbortSignal.timeout(15_000) }).catch(error => {
        throw new Error(`${path}: ${error.message}`);
      });
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    }));
    return { engine: tts.active, ready: tts.backends[0].available, engines: tts.backends.map(item => item.id), models: catalogue.models };
  });
  assert.deepEqual([empty.engine, empty.ready], ['omnivoice', true]);
  assert.deepEqual(empty.engines, ['omnivoice']);
  assert.deepEqual(empty.models.map(item => item.repo_id), ['k2-fsa/OmniVoice']);
  assert.equal(empty.models[0].installed, false);
  assert.equal(empty.models[0].license_info.license_category, 'noncommercial');
  await page.screenshot({ path: resolve(captures, 'clone-no-model.png') });
  console.log('PASS: packaged Clone opens without weights and shows the download action.');

  // Accept only the real installer confirmation. The signed app still launches
  // its actual download worker while inference stays offline.
  await app.evaluate(({ dialog }) => {
    const show = dialog.showMessageBox.bind(dialog);
    dialog.showMessageBox = (owner, options) => options.message === 'Go online to download OmniVoice?'
      ? Promise.resolve({ response: 0, checkboxChecked: false })
      : show(owner, options);
  });
  await install.click();
  const downloadFailed = page.getByText('OmniVoice download failed.', { exact: false });
  await page.getByText(/Preparing OmniVoice download|Downloading OmniVoice/).first().waitFor();
  await pollUntil(async () => {
    assert.equal(await downloadFailed.isVisible(), false, 'OmniVoice download from the packaged app failed');
    return page.evaluate(async () => {
      try {
        const response = await fetch('/api/models', { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return false;
        const catalogue = await response.json();
        return catalogue.models[0]?.installed;
      } catch {
        return false;
      }
    });
  }, 46 * 60 * 1000, 'OmniVoice weights never became available');
  console.log('PASS: local backend recognizes the installed OmniVoice weights.');
  await page.screenshot({ path: resolve(captures, 'clone-installed.png') });
  const cache = await app.evaluate(({ app }) => app.getPath('userData'));
  await app.close();
  const legacyHub = resolve(homedir(), '.cache/huggingface/hub');
  await mkdir(legacyHub, { recursive: true });
  const repoCache = 'models--k2-fsa--OmniVoice';
  await rename(resolve(cache, 'models', repoCache), resolve(legacyHub, repoCache));

  // A new launch must use the original app's Hugging Face cache without a download.
  app = await launch();
  app.process().stderr?.on('data', chunk => process.stderr.write(chunk));
  page = await app.firstWindow();
  await page.waitForURL('app://voicestudio/**');
  await pollUntil(async () => (await page.evaluate(() => window.voicestudio.backend.getStatus())).stage === 'ready',
    180000, 'The offline app did not restart with the upstream cache');
  await page.goto('app://voicestudio/#/clone');
  await page.getByText('OmniVoice weights are for non-commercial use.', { exact: false }).waitFor();
  await page.getByRole('button', { name: /^Licence:.*OmniVoice/i }).click();
  const licence = page.getByRole('dialog');
  await licence.getByRole('checkbox', { name: /I have read the OmniVoice licence/ }).check();
  await licence.getByRole('button', { name: 'Accept licence', exact: true }).click();
  await licence.getByRole('button', { name: 'Withdraw acceptance' }).waitFor();
  await licence.getByRole('button', { name: 'Close', exact: true }).click();
  await licence.waitFor({ state: 'hidden' });
  await page.getByRole('main').getByRole('button', { name: 'Demo Voice', exact: true }).click();
  await page.locator('[data-clone-script]').fill('你好，聽日見。See you tomorrow.');
  const synthesize = page.getByRole('button', { name: 'Synthesize audio', exact: true });
  await pollUntil(async () => (await synthesize.count()) > 0 && await synthesize.isEnabled(),
    60000, 'Installed OmniVoice did not unblock Clone');
  await synthesize.click();
  // A saved take proves the UI submitted real synthesis and received its result.
  const audioPath = await pollUntil(() => page.evaluate(async () => {
    const response = await fetch('/api/history', { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!response?.ok) return null;
    const history = await response.json();
    return history.find(take => take.audio_path)?.audio_path;
  }), 12 * 60 * 1000, 'Clone did not save a synthesized take');
  const take = await page.evaluate(async path => {
    const response = await fetch('/api/audio/' + encodeURIComponent(path));
    if (!response.ok) throw new Error(`Clone WAV: ${response.status}`);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  }, audioPath);
  const speech = Buffer.from(take);
  assert(speech.length > 44 && speech.toString('ascii', 0, 4) === 'RIFF');
  await writeFile(resolve(captures, 'clone-generated.wav'), speech);
  await page.screenshot({ path: resolve(captures, 'clone-reused.png') });
  console.log('PASS: Clone generated and exported a mixed Cantonese–English WAV from the reused OmniVoice weights.');

  await exerciseToneEditor(page, 'app://voicestudio', captures);
  const exported = await readFile(resolve(captures, 'edited-speech.wav'));
  assert(exported.length > 44 && exported.toString('ascii', 0, 4) === 'RIFF' &&
    exported.toString('ascii', 8, 12) === 'WAVE', 'Export must be a nonempty WAV');
  console.log('PASS: sandboxed ARM64 app, bundled backend/ffmpeg, real pitch edit and export.');
} finally {
  if (page) await page.screenshot({ path: resolve(captures, 'last-screen.png'), fullPage: true }).catch(() => {});
  await app.close();
}
