"""Procedural score + sound effects + voice mix for EP01 (all original, no samples).

Reads build/timing.json + build/voice.wav, writes build/mix.wav (48 kHz stereo).
"""
import json, os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
T = json.load(open(os.path.join(B, 'timing.json')))
SR = 48000
DUR = T['duration']
N = int(DUR * SR)
rng = np.random.default_rng(11)
beats = T['beats']


def movavg(x, k):
    c = np.cumsum(np.concatenate([[0.0], x]))
    h = k // 2
    idx = np.arange(len(x))
    a = np.clip(idx - h, 0, len(x)); b = np.clip(idx + h, 0, len(x))
    return (c[b] - c[a]) / np.maximum(1, b - a)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def tt(d):
    return np.arange(int(round(d * SR))) / SR


def add(buf, sig, t0, gain=1.0):
    i0 = int(t0 * SR)
    if i0 >= len(buf):
        return
    if i0 < 0:
        sig = sig[-i0:]; i0 = 0
    n = min(len(sig), len(buf) - i0)
    buf[i0:i0 + n] += sig[:n] * gain


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ instruments
def pluck(freq, d=0.6, bright=1.0):
    t = tt(d)
    s = np.sin(2 * np.pi * freq * t) + 0.5 * bright * np.sin(4 * np.pi * freq * t) + 0.25 * bright * np.sin(6 * np.pi * freq * t)
    return s * np.exp(-t * 6) * np.minimum(1, t * 400)


def keys(freq, d=1.5):
    t = tt(d)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 3) + 0.15 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 5)
    return s * np.exp(-t * 2.2) * np.minimum(1, t * 300)


def pad(freqs, d, cutoff=1800):
    t = tt(d)
    s = np.zeros_like(t)
    for fq in freqs:
        for det in (-0.12, 0.0, 0.11):
            ph = rng.random() * 6.28
            f2 = fq * 2 ** (det / 12)
            s += 2 * ((f2 * t + ph / 6.28) % 1) - 1      # saw
    s = lp(s / (3 * len(freqs)), cutoff)
    a = np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8)
    return s * a


def kick(d=0.4):
    t = tt(d)
    fr = 45 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 9)


def hat(d=0.06):
    return hp(rng.standard_normal(len(tt(d))), 7000) * np.exp(-tt(d) * 60)


def heartbeat():
    s = np.zeros(int(0.9 * SR))
    for off, g in ((0, 1.0), (0.22, 0.7)):
        t = tt(0.25); th = np.sin(2 * np.pi * (40 + 30 * np.exp(-t * 25)) * t) * np.exp(-t * 18)
        add(s, th, off, g)
    return s


# ------------------------------------------------------------------ mood stems
BPM = 96
BEAT = 60 / BPM
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]       # Am F C G
PROG_DARK = [(45, [45, 48, 52]), (44, [44, 48, 51]), (41, [41, 45, 48]), (40, [40, 44, 47])]   # Am Ab F E
PROG_WARM = [(48, [48, 52, 55, 59]), (53, [53, 57, 60, 64]), (45, [45, 48, 52, 55]), (50, [50, 53, 57, 60])]

def stem_curious():
    s = np.zeros(N)
    bar = 4 * BEAT
    nb = int(DUR / bar) + 1
    for b in range(nb):
        t0 = b * bar
        root, ch = PROG[b % 4]
        add(s, pad([mtof(n) for n in ch], bar + 0.8, 1400), t0, 0.22)
        add(s, np.sin(2 * np.pi * mtof(root - 12) * tt(bar)) * np.minimum(1, (bar - tt(bar)) / 0.1) * 0.5, t0, 0.35)
        pat = [0, 2, 1, 2, 0, 2, 1, 3]
        for i in range(8):
            n = ch[pat[i] % len(ch)] + (12 if pat[i] == 3 else 12)
            add(s, pluck(mtof(n), 0.5), t0 + i * BEAT / 2, 0.16)
        for i in range(4):
            add(s, kick(), t0 + i * BEAT, 0.28 if i % 2 == 0 else 0.0)
            add(s, hat(), t0 + i * BEAT + BEAT / 2, 0.08)
    return s


