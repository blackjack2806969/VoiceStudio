"""Speech-only Praat PSOLA editing. Source samples are never changed in place."""
import numpy as np
import parselmouth
from parselmouth.praat import call
from pydantic import BaseModel, ConfigDict, Field, model_validator

TONE_LEVELS = {"55": (5, 5), "25": (2, 5), "33": (3, 3),
               "21": (2, 1), "23": (2, 3), "22": (2, 2)}
MAX_SECONDS = 120


class PitchPoint(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    time: float = Field(ge=0, le=MAX_SECONDS)
    hz: float = Field(ge=60, le=600)


class ToneEdit(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    start: float = Field(ge=0, le=MAX_SECONDS)
    end: float = Field(gt=0, le=MAX_SECONDS)
    semitones: float = Field(default=0, ge=-12, le=12)
    tone: str | None = None
    points: list[PitchPoint] = Field(default_factory=list, max_length=256)

    @model_validator(mode="after")
    def validate_region(self):
        if self.end - self.start < 0.04:
            raise ValueError("Select at least 40 ms of speech.")
        if self.tone is not None and self.tone not in TONE_LEVELS:
            raise ValueError("Unknown Cantonese tone.")
        if self.tone and self.points:
            raise ValueError("Choose a preset or manual points, not both.")
        times = [p.time for p in self.points]
        if times != sorted(set(times)) or any(t < self.start or t > self.end for t in times):
            raise ValueError("Pitch points must increase in time inside the selection.")
        return self


def sound(samples, rate):
    samples = np.asarray(samples, dtype=np.float64)
    if samples.ndim != 1 or not np.isfinite(samples).all():
        raise ValueError("Audio must contain finite mono samples.")
    if not 8000 <= rate <= 96000 or not 0.08 <= len(samples) / rate <= MAX_SECONDS:
        raise ValueError("Import 0.08–120 seconds of audio at 8–96 kHz.")
    return parselmouth.Sound(samples, sampling_frequency=rate)


def track(samples, rate):
    pitch = sound(samples, rate).to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=600)
    return pitch.xs(), pitch.selected_array["frequency"]


def speaker_range(f0):
    voiced = f0[f0 > 0]
    if not len(voiced):
        raise ValueError("No voiced speech found. Select a voiced syllable or use a clearer recording.")
    center = np.median(np.log2(voiced))
    lo, hi = np.percentile(np.log2(voiced), [10, 90])
    # A flat reference still needs a usable relative lexical-tone range (six semitones).
    span = np.clip(hi - lo, 0.5, 1.25)
    return np.exp2([center - span / 2, center + span / 2])


def analyze(samples, rate):
    times, f0 = track(samples, rate)
    bins = np.array_split(samples, min(2000, len(samples)))
    voiced = f0[f0 > 0]
    return {"duration": len(samples) / rate, "sample_rate": rate,
            "times": times.tolist(), "f0": f0.tolist(),
            "waveform": [[float(np.min(b)), float(np.max(b))] for b in bins],
            "range_hz": speaker_range(f0).tolist() if len(voiced) else [80, 300]}


def apply_edit(samples, rate, edit: ToneEdit, reference_range):
    original = np.asarray(samples, dtype=np.float64)
    duration = len(original) / rate
    if edit.end > duration + 1 / rate:
        raise ValueError("Selection extends beyond the audio.")
    times, f0 = track(original, rate)
    selected = (times >= edit.start) & (times <= edit.end) & (f0 > 0)
    if not selected.any():
        raise ValueError("The selection contains no voiced speech.")
    if not edit.tone and not edit.points and edit.semitones == 0:
        return original.copy()
    target = f0.copy()
    if edit.tone:
        levels = np.array(TONE_LEVELS[edit.tone])
        lo, hi = np.log2(reference_range)
        anchors = lo + (levels - 1) / 4 * (hi - lo)
        target[selected] = np.exp2(np.interp(times[selected], [edit.start, edit.end], anchors))
    elif edit.points:
        target[selected] = np.exp2(np.interp(times[selected],
            [p.time for p in edit.points], np.log2([p.hz for p in edit.points])))
    target[selected] *= 2 ** (edit.semitones / 12)
    if np.any((target[selected] < 60) | (target[selected] > 600)):
        raise ValueError("Target pitch must stay between 60 and 600 Hz.")
    manipulation = call(sound(original, rate), "To Manipulation", 0.01, 60, 600)
    tier = call(manipulation, "Extract pitch tier")
    call(tier, "Remove points between", 0, duration)
    for time, hz in zip(times[f0 > 0], target[f0 > 0]):
        call(tier, "Add point", float(time), float(hz))
    call([tier, manipulation], "Replace pitch tier")
    rendered = call(manipulation, "Get resynthesis (overlap-add)").values[0]
    if len(rendered) != len(original) or not np.isfinite(rendered).all():
        raise ValueError("Praat returned invalid audio.")
    # Copy only confidently voiced frames; consonants, silence and outside samples stay exact.
    sample_times = np.arange(len(original)) / rate
    frame = np.clip(np.searchsorted(times, sample_times + 0.005) - 1, 0, len(times) - 1)
    mask = selected[frame] & (sample_times >= edit.start) & (sample_times < edit.end)
    weights = np.zeros(len(original))
    edges = np.flatnonzero(np.diff(np.r_[False, mask, False]))
    for start, end in edges.reshape(-1, 2):
        fade = min(round(rate * 0.005), (end - start) // 2)
        weights[start:end] = 1
        if fade:
            ramp = np.linspace(0, 1, fade)
            weights[start:start + fade] = ramp
            weights[end - fade:end] = ramp[::-1]
    result = original + weights * (rendered - original)
    # Reject clipping rather than silently altering untouched consonants by normalization.
    if np.max(np.abs(result)) > 1:
        raise ValueError("The edit would clip. Lower the source level before importing.")
    return result


def render(samples, rate, edits: list[ToneEdit]):
    samples = np.asarray(samples, dtype=np.float64).copy()
    if edits:
        _, f0 = track(samples, rate)
        reference_range = speaker_range(f0)
        for edit in edits:
            samples = apply_edit(samples, rate, edit, reference_range)
    return samples
