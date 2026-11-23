"""EP02 soundtrack: dialogue mix + procedural score + sound effects + ambience -> out/soundtrack.wav

Everything except the Kokoro voices is synthesised here (no samples). The instrument
models (pluck, bell, bass, pad, drums) come from EP01's audio.py so both episodes share a sound.
"""
import math
import os

import numpy as np
import soundfile as sf
from scipy.signal import lfilter, butter, fftconvolve

import anim
import script

SR = 48000
DUR = anim.TL['duration']
N = int(round(SR * DUR))
rng = np.random.default_rng(11)
HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(HERE, 'out', 'voices')


def tt(d):
    return np.arange(int(d * SR)) / SR


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.1):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    sus = max(n - a_n - d_n - r_n, 0)
    e = np.concatenate([np.linspace(0, 1, max(a_n, 1)), np.linspace(1, s, max(d_n, 1)),
                        np.full(sus, s), np.linspace(s, 0, max(r_n, 1))])
    if len(e) < n:
        e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n]


def lowpass(x, f, order=2):
    b, a = butter(order, min(f / (SR / 2), 0.99), 'low')
    return lfilter(b, a, x)


def highpass(x, f, order=2):
    b, a = butter(order, min(f / (SR / 2), 0.99), 'high')
    return lfilter(b, a, x)


def bandpass(x, f, q):
    w0 = 2 * math.pi * f / SR
    alpha = math.sin(w0) / (2 * q)
    return lfilter([alpha, 0, -alpha], [1 + alpha, -2 * math.cos(w0), 1 - alpha], x)


class Track:
    def __init__(self):
        self.buf = np.zeros((N, 2), dtype=np.float32)

    def add(self, sig, t0, gain=1.0, pan=0.0):
        i0 = int(t0 * SR)
        if i0 >= N or len(sig) == 0:
            return
        if sig.ndim == 1:
            l = math.cos((pan + 1) * math.pi / 4) * 1.414
            r = math.sin((pan + 1) * math.pi / 4) * 1.414
            st = np.stack([sig * l, sig * r], axis=1)
        else:
            st = sig
        if i0 < 0:
            st = st[-i0:]
            i0 = 0
        st = st[:N - i0]
        self.buf[i0:i0 + len(st)] += (st * gain).astype(np.float32)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ instruments (from EP01)
def pluck(freq, dur=0.9, bright=0.6, decay=0.996):
    n = int(dur * SR)
    p = max(int(SR / freq), 2)
    buf = lowpass(rng.uniform(-1, 1, p), 2000 + 6000 * bright, 1)
    out = np.zeros(n + p + 1)
    out[:p] = buf
    i = p
    while i < n:
        j = min(i + p, n)
        out[i:j] = 0.5 * (out[i - p:j - p] + out[i - p + 1:j - p + 1]) * decay
        i = j
    out = out[:n] * np.linspace(1, 0.0, n) ** 0.5
    return out * 0.6


def bell(freq, dur=1.2, gain=1.0):
    t = tt(dur)
    s = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.5)
         + 0.45 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 7)
         + 0.25 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 12)
         + 0.12 * np.sin(2 * np.pi * freq * 8.9 * t) * np.exp(-t * 20))
    return s * np.minimum(t / 0.002, 1) * 0.35 * gain


def bass(freq, dur=0.45):
    t = tt(dur)
    ph = 2 * np.pi * freq * t
    s = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    return s * np.minimum(t / 0.008, 1) * np.exp(-t * 4.0) * 0.55


def pad(freqs, dur, attack=0.4, release=0.6, cutoff=1800):
    t = tt(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            s += 2 * ((t * ff + rng.random()) % 1) - 1
    s = lowpass(s, cutoff, 2)
    return s * env_adsr(len(t), attack, 0.2, 0.8, release) * 0.05 / len(freqs)


def kick():
    t = tt(0.3)
    f = 120 * np.exp(-t * 25) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10) * 0.8


def snare():
    t = tt(0.22)
    n = highpass(rng.normal(0, 1, len(t)), 1500) * np.exp(-t * 22)
    return n * 0.35 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.3


def shaker():
    t = tt(0.06)
    return highpass(rng.normal(0, 1, len(t)), 5000) * np.exp(-t * 60) * 0.15


def clap():
    t = tt(0.2)
    n = bandpass(rng.normal(0, 1, len(t)), 1200, 0.8)
    e = np.zeros_like(t)
    for o in (0.0, 0.011, 0.022):
        e += np.where(t >= o, np.exp(-(t - o) * 60), 0)
    return n * e * 0.25


# ------------------------------------------------------------------ new instruments
def flute(freq, dur):
    t = tt(dur)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(t / 0.3, 1)
    ph = 2 * np.pi * freq * np.cumsum(vib) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    s += lowpass(rng.normal(0, 1, len(t)), 3000) * 0.04
    return s * env_adsr(len(t), 0.06, 0.1, 0.85, 0.12) * 0.16