def stem_dark():
    s = np.zeros(N)
    bar = 4 * BEAT * 2
    for b in range(int(DUR / bar) + 1):
        root, ch = PROG_DARK[b % 4]
        add(s, pad([mtof(n - 12) for n in ch], bar + 1.0, 700), b * bar, 0.35)
        for i in range(8):
            add(s, np.sin(2 * np.pi * mtof(root - 24) * tt(0.5)) * np.exp(-tt(0.5) * 5), b * bar + i * BEAT, 0.35)
    for t0 in np.arange(0, DUR, 1.0):
        add(s, heartbeat(), t0, 0.5)
    return s


def stem_eerie():
    s = np.zeros(N)
    t = np.arange(N) / SR
    for fq, g in ((110, 0.2), (116.5, 0.15), (164.8, 0.12), (233, 0.08)):
        s += g * np.sin(2 * np.pi * fq * t + 3 * np.sin(2 * np.pi * 0.07 * t))
    s += 0.08 * bp(rng.standard_normal(N), 800, 2400) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t))
    for t0 in np.arange(0, DUR, 2.3):    # glassy random tones
        add(s, keys(mtof(72 + rng.integers(0, 12)), 2.0), t0, 0.06)
    return s


def stem_warm():
    s = np.zeros(N)
    bar = 4 * BEAT * 1.5
    for b in range(int(DUR / bar) + 1):
        root, ch = PROG_WARM[b % 4]
        add(s, pad([mtof(n) for n in ch], bar + 1.2, 1100), b * bar, 0.2)
        for i, n in enumerate(ch):
            add(s, keys(mtof(n + 12), 2.5), b * bar + i * 0.45, 0.12)
    return s


def stem_upbeat():
    s = np.zeros(N)
    bar = 4 * (60 / 118)
    bt = 60 / 118
    for b in range(int(DUR / bar) + 1):
        t0 = b * bar
        root, ch = PROG_WARM[(b * 3) % 4]
        add(s, pad([mtof(n) for n in ch], bar + 0.5, 2200), t0, 0.15)
        for i in range(8):
            add(s, pluck(mtof(ch[i % len(ch)] + 12), 0.4, 1.3), t0 + i * bt / 2, 0.14)
        for i in range(4):
            add(s, kick(), t0 + i * bt, 0.32)
            add(s, hat(), t0 + i * bt + bt / 2, 0.1)
    return s


def stem_vintage():
    s = np.zeros(N)
    bar = 4 * BEAT * 1.25
    for b in range(int(DUR / bar) + 1):
        root, ch = PROG[(b + 2) % 4]
        for i, n in enumerate([ch[0], ch[1], ch[2], ch[1]]):
            add(s, keys(mtof(n), 1.6), b * bar + i * bar / 4, 0.16)
        add(s, keys(mtof(root - 12), 3), b * bar, 0.14)
    crackle = np.zeros(N)
    idx = rng.integers(0, N, int(DUR * 30))
    crackle[idx] = rng.standard_normal(len(idx)) * 0.5
    s += hp(crackle, 2000) * 0.5 + 0.01 * lp(rng.standard_normal(N), 3000)
    return lp(s, 4500)


SCENE_MOOD = {'haunt': 'dark', 'title': 'dark', 'flash': 'vintage', 'room': 'curious', 'card': 'curious', 'brain': 'curious',
              'car': 'curious', 'kitchen': 'curious', 'lab': 'curious', 'halluc': 'eerie', 'info': 'dark', 'arcade': 'upbeat',
              'bed': 'warm', 'city': 'dark', 'phone': 'eerie', 'outro': 'upbeat'}
moods = ['curious', 'dark', 'eerie', 'warm', 'upbeat', 'vintage']
print('synth stems...')
stems = {m: globals()['stem_' + m]() for m in moods}
for m in moods:
    stems[m] /= max(1e-6, np.max(np.abs(stems[m])))

# mood gain envelopes (crossfade 0.8 s)
env = {m: np.zeros(N) for m in moods}
for i, b in enumerate(beats):
    m = SCENE_MOOD.get(b['s'], 'curious')
    if b['s'] == 'room' and b.get('a') in ('paranoid', 'paranoid2', 'amygdala'):
        m = 'eerie'
    if b['s'] == 'room' and b.get('a') == 'party':
        m = 'upbeat'
    if b['s'] == 'bed' and b.get('a') == 'twist':
        m = 'dark'
    t0 = 0 if i == 0 else b['start']
    env[m][int(t0 * SR):int(b['end'] * SR)] = 1.0
