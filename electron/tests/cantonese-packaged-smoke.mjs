import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { exerciseToneEditor } from './cantonese-tone-flow.mjs';
import { CANTONESE_PRODUCT_NAME, CANTONESE_VERSION } from '../../config/app-config.mjs';

const captures = resolve('artifacts/cantonese/packaged');
await mkdir(captures, { recursive: true });
const data = await mkdtemp(resolve(tmpdir(), 'cantonese-packaged-'));
const executablePath = process.env.CANTONESE_SMOKE_EXECUTABLE ??
  resolve('electron/release/mac-arm64', `${CANTONESE_PRODUCT_NAME}.app/Contents/MacOS/cantonese-offline`);
const contents = resolve(dirname(executablePath), '..');
const plist = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', join(contents, 'Info.plist')], { encoding: 'utf8' }));
assert.equal(plist.CFBundleIdentifier, 'com.voicestudio.desktop');
assert.equal(plist.CFBundleName, CANTONESE_PRODUCT_NAME);
assert.equal(plist.CFBundleDisplayName, CANTONESE_PRODUCT_NAME);
assert.equal(plist.CFBundleShortVersionString, CANTONESE_VERSION);
assert.equal(plist.CFBundleExecutable, 'cantonese-offline');
assert((await readFile(join(contents, 'Resources', plist.CFBundleIconFile)))
  .equals(await readFile(resolve('electron/build/icons/cantonese.icns'))), 'Finder icon differs from the CAN Edition asset');
assert((await readFile(join(contents, 'Resources/brand/icon-macos.png')))
  .equals(await readFile(resolve('electron/build/icons/cantonese.png'))), 'Dock icon differs from the CAN Edition asset');
for (const notice of ['LICENSE', 'LICENSE-NOTICE.md']) {
  assert((await readFile(join(contents, 'Resources', notice)))
    .equals(await readFile(resolve(notice))), `${notice} must retain the original attribution`);
}

async function pollUntil(check, timeout, message) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(message);
}

function navigation(page) {
  return page.locator('[data-slot="workspace-navigation"]');
}

