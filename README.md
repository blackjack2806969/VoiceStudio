<div align="center">
  <img src="docs/logo-can.svg" alt="Cantonese Voice Studio CAN logo" width="112" height="112" />
  <h1>Cantonese Voice Studio</h1>
  <p><strong>Voice cloning · Local TTS · Cantonese tone correction</strong></p>
  <p>Offline voice cloning and Cantonese lexical-tone editing for Apple Silicon Macs.</p>
  <p><strong>English</strong> · <a href="README.zh-HK.md">繁體中文（香港）</a></p>
  <p>
    <a href="https://github.com/blackjack2806969/VoiceStudio/releases"><strong>Download for macOS</strong></a> ·
    <a href="#screenshots">Screenshots</a> ·
    <a href="#quick-start">Quick start</a> ·
    <a href="https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md">Documentation</a>
  </p>
  <p><code>macOS arm64</code> · <code>OmniVoice</code> · <code>Praat / PSOLA</code> · <code>Local inference</code></p>
</div>

---

## What is Cantonese Voice Studio?

An independent, Cantonese-focused fork of [VoiceStudio](https://github.com/debpalash/VoiceStudio), designed for a simple workflow: clone an authorised reference voice, generate Hong Kong Cantonese speech (including English words), correct individual syllable tones and export the finished audio.

The distribution uses OmniVoice as its only TTS engine. Once the model is installed, speech generation and audio editing run locally, without a cloud inference service or paid API credits.

> [!TIP]
> **Most important generation tip: render complete sentences, not isolated words.** Give OmniVoice a full sentence or a natural phrase instead of generating one or two words at a time. Sentence-level context helps the model produce more natural Cantonese pronunciation, rhythm and intonation. If a single syllable has the wrong tone, generate the whole sentence first and then correct that syllable in the Pitch Editor. If regeneration is needed, regenerate the full sentence rather than splicing isolated words together.
>
> For example, render `聽日朝早九點要開會，記得準時返嚟。` as a complete sentence rather than generating `聽日` and `開會` separately.

## Screenshots

Actual screenshots from the packaged v0.3.0 macOS ARM64 application tests, not design mockups.

### Voice Clone

[![v0.3.0 Voice Clone workspace](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-01-clone.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-01-clone.png)

### Cantonese Pitch Editor

[![v0.3.0 Cantonese Pitch Editor workspace](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-02-cantonese-pitch-editor.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-02-cantonese-pitch-editor.png)

<details>
<summary>More screenshots: Saved Voices, History and Settings</summary>

### Saved Voices

[![Saved Voices](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-03-saved-voices.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-03-saved-voices.png)

### History

[![History](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-04-history.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-04-history.png)

### Settings

[![Settings](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-05-settings.png)](https://github.com/blackjack2806969/VoiceStudio/releases/download/cantonese-macos-0.3.0/ui-05-settings.png)

</details>

[View the v0.3.0 release and screenshots](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.3.0)

## Two core tools

| Voice Clone | Cantonese Pitch Editor |
| --- | --- |
| Zero-shot voice cloning from a reference recording | Select individual syllables on a waveform |
| Cantonese and mixed Cantonese–English text | Six Cantonese lexical-tone presets |
| Saved voice profiles and speech-speed control | Manual F0 control points and semitone shifts |
| Preview and export generated audio | Non-destructive editing, undo, A/B playback and WAV export |

### Cantonese tone correction

Unlike music Auto-Tune, this editor is designed for spoken Cantonese. It uses Praat PSOLA pitch manipulation and speaker-relative contours rather than musical scales.

| Tone | Example | Contour |
| :---: | :---: | --- |
| 1 | 詩 (si1) | 55 · High level |
| 2 | 史 (si2) | 25 · High rising |
| 3 | 試 (si3) | 33 · Mid level |
| 4 | 時 (si4) | 21 · Low falling |
| 5 | 市 (si5) | 23 · Low rising |
| 6 | 事 (si6) | 22 · Low level |

Select a syllable, apply a preset or adjust its pitch points manually, then listen to the original and edited versions. The source recording is preserved. The editor adjusts pitch, not consonants or vowels, and does not automatically detect pronunciation errors.

## Download

**[Get the macOS ARM64 installer from this fork's Releases](https://github.com/blackjack2806969/VoiceStudio/releases)**

Choose the newest published OmniVoice-only release and download its `.dmg` file.

- Target: Apple Silicon Macs (M-series).
- The DMG bundles the app, Python runtime, OmniVoice engine and ffmpeg.
- OmniVoice model weights (~2.4 GiB) are **not bundled**. Install once from Clone, or reuse a complete existing Hugging Face model cache.
- The pitch editor works without any TTS model.
- Packages are ad-hoc signed, not Apple Developer ID notarized. Follow your organisation's installation and security policy.

## Quick start

1. Open the DMG and install the app in Applications.
2. Open **Clone**. If the OmniVoice model is missing, select **Download OmniVoice** and complete the one-time setup.
3. Review and acknowledge the model licence.
4. Import a clean 5–15 second reference recording with the speaker's permission and enter its accurate transcript.
5. Select Cantonese, enter your script and generate speech. For example: `聽日開 meeting，記得帶 laptop。我哋九點見。`
6. Preview the take and choose **Edit Pitch** to open it directly in the Cantonese Pitch Editor. Select a syllable, adjust the tone and export WAV.

In v0.3.0, **Edit Pitch** is available directly from Clone and History. In the older v0.2.0 release, export the generated take and import it through **Tools → Cantonese lexical tones**.

### Existing model cache / offline setup

A complete existing `k2-fsa/OmniVoice` Hugging Face snapshot can be reused. For an offline Mac, the intact `models--k2-fsa--OmniVoice` cache directory can be transferred to `~/.cache/huggingface/hub`, preserving blobs, snapshots and relative symlinks. See the [installation guide](https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md) for details.

## Release status

| Version | Status |
| --- | --- |
| [v0.2.0](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.2.0) | Published OmniVoice-only ARM64 installer; packaged CI passed |
| [v0.3.0](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.3.0) | Published ARM64 installer; five focused workspaces, direct Edit Pitch handoff, packaged CI passed |

The v0.3.0 release tests verified model setup, offline cloning, both Edit Pitch actions, playback, undo and WAV export.

The v0.2.0 [macOS ARM64 CI run](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45981656040) verified model installation, cache reuse, local mixed-language voice cloning, manual F0 editing, playback, undo and WAV export.

[Download v0.2.0 test screenshots and audio](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45981656040/artifacts/15190228799) (GitHub Actions artifact; sign-in may be required).

CI is not a guarantee of pronunciation quality, voice similarity or performance on a physical M1 Ultra. Those remain subject to hands-on evaluation.

## Source and documentation

The Cantonese implementation lives on [`cantonese-offline`](https://github.com/blackjack2806969/VoiceStudio/tree/cantonese-offline). The default branch is the repository landing page and retains the upstream source baseline; use the Cantonese branch or a release tag for development.

- [Installation, model setup and editing guide](https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md)
- [Development status and test evidence](https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/DEVELOPMENT_STATUS.md)
- [Report a fork-specific issue](https://github.com/blackjack2806969/VoiceStudio/issues)

## Licence and credits

- Application: [AGPL-3.0](LICENSE). Upstream copyright, notices and source history are retained. See [LICENSE-NOTICE.md](LICENSE-NOTICE.md).
- OmniVoice model weights: [CC BY-NC; non-commercial use](https://huggingface.co/k2-fsa/OmniVoice/blob/c5fdb5ccb189668d56333f77ba2629f4cd7535f4/README.md). The audio tokenizer has [separate Higgs Audio 2 and Meta Llama 3 terms](https://huggingface.co/k2-fsa/OmniVoice/blob/c5fdb5ccb189668d56333f77ba2629f4cd7535f4/audio_tokenizer/LICENSE). The app licence does not override model terms.
- Pitch processing: [Praat-Parselmouth](https://github.com/YannickJadoul/Parselmouth), GPL-3.0-or-later.

Built on the work of [Palash Debnath](https://github.com/debpalash), [Shimul Debnath](https://github.com/velixio) and the [VoiceStudio contributors](https://github.com/debpalash/VoiceStudio/graphs/contributors), with OmniVoice by its upstream authors and Praat/Parselmouth by their respective developers.

This independent fork is not the official upstream VoiceStudio distribution. Use only voices you are authorised to clone; do not use the software for impersonation, fraud or other unlawful activity.