k = int(0.8 * SR)
kern = np.ones(k) / k
music = np.zeros(N)
for m in moods:
    e = movavg(env[m], k)
    music += stems[m] * e
# hard stop on the title impact for drama, music swells into outro
# ------------------------------------------------------------------ SFX
sfx = np.zeros(N)

def s_whoosh(d=0.6):
    t = tt(d); n = rng.standard_normal(len(t))
    out = np.zeros_like(t); seg = len(t) // 12
    for j in range(12):  # sweep band upward
        lo = 300 + j * 250; part = bp(n[j * seg:(j + 1) * seg + 1], lo, lo * 2.2)
        out[j * seg:j * seg + len(part)] += part
    return out * np.sin(np.pi * t / d) ** 2 * 1.4

def s_boom():
    t = tt(2.5)
    return (np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 4)) / SR) * np.exp(-t * 1.6) + 0.5 * lp(rng.standard_normal(len(t)), 300) * np.exp(-t * 3))

def s_impact():
    t = tt(1.6)
    return np.sin(2 * np.pi * np.cumsum(40 + 120 * np.exp(-t * 20)) / SR) * np.exp(-t * 3) + 0.4 * lp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 8)

def s_riser(d=1.4):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros_like(t); seg = len(t) // 14
    for j in range(14):
        lo = 200 * 1.25 ** j; part = bp(n[j * seg:(j + 1) * seg + 1], lo, min(lo * 2, 20000))
        out[j * seg:j * seg + len(part)] += part
    return out * (t / d) ** 2 + 0.3 * np.sin(2 * np.pi * np.cumsum(200 + 600 * (t / d) ** 2) / SR) * (t / d)

def s_glitch():
    out = np.zeros(int(0.45 * SR))
    for j in range(9):
        L = int(rng.uniform(0.02, 0.06) * SR); st = int(rng.uniform(0, 0.4) * SR)
        sq = np.sign(np.sin(2 * np.pi * rng.uniform(200, 1500) * np.arange(L) / SR))
        add(out, sq * 0.4 + 0.4 * rng.standard_normal(L), st / SR)
    return out

def s_tick(n=4):
    out = np.zeros(int(n * 0.5 * SR))
    for j in range(n):
        add(out, bp(rng.standard_normal(int(0.02 * SR)), 2000, 6000) * np.exp(-tt(0.02) * 200), j * 0.5, 1.0 if j % 2 == 0 else 0.7)
    return out

def s_stamp():
    t = tt(0.4)
    return np.sin(2 * np.pi * 90 * t) * np.exp(-t * 20) + 0.6 * lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 40)

def s_horn():
    t = tt(0.7); s = 0.5 * np.sign(np.sin(2 * np.pi * 415 * t)) + 0.5 * np.sign(np.sin(2 * np.pi * 523 * t))
    return lp(s, 2500) * np.minimum(1, t * 50) * np.minimum(1, (0.7 - t) * 30) * 0.6

def s_ding():
    t = tt(2.0)
    return (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 3) * 0.5

def s_pop():
    t = tt(0.25)
    return np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t * 15) + 200) / SR) * np.exp(-t * 25)

def s_sob():
    t = tt(1.0)
    return np.sin(2 * np.pi * np.cumsum(330 - 120 * t) / SR) * np.exp(-t * 2) * 0.3

def s_arcade(d):
    out = np.zeros(len(tt(d)))
    for j in np.arange(0, d, 0.11):
        f0 = 440 * 2 ** (rng.integers(0, 12) / 12)
        add(out, np.sign(np.sin(2 * np.pi * f0 * tt(0.06))) * np.exp(-tt(0.06) * 30) * 0.25, j)
    return out

def ambience(kind, d):
    t = tt(d)
    if kind == 'engine':
        return lp(rng.standard_normal(len(t)), 180) * 2.5 + 0.3 * np.sin(2 * np.pi * 42 * t)
    if kind == 'fridge':
        return 0.25 * np.sin(2 * np.pi * 60 * t) + 0.12 * np.sin(2 * np.pi * 120 * t) + 0.3 * lp(rng.standard_normal(len(t)), 400)
    if kind == 'projector':
        out = np.zeros(len(t))
        for j in np.arange(0, d, 1 / 24):
            add(out, bp(rng.standard_normal(int(0.008 * SR)), 1500, 5000), j, 0.6)
        return out
    return np.zeros(len(t))

