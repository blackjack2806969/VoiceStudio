import os
from pathlib import Path
import subprocess
import sys


def test_packaged_backend_resolves_the_downloaders_data_directory(tmp_path):
    private = tmp_path / 'private'
    private.mkdir()
    alias = tmp_path / 'alias'
    alias.symlink_to(private, target_is_directory=True)
    env = {
        **os.environ,
        'VOICESTUDIO_CANTONESE_BUNDLED': '1',
        'OMNIVOICE_DATA_DIR': str(alias),
        'PYTHONPATH': str(Path(__file__).resolve().parents[1] / 'backend'),
    }
    result = subprocess.check_output([sys.executable, '-c', 'from core.config import DATA_DIR; print(DATA_DIR)'],
                                     env=env, text=True, timeout=10)
    assert result.strip() == str(private.resolve())


def test_real_socket_boundary_in_child():
    code = '''
import os, socket
from core.offline import install
install()
assert os.environ['HF_HUB_OFFLINE'] == '1'
with socket.socket() as server:
    server.bind(('127.0.0.1', 0)); server.listen()
    with socket.create_connection(server.getsockname(), timeout=1):
        peer, _ = server.accept(); peer.close()
for action in [lambda: socket.getaddrinfo('example.com', 443),
               lambda: socket.create_connection(('1.1.1.1', 443), timeout=.1),
               lambda: socket.socket(socket.AF_INET, socket.SOCK_DGRAM).sendto(b'x', ('1.1.1.1', 53))]:
    try: action()
    except PermissionError: pass
    else: raise AssertionError('External network was not blocked')
'''
    env = {**os.environ, 'PYTHONPATH': str(Path(__file__).resolve().parents[1] / 'backend')}
    subprocess.run([sys.executable, '-c', code], env=env, check=True, timeout=10)


def test_bundled_runtime_uses_offline_policy_without_store_sidecar_restriction():
    import importlib.util
    script = Path(__file__).resolve().parents[1] / 'scripts/stage_mas_python.py'
    spec = importlib.util.spec_from_file_location('cantonese_runtime_stage', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert '_voicestudio_bundled_code' in module.runtime_customization()
    fork = module.runtime_customization(cantonese=True)
    assert fork == 'from _voicestudio_offline import install\ninstall()\n'


def test_offline_synthesis_does_not_download_optional_watermark(monkeypatch):
    import torch
    from services import watermark
    monkeypatch.setenv('HF_HUB_OFFLINE', '1')
    monkeypatch.setattr(watermark, '_generator', None)
    monkeypatch.setattr(watermark, 'is_enabled', lambda: True)
    monkeypatch.setattr(watermark, '_check_available', lambda: True)
    monkeypatch.setattr(watermark, '_generator_checkpoint_cached', lambda: False)
    loads = []
    def unexpected_load():
        loads.append(True)
        raise AssertionError('Missing optional weights must never trigger a download.')
    monkeypatch.setattr(watermark, '_get_generator', unexpected_load)
    source = torch.zeros(1, 24000)
    assert watermark.mark_synthetic(source, 24000, context='test.offline') is source
    assert not loads


def test_omnivoice_reuses_original_hub_snapshot_only_when_complete(monkeypatch, tmp_path):
    repo = "k2-fsa/OmniVoice"
    cache = tmp_path / ".cache" / "huggingface" / "hub" / "models--k2-fsa--OmniVoice"
    rev = "b" * 40
    (cache / "refs").mkdir(parents=True)
    (cache / "refs" / "main").write_text(rev)
    snapshot = cache / "snapshots" / rev
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path / "new-empty-cache"))
    monkeypatch.setenv("VOICESTUDIO_CANTONESE_OFFLINE", "1")
    monkeypatch.setenv("OMNIVOICE_MODEL", "someone/other-model")
    from services.model_catalogue import catalogue_entry
    from services.omnivoice_checkpoint import installed_omnivoice_checkpoint, resolve_omnivoice_checkpoint

    for name in catalogue_entry(repo)["required_files"]:
        if name == "audio_tokenizer/model.safetensors":
            continue
        path = snapshot / name
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as output:
            output.truncate(5 * 1024 * 1024 if path.suffix == ".safetensors" else 1)
    assert not installed_omnivoice_checkpoint()
    assert resolve_omnivoice_checkpoint() == repo
    with (snapshot / "audio_tokenizer/model.safetensors").open("wb") as output:
        output.truncate(5 * 1024 * 1024)
    assert resolve_omnivoice_checkpoint() == str(snapshot)
