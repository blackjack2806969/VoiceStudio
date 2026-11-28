#!/bin/bash
set -euo pipefail
# This launcher is installed as CFBundleExecutable. The original Mach-O stays intact.
contents_dir="$(cd "$(dirname "$0")/.." && pwd)"
export VOICESTUDIO_CANTONESE_OFFLINE=1
export VOICESTUDIO_CANTONESE_BUNDLED=1
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 DO_NOT_TRACK=1
export OMNIVOICE_ANALYTICS_DISABLED=1 OMNIVOICE_DIAGNOSTICS_DISABLED=1 VOICESTUDIO_DISABLE_UPDATER=1
export OMNIVOICE_TTS_BACKEND=omnivoice OMNIVOICE_LLM_BACKEND=off
exec "$contents_dir/MacOS/Cantonese Voice Studio" "$@"
