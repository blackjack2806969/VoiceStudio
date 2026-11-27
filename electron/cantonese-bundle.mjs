import { copyFileSync, chmodSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export function packageCantonese(context) {
  if (process.env.VOICESTUDIO_CANTONESE_BUILD !== '1') return;
  if (context.electronPlatformName !== 'darwin') throw new Error('Cantonese installers require macOS ARM64');
  const contents = join(context.appOutDir, 'VoiceStudio.app', 'Contents');
  const source = new URL('../packaging/cantonese/', import.meta.url);
  const launcher = join(contents, 'MacOS', 'cantonese-offline');
  copyFileSync(new URL('launch-offline.sh', source), launcher);
  chmodSync(launcher, 0o755);
  copyFileSync(new URL('offline.sb', source), join(contents, 'Resources', 'cantonese-offline.sb'));
  execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set :CFBundleExecutable cantonese-offline', join(contents, 'Info.plist')]);
  const manifest = JSON.parse(readFileSync(join(contents, 'Resources', 'python-runtime', 'manifest.json')));
  if (manifest.arch !== 'arm64') throw new Error('Cantonese runtime must be ARM64');
}