def brass(freq, dur):
    t = tt(dur)
    s = np.zeros_like(t)
    for det in (-0.08, 0.0, 0.07):
        s += 2 * ((t * freq * 2 ** (det / 12)) % 1) - 1
    env = env_adsr(len(t), 0.03, 0.1, 0.8, 0.1)
    cutoff = 900 + 2500 * np.minimum(t / 0.08, 1)
    s = lowpass(s, 2400, 2)
    return s * env * 0.06


def pizz(freq, dur=0.3):
    return pluck(freq, dur, bright=0.35, decay=0.99) * 0.9


def piano(freq, dur=1.6):
    t = tt(dur)
    s = sum(np.sin(2 * np.pi * freq * k * t) * np.exp(-t * (2.0 + k * 1.3)) / k for k in range(1, 6))
    return s * np.minimum(t / 0.004, 1) * 0.22


def bassoon(freq, dur):
    t = tt(dur)
    s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + np.sin(2 * np.pi * freq * t)
    return lowpass(s, 900, 2) * env_adsr(len(t), 0.02, 0.05, 0.8, 0.06) * 0.12


def string_pad(freqs, dur):
    t = tt(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.1, 0.05, 0.12):
            vib = 1 + 0.004 * np.sin(2 * np.pi * (5 + det * 10) * t)
            s += 2 * ((np.cumsum(f * 2 ** (det / 12) * vib) / SR) % 1) - 1
    s = lowpass(s, 2200, 2)
    return s * env_adsr(len(t), 0.6, 0.3, 0.85, 0.8) * 0.035 / len(freqs)


# ------------------------------------------------------------------ SFX
def whoosh(dur=0.5, f0=400, f1=2500, gain=1.0):
    t = tt(dur)
    n = rng.normal(0, 1, len(t))
    out = np.zeros_like(t)
    seg = 512
    for i in range(0, len(t), seg):
        f = f0 + (f1 - f0) * (i / len(t))
        out[i:i + seg] = bandpass(n[i:i + seg + 0], f, 1.2)[:len(out[i:i + seg])]
    return out * np.sin(np.pi * t / dur) ** 2 * 0.6 * gain


def impact():
    t = tt(1.2)
    f = 90 * np.exp(-t * 8) + 35
    low = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)
    n = lowpass(rng.normal(0, 1, len(t)), 1800) * np.exp(-t * 7)
    return (low * 0.9 + n * 0.5)


def sparkle_burst(dur=1.0, n=14, base=1500, spread=2.2, gain=1.0):
    out = np.zeros(int(dur * SR) + SR)
    for i in range(n):
        t0 = rng.uniform(0, dur)
        b = bell(base * 2 ** rng.uniform(0, spread), 0.5, 0.25 * gain)
        i0 = int(t0 * SR)
        out[i0:i0 + len(b)] += b
    return out


def ring_tone(dur=1.5):
    t = tt(dur)
    s = np.sin(2 * np.pi * 2200 * t) * 0.5 + np.sin(2 * np.pi * 3300 * t) * 0.25
    return s * np.exp(-t * 2.0) * np.minimum(t / 0.01, 1) * 0.25


def shimmer(dur=1.5, gain=1.0):
    t = tt(dur)
    s = np.zeros_like(t)
    for f in (1760, 2217, 2637, 3520):
        s += np.sin(2 * np.pi * f * t + rng.random() * 6) * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(3, 7) * t))
    return s * np.sin(np.pi * t / dur) ** 2 * 0.04 * gain


def footstep(pitch=1.0, gain=1.0):
    t = tt(0.09)
    n = lowpass(rng.normal(0, 1, len(t)), 700 * pitch) * np.exp(-t * 55)
    th = np.sin(2 * np.pi * 70 * pitch * t) * np.exp(-t * 40)
    return (n * 0.5 + th * 0.5) * 0.35 * gain


def flap():
    t = tt(0.12)
    return bandpass(rng.normal(0, 1, len(t)), 500, 0.7) * np.sin(np.pi * t / 0.12) ** 2 * 0.5


def crack_sfx(intensity=1.0):
    t = tt(0.25)
    out = np.zeros_like(t)
    for _ in range(int(6 + 8 * intensity)):
        i0 = rng.integers(0, len(t) - 600)
        out[i0:i0 + 600] += highpass(rng.normal(0, 1, 600), 2500) * np.exp(-np.arange(600) / 90) * rng.uniform(0.3, 1)
    return out * 0.6 * intensity


def glass_crack():
    t = tt(0.8)
    s = crack_sfx(1.0)
    b = msum(bell(3100, 0.8, 0.5), bell(4400, 0.8, 0.3))
    out = np.zeros(len(t))
    out[:len(s)] += s
    out[:len(b)] += b[:len(out)]
    return out


def heartbeat():
    out = np.zeros(int(0.7 * SR))
    for o, g in ((0.0, 1.0), (0.22, 0.7)):
        t = tt(0.2)
        k = np.sin(2 * np.pi * (55 * np.exp(-t * 10) + 35) * t) * np.exp(-t * 18) * g
        i0 = int(o * SR)
        out[i0:i0 + len(k)] += k
    return out * 0.8