ONE = {'whoosh': (s_whoosh, 0.35), 'boom': (s_boom, 0.7), 'impact': (s_impact, 0.55), 'glitch': (s_glitch, 0.35), 'tick': (s_tick, 0.35),
       'stamp': (s_stamp, 0.5), 'horn': (s_horn, 0.55), 'ding': (s_ding, 0.35), 'sob': (s_sob, 0.25), 'confetti': (s_pop, 0.5), 'heart': (heartbeat, 0.0)}
prev_scene = None
for i, b in enumerate(beats):
    cues = list(b.get('sfx', []))
    if b['s'] != prev_scene and i > 0 and 'whoosh' not in cues and b['s'] not in ('card', 'title'):
        cues.append('whoosh')
    prev_scene = b['s']
    st = 0 if i == 0 else b['start']
    for cue in cues:
        if cue == 'riser':
            add(sfx, s_riser(), st - 1.4, 0.35); continue
        if cue == 'heart':
            for j in range(int((b['end'] - st) / 0.85)):
                add(sfx, heartbeat(), st + j * 0.85, 0.6)
            continue
        if cue in ('engine', 'fridge', 'projector', 'arcade', 'drone'):
            # ambience for the rest of the scene run
            end = b['end']
            for b2 in beats[i + 1:]:
                if b2['s'] != b['s']:
                    break
                end = b2['end']
            d = end - st
            if cue == 'arcade':
                add(sfx, s_arcade(d), st, 0.12)
            elif cue == 'drone':
                add(sfx, lp(rng.standard_normal(len(tt(d))), 120) * np.minimum(1, tt(d) / 1.5) * 1.5, st, 0.3)
            else:
                a = ambience(cue, d); fade = np.minimum(1, np.minimum(tt(d) / 0.5, (d - tt(d)) / 0.5))
                add(sfx, a * fade, st, {'engine': 0.18, 'fridge': 0.12, 'projector': 0.12}[cue])
            continue
        if cue in ONE:
            fn, g = ONE[cue]
            add(sfx, fn(), st, g)

# card ticks get a soft pop on the number reveal
for b in beats:
    if b['s'] == 'card':
        add(sfx, s_pop(), b['start'] + 0.05, 0.25)

# ------------------------------------------------------------------ voice + ducking
v, vsr = sf.read(os.path.join(B, 'voice.wav'))
v = resample_poly(v, SR, vsr)[:N]
v = np.pad(v, (0, N - len(v)))
# gentle presence EQ + compression for the voice
v = v + 0.25 * bp(v, 2500, 6000)
venv = np.sqrt(movavg(v ** 2, int(0.05 * SR)))
talking = (venv > 0.02).astype(float)
# attack 60 ms / release 400 ms smoothing of the duck control
duck = np.zeros(N); a_up, a_dn = 1 / (0.06 * SR), 1 / (0.4 * SR); cur = 0.0
tk = talking
# vectorised-ish one-pole (chunked for speed)
step = 240
for j in range(0, N, step):
    tgt = tk[j]
    cur += (tgt - cur) * (min(1, a_up * step) if tgt > cur else min(1, a_dn * step))
    duck[j:j + step] = cur
music_gain = 0.32 * (1 - 0.62 * duck)
# louder music where there is no narration (title, card holds, outro tail)
mix_mono_music = music * music_gain
sfx_l = sfx * 0.9

# stereo: music slightly widened with a short delay, voice centred
d = int(0.012 * SR)
ml = mix_mono_music
mr = np.concatenate([np.zeros(d), mix_mono_music[:-d]])
L = v * 0.95 + ml + sfx_l
R = v * 0.95 + mr * 0.95 + sfx_l
# fade in/out
fi = np.minimum(1, np.arange(N) / (0.3 * SR)); fo = np.minimum(1, (N - np.arange(N)) / (2.5 * SR))
L *= fi * fo; R *= fi * fo
st = np.stack([L, R], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)          # soft limiter
st *= 0.95 / np.max(np.abs(st))
sf.write(os.path.join(B, 'mix_raw.wav'), st.astype(np.float32), SR)
print('mix written', st.shape[0] / SR, 's')
