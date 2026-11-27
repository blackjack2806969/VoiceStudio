"""Run under sandbox-exec on macOS. Checks OS enforcement without Python hooks."""
import socket
import subprocess

with socket.socket() as server:
    server.bind(('127.0.0.1', 0))
    server.listen()
    with socket.create_connection(server.getsockname(), timeout=2):
        peer, _ = server.accept()
        peer.close()
try:
    socket.create_connection(('1.1.1.1', 443), timeout=2)
except PermissionError:
    pass
else:
    raise AssertionError('OS sandbox did not deny external TCP')
# A non-Python child must inherit the same OS network restriction.
result = subprocess.run(['/usr/bin/curl', '--noproxy', '*', '--connect-timeout', '2', 'https://1.1.1.1'], capture_output=True)
assert result.returncode != 0, 'Child process escaped the offline policy'
print('OS sandbox: loopback works; external TCP and child curl blocked.')
