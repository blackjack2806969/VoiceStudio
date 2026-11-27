# Ponytail review — first MVP

What this change does: Adds a speech-tone editor to the existing Electron Tools
page and FastAPI service. It reuses existing access control, audio write helper,
UI controls, locale catalogs and the existing cloning workflow. Assumed load is
one local desktop user editing clips of up to two minutes.

Review traced Tools → upload → ffmpeg decode → immutable source WAV → Praat
pitch tier → overlap-add → selected voiced samples → immutable take → playback.
Undo renders the remaining recipe against the source, not the previous export.
UUID-only routes prevent callers supplying filesystem paths. Native-access
checks reject remote clients. Inputs reject nonfinite numbers, reversed regions,
unknown presets, unsorted/out-of-region points and oversized edit lists.

Findings fixed before the milestone:
- Reused the existing safe audio writer instead of direct writes from a router.
- Kept dependency changes to one pinned Praat package; regenerated with the
  project's pinned uv version to avoid unrelated lockfile rewriting.
- Aligned analysis limits with the editable 60–600 Hz range.
- Prevented full-scale overflow from silently changing the source at save time.
- Kept explicit numeric controls as an alternative to pointer-only editing.

Verdict: Ship the tested editor milestone. This is not a production release approval.

Not checked: physical Mac, Cantonese perception, full model inference, ARM64
packaging or OS sandbox execution. Tone contours are relative editing aids, not
automatic lexical-tone recognition. PSOLA retains the speech spectral envelope
but large changes and pitch-tracking errors can introduce audible artifacts.

## TTS/offline/deployment review

What this change does: Keeps the existing CosyVoice adapters and provides an
explicit Cantonese dialect instruction without rewriting the user's mixed text.
The Mac launcher confines Electron and child processes to local sockets. Runtime
staging and packaging reuse upstream's scripts; model provisioning stays separate.

Findings fixed:
- The CosyVoice sidecar intentionally cannot import application services. Kept
  its small dialect rule local and mirrored the in-process adapter; existing
  isolation and model-mapping tests now pass.
- Undo originally wrote a fresh WAV header with a new timestamp. An empty edit
  list now returns the source file directly, avoiding work and ensuring exact undo.
- Added a real-speech fixture; retained a conservative 60–600 Hz analysis range
  after a wider ceiling produced false high-frequency voiced frames.
- Bundled direct-download runtime must allow preinstalled local sidecars. Reused
  runtime selection without imposing the Mac App Store's signed-code-only policy.
- Removed analytics delivery regardless of saved upstream opt-in preferences.

Verdict: Ship the source milestone for Mac validation, not as a verified release.
Not checked: macOS sandbox grammar/LaunchServices, actual bundled startup, model
installation on ARM64, real TTS synthesis, and component licence clearance.
No review result here claims these missing checks passed.