def msum(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


def clink():
    return msum(bell(2600, 0.5, 0.6), bell(3900, 0.4, 0.3))


def plink():
    return msum(bell(1568, 0.8, 1.0), bell(2349, 0.6, 0.5))


def boom():
    t = tt(1.6)
    f = 60 * np.exp(-t * 3) + 30
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3)
    n = lowpass(rng.normal(0, 1, len(t)), 900) * np.exp(-t * 5)
    cr = np.zeros_like(t)
    for _ in range(40):
        i0 = int(rng.uniform(0.1, 1.2) * SR)
        b = highpass(rng.normal(0, 1, 300), 3000) * np.exp(-np.arange(300) / 60) * rng.uniform(0.1, 0.4)
        cr[i0:i0 + 300] += b
    return s * 0.8 + n * 0.5 + cr * 0.8


def launch_whistle(dur=0.75):
    t = tt(dur)
    f = 900 + 1800 * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12 * np.sin(np.pi * t / dur) + whoosh(dur, 300, 1500, 0.4)[:len(t)]


def popper():
    t = tt(0.15)
    return highpass(rng.normal(0, 1, len(t)), 800) * np.exp(-t * 40) * 0.8


def slide_whistle(f0, f1, dur):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_adsr(len(t), 0.02, 0.05, 0.9, 0.05) * 0.25


def wah_wah():
    """comedic 'uh-oh' trombone"""
    out = np.zeros(int(1.6 * SR))
    for i, (m, d) in enumerate(((58, 0.35), (57, 0.35), (56, 0.8))):
        s = brass(midi(m), d) * 2.2
        t = tt(d)
        s = lowpass(s, 600 + 900 * np.abs(np.sin(np.pi * t / d * (2 if i == 2 else 1))), 1) if False else s
        i0 = int(i * 0.38 * SR)
        out[i0:i0 + len(s)] += s
    return out


def riser(dur):
    t = tt(dur)
    n = rng.normal(0, 1, len(t))
    out = np.zeros_like(t)
    seg = 1024
    for i in range(0, len(t), seg):
        f = 300 * (12 ** (i / len(t)))
        out[i:i + seg] = bandpass(n[i:i + seg], f, 2.0)[:len(out[i:i + seg])]
    return out * (t / dur) ** 2 * 0.5


# ------------------------------------------------------------------ ambience beds
def noise_bed(dur, lo, hi, gain):
    n = rng.normal(0, 1, int(dur * SR))
    return lowpass(highpass(n, lo), hi) * gain


def birds(dur, density=0.6):
    out = np.zeros(int(dur * SR) + SR)
    t = 0.0
    while t < dur:
        t += rng.exponential(1.0 / density)
        f0 = rng.uniform(2500, 4200)
        for k in range(int(rng.integers(2, 6))):
            d = rng.uniform(0.04, 0.09)
            tc = tt(d)
            f = f0 * (1 + 0.3 * np.sin(np.pi * tc / d)) * rng.uniform(0.9, 1.1)
            s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tc / d) * 0.05
            i0 = int((t + k * 0.11) * SR)
            if i0 + len(s) < len(out):
                out[i0:i0 + len(s)] += s
    return out[:int(dur * SR)]


def crickets(dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.3) * (np.sin(2 * np.pi * 1.6 * t) > -0.2)
    s2 = np.sin(2 * np.pi * 4700 * t + 1) * (np.sin(2 * np.pi * 31 * t + 2) > 0.4) * (np.sin(2 * np.pi * 1.1 * t + 1) > 0.0)
    return (s + s2) * 0.012


# ------------------------------------------------------------------ music engine
SCALES = {'maj': [0, 2, 4, 5, 7, 9, 11], 'min': [0, 2, 3, 5, 7, 8, 10]}


def chord_freqs(root, quality, octave=4):
    third = 4 if quality == 'M' else 3
    return [midi(12 * (octave + 1) + root + i) for i in (0, third, 7)]


STYLES = {
    # bpm, key root (0=C), mode, progression (degree roots + quality)
    'bounce':   (112, 0, 'maj', [(0, 'M'), (9, 'm'), (5, 'M'), (7, 'M')]),
    'curious':  (100, 9, 'min', [(0, 'm'), (8, 'M'), (3, 'M'), (10, 'M')]),
    'pastoral': (92, 7, 'maj', [(0, 'M'), (4, 'm'), (5, 'M'), (7, 'M')]),
    'comedic':  (128, 5, 'maj', [(0, 'M'), (5, 'M'), (7, 'M'), (0, 'M')]),
    'mystery':  (84, 2, 'min', [(0, 'm'), (10, 'M'), (8, 'M'), (7, 'M')]),
    'tense':    (100, 2, 'min', [(0, 'm'), (0, 'm'), (10, 'M'), (8, 'M')]),
    'sad':      (72, 9, 'min', [(0, 'm'), (8, 'M'), (3, 'M'), (10, 'M')]),
    'tender':   (76, 5, 'maj', [(0, 'M'), (9, 'm'), (5, 'M'), (7, 'M')]),
    'urgent':   (140, 2, 'min', [(0, 'm'), (10, 'M'), (8, 'M'), (10, 'M')]),
    'party':    (124, 0, 'maj', [(0, 'M'), (5, 'M'), (9, 'm'), (7, 'M')]),
    'chaos':    (90, 1, 'min', [(0, 'm'), (1, 'M'), (0, 'm'), (6, 'M')]),
    'warm':     (84, 10, 'maj', [(0, 'M'), (5, 'M'), (9, 'm'), (7, 'M')]),
}


