// Set before services initialize, including when opening the original app executable.
Object.assign(process.env, {
  VOICESTUDIO_CANTONESE_OFFLINE: '1',
  HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', HF_HUB_DISABLE_TELEMETRY: '1',
  OMNIVOICE_ANALYTICS_DISABLED: '1', OMNIVOICE_DIAGNOSTICS_DISABLED: '1',
  DO_NOT_TRACK: '1', VOICESTUDIO_DISABLE_UPDATER: '1',
});

export function localRuntimeUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (['app:', 'file:', 'data:', 'blob:', 'devtools:'].includes(url.protocol)) return true;
    return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

process.env.OMNIVOICE_PORT ??= '3920';
