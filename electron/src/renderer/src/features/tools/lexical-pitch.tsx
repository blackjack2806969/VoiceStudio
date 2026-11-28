import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch, apiJson, describeError } from '@/lib/api/client';

type Point = { time: number; hz: number };
type Edit = { start: number; end: number; semitones: number; tone?: string; points: Point[] };
type AudioData = {
  id: string; take: string; duration: number; sample_rate: number;
  times: number[]; f0: number[]; waveform: [number, number][];
  range_hz: [number, number]; audio_url: string;
};
const base = '/tools/lexical-pitch';
const savedKey = 'cantonese-tone-project';

export function importPitchAudio(file: Blob, name: string, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file, name);
  return apiJson<AudioData>(base + '/import', { method: 'POST', body: form, signal });
}

function renderPitch(id: string, edits: Edit[], signal?: AbortSignal) {
  return apiJson<AudioData>(`${base}/${id}/render`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edits }), signal,
  });
}

export function LexicalPitch({
  sessionId,
  showTitle = true,
  onManualOpen,
}: {
  sessionId?: string;
  showTitle?: boolean;
  onManualOpen?: () => void;
} = {}) {
  const { t } = useTranslation();
  const [source, setSource] = useState<AudioData | null>(null);
  const [audio, setAudio] = useState<AudioData | null>(null);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0.5);
  const [shift, setShift] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(Boolean(sessionId));
  const [beforeUrl, setBeforeUrl] = useState('');
  const [afterUrl, setAfterUrl] = useState('');
  const active = useRef(false);
  const drag = useRef<{ anchor: number; point?: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const setProject = useCallback((original: AudioData, edited: AudioData, next: Edit[]) => {
    setSource(original); setAudio(edited); setEdits(next); setPoints([]);
    setStart(0); setEnd(Math.min(0.5, original.duration)); setShift(0); setZoom(1);
    localStorage.setItem(savedKey, JSON.stringify({ id: original.id, edits: next }));
  }, []);

  const reopen = useCallback(async (id?: string, signal?: AbortSignal) => {
    const saved = JSON.parse(localStorage.getItem(savedKey) || 'null');
    const target = id ?? saved?.id;
    if (!target) return;
    const original = await apiJson<AudioData>(`${base}/${encodeURIComponent(target)}`, { signal });
    const next: Edit[] = saved?.id === target ? saved.edits : [];
    const edited = next.length ? await renderPitch(original.id, next, signal) : original;
    if (!signal?.aborted) setProject(original, edited, next);
  }, [setProject]);

  useEffect(() => {
    if (!sessionId) return;
    setBusy(true);
    setError('');
    const request = new AbortController();
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]);
    void reopen(sessionId, signal)
      .catch(error => { if (!request.signal.aborted) setError(describeError(error)); })
      .finally(() => { if (!request.signal.aborted) setBusy(false); });
    return () => request.abort();
  }, [reopen, sessionId]);

  useEffect(() => {
    let disposed = false;
    let before = ''; let after = '';
    setBeforeUrl(''); setAfterUrl('');
    if (source && audio) {
      void Promise.all([apiFetch(source.audio_url), apiFetch(audio.audio_url)])
        .then(async responses => Promise.all(responses.map(r => r.blob())))
        .then(([a, b]) => {
          if (disposed) return;
          before = URL.createObjectURL(a); after = URL.createObjectURL(b);
          setBeforeUrl(before); setAfterUrl(after);
        }).catch(e => { if (!disposed) setError(describeError(e)); });
    }
    return () => { disposed = true; URL.revokeObjectURL(before); URL.revokeObjectURL(after); };
  }, [source, audio]);

  async function run(work: () => Promise<void>) {
    if (active.current) return;
    active.current = true; setBusy(true); setError('');
    try { await work(); } catch (e) { setError(describeError(e)); }
    finally { active.current = false; setBusy(false); }
  }
  async function render(id: string, next: Edit[]) {
    const data = await renderPitch(id, next);
    setAudio(data); setEdits(next); setPoints([]);
    localStorage.setItem(savedKey, JSON.stringify({ id, edits: next }));
  }
  const valid = audio && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end <= audio.duration && end - start >= 0.04 && Number.isFinite(shift) && Math.abs(shift) <= 12;
  function apply(tone?: string) {
    if (!valid || !source) return;
    void run(() => render(source.id, [...edits, { start, end, semitones: shift, tone, points: tone ? [] : points }]));
  }
  const duration = audio?.duration || 1;
  const high = 600;
  const x = (time: number) => time / duration * 1000;
  const y = (hz: number) => 285 - (Math.log2(hz / 60) / Math.log2(high / 60)) * 160;
  function position(event: React.PointerEvent) {
    const rect = svg.current!.getBoundingClientRect();
    return {
      time: Math.max(0, Math.min(duration, (event.clientX - rect.left) / rect.width * duration)),
      hz: Math.max(60, Math.min(600, 60 * 2 ** ((285 - (event.clientY - rect.top) / rect.height * 310) / 160 * Math.log2(high / 60)))),
    };
  }
  function updatePoint(index: number, hz: number) {
    setPoints(current => current.map((p, i) => i === index ? { ...p, hz: Math.round(hz) } : p));
  }
  return <div className="mx-auto max-w-5xl space-y-5">
    {showTitle && <h2 className="text-lg font-medium">{t('tone.title')}</h2>}
    <p className="text-sm text-muted-foreground">{t('tone.help')}</p>
    <div className="flex flex-wrap gap-3">
      <label className="space-y-1 text-sm">{t('tone.import')}
        <Input type="file" accept=".wav,.mp3,.m4a" disabled={busy} onChange={event => {
          const file = event.target.files?.[0]; if (!file) return;
          void run(async () => {
            const data = await importPitchAudio(file, file.name);
            setProject(data, data, []);
            onManualOpen?.();
          });
        }} />
      </label>
      <Button variant="outline" disabled={busy} onClick={() => void run(async () => {
        await reopen();
        onManualOpen?.();
      })}>{t('tone.restore')}</Button>
    </div>
    {audio && <>
      <label className="flex items-center gap-3 text-sm">{t('tone.zoom')}
        <input aria-label={t('tone.zoom')} type="range" min="1" max="8" step="0.5" value={zoom} onChange={e => setZoom(Number(e.target.value))} />{zoom}×
      </label>
      <div className="overflow-x-auto rounded-lg border">
        <svg ref={svg} viewBox="0 0 1000 310" preserveAspectRatio="none" style={{ width: `${zoom * 100}%`, height: 310, touchAction: 'none' }}
          role="img" aria-label={t('tone.graph')}
          onPointerDown={event => {
            if (busy) return;
            const p = position(event);
            const point = (event.target as Element).getAttribute('data-point');
            drag.current = { anchor: p.time, ...(point !== null ? { point: Number(point) } : {}) };
            event.currentTarget.setPointerCapture(event.pointerId);
            if (point === null) { setStart(p.time); setEnd(p.time); setPoints([]); }
          }}
          onPointerMove={event => {
            if (!drag.current) return;
            const p = position(event);
            if (drag.current.point !== undefined) updatePoint(drag.current.point, p.hz);
            else { setStart(Math.min(drag.current.anchor, p.time)); setEnd(Math.max(drag.current.anchor, p.time)); }
          }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <rect x={x(start)} y="0" width={Math.max(0, x(end - start))} height="310" fill="currentColor" opacity="0.08" />
          <path d={audio.waveform.map(([lo, hi], i) => `M${i / audio.waveform.length * 1000},${55 - hi * 48}V${55 - lo * 48}`).join(' ')} stroke="currentColor" opacity="0.6" />
          {[100, 200, 300].map(hz => <g key={hz}><path d={`M0,${y(hz)}H1000`} stroke="currentColor" opacity="0.12" /><text x="4" y={y(hz) - 3} fill="currentColor" fontSize="11">{hz} Hz</text></g>)}
          <path d={audio.times.map((time, i) => audio.f0[i] > 0 ? `${i && audio.f0[i - 1] > 0 ? 'L' : 'M'}${x(time)},${y(audio.f0[i])}` : '').join(' ')} stroke="#0d9488" fill="none" strokeWidth="2" />
          {points.length > 0 && <path d={points.map((p, i) => `${i ? 'L' : 'M'}${x(p.time)},${y(p.hz)}`).join(' ')} stroke="#d97706" fill="none" strokeWidth="2" />}
          {points.map((p, i) => <circle key={i} data-point={i} cx={x(p.time)} cy={y(p.hz)} r="7" fill="#d97706" style={{ cursor: 'ns-resize' }} />)}
          <text x="4" y="305" fontSize="11" fill="currentColor">0 s</text><text x="930" y="305" fontSize="11" fill="currentColor">{duration.toFixed(2)} s</text>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(['start', 'end', 'shift'] as const).map(key => <label className="text-sm" key={key}>{t('tone.' + key)}
          <Input type="number" step="0.01" value={key === 'start' ? start : key === 'end' ? end : shift} disabled={busy}
            onChange={e => { const value = Number(e.target.value); if (key === 'start') { setStart(value); setPoints([]); } else if (key === 'end') { setEnd(value); setPoints([]); } else setShift(value); }} />
        </label>)}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('tone.presets')}>
        {['55', '25', '33', '21', '23', '22'].map(tone => <Button key={tone} variant="outline" disabled={busy || !valid || edits.length >= 50} onClick={() => apply(tone)}>{tone}</Button>)}
        <Button variant="outline" disabled={busy || !valid} onClick={() => {
          const hz = Math.sqrt(audio.range_hz[0] * audio.range_hz[1]);
          setPoints([0, 0.5, 1].map(f => ({ time: start + f * (end - start), hz: Math.round(hz) })));
        }}>{t('tone.points')}</Button>
        <Button disabled={busy || !valid || edits.length >= 50} onClick={() => apply()}>{t('tone.apply')}</Button>
        <Button variant="outline" disabled={busy || !edits.length} onClick={() => void run(() => render(audio.id, edits.slice(0, -1)))}>{t('tone.undo')}</Button>
      </div>
      {points.map((p, i) => <label key={i} className="inline-block w-1/3 px-1 text-sm">{t('tone.point')} {i + 1} ({p.time.toFixed(2)} s)
        <Input aria-label={`${t('tone.point')} ${i + 1} Hz`} type="number" min="60" max="600" value={p.hz} disabled={busy} onChange={e => updatePoint(i, Number(e.target.value))} />
      </label>)}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="mb-2 text-sm">{t('tone.before')}</p><audio aria-label={t('tone.before')} controls src={beforeUrl || undefined} className="w-full" /></div>
        <div><p className="mb-2 text-sm">{t('tone.after')}</p><audio aria-label={t('tone.after')} controls src={afterUrl || undefined} className="w-full" /></div>
      </div>
      {afterUrl && <a className="text-sm underline" href={afterUrl} download="cantonese-edited.wav">{t('tone.export')}</a>}
    </>}
    {busy && <p role="status">{t('common.loading')}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
