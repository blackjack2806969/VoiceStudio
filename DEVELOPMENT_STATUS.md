# Cantonese Voice Studio development status

Updated: 2026-11-27. Deadline: 2026-11-30.

## Baseline
- Upstream: debpalash/VoiceStudio @ 29ca59dcd, Electron + FastAPI.
- Branch: cantonese-offline. Original history and AGPL-3.0 license retained.
- Official Ponytail instructions persisted in AGENTS.md; official review skill installed locally.
- Existing code includes voice import, local profiles, MLX TTS, speed, preview, exports and ARM64 packaging.
- Development host: Linux x86_64. Real TTS and installer checks also ran on GitHub macOS ARM64. Physical Mac testing remains open.
- Initial fork creation returned HTTP 403. On recheck, blackjack2806969/VoiceStudio exists as a fork and grants push permission; publishing is now proceeding.

## Current milestone
Implement bounded, non-destructive Praat lexical-tone editing integrated into Electron Tools.

## Remaining acceptance gates
- Real Hong Kong Cantonese and mixed English listening evaluation on an M1 Ultra.
- Install the downloaded ARM64 artifact on a physical Mac and exercise the offline workflow.
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

## Implemented — offline/deployment milestone
- Python loopback-only audit policy; forced HF offline; telemetry disabled.
- Electron external renderer request blocking; no cloud account startup or updates.
- macOS network sandbox for backend and native audio workers, inherited by their children.
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
1. Provision CosyVoice on M1 Ultra and test real cloning, Cantonese lexical tones,
   mixed-English text, speed, profile persistence and offline restart. Real offline CosyVoice synthesis passed on GitHub ARM64; M1 Ultra listening/performance remain untested.
2. Measure latency/RAM and evaluate an existing MLX/Metal Cantonese-capable engine
   only if its support and licence can be substantiated. Do not promise acceleration.
3. Review the upstream model-component licences before commercial redistribution.
4. Optional duration/segment regeneration, alignment and pronunciation detection
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

## Real offline Cantonese synthesis — passed
- Run: https://github.com/blackjack2806969/VoiceStudio/actions/runs/45945764393
- Existing CosyVoice installer provisioned pinned source and weights on macos-15 ARM64.
  Synthesis then ran under the OS offline sandbox with a public upstream reference.
- Mixed text: 聽日開 meeting，記得帶 laptop。我哋九點見。
- 1×: 4.84 s, median F0 253.18 Hz; 1.25×: 3.86 s, median F0 250.31 Hz.
  Cold run including loading took 247.6 s; second run 65.7 s on the CI runner.
  These are not M1 Ultra timings or perceptual Cantonese/cloning-quality scores.
- Downloaded WAVs and metrics: artifacts/cantonese/tts (ignored local evidence).
- Applied the real pitch editor to the generated Cantonese: requested +2 semitones,
  measured +2.026; samples outside the selected syllable remained exactly unchanged.
- Optional AudioSeal attempted to fetch absent weights; the offline policy blocked
  it and audio generation succeeded. Added a cache check so absent optional weights
  no longer trigger that attempt. Watermark/offline checks: 24 passed, 2 optional skips.
- Run 45946571487 verified signing and exposed the packaged Chromium sandbox conflict.


## Packaged Electron sandbox fix
- Run 45946571487 reached packaged startup. Chromium GPU and network processes
  failed to initialize their Seatbelt profiles after inheriting the launcher profile.
- Moved the OS network profile to native worker launches and enabled Chromium's
  renderer sandbox using the same preload bridge built as CommonJS. Main-process
  online browser, repair, update-list and setup paths are blocked in offline mode.
- The package smoke test checks Chromium sandbox preferences, external IP request
  rejection, actual audio edit and playback, and the exported WAV header.


## macOS ARM64 installer acceptance passed
- GitHub Actions run [45952519707](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45952519707) verified commit `85823f70f` on macos-15 ARM64.
- 59 Python tests and 4 selected Electron tests passed. The OS profile allowed loopback and denied external TCP in the worker and an inherited native child.
- The packaged app launched with Chromium renderer sandboxing enabled, rejected external Chromium requests, and reached the managed loopback backend. The app imported speech, edited a pitch point, rendered with Praat, advanced both playback clocks, exported a nonempty RIFF/WAVE file, undid the edit and reopened the project in Traditional Chinese.
- The playback test now waits for the edited audio source to replace the original blob before measuring progress.
- The [installer artifact](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45952519707/artifacts/15177723043) contains the DMG and app ZIP with 14-day retention. [Test evidence](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45952519707/artifacts/15178047423) contains the exported WAV and screenshots.
- The CI smoke test launches the built app bundle. Physical M1 Ultra testing and installation from a downloaded or quarantined DMG remain open. The artifacts use ad-hoc signing.

## Clone readiness and installer follow-up

A physical Mac user reported an indefinitely loading Clone page. The old gate
waited without a deadline for the full engine inventory and model catalogue.
Its recovery tried to download within the backend network sandbox. A runtime
marker alone could also mark a CosyVoice sidecar available before weights were
complete.

The packaged app checks the pinned CosyVoice runtime and complete local weights
without probing unrelated TTS engines or waiting on the model catalogue. Engine
and catalogue requests have deadlines. Clone shows a download action when it
cannot synthesize. Explicit confirmation starts a separate, fixed-purpose
installer using the existing pinned provisioning recipe. The backend retains
its offline profile and port 3920. The ARM64 workflow now tests the packaged
Clone UI before and after provisioning, real TTS and the existing pitch workflow.

The packaged run 45965307281 opened Clone with no weights, completed the online
installer and restarted its backend, then failed to see the installed engine.
The Mac test data folder could be addressed through both `/var` and `/private/var`.
The installer saved the canonical path but the backend compared it to an alias
and treated its managed checkout as external. The packaged backend now
canonicalizes that same data path before restoring preferences. A local symlink
regression passed. [Run 45969948061](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45969948061)
passed at `ef1628e3d` and published the ARM64 DMG and app ZIP.
[Download the Clone fix](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.5.9-beta.9-tts.6).
The packaged tests covered a fresh data directory, the download action, real
CosyVoice installation, backend restart on port 3920, local Cantonese synthesis,
Praat editing, both playbacks, WAV export, undo and Traditional Chinese reopen.
The installer took about 3m45s and the first synthesis and save took about 5m34s
on the hosted ARM64 runner. [WAV and screenshot evidence](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45969948061/artifacts/15185952535).
This follow-up has been tested on hosted macOS ARM64. Retesting on the user's
physical Mac remains open.

## OmniVoice-only installer

- The Cantonese distribution pins the bundled upstream `k2-fsa/OmniVoice`
  engine, keeps its Apple Silicon MPS route and reuses complete HF snapshots,
  including the original app's cache. Existing recordings and edit projects
  keep their data paths.
- Clone offers the upstream model downloader through the confirmed,
  download-only Electron worker and shows progress and retry guidance.
  Inference, recording and pitch editing keep the existing loopback-only
  macOS worker profile. Clone discloses the non-commercial weights and
  separate audio-tokenizer terms and uses upstream licence acknowledgement.
- The release workflow runs the fresh install, restart with a reused upstream
  cache, offline mixed-language clone and pitch editing in packaged Electron.
  Physical M1 Ultra verification remains pending.
