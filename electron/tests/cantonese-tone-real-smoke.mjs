// Start the existing renderer smoke server and a local lexical_pitch router first.
import { exerciseToneEditor } from './cantonese-tone-flow.mjs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchSmokeBrowser, openMockedPage } from './smoke-api-mock.mjs';
const browser = await launchSmokeBrowser();
const captures = resolve(import.meta.dirname, '../../artifacts/cantonese');
await mkdir(captures, { recursive: true });
try {
  const page = await openMockedPage(browser, {
    viewport: { width: 1440, height: 1100 },
    handle: (route, _request, path) => {
      if (path.startsWith('/api/tools/lexical-pitch')) {
        return route.continue();
      }
    },
  });
  await exerciseToneEditor(page, process.env.VOICESTUDIO_UI_URL || 'http://localhost:3912', captures);
} finally { await browser.close(); }
