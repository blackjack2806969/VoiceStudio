"""Real CosyVoice cloning/speed check; run under the macOS offline sandbox."""
import argparse
import json
import os
from pathlib import Path
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    os.environ['OMNIVOICE_DATA_DIR'] = str(args.data_dir.expanduser().resolve())
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
    from core.offline import install
    install()
    from core import prefs
    checkout = prefs.get('env.OMNIVOICE_COSYVOICE_DIR')
    if not checkout:
        parser.error('Prepare the existing CosyVoice engine first.')
    os.environ['OMNIVOICE_COSYVOICE_DIR'] = checkout
    from engines.cosyvoice_subprocess import CosyVoiceSubprocessBackend
    from services.audio_io import atomic_save_wav
    from services.watermark import mark_synthetic
    import numpy as np
    import parselmouth

    reference = Path(checkout) / 'asset' / 'zero_shot_prompt.wav'
    assert reference.is_file(), 'Public upstream reference fixture is missing.'
    args.output.mkdir(parents=True, exist_ok=True)
    backend = CosyVoiceSubprocessBackend()
    results = []
    try:
        for speed in (1.0, 1.25):
            started = time.monotonic()
            audio = backend.generate('聽日開 meeting，記得帶 laptop。我哋九點見。',
                                     language='yue', ref_audio=str(reference), speed=speed, seed=42)
            samples = audio.detach().cpu().numpy().reshape(-1)
            duration = len(samples) / backend.sample_rate
            assert np.isfinite(samples).all() and 0.5 < duration < 60, 'Invalid audio.'
            rms = float(np.sqrt(np.mean(samples ** 2)))
            assert rms > 0.001, 'Output is silent.'
            f0 = parselmouth.Sound(samples, backend.sample_rate).to_pitch_ac(
                time_step=0.01, pitch_floor=60, pitch_ceiling=600).selected_array['frequency']
            voiced = f0[f0 > 0]
            assert len(voiced) > 20, 'Output has too little voiced speech.'
            atomic_save_wav(str(args.output / f'cantonese-{speed}.wav'),
                            mark_synthetic(audio, backend.sample_rate, context='cantonese.smoke'),
                            backend.sample_rate)
            result = dict(speed=speed, duration=duration, rms=rms,
                          median_f0=float(np.median(voiced)), elapsed=time.monotonic() - started)
            results.append(result)
            print(json.dumps(result), flush=True)
        ratio = results[1]['duration'] / results[0]['duration']
        assert 0.65 < ratio < 0.95, f'Speed did not shorten speech as expected: {ratio}'
    finally:
        backend.shutdown()
        (args.output / 'metrics.json').write_text(json.dumps(results, indent=2) + '\n')


if __name__ == '__main__':
    main()
