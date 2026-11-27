import { expect, it } from 'vitest';
import { localRuntimeUrl } from './cantonese-offline';
import { offlineWorkerCommand } from './cantonese-sandbox';
import { resolve } from 'node:path';
it('allows local IPC and assets but rejects remote and disguised hosts', () => {
  for (const url of ['http://127.0.0.1:3900/health', 'ws://localhost:3900/ws', 'app://voicestudio/', 'blob:app://local/id']) expect(localRuntimeUrl(url)).toBe(true);
  for (const url of ['https://example.com', 'https://localhost.example.com', 'http://127.0.0.1@example.com', 'ftp://localhost/file']) expect(localRuntimeUrl(url)).toBe(false);
  expect(process.env.OMNIVOICE_ANALYTICS_DISABLED).toBe('1');
});

it.runIf(process.platform === 'darwin')('runs source workers under the repository network profile', () => {
  expect(offlineWorkerCommand('/opt/python', ['-m', 'uvicorn'])).toEqual({
    command: '/usr/bin/sandbox-exec',
    args: ['-f', resolve('../packaging/cantonese/offline.sb'), '/opt/python', '-m', 'uvicorn'],
  });
});
