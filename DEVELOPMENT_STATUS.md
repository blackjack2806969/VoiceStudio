# Cantonese Voice Studio development status

Updated: 2026-11-27. Deadline: 2026-11-30.

## Baseline
- Upstream: debpalash/VoiceStudio @ 29ca59dcd, Electron + FastAPI.
- Branch: cantonese-offline. Original history and AGPL-3.0 license retained.
- Official Ponytail instructions persisted in AGENTS.md; official review skill installed locally.
- Existing code includes voice import, local profiles, MLX TTS, speed, preview, exports and ARM64 packaging.
- Development host: Linux x86_64. No physical Mac test or real TTS inference performed yet.
- Initial fork creation returned HTTP 403. On recheck, blackjack2806969/VoiceStudio exists as a fork and grants push permission; publishing is now proceeding.

## Current milestone
Implement bounded, non-destructive Praat lexical-tone editing integrated into Electron Tools.

## Remaining acceptance gates
- Real Hong Kong Cantonese and mixed English listening evaluation on an M1 Ultra.
- Strict offline application runtime and model provisioning validation.
- ARM64 build, offline install, and downloaded artifact smoke test.
- Optional duration editing, alignment and selected-segment regeneration are outside the first milestone.

## Implemented — editor milestone
- Existing Electron Tools UI: waveform, zoom/scroll, manual selection, F0 in Hz,
  six relative Cantonese contours, semitone shifts, draggable/numeric pitch points.
- Praat PSOLA with immutable source, detected-unvoiced preservation, fades,
  before/after playback, WAV export, undo and last-project restoration.
- Bounded WAV/MP3/M4A import, local UUID storage, JSON recipes and existing native API access checks.
- Existing Clone defaults to Cantonese; CosyVoice v3 now receives an explicit
  Hong Kong Cantonese/English instruction in both existing adapter paths.
- English and Traditional Chinese editor strings; other locales use English for this new panel.
- Model choice: CosyVoice 3 (Apache-2.0-labelled upstream weights), CPU fallback on Mac.
  MLX Cantonese inference is not verified; OmniVoice non-commercial weights are not the default.
- Ponytail review recorded in docs/cantonese-review.md.

## Implemented — offline/deployment milestone (Mac validation pending)
- Python loopback-only audit policy; forced HF offline; telemetry disabled.
- Electron external renderer request blocking; no cloud account startup or updates.
- macOS sandbox launcher for the app and source builds, inherited by native child processes.
- Manual ARM64 GitHub Actions workflow bundles existing Python/ffmpeg and uploads DMG/ZIP.
- Separate model-provisioning command reuses the existing CosyVoice installer.
- Installation/limitations documented in docs/cantonese-offline.md.

## Evidence so far
- Real speech sample: requested +2 semitones, measured median +2.003 semitones.
- DSP checks include all six preset directions, speaker-relative ranges, exact
  outside-region samples, detected-unvoiced samples, manual anchors and silence rejection.
- API tests exercise actual ffmpeg WAV/MP3/M4A decode and exported audio F0.
- Electron production build, TypeScript checks and locale checks passed on Linux.
- Dedicated UI tests cover import, tone edit, undo, export and failed import.
- Current focused result: 52 Python tests, 60 Electron tests and 330 locale/CJK checks passed; production build and type/locale checks passed.
- Full-suite results, physical Mac tests and production Cantonese listening validation are not claimed.

## Acceptance work still required (priority order)
1. Complete the ARM64 packaging workflow; source milestones are pushed to cantonese-offline.
2. Validate packaged startup and inherited OS network denial on macOS, fix any failures.
3. Provision CosyVoice on M1 Ultra and test real cloning, Cantonese lexical tones,
   mixed-English text, speed, profile persistence and offline restart. Current TTS
   regression tests mock model inference; no real TTS output was generated here.
4. Measure latency/RAM and evaluate an existing MLX/Metal Cantonese-capable engine
   only if its support and licence can be substantiated. Do not promise acceleration.
5. Review the upstream model-component licences before commercial redistribution.
6. Optional duration/segment regeneration, alignment and pronunciation detection
   stay outside the initial milestone. No RVC, singing or DAW work.

## Final review corrections
- Refuse external or pre-existing backend attachment in offline mode; only the
  app-owned child may become ready. Dedicated Electron data folder and port 3920
  avoid sharing preferences with an upstream installation.
- Existing bundled-runtime staging unconditionally activated the App Store
  code policy in sitecustomize. Added a build-time Cantonese variant that activates
  the offline network policy instead, allowing the prepared CosyVoice sidecar.

## ARM64 CI and browser evidence
- Fork push succeeded after the connector installation was granted repository access.
- First ARM64 run: https://github.com/blackjack2806969/VoiceStudio/actions/runs/45942272650
- Python/runtime/media staging succeeded and all 52 focused Python tests passed
  on GitHub's macos-15 ARM64 runner. This is CI evidence, not physical M1 Ultra testing.
- OS sandbox parsing rejected literal loopback IP patterns; corrected to macOS's
  supported `localhost:*` pattern and queued a new build.
- Linux Chromium against the actual Praat API passed real speech upload, pointer
  selection, pitch-point drag, render/export, exact undo and Traditional Chinese restore.
  Screenshots and an edited WAV are under artifacts/cantonese (untracked test artifacts).
- Real-speech +2-semitone edit: median per-frame formant change F1 4.32%, F2 1.73%,
  F3 1.11% for the test selection. This supports envelope preservation for this
  fixture only; it is not an accent or perceptual-quality guarantee.

## Follow-up validation
- Second ARM64 run (45942624693) passed the 52 Python tests, actual OS sandbox
  checks and native helper compilation. Frontend test failed waiting for a
  mocked Response/Blob; its fetch mock now returns the expected async blob contract.
  The separate real Chromium/API test exercises actual binary WAV transport.
- CosyVoice previously discarded speed. Both existing adapters now pass validated
  0.5–2.0 speed to upstream inference; regression failed before and passes after.
- Removed the paid/cloud support shortcut from Clone and the workspace header.
- Added a separate real-model ARM64 smoke workflow using the existing installer
  and public upstream reference, with synthesis under the offline OS sandbox.
  It checks voiced audio and the duration change at 1.25×; result pending.
- Real-model run 45945374738 installed CosyVoice and public weights on ARM64.
  Its smoke script then failed on the app's language-map import, before inference;
  corrected the script's source root path. This is not a model synthesis pass.
- Removed first-run online model setup gating and renderer analytics/cloud-sync
  hooks. Pitch editing can open with no TTS weights installed. Added a packaged
  launcher test that reuses the verified real browser audio-edit flow.
- Follow-up checks: 58 Python tests, 77 backend-gate frontend tests, typecheck and
  real Chromium/Praat edit/export/undo/Traditional Chinese flow passed on Linux.
- Third packaging run (45945374495) compiled both UIs and native helpers, then
  failed signing the bundled Python tree with EMFILE. Pinned a minimal Bun patch
  to make the existing osx-sign walker sequential and reused the existing bundled
  runtime signer to refresh signed-file manifests. A 128-open-file-limit regression
  reproduces the original failure and passes with the patch.
- Browser smoke now decodes and plays both before/after audio and verifies that
  playback time advances; passed on Linux Chromium against the real local API.
