# Cantonese Voice Studio for Apple Silicon

This fork reuses VoiceStudio's Electron desktop, local voice profiles and TTS
adapters. The five workspaces are **Clone**, **Cantonese Pitch Editor**,
**Saved Voices**, **History** and **Settings**. Set **Settings → General → Language → 繁體中文** for Traditional
Chinese; English is also supported. New editor strings in other UI languages
currently fall back to English.

## Install and set up OmniVoice

From v0.3.1, the bundle is named **Cantonese Voice Studio.app** and uses the
[original CAN Edition mark](https://github.com/blackjack2806969/VoiceStudio/blob/main/docs/logo-can.svg).
Quit the previous build and open the renamed app. The same bundle identifier and
Application Support directory keep your model cache, voices, settings and takes available.

Install the Apple Silicon app from [GitHub Releases](https://github.com/blackjack2806969/VoiceStudio/releases).
The DMG includes Python, the upstream OmniVoice engine and local ffmpeg. The
pitch editor works before model setup.

1. Open **Clone**. The app reuses a complete `k2-fsa/OmniVoice` snapshot in the
   original VoiceStudio/Hugging Face cache. This includes the default
   `~/.cache/huggingface/hub` or a configured HF cache.
2. If weights are missing, choose **Download OmniVoice** and confirm the macOS
   prompt. The app uses the upstream pinned downloader and shows progress.
   Allow about 2.4 GB for weights plus download working space. A failed download
   can be retried after checking disk space and access to Hugging Face.
3. Read and acknowledge the model licence in **Clone** before synthesizing.
   OmniVoice weights are under CC-BY-NC. The bundled audio tokenizer is subject
   to separate Higgs Audio 2 and Meta Llama 3 terms. See the
   [pinned model card](https://huggingface.co/k2-fsa/OmniVoice/blob/c5fdb5ccb189668d56333f77ba2629f4cd7535f4/README.md)
   and
   [tokenizer licence](https://huggingface.co/k2-fsa/OmniVoice/blob/c5fdb5ccb189668d56333f77ba2629f4cd7535f4/audio_tokenizer/LICENSE).
4. Disconnect after the download finishes. The app uses MPS on supported Apple
   Silicon hosts and CPU when the system reports MPS unavailable.

For an offline Mac, copy the intact Hugging Face `models--k2-fsa--OmniVoice`
directory from a prepared machine into `~/.cache/huggingface/hub`. Keep its
`snapshots`, `blobs`, Git revision markers and relative symlinks together.
The app's own downloads are under `~/Library/Application Support/Cantonese Voice
Studio/models`. The app stores profiles and takes in its separate `data`
directory.

For source development on ARM64, install Git, Node 22, Bun 1.4.2 and uv 0.12.13.
Use `bun install --frozen-lockfile` and
`uv sync --frozen --no-dev --no-editable --python 3.11`. Run
`.venv/bin/python scripts/prepare_cantonese_models.py` for the explicit connected
setup, then `bash scripts/run-cantonese-offline.sh` with the same Hugging Face
cache. See [development status](../DEVELOPMENT_STATUS.md) for validation and
hardware coverage.

## Generate, edit and export

1. In **Clone**, import a clean WAV, MP3 or M4A recording of the speaker. Use a
   short Cantonese reference (roughly 5–15 seconds, one speaker, no music) and
   enter its accurate transcript. Save a named local voice profile.
2. Choose **Cantonese**. Enter colloquial Traditional Chinese,
   for example `聽日開 meeting，記得帶 laptop。`. Adjust speed and generate. If
   offline transcription has no installed model, enter the transcript manually.
3. Preview the take, then choose **Edit Pitch** beside its audio in **Clone**
   or **History**. The editor opens a separate project with that take. To edit
   an external recording, open **Cantonese Pitch Editor** and choose **Import recording**.
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

Electron uses Chromium's sandbox for its windows and utility processes.
The desktop supervisor starts the Python backend and native audio helpers under
macOS `sandbox-exec`. The profile permits only loopback IP and local Unix sockets
and is inherited by ffmpeg, inference libraries and model subprocesses. A profile
failure stops the affected worker.

The Python backend also blocks non-loopback sockets and DNS through an audit hook
and forces Hugging Face offline mode. Electron filters external Chromium requests
and disables proxy discovery, remote hostname resolution, external browser launch,
analytics, updates and cloud account startup. Only an explicitly confirmed, separate model installer uses the internet. Use the normal app entrypoint or the source launcher
to select the right worker profile.

## Build and downloadable artifact

The **Cantonese offline macOS ARM64** workflow builds the app on the
`macos-15` ARM64 runner. It opens the packaged Electron app with an empty
cache, downloads and reuses the real model, runs a cloned mixed-language
synthesis offline, and tests pitch editing, playback and WAV export. A
`cantonese-macos-*` tag publishes the DMG and app ZIP only after those checks
pass. The packages use ad-hoc signing. Developer ID notarization is unavailable
for these builds.
