"""Voices + timing for EP03 (adapted from EP01's tts.py).

Every character speaks with its own Kokoro voice. Writes:
  build/voice.wav      spoken dialogue (mono 24 kHz)
  build/thoughts.wav   thought lines (dry; audio.py adds the echo "inner voice")
  build/timing.json    beats, sentence timings, subtitle chunks, per-frame mouth envelopes
  build/subtitles.srt
Total length is EXACTLY script.duration seconds.
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build'); os.makedirs(os.path.join(B, 'lines'), exist_ok=True)
S = json.load(open(os.path.join(HERE, 'script.json')))
TTS_DIR = os.environ.get('KOKORO_DIR', '/home/user/tts')
FPS = 30
SR = 24000
k = Kokoro(os.path.join(TTS_DIR, 'kokoro-v1.0.onnx'), os.path.join(TTS_DIR, 'voices-v1.0.bin'))


def trim(a, thr=0.012):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(0.02 * SR)); e = min(len(a), idx[-1] + int(0.06 * SR))
    return a[s:e]


def sentences(t):
    return [p for p in re.split(r'(?<=[.?!])\s+(?=["A-Z])', t.strip()) if p]


def speakable(s):
    # Kokoro spells out ALL-CAPS words; keep the emphasis for subtitles only
    out = []
    for w in s.split(' '):
        core = re.sub(r'[^A-Za-z]', '', w)
        out.append(w.lower() if len(core) > 1 and core.isupper() else w)
    return ' '.join(out).replace('—', '...')


def chunks(sentence, maxw=6):
    words = sentence.split()
    out, cur = [], []
    for w in words:
        cur.append(w)
        brk = w[-1] in ',.?!;:—' or w.endswith('...')
        if len(cur) >= maxw or (brk and len(cur) >= 2):
            out.append(cur); cur = []
    if cur:
        if out and len(cur) == 1 and len(out[-1]) < maxw + 1:
            out[-1] += cur
        else:
            out.append(cur)
    return out


def weight(ws):
    w = sum(len(re.sub(r'[^A-Za-z0-9]', '', x)) + 1.2 for x in ws)
    if ws[-1][-1] in ',;:': w += 3
    if ws[-1][-1] in '.?!': w += 5
    return w


def synth(voice, text, cache_key):
    fn = os.path.join(B, 'lines', cache_key + '.wav')
    key = f'{voice}|{text}'
    kf = fn + '.key'
    if os.path.exists(fn) and os.path.exists(kf) and open(kf).read() == key:
        a, _ = sf.read(fn)
        return np.asarray(a, dtype=np.float32)
    lang = 'en-gb' if voice.startswith('b') else 'en-us'
    a, _ = k.create(speakable(text), voice=voice, speed=1.0, lang=lang)
    a = trim(np.asarray(a, dtype=np.float32))
    sf.write(fn, a, SR); open(kf, 'w').write(key)
    return a


beats = []
for i, b in enumerate(S['beats']):
    if not b.get('v'):
        beats.append({'b': b, 'sents': [], 'chorus': []})
        continue
    voice = S['voices'][b['v']]
    sents = [{'text': s, 'audio': synth(voice, s, f'{i:03d}_{j}_{b["v"]}')} for j, s in enumerate(sentences(b['t']))]
    chorus = []
    for cv in b.get('chorus', []):
        chorus.append({'v': cv, 'audio': synth(S['voices'][cv], b['t'], f'{i:03d}_c_{cv}')})
    beats.append({'b': b, 'sents': sents, 'chorus': chorus})
    print(f'{i:03d} {b["v"]:5s} {"T" if b.get("mode") == "think" else " "} {sum(len(x["audio"]) for x in sents) / SR:5.2f}s  {b["t"][:60]}', file=sys.stderr)

SENT_GAP = 0.3


def blen(bb):
    if not bb['sents']:
        return bb['b']['dur']
    return sum(len(x['audio']) for x in bb['sents']) / SR + SENT_GAP * (len(bb['sents']) - 1)


speech = sum(blen(bb) for bb in beats)


def base_hold(i):
    b = S['beats'][i]
    nxt = S['beats'][i + 1] if i + 1 < len(S['beats']) else None
    if nxt is None:
        return 5.0                            # end card
    if b['s'] == 'hook':
        return 0.05                           # hook: rapid-fire, under 10 s
    if b['s'] == 'title' or (nxt and nxt['s'] != b['s']):
        return 0.7                            # scene change breathing room
    if not b.get('v'):
        return 0.15                           # action beats flow straight on
    if b.get('mode') == 'think' and nxt.get('mode') == 'think':
        return 0.05                           # overlapping crowd of thoughts
    return 0.35                               # natural turn-taking


LEAD = 0.25
holds = [base_hold(i) for i in range(len(beats))]
total_min = LEAD + speech + sum(holds)
slack = S['duration'] - total_min
print(f'speech+actions {speech:.1f}s, min total {total_min:.1f}s, slack {slack:.1f}s', file=sys.stderr)
if slack < 0:
    sys.exit('Script too long for target duration')
extra_end = min(4.0, slack * 0.1)
holds[-1] += extra_end
rest = slack - extra_end
w = holds[:-1]
for i in range(len(w)):
    if S['beats'][i]['s'] != 'hook':
        holds[i] += rest * w[i] / sum(w[j] for j in range(len(w)) if S['beats'][j]['s'] != 'hook')

N = int(round(S['duration'] * SR))
voice = np.zeros(N, dtype=np.float32)
thoughts = np.zeros(N, dtype=np.float32)


def env_of(a, d):
    env = []
    for f in range(int(d * FPS) + 1):
        seg = a[int(f * SR / FPS):int((f + 1) * SR / FPS)]
        env.append(round(float(np.sqrt(np.mean(seg ** 2))) if len(seg) else 0.0, 4))
    return env


t = LEAD
out = []
for i, bb in enumerate(beats):
    b = bb['b']
    start = t
    sl, subs, ch = [], [], []
    dst = thoughts if b.get('mode') == 'think' else voice
    for j, s in enumerate(bb['sents']):
        a = s['audio']; n = len(a)
        i0 = int(round(t * SR)); dst[i0:i0 + n] += a[:max(0, min(n, N - i0))]
        d = n / SR
        cs = chunks(s['text'])
        ws = [weight(c) for c in cs]; tot = sum(ws); acc = t
        for c, wv in zip(cs, ws):
            cd = d * wv / tot
            subs.append({'start': round(acc, 3), 'end': round(acc + cd, 3), 'text': ' '.join(c)})
            acc += cd
        sl.append({'start': round(t, 3), 'end': round(t + d, 3), 'text': s['text'], 'env': env_of(a, d)})
        t += d + (SENT_GAP if j < len(bb['sents']) - 1 else 0)
    for c in bb['chorus']:
        a = c['audio']; i0 = int(round((start + 0.03) * SR))
        voice[i0:i0 + len(a)] += a[:max(0, min(len(a), N - i0))] * 0.9
        ch.append({'v': c['v'], 'start': round(start + 0.03, 3), 'end': round(start + 0.03 + len(a) / SR, 3), 'env': env_of(a, len(a) / SR)})
    if not bb['sents']:
        t += b['dur']
    end = t
    t += holds[i]
    out.append({'i': i, 'start': round(start, 3), 'speechEnd': round(end, 3), 'end': round(t, 3), **b,
                'sentences': sl, 'subs': subs, 'choirs': ch})

for bt in out:
    for a, c in zip(bt['subs'], bt['subs'][1:]):
        a['end'] = c['start']
    if bt['subs']:
        bt['subs'][-1]['end'] = round(min(bt['end'] - 0.05, bt['speechEnd'] + 0.45), 3)
        if bt.get('mode') == 'think':  # overlapping thoughts: keep each on screen a little
            bt['subs'][-1]['end'] = round(max(bt['subs'][-1]['end'], bt['speechEnd'] + 0.2), 3)

pk = max(np.max(np.abs(voice)), np.max(np.abs(thoughts)), 1e-6)
sf.write(os.path.join(B, 'voice.wav'), voice * 0.89 / pk, SR)
sf.write(os.path.join(B, 'thoughts.wav'), thoughts * 0.89 / pk, SR)
json.dump({'fps': FPS, 'duration': S['duration'], 'title': S['title'], 'names': S['names'], 'signs': S.get('signs', {}), 'beats': out},
          open(os.path.join(B, 'timing.json'), 'w'))


def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f'{h:02d}:{m:02d}:{s:06.3f}'.replace('.', ',')


n = 1; lines = []
for bt in out:
    for j, c in enumerate(bt['subs']):
        txt = c['text']
        if j == 0:
            name = S['names'][bt['v']].title() if bt['v'] != 'N' else 'Narrator'
            if bt.get('chorus'):
                name = 'Everyone'
            txt = (f'<i>{name} (thinking): {txt}' if bt.get('mode') == 'think' else f'{name}: {txt}')
        elif bt.get('mode') == 'think':
            txt = '<i>' + txt
        if bt.get('mode') == 'think':
            txt += '</i>'
        lines += [str(n), f'{ts(c["start"])} --> {ts(c["end"])}', txt, '']; n += 1
open(os.path.join(B, 'subtitles.srt'), 'w').write('\n'.join(lines))
print(f'final end {out[-1]["end"]:.3f}s  beats {len(out)}  subs {n - 1}', file=sys.stderr)
