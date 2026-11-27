"""Bounded local uploads and immutable speech-tone takes, using the existing API auth."""
import json
import subprocess
import tempfile
import uuid
from pathlib import Path

import soundfile as sf
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from api.dependencies import require_native_access
from core.config import DATA_DIR
from services import lexical_pitch as dsp
from services.audio_io import _safe_soundfile_write
from services.ffmpeg_utils import find_ffmpeg

router = APIRouter(prefix="/tools/lexical-pitch", dependencies=[Depends(require_native_access)])
ROOT = Path(DATA_DIR) / "lexical-pitch"


class RenderRequest(BaseModel):
    edits: list[dsp.ToneEdit] = Field(max_length=50)


def session_dir(session_id: str):
    try:
        clean = str(uuid.UUID(session_id))
    except ValueError as exc:
        raise HTTPException(400, "Invalid audio ID.") from exc
    path = ROOT / clean
    if not (path / "source.wav").is_file():
        raise HTTPException(404, "Audio not found.")
    return path


def result(session_id, take, samples, rate):
    return {"id": session_id, "take": take, **dsp.analyze(samples, rate),
            "audio_url": f"/tools/lexical-pitch/{session_id}/audio/{take}"}


@router.post("/import")
def import_audio(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".wav", ".mp3", ".m4a"}:
        raise HTTPException(400, "Import WAV, MP3 or M4A audio.")
    payload = file.file.read(25 * 1024 * 1024 + 1)
    if len(payload) > 25 * 1024 * 1024:
        raise HTTPException(413, "Import at most 25 MB and 120 seconds.")
    try:
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / ("input" + suffix)
            source.write_bytes(payload)
            decoded = Path(tmp) / "decoded.wav"
            ffmpeg = find_ffmpeg()
            if not ffmpeg:
                raise HTTPException(503, "Install local ffmpeg before importing audio.")
            subprocess.run([ffmpeg, "-nostdin", "-v", "error", "-i", str(source),
                "-t", "121", "-ac", "1", "-ar", "48000", "-c:a", "pcm_f32le", str(decoded)],
                check=True, timeout=30, capture_output=True)
            samples, rate = sf.read(decoded)
            if abs(samples).max(initial=0) > 1:
                raise ValueError("Source audio exceeds full scale.")
            analysis = dsp.analyze(samples, rate)
        session_id = str(uuid.uuid4())
        path = ROOT / session_id
        path.mkdir(parents=True)
        _safe_soundfile_write(path / "source.wav", samples, rate, subtype="FLOAT")
        return {"id": session_id, "take": "source", **analysis,
                "audio_url": f"/tools/lexical-pitch/{session_id}/audio/source"}
    except HTTPException:
        raise
    except (ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        raise HTTPException(422, "Cannot decode a valid 0.08–120 second recording.") from exc


@router.post("/{session_id}/render")
def render_audio(session_id: str, request: RenderRequest):
    path = session_dir(session_id)
    samples, rate = sf.read(path / "source.wav")
    if not request.edits:
        return result(session_id, "source", samples, rate)
    try:
        edited = dsp.render(samples, rate, request.edits)
        take = str(uuid.uuid4())
        response = result(session_id, take, edited, rate)
        _safe_soundfile_write(path / f"{take}.wav", edited, rate, subtype="FLOAT")
        (path / f"{take}.json").write_text(json.dumps(request.model_dump(), indent=2))
        return response
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/{session_id}/audio/{take}")
def audio(session_id: str, take: str):
    path = session_dir(session_id)
    if take != "source":
        try:
            take = str(uuid.UUID(take))
        except ValueError as exc:
            raise HTTPException(400, "Invalid take ID.") from exc
    target = path / f"{take}.wav"
    if not target.is_file():
        raise HTTPException(404, "Take not found.")
    return FileResponse(target, media_type="audio/wav", filename=f"cantonese-{take}.wav")


@router.get("/{session_id}")
def reopen(session_id: str):
    path = session_dir(session_id)
    samples, rate = sf.read(path / "source.wav")
    return result(session_id, "source", samples, rate)
