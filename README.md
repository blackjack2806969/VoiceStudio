<div align="center">
  <img src="docs/logo.png" alt="VoiceStudio logo" width="72" height="72" />
  <h1>Cantonese Voice Studio</h1>
  <p><strong>廣東話語音複製 · 本地文字轉語音 · 六聲修音</strong></p>
  <p>Offline voice cloning and Cantonese lexical-tone editing for Apple Silicon Macs.</p>
  <p>
    <a href="https://github.com/blackjack2806969/VoiceStudio/releases"><strong>Download for macOS</strong></a> ·
    <a href="#quick-start">Quick start</a> ·
    <a href="#快速上手">繁體中文</a> ·
    <a href="https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md">Documentation</a>
  </p>
  <p><code>macOS arm64</code> · <code>OmniVoice</code> · <code>Praat / PSOLA</code> · <code>Local inference</code></p>
</div>

---

## What is Cantonese Voice Studio?

An independent, Cantonese-focused fork of [VoiceStudio](https://github.com/debpalash/VoiceStudio), designed for a simple workflow: clone an authorised reference voice, generate Hong Kong Cantonese speech (including English words), correct individual syllable tones and export the finished audio.

The distribution uses OmniVoice as its only TTS engine. Once the model is installed, speech generation and audio editing run locally, without a cloud inference service or paid API credits.

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
- OmniVoice model weights (~2.4 GB) are **not bundled**. Install once from Clone, or reuse a complete existing Hugging Face model cache.
- The pitch editor works without any TTS model.
- Packages are ad-hoc signed, not Apple Developer ID notarized. Follow your organisation's installation and security policy.

## Quick start

1. Open the DMG and install the app in Applications.
2. Open **Clone**. If the OmniVoice model is missing, select **Download OmniVoice** and complete the one-time setup.
3. Review and acknowledge the model licence.
4. Import a clean 5–15 second reference recording with the speaker's permission and enter its accurate transcript.
5. Select Cantonese, enter your script and generate speech. For example: `聽日開 meeting，記得帶 laptop。我哋九點見。`
6. Preview the take. Open it in the Cantonese Pitch Editor, select a syllable, adjust the tone and export WAV.

In v0.2.0, export the generated take and import it through **Tools → Cantonese lexical tones**. The focused v0.3.0 interface introduces a direct **Edit Pitch** handoff from Clone and History.

### Existing model cache / offline setup

A complete existing `k2-fsa/OmniVoice` Hugging Face snapshot can be reused. For an offline Mac, the intact `models--k2-fsa--OmniVoice` cache directory can be transferred to `~/.cache/huggingface/hub`, preserving blobs, snapshots and relative symlinks. See the [installation guide](https://github.com/blackjack2806969/VoiceStudio/blob/cantonese-offline/docs/cantonese-offline.md) for details.

## Release status

| Version | Status |
| --- | --- |
| [v0.2.0](https://github.com/blackjack2806969/VoiceStudio/releases/tag/cantonese-macos-0.2.0) | Published OmniVoice-only ARM64 installer; packaged CI passed |
| [v0.3.0](https://github.com/blackjack2806969/VoiceStudio/tree/cantonese-macos-0.3.0) | Focused UI candidate: Clone, Cantonese Pitch Editor, Saved Voices, History, Settings; check Releases for installer availability |

The v0.2.0 [macOS ARM64 CI run](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45981656040) verified model installation, cache reuse, local mixed-language voice cloning, manual F0 editing, playback, undo and WAV export.

[Download v0.2.0 test screenshots and audio](https://github.com/blackjack2806969/VoiceStudio/actions/runs/45981656040/artifacts/15190228799) (GitHub Actions artifact; sign-in may be required).

CI is not a guarantee of pronunciation quality, voice similarity or performance on a physical M1 Ultra. Those remain subject to hands-on evaluation.

## 快速上手

Cantonese Voice Studio 係一個以香港廣東話為核心嘅本地 AI 配音工具，專為 Apple Silicon Mac 設計。

- **語音複製：** 匯入獲授權嘅參考錄音，用 OmniVoice 生成廣東話及中英夾雜語音。
- **廣東話修音：** 選取讀錯聲調嘅字，套用六聲預設，或者手動調整 F0 音高曲線。
- **本地運算：** 安裝模型後，生成語音、錄音及修音均在本機處理。
- **繁體中文介面：** 在 Settings → Language 選擇繁體中文。

去 [Releases](https://github.com/blackjack2806969/VoiceStudio/releases) 下載 ARM64 DMG。首次使用 Clone 需要下載約 2.4 GB OmniVoice 模型權重；如已有完整模型快取，可以直接重用。Pitch Editor 不需要 AI 模型。

注意：聲調修正並非自動糾正所有讀音錯誤。OmniVoice 權重採非商業用途授權，使用前請確認授權條款。

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
