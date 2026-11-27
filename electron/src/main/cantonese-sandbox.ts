import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Chromium initializes its own Seatbelt profiles. Apply ours only to native workers.
export function offlineWorkerCommand(command: string, args: string[]) {
  if (process.platform !== 'darwin' || process.env.VOICESTUDIO_CANTONESE_OFFLINE !== '1') {
    return { command, args };
  }
  const profile = process.env.VOICESTUDIO_CANTONESE_BUNDLED === '1'
    ? join(process.resourcesPath, 'cantonese-offline.sb')
    : fileURLToPath(new URL('../../../packaging/cantonese/offline.sb', import.meta.url));
  return { command: '/usr/bin/sandbox-exec', args: ['-f', profile, command, ...args] };
}
