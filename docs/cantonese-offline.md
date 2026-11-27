# Cantonese Voice Studio for Apple Silicon

This fork reuses VoiceStudio's Electron desktop, local voice profiles and TTS
adapters. It adds a non-destructive Praat lexical-tone editor in **Tools →
Cantonese lexical tones**. Set **Settings → Language → 繁體中文** for Traditional
Chinese; English is also supported. New editor strings in other UI languages
currently fall back to English.

## What is tested

The Linux development and macOS ARM64 CI checks process real WAV/MP3/M4A audio, measure pitch
changes, preserve source samples, exercise undo and check the existing CosyVoice
adapter contract. They do not establish M1 Ultra performance, Cantonese accent
quality, or macOS installer correctness. See `DEVELOPMENT_STATUS.md` for the
current acceptance gates. There is no completed DMG until the ARM64 workflow
has run successfully; a workflow file is not a tested installer.

## TTS choice and licences

The initial Cantonese engine is the **existing CosyVoice 3** adapter, using
`FunAudioLLM/Fun-CosyVoice3-0.5B-2512` and the repository's reviewed runtime/model
pins. Its upstream model card labels the weights Apache-2.0. This is the preferred
commercial-use candidate, but VoiceStudio's component-level commercial licence
review is still incomplete; this fork does not turn that into a legal clearance.
The app remains AGPL-3.0-only and Praat-Parselmouth is GPL-3.0-or-later. Neither
requires a paid dependency; preserve notices and source obligations when sharing.

CosyVoice supports Cantonese (`yue`) and zero-shot references. On the M1 Ultra
its current VoiceStudio adapter uses **CPU**, not a verified MPS implementation.
The existing MLX adapter remains available, but its curated Qwen3 Base language
list does not include Cantonese. Do not silently route `yue` to Mandarin or claim
MLX Cantonese support. Upstream OmniVoice weights are currently recorded as
non-commercial and are not the fork's default. Models are not embedded in the DMG.

The v3 adapter now carries a Hong Kong Cantonese instruction, retaining English
words and any user delivery instruction. It preserves the input text, including
colloquial Traditional Chinese. This is model conditioning, not a guarantee of
correct pronunciation; listen to your own references and output.
The existing speech-speed control now reaches CosyVoice inference (0.5–2.0×).

The separate **Cantonese real offline TTS** Actions workflow provisions the pinned
model, then generates mixed Cantonese/English speech under the OS network sandbox.
It retains WAV files and duration/F0 metrics for listening and compares 1×/1.25×
speed. This is a synthesis smoke check, not an automatic pronunciation assessment.

## One-time preparation on a connected ARM64 Mac

Downloads happen in this separate preparation step. The studio itself stays
offline. Do not send recordings, reference transcripts or synthesis text to any
preparation command. A model-free pitch editor needs only the app runtime and
local ffmpeg. TTS additionally needs the CosyVoice environment and weights.

Install Xcode Command Line Tools, Git, Node 22, Bun 1.4.2 and uv 0.12.13. Then,
from this fork's checkout:

```sh
bun install --frozen-lockfile
uv sync --frozen --no-dev --no-editable --python 3.11
.venv/bin/python scripts/prepare_cantonese_models.py --download \
  --data-dir "$HOME/Library/Application Support/Cantonese Voice Studio/data"
bun run build
```

The model preparation command calls VoiceStudio's existing pinned CosyVoice
installer; it does not implement a second installer or download during inference.
It reports success only when the existing runtime/weight probe passes. About
5.4 GB of weights plus Python packages and source are required. Leave plenty of
free disk space (30 GB is a reasonable starting budget for build and caches).

The default packaged app data location is `~/Library/Application
Support/Cantonese Voice Studio/data`. If your Electron application name differs, use its
actual user-data location or set `OMNIVOICE_DATA_DIR` consistently for provisioning
and launch. The engine's `.venv` and persisted paths must remain valid. Copying a
Linux environment or moving an ARM64 venv to a new absolute path is not supported.
For an air-gapped target, prepare on that Mac before disconnecting, or restore an
ARM64 environment at the same absolute paths and verify it before use. A generic
relocatable offline model installer has not yet been validated.

For source operation, use the same data directory explicitly:

```sh
export OMNIVOICE_DATA_DIR="$HOME/Library/Application Support/Cantonese Voice Studio/data"
bash scripts/run-cantonese-offline.sh
```

