import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
import { join } from 'node:path';
import { bundledPython, bundledRuntimeEnv } from './bundled-runtime';
import { runRuntimeProbe } from './runtime-probe';
import { assertTrustedMainFrame } from './trusted-ipc';
import type { BackendSupervisor } from './backend';
import { bundledUvPath } from './backend';

export function registerCantoneseInstaller(backend: BackendSupervisor, window: () => BrowserWindow | null) {
  let pending: Promise<void> | null = null;
  ipcMain.handle('cosyvoice:install', async (event, locale: unknown) => {
    const owner = window();
    assertTrustedMainFrame(event, owner);
    if (!app.isPackaged || process.env.VOICESTUDIO_CANTONESE_BUNDLED !== '1' || backend.connection.remote)
      throw new Error('CosyVoice setup requires the local Cantonese Studio app.');
    if (pending) return pending;
    const cancel = new AbortController();
    const onQuit = () => cancel.abort();
    pending = (async () => {
      const chinese = locale === 'zh-TW';
      const choice = await dialog.showMessageBox(owner, {
        type: 'question',
        message: chinese ? '連線下載 CosyVoice 3？' : 'Go online to install CosyVoice 3?',
        detail: chinese
          ? '只下載語音引擎、依賴套件及模型（權重約 5.4 GB）。錄音和文字留在本機。安裝後會重啟本機後端。'
          : 'Downloads the engine, dependencies and about 5.4 GB of weights. Recordings and text stay local. The local backend restarts after setup.',
        buttons: chinese ? ['下載', '取消'] : ['Download', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
      });
      if (choice.response !== 0) return;
      const root = process.resourcesPath;
      const { VOICESTUDIO_BUNDLED_CODE_ONLY: _storePolicy, ...runtime } = bundledRuntimeEnv(root, app.getPath('userData'));
      const dataDir = process.env.OMNIVOICE_DATA_DIR || runtime.OMNIVOICE_DATA_DIR!;
      // Only the fixed downloader can go online. No renderer-supplied paths,
      // credentials, text or audio enter its command line or environment.
      await runRuntimeProbe(bundledPython(root), [
        '-I', '-S', '-B', join(root, 'scripts/prepare_cantonese_models.py'),
        '--download', '--data-dir', dataDir,
      ], root, {
        ...runtime,
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR,
        LANG: 'en_US.UTF-8',
        HF_ENDPOINT: 'https://huggingface.co',
        OMNIVOICE_HF_ENDPOINT_MODE: 'manual',
        HF_HUB_DISABLE_TELEMETRY: '1',
        HF_HUB_DISABLE_IMPLICIT_TOKEN: '1',
        DO_NOT_TRACK: '1',
        OMNIVOICE_ANALYTICS_DISABLED: '1',
        OMNIVOICE_DIAGNOSTICS_DISABLED: '1',
        GIT_TERMINAL_PROMPT: '0',
        OMNIVOICE_BUNDLED_UV: bundledUvPath(root),
      }, { timeoutMs: 45 * 60 * 1000, signal: cancel.signal, captureStderr: true }).catch((error: Error & { stdout?: string; stderr?: string }) => {
        console.warn('[CosyVoice setup]', error.message, error.stdout?.slice(-2500), error.stderr?.slice(-1500));
        throw error;
      });
      await backend.restart();
    })();
    app.once('before-quit', onQuit);
    try {
      await pending;
    } finally {
      app.removeListener('before-quit', onQuit);
      pending = null;
    }
  });
}