async function verifyNavigation(page, labels) {
  const links = navigation(page).getByRole('link');
  await links.first().waitFor();
  assert.deepEqual(await links.evaluateAll(items => items.map(
    item => item.getAttribute('aria-label') || item.textContent.trim(),
  )), labels);
}
// Launch the bundle's real entrypoint with Chromium sandboxing enabled.
const launch = () => electron.launch({
  executablePath,
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
  assert.equal(await page.title(), CANTONESE_PRODUCT_NAME);
  const identity = await app.evaluate(({ app, Menu }) => ({
    name: app.getName(),
    version: app.getVersion(),
    menu: Menu.getApplicationMenu().items[0].label,
    about: Menu.getApplicationMenu().items[0].submenu.items.some(item => item.role === 'about'),
    userData: app.getPath('userData'),
    appData: app.getPath('appData'),
  }));
  assert.equal(identity.name, CANTONESE_PRODUCT_NAME);
  assert.equal(identity.version, CANTONESE_VERSION);
  assert.equal(identity.menu, CANTONESE_PRODUCT_NAME);
  assert.equal(identity.about, true);
  assert.equal(identity.userData, join(identity.appData, 'Cantonese Voice Studio'));
  console.log(`PASS: Finder branding, Dock icon, menu and window title match v${CANTONESE_VERSION}; bundle ID, user data and licence notices retained.`);
  assert.equal(await app.evaluate(({ app }) => app.commandLine.hasSwitch('no-sandbox')), false);
  const window = await app.browserWindow(page);
  assert.equal(await window.evaluate(win => win.getTitle()), CANTONESE_PRODUCT_NAME);
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
  await verifyNavigation(page, ['Clone', 'Cantonese Pitch Editor', 'Saved Voices', 'History', 'Settings']);
  await navigation(page).getByRole('link', { name: 'Saved Voices', exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'Saved Voices', exact: true, level: 1 }).waitFor();
  await page.getByRole('main').getByRole('button', { name: 'Demo Voice', exact: true }).waitFor();
  await page.screenshot({ path: resolve(captures, 'ui-03-saved-voices.png') });
  await page.goto('app://voicestudio/#/settings/sharing');
  await page.waitForURL('**/#/settings/general');
  await page.getByRole('heading', { name: 'General', exact: true, level: 1 }).waitFor();
  await page.getByRole('link', { name: 'Models', exact: true }).press('Enter');
  await page.getByText('VoiceStudio (k2-fsa/OmniVoice, 600+ languages)', { exact: true }).first().waitFor();
  assert.equal(await page.getByRole('link', { name: /dictation|translation|credentials|network|account/i }).count(), 0);
  await page.screenshot({ path: resolve(captures, 'ui-05-settings.png') });
  await page.goto('app://voicestudio/#/dub');
  await page.waitForURL('**/#/clone');
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
  // The synthesis checks are complete. Keep memory headroom for the audio editor
  // on the hosted runner, while preserving Clone's selection and original take.
  await page.evaluate(async () => {
    const response = await fetch('/api/system/flush-memory?unload_model=true', {
      method: 'POST', signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Release test model memory: ${response.status}`);
  });

  for (const origin of ['Clone', 'History']) {
    if (origin === 'History') {
      await navigation(page).getByRole('link', { name: 'History', exact: true }).press('Enter');
      await page.getByRole('heading', { name: 'History', exact: true, level: 1 }).waitFor();
    }
    const editPitch = page.getByRole('button', { name: 'Edit Pitch', exact: true });
    await editPitch.waitFor();
    await page.screenshot({
      path: resolve(captures, origin === 'Clone' ? 'ui-01-clone.png' : 'ui-04-history.png'),
    });
    const original = page.waitForRequest(request =>
      request.method() === 'GET' && request.resourceType() === 'fetch' &&
      new URL(request.url()).pathname === '/api/audio/' + encodeURIComponent(audioPath));
    const upload = page.waitForResponse(response =>
      response.request().method() === 'POST' && response.url().endsWith('/tools/lexical-pitch/import'));
    await editPitch.press('Enter');
    const [, importResponse] = await Promise.all([original, upload]);
    assert.equal(importResponse.status(), 200);
    const project = await importResponse.json();
    assert(project.duration > 0, `${origin} imported an empty take`);
    await page.waitForURL(url => /#\/tools\?pitch=/.test(url.hash));
    assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('pitch'), project.id);
    await page.getByRole('heading', { name: 'Cantonese Pitch Editor', exact: true, level: 1 }).waitFor();
    await page.getByRole('img', { name: /Speech waveform/ }).waitFor();
    await page.getByRole('link', { name: 'Export WAV', exact: true }).waitFor();
    await page.screenshot({ path: resolve(captures, `pitch-from-${origin.toLowerCase()}.png`) });
  }
  console.log('PASS: both Clone and History opened the selected WAV directly in the pitch editor.');

  await exerciseToneEditor(page, 'app://voicestudio', captures);
  await copyFile(resolve(captures, 'editor-en.png'), resolve(captures, 'ui-02-cantonese-pitch-editor.png'));
  await verifyNavigation(page, ['複製', '廣東話音高編輯器', '已儲存聲音', '歷史記錄', '設定']);
  const exported = await readFile(resolve(captures, 'edited-speech.wav'));
  assert(exported.length > 44 && exported.toString('ascii', 0, 4) === 'RIFF' &&
    exported.toString('ascii', 8, 12) === 'WAVE', 'Export must be a nonempty WAV');
  console.log('PASS: sandboxed ARM64 app, bundled backend/ffmpeg, real pitch edit and export.');

  await page.evaluate(() => localStorage.setItem('voicestudio.locale', 'en'));
  await page.reload();
  const cloneLink = navigation(page).getByRole('link', { name: 'Clone', exact: true });
  await cloneLink.click();
  await page.getByRole('button', { name: 'Change voice', exact: true })
    .getByText('Demo Voice', { exact: true }).waitFor();
  // Only the destination picker is replaced. Saving still runs through native IPC.
  await app.evaluate(({ dialog }, directory) => {
    dialog.showSaveDialog = async (...args) => ({
      canceled: false,
      filePath: `${directory}/${args.at(-1).defaultPath}`,
    });
  }, captures);
  const takeRow = (index, count) => page.locator('li[data-status="done"]').filter({
    has: page.getByText(`Take ${index} of ${count}`, { exact: true }),
  });
  const completed = [];
  for (const [count, script] of [[3, '聽日見，see you.'], [5, '而家出發，let’s go.']]) {
    await page.locator('[data-clone-script]').fill(script);
    await page.getByRole('button', { name: String(count), exact: true }).click();
    const seeds = new Set();
    const responses = [];
    const paths = [];
    const record = response => {
      if (response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/generate')
        responses.push(response);
    };
    page.on('response', record);
    try {
      await page.getByRole('button', { name: `Generate ${count} takes`, exact: true }).click();
      await page.getByRole('button', { name: `Generating take 1 of ${count}`, exact: true }).waitFor();
      for (let index = 1; index <= count; index++) {
        const row = takeRow(index, count);
        await row.waitFor({ timeout: 12 * 60 * 1000 });
        const response = responses[index - 1];
        assert(response?.ok(), `Take ${index} of ${count} did not get a successful response`);
        const path = await response.headerValue('x-audio-path');
        assert(path?.endsWith('.wav'), `Take ${index} of ${count} has no local WAV`);
        const seed = await response.headerValue('x-seed');
        assert(seed && /^\d+$/.test(seed), `Take ${index} of ${count} has no numeric seed`);
        paths.push(path);
        seeds.add(seed);
        await row.getByRole('button', { name: 'Play', exact: true }).click();
        await page.waitForFunction(selector => [...document.querySelectorAll(selector)].some(
          player => player.played.length > 0 && player.played.end(0) > 0.05,
        ), `li[data-status="done"] audio[src*="${encodeURIComponent(path)}"]`, { polling: 100 });
        await row.getByRole('button', { name: 'Save as…', exact: true }).click();
        const wav = await pollUntil(() => readFile(resolve(captures, path)).catch(() => null),
          30000, `Take ${index} of ${count} did not export`);
        assert(wav.length > 44 && wav.toString('ascii', 0, 4) === 'RIFF');
        completed.push({ count, index, path });
      }
    } finally {
      page.off('response', record);
    }
    assert.equal(seeds.size, count, 'Each take should have a distinct returned seed');
    assert.equal(new Set(paths).size, count, 'Each take should have a distinct saved WAV');
    const history = await page.evaluate(async () => (await fetch('/api/history')).json());
    assert(paths.every(path => history.some(take => take.audio_path === path)));
    console.log(`PASS: ${count} offline takes, distinct seeds, History, playback and WAV export.`);
  }
  await page.evaluate(() => fetch('/api/system/flush-memory?unload_model=true', { method: 'POST' }));
  for (const { index, count, path } of completed) {
    const source = page.waitForRequest(request => request.resourceType() === 'fetch' &&
      new URL(request.url()).pathname === '/api/audio/' + encodeURIComponent(path));
    const upload = page.waitForResponse(response => response.request().method() === 'POST' &&
      response.url().endsWith('/tools/lexical-pitch/import'));
    await takeRow(index, count).getByRole('button', { name: 'Edit Pitch', exact: true }).click();
    const [, result] = await Promise.all([source, upload]);
    assert.equal(result.status(), 200);
    await page.waitForURL(url => /#\/tools\?pitch=/.test(url.hash));
    await cloneLink.click();
  }
  console.log('PASS: each completed take opened independently in the pitch editor.');
} finally {
  if (page) await page.screenshot({ path: resolve(captures, 'last-screen.png'), fullPage: true }).catch(() => {});
  await app.close();
}