For a packaged build, install the app from the workflow's DMG/ZIP, retain the
prepared data directory, disconnect networking, and launch the `.app` normally.
The app bundles Python and ffmpeg. No model or runtime download is attempted as
a fallback: missing local assets must be prepared before offline use.

## Generate, edit and export

1. In **Clone**, import a clean WAV, MP3 or M4A recording of the speaker. Use a
   short Cantonese reference (roughly 5–15 seconds, one speaker, no music) and
   enter its accurate transcript. Save a named local voice profile.
2. Choose **CosyVoice 3** and **Cantonese**. Enter colloquial Traditional Chinese,
   for example `聽日開 meeting，記得帶 laptop。`. Adjust speed and generate. If
   offline transcription has no installed model, enter the transcript manually.
3. Preview and export the take using the existing Clone controls. Import that
   exported file into **Tools → Cantonese lexical tones**.
4. Drag across the waveform to select one syllable, zoom/scroll to refine the
   boundary, or enter start/end seconds. The lower graph shows measured F0 in Hz.
5. Apply 55, 25, 33, 21, 23 or 22, or use a relative semitone shift. **Add pitch
   points** creates three editable anchors: drag vertically or enter Hz. Numeric
   controls also provide a keyboard-accessible alternative.
6. Compare original and edited playback. **Undo** re-renders the remaining
   recipe from the source. **Reopen last edit** restores the last project after
   navigating away/relaunching. **Export WAV** saves the edited take.

Presets use log-frequency contours across the speaker's 10th–90th percentile
pitch range, with a six-semitone minimum range for flat references. They do not
quantize to musical notes. Manual targets are 60–600 Hz and shifts are ±12
semitones; invalid targets are rejected. Select a single voiced syllable: applying
a tone to an entire sentence is usually wrong. The editor keeps samples outside
the selection and frames **detected as unvoiced** unchanged, using short fades
inside voiced regions. Praat overlap-add retains the speech spectral envelope;
pitch-tracking mistakes or large shifts can still cause artifacts. Automatic
alignment, lexical-tone detection, duration edits and segment regeneration are
not part of this milestone.

Imports are bounded to 120 seconds / 25 MB and decoded to mono 48 kHz float WAV.
The input file on disk is never overwritten. Decoded source, immutable takes and
JSON edit recipes live under `data/lexical-pitch/<UUID>/`. Undo-to-original returns
the exact source file. Up to 50 edits are supported per project. Files are retained
locally until you delete their project directory with the app closed.

## Offline enforcement

The macOS app entrypoint runs Electron and its children under `sandbox-exec`,
allowing only loopback TCP and local Unix sockets. This is the boundary covering
native TTS libraries, ffmpeg and engine subprocesses. If the OS refuses the
profile, launch fails; there is no unsandboxed fallback. `sandbox-exec` is a
legacy macOS interface, so the ARM64 CI smoke test and physical-Mac test remain
required before calling the release fully verified.

The Python backend additionally blocks non-loopback sockets/DNS through an audit
hook and forces Hugging Face offline mode. Electron blocks external renderer
requests, disables analytics/diagnostics and updates, and does not start the cloud
account service. The original upstream online panels are not supported by this
fork. Do not launch the internal Electron executable directly: only the `.app`
entrypoint or provided source launcher applies the OS boundary. Linux development
checks verify Python policy, not native macOS containment.

## Build and downloadable artifact

After the fork is writable, open **Actions → Cantonese offline macOS ARM64 → Run
workflow** on `cantonese-offline`. It uses the standard `macos-15` ARM64 runner,
existing runtime staging, existing native helper build and Electron packaging.
The job tests audio processing and the OS sandbox before uploading DMG and app ZIP
under **Cantonese-Voice-Studio-macOS-arm64** (14-day retention). It does not create
a release or use signing/notarization secrets. Artifacts use ad-hoc signing, without Developer ID notarization; no Apple
Developer subscription is required to build them. Follow macOS's explicit
Open/Privacy & Security approval for a locally trusted unsigned build.

Before the 30 November deadline, run the artifact on the actual M1 Ultra with
network disconnected, import each supported format, create/reopen a profile,
generate Cantonese and mixed-English examples, compare pitch edits by ear and
measure F0 again. Record runner logs and physical-Mac results separately.
