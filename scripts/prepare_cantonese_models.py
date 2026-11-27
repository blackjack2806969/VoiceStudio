"""Explicit online provisioning only; never accepts recordings or performs inference."""
import argparse
import json
import os
from pathlib import Path
import platform
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', required=True)
    parser.add_argument('--data-dir', type=Path, required=True)
    args = parser.parse_args()
    if platform.system() != 'Darwin' or platform.machine() != 'arm64':
        parser.error('Provision on macOS ARM64; Linux environments cannot be copied to a Mac.')
    os.environ['OMNIVOICE_DATA_DIR'] = str(args.data_dir.expanduser().resolve())
    os.environ['OMNIVOICE_ENV_FILE'] = str(args.data_dir.expanduser().resolve() / 'user-env')
    if os.environ.get('HF_HUB_OFFLINE') == '1':
        parser.error('Run provisioning outside the offline launcher, with HF_HUB_OFFLINE unset.')
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
    from services.sidecar_install import start_install, get_status
    print(json.dumps(start_install('cosyvoice')))
    previous = None
    while True:
        status = get_status('cosyvoice')
        if status != previous:
            print(json.dumps(status), flush=True)
            previous = status
        if status['installed']:
            return
        job = status.get('job') or {}
        if job.get('state') in {'failed', 'succeeded'}:
            raise SystemExit('CosyVoice provisioning failed; see the install log above.')
        time.sleep(2)


if __name__ == '__main__':
    main()
