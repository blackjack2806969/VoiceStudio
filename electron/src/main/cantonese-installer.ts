import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
import { join } from 'node:path';
import { bundledPython, bundledRuntimeEnv } from './bundled-runtime';
import { runRuntimeProbe } from './runtime-probe';
import { assertTrustedMainFrame } from './trusted-ipc';
import { sendToLiveWindow } from './window-safety';
import type { BackendSupervisor } from './backend';

export function registerCantoneseInstaller(backend: BackendSupervisor, window: () => BrowserWindow | null) {
  let pending: Promise<void> | null = null;
  ipcMain.handle('omnivoice:install', async (event, locale: unknown) => {
    const owner = window();
    assertTrustedMainFrame(event, owner);
    if (!app.isPackaged || process.env.VOICESTUDIO_CANTONESE_BUNDLED !== '1' || backend.connection.remote)
      throw new Error('OmniVoice setup requires the local Cantonese Studio app.');
    if (pending) return pending;
    const cancel = new AbortController();
    const onQuit = () => cancel.abort();
    pending = (async () => {
      const chinese = locale === 'zh-TW';
      const choice = await dialog.showMessageBox(owner, {
        type: 'question',
        message: chinese ? '連線下載 OmniVoice？' : 'Go online to download OmniVoice?',
        detail: chinese
          ? '只從 Hugging Face 下載約 2.4 GB 的非商業用途模型權重。錄音和文字留在本機。'
          : 'Downloads about 2.4 GB of non-commercial model weights from Hugging Face. Recordings and text stay on this Mac.',
        buttons: chinese ? ['下載', '取消'] : ['Download', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
      });
      if (choice.response !== 0) return;
      const root = process.resourcesPath;
      const { VOICESTUDIO_BUNDLED_CODE_ONLY: _storePolicy, ...runtime } = bundledRuntimeEnv(root, app.getPath('userData'));
      let progress = '';
      // Only the fixed downloader can go online. No renderer-supplied paths,
      // credentials, text or audio enter its command line or environment.
      await runRuntimeProbe(bundledPython(root), [
        '-I', '-S', '-B', join(root, 'scripts/prepare_cantonese_models.py'),
      ], root, {
        ...runtime,
        OMNIVOICE_DATA_DIR: join(runtime.HF_HUB_CACHE!, '.setup'),
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
      }, {
        timeoutMs: 45 * 60 * 1000,
        signal: cancel.signal,
        captureStderr: true,
        onOutput: (chunk, stream) => {
          if (stream !== 'stdout') return;
          const lines = (progress + chunk).split('\n');
          progress = lines.pop()!.slice(-512);
          for (const line of lines) {
            if (/^\d{1,2}\r?$/.test(line)) sendToLiveWindow(owner, 'omnivoice:download-progress', Number(line));
          }
        },
      }).catch((error: Error & { stdout?: string; stderr?: string }) => {
        console.warn('[OmniVoice setup]', error.message, error.stdout?.slice(-500), error.stderr?.slice(-2000));
        throw error;
      });
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
