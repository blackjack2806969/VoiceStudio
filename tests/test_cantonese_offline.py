import os
from pathlib import Path
import subprocess
import sys


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
