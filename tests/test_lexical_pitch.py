"""Real Praat synthesis and F0 extraction, no mocked DSP or downloaded model."""
import numpy as np
import pytest
from pydantic import ValidationError
from services.lexical_pitch import ToneEdit, analyze, render, track

RATE = 24000


def speech_fixture(hz=150):
    t = np.arange(RATE * 2) / RATE
    # Harmonic voiced signal with a silent/unvoiced middle and realistic headroom.
    x = sum(0.15 / k * np.sin(2 * np.pi * hz * k * t) for k in range(1, 7))
    x[(t > 0.85) & (t < 1.15)] = np.random.default_rng(42).normal(0, 0.005, np.sum((t > 0.85) & (t < 1.15)))
    return x


def test_semitones_measurably_change_f0_and_preserve_other_samples():
    source = speech_fixture()
    before = source.copy()
    edited = render(source, RATE, [ToneEdit(start=0.2, end=0.7, semitones=3)])
    times, f0 = track(edited, RATE)
    median = np.median(f0[(times > 0.3) & (times < 0.6)])
    assert median == pytest.approx(150 * 2 ** (3 / 12), rel=0.03)
    np.testing.assert_array_equal(source, before)
    np.testing.assert_array_equal(edited[:int(0.2 * RATE)], source[:int(0.2 * RATE)])
    np.testing.assert_array_equal(edited[int(0.7 * RATE):], source[int(0.7 * RATE):])
    assert len(edited) == len(source)


@pytest.mark.parametrize('tone,direction', [('55', 0), ('25', 1), ('33', 0), ('21', -1), ('23', 1), ('22', 0)])
def test_tone_contours(tone, direction):
    source = speech_fixture()
    edited = render(source, RATE, [ToneEdit(start=0.1, end=0.75, tone=tone)])
    times, f0 = track(edited, RATE)
    early = np.median(f0[(times > 0.2) & (times < 0.3)])
    late = np.median(f0[(times > 0.55) & (times < 0.65)])
    if direction:
        assert direction * (late - early) > 5
    else:
        assert late == pytest.approx(early, rel=0.03)


def test_manual_points_unvoiced_preservation_and_undo():
    source = speech_fixture()
    edit = ToneEdit(start=0.1, end=1.8, points=[{'time': 0.1, 'hz': 130}, {'time': 1.8, 'hz': 200}])
    edited = render(source, RATE, [edit])
    np.testing.assert_array_equal(edited[int(0.95 * RATE):int(1.05 * RATE)], source[int(0.95 * RATE):int(1.05 * RATE)])
    np.testing.assert_array_equal(render(source, RATE, []), source)
    times, f0 = track(edited, RATE)
    assert np.median(f0[(times > 1.5) & (times < 1.7)]) > 180


def test_range_adapts_to_speaker():
    low = analyze(speech_fixture(120), RATE)['range_hz']
    high = analyze(speech_fixture(240), RATE)['range_hz']
    assert np.array(high) == pytest.approx(np.array(low) * 2, rel=0.02)


@pytest.mark.parametrize('kwargs', [dict(start=1, end=0), dict(start=0, end=1, semitones=float('nan')), dict(start=0, end=1, tone='12'), dict(start=0, end=1, points=[{'time': 2, 'hz': 150}])])
def test_invalid_edits(kwargs):
    with pytest.raises(ValidationError):
        ToneEdit(**kwargs)


def test_silence_and_bounds():
    with pytest.raises(ValueError, match='voiced'):
        render(np.zeros(RATE), RATE, [ToneEdit(start=0, end=0.5, tone='55')])
    with pytest.raises(ValueError, match='beyond'):
        render(speech_fixture(), RATE, [ToneEdit(start=0, end=3, tone='55')])


def test_real_speech_fixture_measured_shift():
    from pathlib import Path
    import soundfile as sf
    path = Path(__file__).resolve().parents[1] / 'backend/assets/samples/dictation/en_conversational.wav'
    source, rate = sf.read(path)
    if source.ndim == 2:
        source = source.mean(axis=1)
    times, before = track(source, rate)
    start, end = .55, 1.55
    edited = render(source, rate, [ToneEdit(start=start, end=end, semitones=2)])
    _, after = track(edited, rate)
    voiced = (times > start + .1) & (times < end - .1) & (before > 0) & (after > 0)
    assert np.median(12 * np.log2(after[voiced] / before[voiced])) == pytest.approx(2, abs=.15)
    np.testing.assert_array_equal(edited[:int(start * rate)], source[:int(start * rate)])
    np.testing.assert_array_equal(edited[int(end * rate):], source[int(end * rate):])
