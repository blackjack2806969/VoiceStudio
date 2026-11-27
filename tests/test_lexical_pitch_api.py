import io
import subprocess

import numpy as np
import pytest
import soundfile as sf
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.routers import lexical_pitch as api
from services.lexical_pitch import track


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(api, 'ROOT', tmp_path / 'edits')
    app = FastAPI()
    app.include_router(api.router)
    return TestClient(app, client=('127.0.0.1', 50000))


@pytest.mark.parametrize('extension', ['wav', 'mp3', 'm4a'])
def test_import_render_export_reopen_and_undo(client, tmp_path, extension):
    rate = 24000
    time = np.arange(rate) / rate
    original = 0.2 * np.sin(2 * np.pi * 160 * time)
    wav = tmp_path / 'voice.wav'
    sf.write(wav, original, rate)
    upload = wav
    if extension != 'wav':
        upload = tmp_path / ('voice.' + extension)
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wav), str(upload)], check=True)
    response = client.post('/tools/lexical-pitch/import', files={'file': (upload.name, upload.read_bytes())})
    assert response.status_code == 200, response.text
    source = response.json()
    url = '/tools/lexical-pitch/' + source['id']
    before = client.get(source['audio_url']).content
    edited = client.post(url + '/render', json={'edits': [{'start': .1, 'end': .9, 'semitones': 4}]}).json()
    samples, rate = sf.read(io.BytesIO(client.get(edited['audio_url']).content))
    times, f0 = track(samples, rate)
    assert np.median(f0[(times > .3) & (times < .7)]) == pytest.approx(160 * 2 ** (4 / 12), rel=.03)
    assert client.get(source['audio_url']).content == before
    assert client.get(url).json()['take'] == 'source'
    undone = client.post(url + '/render', json={'edits': []}).json()
    assert client.get(undone['audio_url']).content == before
    assert list(api.ROOT.glob('*/*.json'))


def test_reject_remote_path_invalid_audio_and_invalid_edits(client):
    assert client.get('/tools/lexical-pitch/not-a-uuid').status_code == 400
    response = client.post('/tools/lexical-pitch/import', files={'file': ('x.wav', b'bad audio')})
    assert response.status_code == 422
    assert client.post('/tools/lexical-pitch/import', files={'file': ('x.txt', b'x')}).status_code == 400
    app = FastAPI(); app.include_router(api.router)
    remote = TestClient(app, client=('192.0.2.1', 1))
    assert remote.get('/tools/lexical-pitch/not-a-uuid').status_code == 403
