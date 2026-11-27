# Ponytail review — first MVP

## Speed and CI follow-up

What this change does: Passes the existing speed control through both CosyVoice
adapters and adds an actual model smoke check using the existing installer.
The frontend unit test mocks the blob method directly; the real browser check
still exercises binary WAV responses. Removed the cloud/paid support shortcut.

Reviewed the callers, subprocess keyword forwarding and pinned upstream
inference signatures. Voice conversion remains unchanged. Invalid speed is
rejected before inference; no new runtime dependencies or installer were added.
The speed regression failed before the change and passes afterward.

Verdict: Ship this validation milestone. Real-model and installer CI must pass
before calling either verified. Not checked: physical M1 Ultra or accent quality.

First-launch review found the existing mandatory model-download wizard blocked
the model-free editor. Removed its two wrappers from the backend gate and the
unused analytics, diagnostics and cloud-sync mounts from the app. A fresh-profile
regression and the real browser flow pass. The packaged test reuses that flow
and launches the sandbox wrapper, rather than bypassing it with the inner binary.

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

Further review fixes: blocked attachment to an existing unconfined backend and
remote backend configuration, isolated Electron data and default port, and fixed
the staged sitecustomize policy (deleting a parent environment flag alone was
insufficient). Regression checks cover the attachment refusal and staging mode.
