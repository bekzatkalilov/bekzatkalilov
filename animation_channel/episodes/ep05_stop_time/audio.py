"""Procedural score + sound effects + voice mix for EP05 (adapted from EP04; all original, no samples).

Reads build/timing.json, build/voice.wav, build/masked.wav; writes build/mix_raw.wav (48 kHz stereo).
The hooded stranger (masked.wav) gets an eerie chorus/echo "time voice". Music mood follows each beat's `m` field;
while time is frozen (beat z = 1) the score is muffled and slowed into an icy pad.
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


def stem_magic():
    s = np.zeros(N)
    for t0 in np.arange(0, DUR, 0.18):
        n = [72, 76, 79, 83, 84, 88][int(t0 / 0.18) % 6]
        add(s, keys(mtof(n), 1.2), t0, 0.07)
    bar = 4 * BEAT * 2
    for b in range(int(DUR / bar) + 1):
        add(s, pad([mtof(n) for n in (60, 64, 67, 71)], bar + 1.0, 2400), b * bar, 0.22)
    return s


def stem_comedic():
    s = np.zeros(N)
    bt = 60 / 132
    bar = 4 * bt
    walk = [0, 4, 7, 9, 7, 4, 2, -1]
    for b in range(int(DUR / bar) + 1):
        root, ch = PROG_WARM[(b * 3 + 1) % 4]
        for i in range(8):
            add(s, pluck(mtof(root - 12 + walk[i]), 0.22, 0.6), b * bar + i * bt / 2, 0.3)
            if i % 2 == 1:
                add(s, pluck(mtof(ch[(i // 2) % len(ch)] + 12), 0.15, 1.4), b * bar + i * bt / 2, 0.14)
        add(s, kick(), b * bar, 0.2); add(s, hat(), b * bar + 2 * bt, 0.12)
    return s


def stem_sad():
    s = np.zeros(N)
    bar = 4 * (60 / 70)
    prog = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]
    for b in range(int(DUR / bar) + 1):
        root, ch = prog[b % 4]
        add(s, pad([mtof(n - 12) for n in ch], bar + 1.0, 900), b * bar, 0.18)
        for i, n in enumerate([ch[0], ch[2], ch[1], ch[2]]):
            add(s, keys(mtof(n + 12), 2.2), b * bar + i * bar / 4, 0.12)
    return s


def stem_urgent():
    s = np.zeros(N)
    bt = 60 / 144
    for i, t0 in enumerate(np.arange(0, DUR, bt / 2)):
        root, ch = PROG_DARK[(i // 16) % 4]
        add(s, pluck(mtof(root - 12 + (12 if i % 4 == 2 else 0)), 0.18, 0.5), t0, 0.32)
        if i % 2 == 0:
            add(s, kick(), t0, 0.25 if i % 4 == 0 else 0.0)
        add(s, hat(), t0, 0.06)
    return s


def stem_chaos():
    s = stem_dark() * 0.7 + stem_eerie() * 0.6
    t = np.arange(N) / SR
    s += 0.06 * np.sign(np.sin(2 * np.pi * 220 * t)) * (np.sin(2 * np.pi * 3.1 * t) > 0.7)
    return s


MOODS = ['curious', 'dark', 'eerie', 'warm', 'upbeat', 'magic', 'comedic', 'sad', 'urgent', 'chaos']
ALIAS = {'eerie': 'eerie', 'tense': 'dark', 'bounce': 'upbeat', 'pastoral': 'warm', 'mystery': 'eerie', 'tender': 'warm', 'party': 'upbeat',
         'magic': 'magic', 'curious': 'curious', 'comedic': 'comedic', 'sad': 'sad', 'urgent': 'urgent', 'chaos': 'chaos', 'warm': 'warm', 'upbeat': 'upbeat'}
print('synth stems...')
stems = {m: globals()['stem_' + m]() for m in MOODS}
for m in MOODS:
    stems[m] /= max(1e-6, np.max(np.abs(stems[m])))
GAIN = {'magic': 1.0, 'comedic': 0.85, 'sad': 1.0, 'urgent': 0.8, 'chaos': 0.9, 'upbeat': 0.9}
env = {m: np.zeros(N) for m in MOODS}
cur = 'dark'
for i, b in enumerate(beats):
    if b.get('m'):
        cur = b['m']
    t0 = 0 if i == 0 else b['start']
    if cur == 'silence':
        continue
    env[ALIAS[cur]][int(t0 * SR):int(b['end'] * SR)] = GAIN.get(ALIAS[cur], 1.0)
k = int(0.8 * SR)
music = np.zeros(N)
for m in MOODS:
    music += stems[m] * movavg(env[m], k)
# frozen time: music muffled (low-pass) and thinned while beat z = 1
zenv = np.zeros(N)
cur_z = 0
for b in beats:
    if 'z' in b: cur_z = b['z']
    zenv[int(b['start'] * SR):int(b['end'] * SR)] = cur_z
zenv[:int(beats[1]['start'] * SR)] = 1.0 if beats[0].get('z') else 0.0
zenv = movavg(zenv, int(0.4 * SR))
music = music * (1 - zenv) + lp(music, 700) * zenv * 0.85
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

def s_ring():
    t = tt(2.0)
    return (np.sin(2 * np.pi * 2200 * t) * 0.5 + np.sin(2 * np.pi * 3300 * t) * 0.25) * np.exp(-t * 1.8) * np.minimum(1, t * 100)

def s_shimmer():
    t = tt(2.5); out = np.zeros(len(t))
    for j in range(16):
        add(out, keys(mtof(84 + rng.integers(0, 14)), 0.8) * 0.3, rng.uniform(0, 1.8))
    return out

def s_fall():
    t = tt(1.6)
    return np.sin(2 * np.pi * np.cumsum(2600 * np.exp(-t * 1.2) + 300) / SR) * 0.3 * np.minimum(1, t * 10) + s_whoosh(1.6) * 0.6

def s_boing():
    t = tt(0.5)
    return np.sin(2 * np.pi * np.cumsum(300 + 250 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 4)) / SR) * np.exp(-t * 5) * 0.6

def s_door():
    t = tt(0.5)
    return lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 14) * 1.5 + np.sin(2 * np.pi * 80 * t) * np.exp(-t * 20)

def s_crack():
    out = np.zeros(int(3.0 * SR))
    for at in (0.8, 1.6, 2.3):
        for j in range(10):
            L = 500; add(out, hp(rng.standard_normal(L), 2500) * np.exp(-np.arange(L) / 90), at + rng.uniform(0, 0.15), rng.uniform(0.3, 1))
        add(out, s_ding() * 0.4, at)
    return out

def s_launch():
    out = np.zeros(int(4.5 * SR))
    for j in range(3):
        t0 = j * 1.1
        t = tt(0.6)
        add(out, np.sin(2 * np.pi * np.cumsum(800 + 1600 * t / 0.6) / SR) * 0.15 * np.sin(np.pi * t / 0.6), t0)
        add(out, s_boom() * 0.7, t0 + 0.6)
        for c in range(30):
            L = 300; add(out, hp(rng.standard_normal(L), 3000) * np.exp(-np.arange(L) / 60) * 0.3, t0 + 0.7 + rng.uniform(0, 1.0))
    return out

def s_wah():
    out = np.zeros(int(1.6 * SR))
    for j, (m, d) in enumerate(((58, 0.35), (57, 0.35), (56, 0.8))):
        t = tt(d); x = 2 * ((mtof(m) * t) % 1) - 1
        add(out, lp(x, 900) * np.minimum(1, t * 40) * np.minimum(1, (d - t) * 20) * 0.6, j * 0.38)
    return out

def s_flap():
    out = np.zeros(int(1.6 * SR))
    for j in range(16):
        L = int(0.07 * SR); add(out, bp(rng.standard_normal(L), 300, 1200) * np.sin(np.pi * np.arange(L) / L) ** 2, j * 0.09, 0.8)
    return out

def s_snap():
    out = np.zeros(int(1.8 * SR))
    for j in range(4):
        t = tt(0.12); add(out, hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 60) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 80) * 0.5, j * 0.33)
    return out

def s_opera():
    out = np.zeros(int(2.6 * SR))
    for j, m in enumerate((60, 64, 67, 72)):
        d = 0.6 if j < 3 else 1.0; t = tt(d)
        f0 = mtof(m) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t))
        ph = 2 * np.pi * np.cumsum(f0) / SR
        v = sum(np.sin(k * ph) * a for k, a in ((1, 1.0), (2, 0.6), (3, 0.45), (4, 0.25), (5, 0.15)))
        v = bp(v, 250, 3200) * np.minimum(1, t * 12) * np.minimum(1, (d - t) * 8)
        add(out, v * 0.35, j * 0.55)
    return out

def s_steps():
    out = np.zeros(int(2.4 * SR))
    for j in range(14):
        t = tt(0.08); add(out, lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 50) + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 40), j * 0.17)
    return out

def s_spit():
    t = tt(0.6)
    o = bp(rng.standard_normal(len(t)), 800, 5000) * np.exp(-t * 7) * 0.9
    o[:int(0.5 * SR)] += s_boing() * 0.4
    return o

def s_crash():
    out = np.zeros(int(1.4 * SR))
    add(out, s_impact() * 0.8, 0.0)
    for j in range(6):
        t = tt(0.25); add(out, hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 18) * 0.6, 0.05 + j * 0.09)
    return out

def s_guitar():   # a deliberately terrible, out-of-tune strum x3
    out = np.zeros(int(2.0 * SR))
    for j, notes in enumerate(((40, 46, 51, 55), (41, 47, 50, 56), (39, 45, 52, 54))):
        for k, m in enumerate(notes):
            add(out, pluck(mtof(m + 0.4 * rng.standard_normal()), 1.0, 1.3) * 0.35, j * 0.6 + k * 0.025)
    return out

def s_meow():
    t = tt(0.7)
    f0 = 600 + 350 * np.sin(np.pi * t / 0.7) ** 2
    ph = 2 * np.pi * np.cumsum(f0) / SR
    v = sum(np.sin(k * ph) / k for k in range(1, 7))
    return bp(v, 500, 4000) * np.sin(np.pi * t / 0.7) ** 1.5 * 0.5

def s_bark():
    out = np.zeros(int(0.8 * SR))
    for j in range(2):
        t = tt(0.14); f0 = 700 - 1800 * t
        ph = 2 * np.pi * np.cumsum(f0) / SR
        v = np.sign(np.sin(ph)) * 0.5 + np.sin(2 * ph)
        add(out, bp(v + 0.5 * rng.standard_normal(len(t)), 400, 3500) * np.exp(-t * 12) * 0.6, j * 0.28)
    return out

def s_cricket():
    out = np.zeros(int(2.2 * SR))
    for j in range(4):
        t = tt(0.25)
        add(out, np.sin(2 * np.pi * 4500 * t) * (np.sin(2 * np.pi * 40 * t) > 0) * np.sin(np.pi * t / 0.25) * 0.25, 0.2 + j * 0.5)
    return out

def s_knock():
    out = np.zeros(int(1.0 * SR))
    for j in range(3):
        t = tt(0.12); add(out, (lp(rng.standard_normal(len(t)), 900) * 1.5 + np.sin(2 * np.pi * 140 * t)) * np.exp(-t * 40), j * 0.22)
    return out


def s_freeze():   # reverse swell -> glassy hit -> clock tick that stops
    d = 1.6; out = np.zeros(int(d * SR))
    t = tt(0.5); sw = bp(rng.standard_normal(len(t)), 2000, 9000) * (t / 0.5) ** 3
    add(out, sw * 0.8, 0.0)
    t2 = tt(1.1)
    hit = sum(np.sin(2 * np.pi * f0 * t2) * np.exp(-t2 * 3) for f0 in (1568, 2093, 2637, 3136)) * 0.25
    add(out, hit + np.sin(2 * np.pi * np.cumsum(60 + 80 * np.exp(-t2 * 12)) / SR) * np.exp(-t2 * 5) * 0.8, 0.48)
    add(out, s_tick(2) * 0.7, 0.55)
    return out

def s_unfreeze():   # warm whoosh outward + ticking resumes
    out = np.zeros(int(1.6 * SR))
    add(out, s_whoosh(0.7), 0.0)
    t = tt(0.8); add(out, np.sin(2 * np.pi * np.cumsum(120 + 600 * t) / SR) * np.exp(-t * 4) * 0.4, 0.05)
    add(out, s_tick(3) * 0.6, 0.6)
    return out

def s_bigfreeze():
    out = np.zeros(int(3.0 * SR))
    add(out, s_freeze(), 0.0, 1.0); add(out, s_boom(), 0.45, 0.8)
    t = tt(2.4); add(out, lp(rng.standard_normal(len(t)), 200) * np.exp(-t * 1.2) * 1.2, 0.5)
    return out

def s_clap():
    out = np.zeros(int(0.5 * SR))
    for j in range(2):
        t = tt(0.09); add(out, bp(rng.standard_normal(len(t)), 900, 4500) * np.exp(-t * 55) * 1.3, j * 0.2)
    return out

def s_echostep():
    out = np.zeros(int(1.6 * SR))
    for j, g in enumerate((1.0, 0.45, 0.22, 0.1)):
        t = tt(0.12); add(out, (lp(rng.standard_normal(len(t)), 500) * 1.4 + np.sin(2 * np.pi * 65 * t)) * np.exp(-t * 35) * g, j * 0.21)
    return out

def s_clink():
    t = tt(0.8)
    return sum(np.sin(2 * np.pi * f0 * t) * np.exp(-t * 7) for f0 in (2400, 3550, 5100)) * 0.3

def s_splash():
    t = tt(0.7)
    return bp(rng.standard_normal(len(t)), 500, 5000) * np.exp(-t * 6) * 0.8

def s_zip():
    t = tt(0.25)
    return np.sin(2 * np.pi * np.cumsum(500 + 3000 * t / 0.25) / SR) * np.sin(np.pi * t / 0.25) * 0.4

def s_chime():
    out = np.zeros(int(2.0 * SR))
    for j, m in enumerate((76, 72, 79)):
        add(out, keys(mtof(m), 1.2) * 0.4, j * 0.28)
    return out

def s_crackfx():
    out = np.zeros(int(1.7 * SR))
    for j in range(22):
        L = 400; add(out, hp(rng.standard_normal(L), 3000) * np.exp(-np.arange(L) / 70), rng.uniform(0, 1.2), rng.uniform(0.3, 1))
    t = tt(1.5); add(out, np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 2) * 0.15 + np.sin(2 * np.pi * 55 * t) * np.exp(-t * 3) * 0.5, 0.1)
    return out

def s_scrape():
    t = tt(1.4)
    return bp(rng.standard_normal(len(t)), 200, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)) * np.minimum(1, t * 10) * np.minimum(1, (1.4 - t) * 5) * 0.6

def s_doors():
    out = np.zeros(int(1.8 * SR))
    for j, m in enumerate((79, 76)):
        add(out, keys(mtof(m), 0.6) * 0.5, j * 0.3)
    t = tt(0.9); add(out, bp(rng.standard_normal(len(t)), 300, 2500) * np.sin(np.pi * t / 0.9) * 0.5, 0.7)
    add(out, s_door() * 0.8, 1.55)
    return out

def s_ticktock():
    out = np.zeros(int(2.0 * SR))
    for j in range(4):
        t = tt(0.05); add(out, bp(rng.standard_normal(len(t)), 1800 if j % 2 else 1100, 5000) * np.exp(-t * 120), j * 0.5)
    return out

def s_hum(d=3.0):
    t = tt(d)
    return (np.sin(2 * np.pi * 110 * t) + 0.5 * np.sin(2 * np.pi * 220 * t) + 0.2 * np.sin(2 * np.pi * 331 * t)) * np.minimum(1, t * 3) * np.minimum(1, (d - t) * 3) * 0.3

def s_zap():
    t = tt(0.9)
    return np.sign(np.sin(2 * np.pi * np.cumsum(200 + 1500 * np.exp(-t * 6)) / SR)) * np.exp(-t * 4) * 0.25 + hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 8) * 0.3

def s_holo():
    out = np.zeros(int(1.0 * SR))
    for j in range(6):
        add(out, np.sin(2 * np.pi * (1200 + j * 220) * tt(0.06)) * np.exp(-tt(0.06) * 40) * 0.3, j * 0.07)
    return out

def s_hiss():
    t = tt(1.0)
    return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 3) * 0.6

def s_alarm():
    out = np.zeros(int(1.6 * SR))
    for j in range(3):
        t = tt(0.45); add(out, np.sign(np.sin(2 * np.pi * np.cumsum(700 + 500 * t / 0.45) / SR)) * 0.25 * np.minimum(1, (0.45 - t) * 40), j * 0.5)
    return lp(out, 3500)

def s_wind(d=2.6):
    t = tt(d)
    return bp(rng.standard_normal(len(t)), 300, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t)) * np.minimum(1, t) * np.minimum(1, (d - t)) * 0.8

def s_rumble():
    t = tt(2.0)
    return lp(rng.standard_normal(len(t)), 120) * np.minimum(1, t * 4) * np.exp(-t * 0.8) * 3

def s_land():
    t = tt(0.3)
    return (np.sin(2 * np.pi * 90 * t) + lp(rng.standard_normal(len(t)), 900)) * np.exp(-t * 20) * 0.8

def s_shatter():
    out = np.zeros(int(3.5 * SR))
    for j in range(60):
        L = int(rng.uniform(0.02, 0.1) * SR); f0 = rng.uniform(2000, 7000)
        add(out, np.sin(2 * np.pi * f0 * np.arange(L) / SR) * np.exp(-np.arange(L) / (L / 4)) * 0.3, rng.uniform(0, 1.5))
    add(out, s_riser(1.0)[::-1] * 0.5, 0.0)
    add(out, s_shimmer() * 0.8, 0.6)
    return out

def s_sneeze():
    out = np.zeros(int(1.0 * SR))
    t = tt(0.35); add(out, bp(rng.standard_normal(len(t)), 600, 3000) * (t / 0.35) * 0.3, 0.0)
    t = tt(0.3); add(out, bp(rng.standard_normal(len(t)), 900, 6000) * np.exp(-t * 10) * 1.2, 0.38)
    return out

def s_crowd(d=4.0):
    out = np.zeros(int(d * SR))
    for j in range(40):
        L = int(rng.uniform(0.2, 0.6) * SR); f0 = rng.uniform(140, 260)
        ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.05 * np.sin(2 * np.pi * 4 * np.arange(L) / SR))) / SR
        add(out, bp(np.sign(np.sin(ph)), 300, 2000) * np.sin(np.pi * np.arange(L) / L) * 0.05, rng.uniform(0, d - 0.6))
    return out

def s_rain(d):
    t = tt(d)
    n = hp(rng.standard_normal(len(t)), 1500) * 0.35
    drops = np.zeros(len(t)); idx = rng.integers(0, len(t), int(d * 60)); drops[idx] = rng.standard_normal(len(idx))
    return (n + bp(drops, 2000, 7000) * 1.5) * np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.8)

ONE = {'spit': (s_spit, 0.5), 'crash': (s_crash, 0.55), 'guitar': (s_guitar, 0.5), 'meow': (s_meow, 0.45), 'bark': (s_bark, 0.5),
       'cricket': (s_cricket, 0.35), 'knock': (s_knock, 0.6),'flap': (s_flap, 0.4), 'snap': (s_snap, 0.5), 'opera': (s_opera, 0.6), 'steps': (s_steps, 0.6), 'glitch': (s_glitch, 0.4), 'tick': (s_tick, 0.4), 'horn': (s_horn, 0.5),
       'ring': (s_ring, 0.3), 'shimmer': (s_shimmer, 0.5), 'fall': (s_fall, 0.5), 'boing': (s_boing, 0.35), 'door': (s_door, 0.6),
       'crack': (s_crack, 0.6), 'launch': (s_launch, 0.6), 'wah': (s_wah, 0.5), 'pop': (s_pop, 0.5),
       'whoosh': (s_whoosh, 0.35), 'boom': (s_boom, 0.7), 'impact': (s_impact, 0.55), 'glitch': (s_glitch, 0.35), 'tick': (s_tick, 0.35),
       'stamp': (s_stamp, 0.5), 'freeze': (s_freeze, 0.6), 'unfreeze': (s_unfreeze, 0.55), 'bigfreeze': (s_bigfreeze, 0.7), 'clap': (s_clap, 0.6), 'echostep': (s_echostep, 0.7), 'clink': (s_clink, 0.5), 'splash': (s_splash, 0.45), 'zip': (s_zip, 0.4), 'chime': (s_chime, 0.45), 'crack': (s_crackfx, 0.6), 'scrape': (s_scrape, 0.4), 'doors': (s_doors, 0.5), 'ticktock': (s_ticktock, 0.5), 'hum': (s_hum, 0.35), 'zap': (s_zap, 0.5), 'holo': (s_holo, 0.4), 'hiss': (s_hiss, 0.5), 'alarm': (s_alarm, 0.4), 'wind': (s_wind, 0.35), 'rumble': (s_rumble, 0.5), 'land': (s_land, 0.5), 'shatter': (s_shatter, 0.6), 'sneeze': (s_sneeze, 0.6), 'crowd': (s_crowd, 0.5), 'horn': (s_horn, 0.55), 'ding': (s_ding, 0.35), 'sob': (s_sob, 0.25), 'confetti': (s_pop, 0.5), 'heart': (heartbeat, 0.0)}
prev_scene = None
for i, b in enumerate(beats):
    cues = list(b.get('sfx', []))
    if b['s'] != prev_scene and i > 0 and 'whoosh' not in cues and b['s'] not in ('title',):
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
        if cue == 'rain':
            end = b['end']
            for b2 in beats[i + 1:]:
                if b2['s'] != b['s']:
                    break
                end = b2['end']
            add(sfx, s_rain(end - st), st, 0.22); continue
        if cue in ONE:
            fn, g = ONE[cue]
            add(sfx, fn(), st, g)

# repeated cues inside one action beat (e.g. zip/pop during the prank, whoosh/land during the car jump): spread out
for b in beats:
    cues = b.get('sfx', [])
    if b.get('v') is None and len(cues) >= 3:
        d = b['end'] - b['start']
        for j, cue in enumerate(cues[1:], 1):
            if cue in ONE and cues.count(cue) > 1:
                add(sfx, ONE[cue][0](), b['start'] + d * j / len(cues), ONE[cue][1] * 0.8)
    if b.get('a') == 'clapFail':
        for j in range(3):
            add(sfx, s_clap(), b['start'] + 1.0 + j * 1.0, 0.5)
    if b.get('a') == 'hookOpen':
        add(sfx, s_rain(7.0), 0.0, 0.1)

# ------------------------------------------------------------------ voice + ducking
v, vsr = sf.read(os.path.join(B, 'voice.wav'))
v = resample_poly(v, SR, vsr)[:N]
v = np.pad(v, (0, N - len(v)))
# gentle presence EQ + compression for the voice
v = v + 0.25 * bp(v, 2500, 6000)
th, tsr = sf.read(os.path.join(B, 'masked.wav'))
th = resample_poly(th, SR, tsr)[:N]
th = np.pad(th, (0, N - len(th)))
# eerie 'time voice': chorus of slowly modulated short delays + a low ring-mod layer + echoes
idx = np.arange(N)
echo = th.copy() * 0.8
for k, (base, depth, rate) in enumerate(((0.011, 0.004, 0.6), (0.017, 0.006, 0.43), (0.023, 0.005, 0.31))):
    dly = ((base + depth * np.sin(2 * np.pi * rate * idx / SR)) * SR).astype(int)
    echo += 0.45 * th[np.clip(idx - dly, 0, N - 1)]
echo += 0.25 * th * np.sin(2 * np.pi * 70 * idx / SR)
for dl, g in ((0.16, 0.3), (0.33, 0.16), (0.5, 0.08)):
    n0 = int(dl * SR); echo[n0:] += th[:-n0] * g
echo = lp(echo, 5000)
ir_t = tt(1.3); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.5); ir /= np.sqrt(np.sum(ir ** 2))
from scipy.signal import fftconvolve
wet = fftconvolve(echo, ir)[:N]
th_bus = hp(echo * 0.75 + wet * 0.4, 120)
v = v + th_bus
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
music_gain = 0.27 * (1 - 0.62 * duck)
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
