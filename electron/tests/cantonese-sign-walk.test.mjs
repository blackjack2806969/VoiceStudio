// Run with a low file limit to reproduce the ARM64 bundled-runtime EMFILE failure.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const builderRequire = createRequire(require.resolve('electron-builder/package.json'));
const packagerRequire = createRequire(builderRequire.resolve('app-builder-lib/package.json'));
const { walkAsync } = packagerRequire('@electron/osx-sign');
const root = mkdtempSync(join(tmpdir(), 'cantonese-sign-'));
try {
  for (let i = 0; i < 512; i++) writeFileSync(join(root, `${i}.py`), 'print("local")\n');
  const framework = join(root, 'Example.framework');
  mkdirSync(framework);
  const binary = join(framework, 'Example');
  writeFileSync(binary, Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0, 0, 0, 0]));
  const paths = await walkAsync(root);
  assert.deepEqual(paths, [binary, framework]);
  console.log('PASS: signing walk respects low file limits and retains nested binary targets.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
