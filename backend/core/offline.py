"""Default-deny network policy for this fork's Python backend (loopback IPC only)."""
import ipaddress
import os
import socket
import sys


def local_host(host):
    if isinstance(host, bytes):
        host = host.decode('ascii', errors='replace')
    if host in {None, 'localhost'}:
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def install():
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1',
                      HF_HUB_DISABLE_TELEMETRY='1', DO_NOT_TRACK='1',
                      OMNIVOICE_ANALYTICS_DISABLED='1', OMNIVOICE_DIAGNOSTICS_DISABLED='1')
    os.environ.setdefault('OMNIVOICE_TTS_BACKEND', 'omnivoice')
    os.environ.setdefault('OMNIVOICE_LLM_BACKEND', 'off')

    def audit(event, args):
        if event == 'socket.getaddrinfo' and not local_host(args[0]):
            raise PermissionError('Cantonese Studio is offline: external DNS is disabled.')
        if event in {'socket.connect', 'socket.bind', 'socket.sendto'}:
            sock = args[0]
            if sock.family in {socket.AF_INET, socket.AF_INET6}:
                address = args[-1]
                if not local_host(address[0]):
                    raise PermissionError('Cantonese Studio is offline: only loopback networking is allowed.')
    sys.addaudithook(audit)