def cue(trk, style, t0, t1, gain=1.0, seed=0, fade_in=0.6, fade_out=0.8):
    """Fill [t0, t1] with a procedurally composed cue in the given style."""
    bpm, key, mode, prog = STYLES[style]
    r = np.random.default_rng(seed + int(t0 * 10))
    beat = 60.0 / bpm
    bar = beat * 4
    local = Track.__new__(Track)
    n = int((t1 - t0 + 3.0) * SR)
    local.buf = np.zeros((n, 2), dtype=np.float32)

    def put(sig, t, g=1.0, pan=0.0):
        i0 = int(t * SR)
        if i0 >= n or i0 < 0:
            return
        l = math.cos((pan + 1) * math.pi / 4) * 1.414
        rr = math.sin((pan + 1) * math.pi / 4) * 1.414
        s = sig[:n - i0]
        local.buf[i0:i0 + len(s), 0] += s * g * l
        local.buf[i0:i0 + len(s), 1] += s * g * rr

    scale = SCALES[mode]
    nb = int(math.ceil((t1 - t0) / bar)) + 1
    mel_deg = 4
    for b in range(nb):
        tb = b * bar
        if tb > t1 - t0:
            break
        root, q = prog[b % len(prog)]
        rr = (key + root) % 12
        cf = chord_freqs(rr, q, 4)
        bf = midi(12 * 3 + rr) if rr < 7 else midi(12 * 2 + rr)
        if style in ('bounce', 'party', 'comedic', 'urgent', 'curious'):
            for k in range(4):
                if style == 'comedic' or style == 'urgent':
                    put(bassoon(bf * (1 if k % 2 == 0 else 1.5), beat * 0.45), tb + k * beat, 0.9)
                else:
                    put(bass(bf * (1 if k % 2 == 0 else 1.5), beat * 0.9), tb + k * beat, 0.8)
            for k in range(8):
                if style == 'curious' and k % 2 == 0:
                    continue
                f = cf[k % 3] * 2
                inst = pizz if style in ('comedic', 'curious', 'urgent') else pluck
                put(inst(f, beat * 0.9), tb + k * beat / 2, 0.35, pan=0.3 * math.sin(k))
            # melody: chord-tone random walk on a glockenspiel / flute
            for k in range(8 if style != 'curious' else 4):
                if r.random() < (0.35 if style != 'party' else 0.2):
                    continue
                mel_deg = int(np.clip(mel_deg + r.integers(-2, 3), 0, 9))
                m = 12 * 6 + key + scale[mel_deg % 7] + 12 * (mel_deg // 7)
                if style == 'party':
                    put(brass(midi(m - 12), beat * 0.45), tb + k * beat / 2 * (2 if style == 'curious' else 1), 0.7, -0.2)
                put(bell(midi(m), 0.6, 0.6), tb + k * beat / 2 * (2 if style == 'curious' else 1), 0.45, 0.25)
            if style in ('bounce', 'party', 'urgent'):
                for k in range(4):
                    put(kick(), tb + k * beat, 0.5 if k % 2 == 0 else 0.0)
                    if k % 2 == 1:
                        put(snare() if style != 'party' else clap(), tb + k * beat, 0.45)
                for k in range(8):
                    put(shaker(), tb + k * beat / 2, 0.5)
            if style == 'party' and b % 2 == 0:
                put(brass_chord(cf, beat * 1.5), tb, 0.8)
        elif style in ('pastoral', 'tender', 'warm'):
            put(pad([f / 2 for f in cf], bar + 0.6, 0.5, 0.8), tb, 0.9)
            for k in range(8):
                f = cf[[0, 1, 2, 1][k % 4]] * (2 if k >= 4 else 1)
                put(pluck(f, 1.2, 0.45) if style != 'tender' else piano(f, 1.6), tb + k * beat / 2, 0.32, pan=0.4 * math.sin(k * 1.3))
            put(bass(bf, bar * 0.9) * 0.6, tb, 0.7)
            if style == 'pastoral':
                for k in range(2):
                    if r.random() < 0.3:
                        continue
                    mel_deg = int(np.clip(mel_deg + r.integers(-2, 3), 0, 9))
                    m = 12 * 6 + key + scale[mel_deg % 7] + 12 * (mel_deg // 7)
                    put(flute(midi(m), beat * 1.8), tb + k * beat * 2, 0.8, -0.15)
            if style == 'tender' and b % 2 == 1:
                put(sparkle_burst(0.6, 5, 1800, 1.5, 0.5), tb + beat * 3, 0.4)
        elif style in ('mystery', 'sad', 'tense', 'chaos'):
            cut = 1200 if style != 'chaos' else 2500
            freqs = [f / 2 for f in cf]
            if style == 'chaos':
                freqs = freqs + [freqs[0] * 2 ** (1 / 12), freqs[1] * 2 ** (6 / 12)]
            put(string_pad(freqs, bar + 0.8), tb, 1.2)
            if style == 'tense':
                for k in range(8):
                    put(bass(bf, beat * 0.4) * 0.7, tb + k * beat / 2, 0.8)
                    put(shaker(), tb + k * beat / 2 + beat / 4, 0.4)
            if style == 'mystery':
                for k in (0, 3, 5):
                    m = 12 * 6 + key + scale[r.integers(0, 7)]
                    put(bell(midi(m), 1.2, 0.5), tb + k * beat / 2, 0.5, 0.4 * math.sin(k))
            if style == 'sad':
                for k in range(4):
                    f = cf[[0, 2, 1, 2][k]] * 2
                    put(piano(f, 2.0), tb + k * beat, 0.5)
            if style == 'chaos':
                put(heartbeat(), tb, 0.7)
                put(heartbeat(), tb + bar / 2, 0.7)
    L = int((t1 - t0) * SR)
    seg = local.buf[:L + int(fade_out * SR)].copy()
    m = len(seg)
    env = np.ones(m)
    fi = int(fade_in * SR)
    fo = int(fade_out * SR)
    env[:fi] = np.linspace(0, 1, fi) if fi > 0 else 1
    if fo > 0:
        e0 = max(L - fo // 2, 0)
        env[e0:] = np.linspace(1, 0, m - e0)
    seg *= env[:, None]
    trk.add(seg, t0, gain)


def brass_chord(cf, dur):
    return sum(brass(f, dur) for f in cf) * 0.8


# ------------------------------------------------------------------ dialogue
def load(fn):
    x, sr = sf.read(os.path.join(VO, fn), dtype='float32')
    return x


def reverb_ir(dur=1.6, decay=3.0, seed=1):
    r = np.random.default_rng(seed)
    t = tt(dur)
    ir = r.normal(0, 1, (len(t), 2)) * np.exp(-t * decay)[:, None]
    ir[:, 0] = lowpass(ir[:, 0], 6000)
    ir[:, 1] = lowpass(ir[:, 1], 6000)
    ir /= np.sqrt((ir ** 2).sum(axis=0, keepdims=True))   # unit-energy tail: wet level == dry level
    return ir


def screen_pan(t, who):
    """Pan a voice by where the speaker's head is on screen at time t."""
    try:
        fr = anim.Frame(t)
        u, post, f, ap = anim.uniforms(t)
        cam, tar = u['uCamPos'], u['uCamTar']
        st = fr.st
        if who not in st.cast:
            return 0.0
        x, z, yaw, *_ = st.mark(who, t)
        fwd = anim.norm(anim.sub(tar, cam))
        right = anim.norm((fwd[2], 0.0, -fwd[0]))
        rel = anim.sub((x, 0.6, z), cam)
        depth = sum(a * b for a, b in zip(rel, fwd))
        if depth <= 0.1:
            return 0.0
        sx = sum(a * b for a, b in zip(rel, right)) / depth
        return float(np.clip(-sx * 0.9, -0.6, 0.6))
    except Exception:
        return 0.0


def build():
    music = Track()
    dlg = Track()
    thoughts = Track()
    sfx = Track()
    amb = Track()
    TL = anim.TL
    items = TL['items']
    scenes = {s['id']: s for s in TL['scenes']}

    def E(sid, name):
        for it in items:
            if it['scene'] == sid and it['type'] == 'event' and it['name'] == name:
                return it
        return None

    def lines(sid):
        return [it for it in items if it['scene'] == sid and it['type'] == 'line']

    # ---------------- dialogue
    for it in items:
        if it['type'] == 'line':
            for p in it['parts']:
                x = load(anim.LIPS[p['key']]['file'])
                t0 = it['t0'] + p.get('delay', 0.0)
                if it['mode'] == 'think':
                    thoughts.add(x, t0, 0.8, pan=0.0)
                elif it['mode'] == 'narr':
                    dlg.add(lowpass(x, 9000, 1), t0, 0.95)
                else:
                    pan = screen_pan(t0 + 0.3, p['who'])
                    dlg.add(x, t0, 1.0 if not it['loud'] else 1.05, pan)
        elif it['type'] == 'clip':
            x = load(anim.LIPS[it['key']]['file'])
            dlg.add(x, it['t0'], 0.9, screen_pan(it['t0'] + 0.1, it['who']))
    # thought FX: echo + reverb + gentle shimmer
    th = thoughts.buf
    d1, d2 = int(0.09 * SR), int(0.19 * SR)
    echo = th.copy()
    echo[d1:] += th[:-d1] * 0.35
    echo[d2:] += th[:-d2] * 0.2
    wet = np.stack([fftconvolve(echo[:, c], reverb_ir(1.4, 3.5, 2)[:, c])[:N] for c in range(2)], axis=1)
    thoughts.buf = (echo * 0.85 + wet * 0.35).astype(np.float32)
    thoughts.buf[:, 0] = highpass(thoughts.buf[:, 0], 180)
    thoughts.buf[:, 1] = highpass(thoughts.buf[:, 1], 180)
    for it in items:
        if it['type'] == 'line' and it['mode'] == 'think':
            sfx.add(shimmer(min(it['t1'] - it['t0'] + 0.6, 6.0), 0.8), it['t0'] - 0.3, 0.8)

    # ---------------- footsteps for every move
    for it in items:
        if it['type'] != 'move':
            continue
        w = it['who']
        if w == 'coco':
            continue
        step = {'tiko': 0.3, 'mama': 0.42, 'sparky': 0.2, 'prof': 0.6}[w] * (0.6 if it['run'] else 1.0)
        pitch = {'tiko': 1.0, 'mama': 0.7, 'sparky': 1.6, 'prof': 0.6}[w]
        t = it['t0'] + 0.1
        k = 0
        while t < it['t1'] - 0.1:
            sfx.add(footstep(pitch * rng.uniform(0.9, 1.1), 0.9 if w != 'prof' else 1.3), t, 0.7, pan=0.2 * (1 if k % 2 else -1))
            t += step
            k += 1

    # ---------------- per-scene score, events and ambience
    S = scenes
    # ambience
    for sid, s in S.items():
        d = anim.SCENE_DEF[sid]
        dur = s['t1'] - s['t0']
        if d['tod'] == 'night':
            amb.add(crickets(dur), s['t0'], 1.0)
            amb.add(noise_bed(dur, 100, 600, 0.004), s['t0'], 1.0)
        else:
            amb.add(birds(dur, 0.5 if d['tod'] != 'sunset' else 0.2), s['t0'], 0.8, pan=0.3)
            amb.add(noise_bed(dur, 200, 1500, 0.006), s['t0'], 1.0)
        if d['loc'] == 'pond':
            amb.add(noise_bed(dur, 400, 3000, 0.004) * (1 + 0.5 * np.sin(2 * np.pi * 0.3 * tt(dur))), s['t0'], 1.0, pan=0.4)

    # HOOK
    s = S['hook']
    cue(music, 'tense', s['t0'], s['t1'], 0.9, fade_in=0.2, fade_out=0.1)
    music.add(riser(s['t1'] - 1.0), s['t0'] + 0.5, 0.6)
    e = E('hook', 'hook_open')
    sfx.add(ring_tone(1.2), e['t0'] + 0.35, 0.6)
    e = E('hook', 'hook_sting')
    sfx.add(impact(), e['t0'], 0.9)
    sfx.add(bell(midi(62), 2.0, 1.0) + bell(midi(69), 2.0, 0.6), e['t0'], 0.6)
    # TITLE
    s = S['title']
    cue(music, 'mystery', s['t0'], s['t1'], 1.6, fade_in=0.3)
    sfx.add(sparkle_burst(2.0, 20, 1400, 2.0, 1.0), s['t0'] + 0.2, 0.7)
    sfx.add(shimmer(4.5, 1.5), s['t0'] + 0.3, 1.0)
    # S1
    s = S['s1']
    ev_sn, ev_fall, ev_touch = E('s1', 'sneeze_up'), E('s1', 'star_fall'), E('s1', 'touch_star')
    cue(music, 'bounce', s['t0'], ev_sn['t0'] + 0.4, 0.85)
    clip = next(i for i in items if i['type'] == 'clip' and i['event'] == 'sneeze_up' and i['scene'] == 's1')
    sfx.add(whoosh(0.9, 500, 3000, 1.2), clip['peak'], 0.8)
    sfx.add(slide_whistle(2400, 900, 1.9), ev_fall['t0'] + 0.1, 0.5)
    sfx.add(whoosh(1.0, 300, 2500, 1.0), ev_fall['t0'] + 1.0, 0.8)
    tc = ev_fall['t0'] + 2.0
    sfx.add(impact(), tc, 1.0)
    sfx.add(sparkle_burst(1.5, 16, 1500, 2.0, 1.2), tc + 0.05, 0.8)
    cue(music, 'mystery', tc + 0.6, ev_touch['t0'] + 1.25, 0.8, fade_in=1.0)
    sfx.add(shimmer(3.0, 1.2), ev_touch['t0'], 1.0)
    sfx.add(ring_tone(2.2), ev_touch['t0'] + 1.25, 0.9)
    sfx.add(impact() * 0.5, ev_touch['t0'] + 1.25, 0.6)
    sfx.add(sparkle_burst(1.2, 14, 1600, 2.0, 1.0), ev_touch['t0'] + 1.3, 0.8)
    cue(music, 'curious', ev_touch['t0'] + 2.4, s['t1'], 0.75, fade_in=1.5)
    # S2
    s = S['s2']
    ls = lines('s2')
    worry = next(l for l in ls if l['mode'] == 'think' and 'tonight' in l['text'])
    cue(music, 'pastoral', s['t0'], worry['t0'], 0.8)
    sfx.add(bell(midi(74), 1.5, 0.7) + bell(midi(75), 1.5, 0.5), worry['t0'], 0.5)
    turn = next(l for l in ls if 'dragonfly' in l['text'])
    cue(music, 'mystery', worry['t0'], turn['t0'], 0.7)
    cue(music, 'comedic', turn['t0'], s['t1'], 0.6)
    e = E('s2', 'glasses_down')
    sfx.add(slide_whistle(900, 500, 0.4), e['t0'], 0.4)
    sfx.add(clink(), e['t0'] + 0.7, 0.6)
    # S3
    s = S['s3']
    cue(music, 'comedic', s['t0'], s['t1'], 0.65)
    e = E('s3', 'coco_flyaway')
    for k in range(14):
        sfx.add(flap(), e['t0'] + k * 0.14, 0.8, pan=0.3)
    sfx.add(whoosh(1.0, 600, 2200, 0.7), e['t0'] + 0.2, 0.6, pan=0.4)
    # S4
    s = S['s4']
    ls = lines('s4')
    first_tiko = next(l for l in ls if l['who'] == 'tiko')
    cue(music, 'chaos', s['t0'], first_tiko['t1'], 0.55)
    mama1 = next(l for l in ls if l['who'] == 'mama')
    cue(music, 'pastoral', first_tiko['t1'], mama1['t0'] - 0.2, 0.5)
    mthink = next(l for l in ls if l['who'] == 'mama' and l['mode'] == 'think')
    cue(music, 'warm', mama1['t0'] - 0.2, mthink['t0'], 0.7)
    eh = E('s4', 'heartbreak')
    cue(music, 'mystery', mthink['t0'], eh['t0'] + 0.1, 0.7, fade_out=0.3)
    sfx.add(heartbeat(), eh['t0'] + 0.2, 0.7)
    sfx.add(heartbeat(), eh['t0'] + 1.0, 0.6)
    cue(music, 'sad', eh['t1'], s['t1'], 0.7, fade_in=1.2)
    # S5
    s = S['s5']
    ls = lines('s5')
    banana = next(l for l in ls if 'Bananas' in l['text'])
    cue(music, 'sad', s['t0'], banana['t0'], 0.7)
    cue(music, 'comedic', banana['t0'], banana['t1'] + 3.5, 0.55)
    eh = E('s5', 'heartbreak')
    cue(music, 'mystery', banana['t1'] + 3.5, eh['t0'], 0.6)
    sfx.add(heartbeat(), eh['t0'] + 0.2, 0.8)
    sfx.add(heartbeat(), eh['t0'] + 1.0, 0.7)
    er = E('s5', 'tiko_runs')
    cue(music, 'tense', er['t0'] - 1.5, s['t1'], 0.75)
    # S5b
    s = S['s5b']
    cue(music, 'urgent', s['t0'], s['t1'], 0.65)
    # S6
    s = S['s6']
    ec, ed = E('s6', 'star_crack'), E('s6', 'star_dim')
    cue(music, 'sad', s['t0'], ec['t0'], 0.75)
    cue(music, 'chaos', ec['t0'], ed['t0'] + 0.2, 0.9, fade_in=0.4, fade_out=0.3)
    music.add(riser(ed['t0'] - ec['t0']), ec['t0'], 0.6)
    sfx.add(glass_crack(), ec['t0'] + 0.95, 0.9)
    sfx.add(glass_crack(), ec['t0'] + 2.3, 1.0)
    sfx.add(crack_sfx(1.0), ec['t0'] + 1.6, 0.7)
    sfx.add(bell(midi(57), 3.0, 0.6) + bell(midi(64), 3.0, 0.4), ed['t0'] + 0.3, 0.6)
    cue(music, 'tender', ed['t1'] + 0.5, s['t1'], 0.7, fade_in=2.5)
    # S7
    s = S['s7']
    es_ = E('s7', 'surprise')
    cue(music, 'tense', s['t0'], es_['t1'] - 0.05, 0.35, fade_out=0.05)
    sfx.add(heartbeat(), es_['t0'] + 0.1, 0.6)
    sfx.add(heartbeat(), es_['t0'] + 0.8, 0.6)
    tb = es_['t1']
    sfx.add(impact() * 0.4, tb, 0.6)
    for k in range(4):
        sfx.add(popper(), tb + 0.05 + k * 0.09, 0.7, pan=-0.6 + k * 0.4)
    sfx.add(sparkle_burst(2.0, 24, 1300, 2.2, 1.2), tb + 0.1, 0.8)
    music.add(brass_chord(chord_freqs(0, 'M', 4), 1.4), tb + 0.02, 1.4)
    etr = E('s7', 'treehouse_reveal')
    cue(music, 'party', tb + 0.6, etr['t0'], 0.75, fade_in=0.1)
    ls = lines('s7')
    coco2 = next(l for l in ls if l['who'] == 'coco' and 'same' in l['text'])
    cue(music, 'tender', etr['t0'], coco2['t0'], 0.75)
    sfx.add(harp := sparkle_burst(2.5, 18, 900, 2.5, 1.0), etr['t0'] + 0.3, 0.8)
    efw = E('s7', 'fireworks')
    cue(music, 'comedic', coco2['t0'], efw['t0'], 0.55)
    for k in range(3):
        tk = efw['t0'] + 0.1 + k * 1.2
        sfx.add(launch_whistle(0.75), tk, 0.6)
        sfx.add(boom(), tk + 0.75, 0.9, pan=-0.4 + k * 0.4)
    cue(music, 'party', efw['t0'] + 0.8, efw['t1'] + 2.5, 0.65)
    cue(music, 'tender', efw['t1'] + 2.0, s['t1'], 0.7)
    # S8
    s = S['s8']
    ess, estc, elaugh, eend = E('s8', 'sneeze_star'), E('s8', 'star_to_coco'), E('s8', 'everyone_laughs'), E('s8', 'end_card')
    cue(music, 'tender', s['t0'], ess['t0'] + 0.5, 0.7)
    clip = next(i for i in items if i['type'] == 'clip' and i['event'] == 'sneeze_star')
    sfx.add(whoosh(0.5, 600, 2500, 1.0), clip['peak'], 0.7)
    sfx.add(impact() * 0.5, clip['peak'] + 0.45, 0.7)
    sfx.add(sparkle_burst(1.5, 18, 1500, 2.2, 1.2), clip['peak'] + 0.5, 0.9)
    sfx.add(slide_whistle(700, 2600, 1.2), clip['peak'] + 1.0, 0.4)
    cue(music, 'mystery', ess['t0'] + 0.5, estc['t1'], 0.7)
    sfx.add(slide_whistle(2600, 1200, 1.4), estc['t0'], 0.4)
    sfx.add(plink(), estc['t0'] + 1.6, 0.9)
    sfx.add(ring_tone(1.5), estc['t0'] + 1.65, 0.5)
    ls = lines('s8')
    uhoh = next(l for l in ls if 'Uh-oh' in l['text'])
    music.add(wah_wah(), uhoh['t1'] + 0.05, 1.3)
    cue(music, 'comedic', uhoh['t1'] + 1.4, elaugh['t0'], 0.5)
    cue(music, 'party', elaugh['t0'], DUR, 0.75, fade_out=0.01)
    # final chord + bell on the end card
    music.add(brass_chord(chord_freqs(0, 'M', 4), 3.0), DUR - 3.2, 1.0)
    sfx.add(bell(midi(72), 3.0, 1.0) + bell(midi(79), 3.0, 0.6), DUR - 3.2, 0.6)

    # ---------------- mix: music ducked under dialogue
    voice = dlg.buf + thoughts.buf
    env = np.abs(voice).max(axis=1)
    k = int(0.05 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same')
    env = np.clip(env / 0.08, 0, 1)
    sm = lfilter([0.0008], [1, -0.9992], env)
    sm = np.maximum(sm, env * 0.6)
    duck = 1.0 - 0.55 * np.clip(sm, 0, 1)
    mus_rev = np.stack([fftconvolve(music.buf[:, c], reverb_ir(2.0, 2.5, 5)[:, c])[:N] for c in range(2)], axis=1)
    mus = (music.buf * 0.85 + mus_rev * 0.18) * duck[:, None] * 0.8
    mix = voice * 1.0 + mus + sfx.buf * 0.7 + amb.buf * 0.8
    if os.environ.get('STEMS'):
        for nm, b in (('voice', voice), ('music', mus), ('sfx', sfx.buf * 0.7), ('amb', amb.buf * 0.8)):
            np.save(os.path.join(HERE, 'out', f'stem_{nm}.npy'), b[::48].astype(np.float32))
    # end fade
    fe = int(1.0 * SR)
    mix[-fe:] *= np.linspace(1, 0, fe)[:, None] ** 0.5
    # gentle limiter
    peak = np.max(np.abs(mix))
    mix = np.tanh(mix / max(peak, 1e-6) * 1.6) / np.tanh(1.6) * 0.89
    out = os.path.join(HERE, 'out', 'soundtrack.wav')
    sf.write(out, mix.astype(np.float32), SR, subtype='PCM_16')
    print('wrote', out, mix.shape[0] / SR, 's')


if __name__ == '__main__':
    build()
