# Cantonese Voice Studio development status

Updated: 2026-11-27. Deadline: 2026-11-30.

## Baseline
- Upstream: debpalash/VoiceStudio @ 29ca59dcd, Electron + FastAPI.
- Branch: cantonese-offline. Original history and AGPL-3.0 license retained.
- Official Ponytail instructions persisted in AGENTS.md; official review skill installed locally.
- Existing code includes voice import, local profiles, MLX TTS, speed, preview, exports and ARM64 packaging.
- Development host: Linux x86_64. No physical Mac test or real TTS inference performed yet.
- GitHub fork creation returned HTTP 403 (integration lacks permission); local commits remain deliverable.

## Current milestone
Implement bounded, non-destructive Praat lexical-tone editing integrated into Electron Tools.

## Remaining acceptance gates
- Real Hong Kong Cantonese and mixed English listening evaluation on an M1 Ultra.
- Strict offline application runtime and model provisioning validation.
- ARM64 build, offline install, and downloaded artifact smoke test.
- Optional duration editing, alignment and selected-segment regeneration are outside the first milestone.
