"""Voiceover + timing for episode 1.

Synthesises every sentence with Kokoro (local neural TTS), trims silence,
lays beats on a timeline that lasts EXACTLY script.duration seconds and
writes:
  build/voice.wav       mono 24 kHz voice track
  build/timing.json     beat start/end, sentence timings, subtitle chunks,
                        per-frame mouth envelope for on-screen speakers
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build'); os.makedirs(os.path.join(B, 'lines'), exist_ok=True)
S = json.load(open(os.path.join(HERE, 'script.json')))
TTS_DIR = os.environ.get('KOKORO_DIR', '/home/user/tts')
SPEED = float(os.environ.get('NARR_SPEED', '1.0'))
FPS = 30

k = Kokoro(os.path.join(TTS_DIR, 'kokoro-v1.0.onnx'), os.path.join(TTS_DIR, 'voices-v1.0.bin'))
SR = 24000


def trim(a, thr=0.012):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(0.02 * SR)); e = min(len(a), idx[-1] + int(0.06 * SR))
    return a[s:e]


def sentences(t):
    parts = re.split(r'(?<=[.?!])\s+', t.strip())
    return [p for p in parts if p]


def chunks(sentence, maxw=5):
    """Split into subtitle chunks of <= maxw words, preferring punctuation breaks."""
    words = sentence.split()
    out, cur = [], []
    for w in words:
        cur.append(w)
        brk = w[-1] in ',.?!;:' or w.endswith('...')
        if len(cur) >= maxw or (brk and len(cur) >= 2):
            out.append(cur); cur = []
    if cur:
        if out and len(cur) == 1 and len(out[-1]) < maxw + 1:
            out[-1] += cur
        else:
            out.append(cur)
    return out


def weight(ws):
    """Rough speaking-time weight for a chunk (chars + pause after punctuation)."""
    w = sum(len(re.sub(r'[^A-Za-z0-9]', '', x)) + 1.2 for x in ws)
    if ws[-1][-1] in ',;:':
        w += 3
    if ws[-1][-1] in '.?!':
        w += 5
    return w


beats = []
cache = os.path.join(B, 'lines')
for i, b in enumerate(S['beats']):
    voice = S['voices'][b['v']]
    sp = SPEED if b['v'] == 'N' else 1.0
    sents = []
    for j, s in enumerate(sentences(b['t'])):
        fn = os.path.join(cache, f'{i:03d}_{j}.wav')
        key = f'{voice}|{sp}|{s}'
        kf = fn + '.key'
        if os.path.exists(fn) and os.path.exists(kf) and open(kf).read() == key:
            a, _ = sf.read(fn)
        else:
            a, sr = k.create(s.replace('SAY', 'say'), voice=voice, speed=sp, lang='en-us')
            a = trim(np.asarray(a, dtype=np.float32))
            sf.write(fn, a, SR); open(kf, 'w').write(key)
        sents.append({'text': s, 'audio': a})
    beats.append({'b': b, 'sents': sents})
    print(f'{i:02d} {b["v"]:4s} {sum(len(x["audio"]) for x in sents) / SR:5.2f}s  {b["t"][:60]}', file=sys.stderr)

SENT_GAP = 0.32
speech = sum(sum(len(x['audio']) for x in bb['sents']) / SR + SENT_GAP * (len(bb['sents']) - 1) for bb in beats)

# minimum holds after each beat (before the next starts)
def base_hold(i):
    b = S['beats'][i]
    nxt = S['beats'][i + 1] if i + 1 < len(S['beats']) else None
    h = 0.35
    if b['v'] != 'N' or (nxt and nxt['v'] != 'N'):
        h = 0.25                               # snappy dialogue
    if nxt and nxt['s'] != b['s']:
        h = 0.7                                # scene change breathing room
    if b['s'] in ('card',):
        h = 0.9
    if b['s'] == 'title':
        h = 1.6
    if nxt is None:
        h = 6.0                                # end card hold
    return h

LEAD = 0.6                                     # music/sfx before first word
holds = [base_hold(i) for i in range(len(beats))]
total_min = LEAD + speech + sum(holds)
slack = S['duration'] - total_min
print(f'speech {speech:.1f}s, min total {total_min:.1f}s, slack {slack:.1f}s', file=sys.stderr)
if slack < 0:
    sys.exit('Script too long for target duration; raise NARR_SPEED')
# distribute slack: last hold (end card) gets up to 6 s more, rest spread proportionally
extra_end = min(6.0, slack * 0.2)
holds[-1] += extra_end
rest = slack - extra_end
w = [h for h in holds[:-1]]
for i in range(len(w)):
    holds[i] += rest * w[i] / sum(w)

N = int(round(S['duration'] * SR))
voice = np.zeros(N, dtype=np.float32)
t = LEAD
out = []
for i, bb in enumerate(beats):
    b = bb['b']
    start = t
    sl, subs = [], []
    for j, s in enumerate(bb['sents']):
        a = s['audio']; n = len(a)
        i0 = int(round(t * SR)); voice[i0:i0 + n] += a[:max(0, min(n, N - i0))]
        d = n / SR
        # subtitle chunks inside the sentence (time ∝ weight)
        cs = chunks(s['text'])
        ws = [weight(c) for c in cs]; tot = sum(ws); acc = t
        for c, wv in zip(cs, ws):
            cd = d * wv / tot
            subs.append({'start': round(acc, 3), 'end': round(acc + cd, 3), 'text': ' '.join(c)})
            acc += cd
        # mouth envelope (per video frame) for on-screen speakers
        env = []
        for f in range(int(d * FPS) + 1):
            seg = a[int(f * SR / FPS):int((f + 1) * SR / FPS)]
            env.append(round(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0, 4))
        sl.append({'start': round(t, 3), 'end': round(t + d, 3), 'text': s['text'], 'env': env})
        t += d + (SENT_GAP if j < len(bb['sents']) - 1 else 0)
    end = t
    t += holds[i]
    out.append({'i': i, 'start': round(start, 3), 'speechEnd': round(end, 3), 'end': round(t, 3), **b, 'sentences': sl, 'subs': subs})

# extend each subtitle to cover small gaps (no flicker) but never past the speech
for bt in out:
    for a, c in zip(bt['subs'], bt['subs'][1:]):
        a['end'] = c['start']
    if bt['subs']:
        bt['subs'][-1]['end'] = round(min(bt['end'] - 0.05, bt['speechEnd'] + 0.4), 3)

# normalise voice to -1 dBFS peak
voice *= 0.89 / max(1e-6, np.max(np.abs(voice)))
sf.write(os.path.join(B, 'voice.wav'), voice, SR)
json.dump({'fps': FPS, 'duration': S['duration'], 'title': S['title'], 'beats': out}, open(os.path.join(B, 'timing.json'), 'w'))

# .srt
def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f'{h:02d}:{m:02d}:{s:06.3f}'.replace('.', ',')
n = 1; lines = []
for bt in out:
    for c in bt['subs']:
        lines += [str(n), f'{ts(c["start"])} --> {ts(c["end"])}', c['text'], '']; n += 1
open(os.path.join(B, 'subtitles.srt'), 'w').write('\n'.join(lines))
print(f'final end {out[-1]["end"]:.3f}s  beats {len(out)}  subs {n - 1}', file=sys.stderr)
