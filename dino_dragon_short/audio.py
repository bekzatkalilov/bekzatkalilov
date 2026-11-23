"""Synthesise the soundtrack: cheerful music + cartoon sound effects, exactly 20 s.

All sounds are generated procedurally (no samples), so the audio is fully original.
"""
import math
import os
import numpy as np
from scipy.signal import lfilter, butter, fftconvolve
from scipy.io import wavfile

import anim

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))


def tt(d):
    return np.arange(int(d * SR)) / SR


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.1, sus_len=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    if sus_len is None:
        sus_len = max(n - a_n - d_n - r_n, 0)
    e = np.concatenate([np.linspace(0, 1, max(a_n, 1)), np.linspace(1, s, max(d_n, 1)),
                        np.full(int(sus_len), s), np.linspace(s, 0, max(r_n, 1))])
    if len(e) < n:
        e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n]


def bandpass(x, f, q):
    w0 = 2 * math.pi * f / SR
    alpha = math.sin(w0) / (2 * q)
    b = [alpha, 0, -alpha]
    a = [1 + alpha, -2 * math.cos(w0), 1 - alpha]
    return lfilter(b, a, x)


def lowpass(x, f, order=2):
    b, a = butter(order, min(f / (SR / 2), 0.99), 'low')
    return lfilter(b, a, x)


def highpass(x, f, order=2):
    b, a = butter(order, min(f / (SR / 2), 0.99), 'high')
    return lfilter(b, a, x)


class Track:
    def __init__(self):
        self.buf = np.zeros((N, 2))

    def add(self, sig, t0, gain=1.0, pan=0.0):
        i0 = int(t0 * SR)
        if i0 >= N:
            return
        if i0 < 0:
            sig = sig[-i0:]
            i0 = 0
        sig = sig[:N - i0]
        l = math.cos((pan + 1) * math.pi / 4)
        r = math.sin((pan + 1) * math.pi / 4)
        self.buf[i0:i0 + len(sig), 0] += sig * gain * l * 1.414
        self.buf[i0:i0 + len(sig), 1] += sig * gain * r * 1.414


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ instruments
def pluck(freq, dur=0.9, bright=0.6):
    """Karplus-Strong plucked string (ukulele-ish), vectorised per period."""
    n = int(dur * SR)
    p = max(int(SR / freq), 2)
    buf = rng.uniform(-1, 1, p)
    buf = lowpass(buf, 2000 + 6000 * bright, 1)
    out = np.zeros(n + p + 1)
    out[:p] = buf
    i = p
    decay = 0.996
    while i < n:
        j = min(i + p, n)
        seg = 0.5 * (out[i - p:j - p] + out[i - p + 1:j - p + 1]) * decay
        out[i:j] = seg
        i = j
    out = out[:n]
    out *= np.linspace(1, 0.0, n) ** 0.5
    return out * 0.6


def bell(freq, dur=1.2, gain=1.0):
    t = tt(dur)
    s = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.5)
         + 0.45 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 7)
         + 0.25 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 12)
         + 0.12 * np.sin(2 * np.pi * freq * 8.9 * t) * np.exp(-t * 20))
    s *= np.minimum(t / 0.002, 1)
    return s * 0.35 * gain


def bass(freq, dur=0.45):
    t = tt(dur)
    ph = 2 * np.pi * freq * t
    s = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    e = np.minimum(t / 0.008, 1) * np.exp(-t * 4.0)
    return s * e * 0.55


def pad(freqs, dur, attack=0.4, release=0.6):
    t = tt(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            s += 2 * (t * ff % 1) - 1
    s = lowpass(s, 1800, 2)
    e = env_adsr(len(t), attack, 0.2, 0.8, release)
    return s * e * 0.05 / len(freqs)


def kick():
    t = tt(0.3)
    f = 120 * np.exp(-t * 25) + 45
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 10) * 0.8


def snare():
    t = tt(0.22)
    n = highpass(rng.normal(0, 1, len(t)), 1500) * np.exp(-t * 22)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (n * 0.35 + tone * 0.3)


def shaker():
    t = tt(0.08)
    return highpass(rng.normal(0, 1, len(t)), 6000) * np.exp(-t * 60) * 0.18


def clap():
    t = tt(0.2)
    n = bandpass(rng.normal(0, 1, len(t)), 1200, 1.2)
    e = np.zeros_like(t)
    for k in range(3):
        e += np.exp(-np.maximum(t - k * 0.01, 0) * 60) * (t >= k * 0.01)
    return n * e * 0.4


# ------------------------------------------------------------------ voice (formant) synthesis
VOWELS = {
    'a': [(850, 1.0, 80), (1350, 0.6, 90), (2800, 0.3, 120)],
    'e': [(500, 1.0, 70), (2200, 0.5, 100), (3000, 0.3, 120)],
    'i': [(330, 1.0, 60), (2700, 0.4, 100), (3400, 0.3, 120)],
    'o': [(560, 1.0, 70), (950, 0.7, 80), (2600, 0.2, 120)],
    'u': [(380, 1.0, 60), (900, 0.4, 80), (2400, 0.15, 120)],
}


def voice(pitch_curve, vowel, dur, breath=0.15, scale=1.25):
    """pitch_curve: function of normalised time -> Hz."""
    t = tt(dur)
    x = t / dur
    f0 = pitch_curve(x) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    ph = np.cumsum(f0) / SR
    src = 2 * (ph % 1) - 1               # sawtooth glottal source
    src = src + breath * rng.normal(0, 1, len(t))
    out = np.zeros_like(t)
    for f, g, bw in VOWELS[vowel]:
        out += g * bandpass(src, f * scale, f * scale / (bw * 1.2))
    return out


def syllable(pitch, vowel, dur, h=0.04, fall=0.85, scale=1.25, gain=1.0):
    v = voice(lambda x: pitch * (1 - (1 - fall) * x), vowel, dur, scale=scale)
    e = env_adsr(len(v), 0.012, dur * 0.3, 0.6, dur * 0.45)
    v *= e
    if h > 0:
        hn = bandpass(rng.normal(0, 1, int(h * SR)), 1800 * scale, 1.0) * np.linspace(0.2, 1, int(h * SR)) * 0.25
        v = np.concatenate([hn, v])
    return v * gain


def laugh(t0, t1, pitch, rate, vowel, track, gain, pan, seed=0):
    r = np.random.default_rng(seed)
    t = t0
    k = 0
    while t < t1:
        p = pitch * (1.0 + 0.12 * math.sin(k * 1.7)) * (1.06 if k % 4 == 0 else 1.0)
        d = 0.75 / rate
        track.add(syllable(p, vowel, d, h=0.035, fall=0.8), t, gain * (0.85 + 0.3 * r.random()), pan)
        t += 1.0 / rate * (0.9 + 0.2 * r.random())
        k += 1
        if k % 6 == 0:
            t += 0.12                      # breath between giggle bursts


# ------------------------------------------------------------------ sfx
def boing(f0=300, f1=600, dur=0.35, vib=18):
    t = tt(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 12))
    f = f * (1 + 0.15 * np.sin(2 * np.pi * vib * t) * np.exp(-t * 4))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 6) * np.minimum(t / 0.004, 1) * 0.6


def footstep(pitch=1.0):
    t = tt(0.12)
    f = 220 * pitch * np.exp(-t * 18) + 90
    ph = 2 * np.pi * np.cumsum(f) / SR
    thump = np.sin(ph) * np.exp(-t * 35)
    rustle = bandpass(rng.normal(0, 1, len(t)), 3000, 0.8) * np.exp(-t * 50) * 0.15
    return (thump * 0.5 + rustle)


def sparkle_burst(dur=1.0, n=14, base=1500, spread=2.2, gain=1.0):
    out = np.zeros(int((dur + 0.8) * SR))
    scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
    for i in range(n):
        st = int(rng.uniform(0, dur) * SR)
        f = base * 2 ** (rng.choice(scale) / 12.0 * spread / 2)
        b = bell(f, 0.6, 0.25)
        out[st:st + len(b)] += b[:len(out) - st]
    return out * gain


def harp_gliss(start_m, n=10, step=0.045, up=True, gain=1.0):
    scale = [0, 2, 4, 7, 9]
    out = np.zeros(int((n * step + 1.2) * SR))
    for i in range(n):
        idx = i if up else n - 1 - i
        m = start_m + 12 * (idx // 5) + scale[idx % 5]
        p = pluck(midi(m), 1.0, 0.9)
        st = int(i * step * SR)
        out[st:st + len(p)] += p[:len(out) - st]
    return out * gain


def crack(intensity=1.0):
    d = 0.18
    t = tt(d)
    out = np.zeros(len(t))
    for k in range(int(5 + 6 * intensity)):
        st = int(rng.uniform(0, 0.12) * SR)
        ln = int(rng.uniform(0.004, 0.015) * SR)
        burst = rng.normal(0, 1, ln) * np.exp(-np.arange(ln) / (ln * 0.3))
        out[st:st + ln] += burst[:len(out) - st] * rng.uniform(0.4, 1.0)
    out = bandpass(out, 2500, 1.5) + 0.4 * bandpass(out, 900, 2.0)
    return out * 0.7 * intensity


def tok(f=650):
    t = tt(0.09)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + 0.4 * np.sin(2 * np.pi * f * 2.3 * t) * np.exp(-t * 70)
    s += bandpass(rng.normal(0, 1, len(t)), 2000, 2) * np.exp(-t * 80) * 0.3
    return s * 0.5


def pop():
    t = tt(0.25)
    f = 1400 * np.exp(-t * 60) + 180
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 18)
    s += highpass(rng.normal(0, 1, len(t)), 800) * np.exp(-t * 40) * 0.5
    return s * 0.8


def whoosh(dur=0.5, f0=400, f1=2500, gain=1.0, crackle=0.0):
    t = tt(dur)
    noise = rng.normal(0, 1, len(t))
    out = np.zeros_like(t)
    # time-varying bandpass approximated with overlapping blocks
    blk = 1024
    for i in range(0, len(t), blk // 2):
        seg = noise[i:i + blk]
        x = i / len(t)
        fc = f0 + (f1 - f0) * x
        y = bandpass(seg, fc, 1.2) * np.hanning(len(seg))
        out[i:i + len(seg)] += y
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    out *= e
    if crackle > 0:
        c = (rng.random(len(t)) > 0.9985).astype(float) * rng.normal(0, 1, len(t))
        out += lowpass(c, 4000) * 3 * crackle * e
    return out * gain


def puff(dur=0.5):
    t = tt(dur)
    n = lowpass(rng.normal(0, 1, len(t)), 700, 2)
    return n * np.exp(-t * 7) * np.minimum(t / 0.01, 1) * 1.2


def slide_whistle(f0, f1, dur):
    t = tt(dur)
    f = np.exp(np.linspace(math.log(f0), math.log(f1), len(t)))
    f *= 1 + 0.01 * np.sin(2 * np.pi * 7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.08 * rng.normal(0, 1, len(t))
    s = lowpass(s, 3000)
    return s * env_adsr(len(t), 0.02, 0.05, 0.9, 0.06) * 0.35


def chirp(f0, f1, dur=0.12):
    t = tt(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 1.5
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.sin(np.pi * t / dur) * 0.4


# ------------------------------------------------------------------ build
def build():
    music = Track()
    sfx = Track()
    vox = Track()

    bpm = 120
    beat = 60 / bpm
    # chord roots in MIDI for each bar (4 beats = 2 s); key C major
    C, Am, F, G, Em, Dm = [48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47], [38, 41, 45]

    def music_bar(bar_t, chord, style, gain=1.0, melody=None):
        root = chord[0]
        if style == 'walk':
            # bouncy bass on 1 & 3, ukulele strums on 2 & 4 + offbeats, light drums
            for b in range(4):
                bt = bar_t + b * beat
                if b % 2 == 0:
                    music.add(bass(midi(root - 12 + (7 if b == 2 else 0))), bt, 0.9 * gain)
                    music.add(kick(), bt, 0.55 * gain)
                else:
                    music.add(snare(), bt, 0.35 * gain)
                for k, m in enumerate(chord):
                    music.add(pluck(midi(m + 12), 0.5, 0.5), bt + beat * 0.5 + k * 0.012, 0.32 * gain, -0.25)
                music.add(shaker(), bt + beat * 0.25, 0.5 * gain, 0.4)
                music.add(shaker(), bt + beat * 0.75, 0.5 * gain, 0.4)
        elif style == 'magic':
            music.add(pad([midi(m + 12) for m in chord], 2.2, 0.5, 0.8), bar_t, 1.4 * gain)
            arp = chord + [m + 12 for m in chord]
            for k in range(8):
                music.add(bell(midi(arp[k % len(arp)] + 24), 1.0, 0.5), bar_t + k * beat / 2, 0.6 * gain, 0.3 * math.sin(k))
        elif style == 'suspense':
            music.add(pad([midi(m + 12) for m in chord], 2.2, 0.2, 0.4), bar_t, 1.2 * gain)
            for k in range(8):
                music.add(pluck(midi(root), 0.25, 0.3), bar_t + k * beat / 2, 0.35 * gain)
        if melody:
            for (off, m, d) in melody:
                music.add(bell(midi(m), max(d, 0.6), 0.9), bar_t + off * beat, 0.55 * gain, 0.15)
                music.add(pluck(midi(m), max(d, 0.5), 0.8), bar_t + off * beat, 0.18 * gain, 0.15)

    # A: walking in 0 - 3 s
    mel1 = [(0, 72, 0.5), (0.5, 74, 0.5), (1, 76, 0.5), (1.5, 79, 0.5), (2, 76, 0.5), (3, 74, 0.5), (3.5, 72, 0.5)]
    mel2 = [(0, 69, 0.5), (0.5, 72, 0.5), (1, 77, 1.0), (2, 76, 0.5), (2.5, 74, 0.5)]
    music_bar(0.0, C, 'walk', 0.9, mel1)
    music_bar(2.0, Am, 'walk', 0.55, mel2[:3])
    # B: discovery / magic 3 - 6.4
    music_bar(3.0, F, 'magic', 1.5)
    music_bar(5.0, Am, 'magic', 1.4)
    # C: suspense 6.4 - 10.2 (rising)
    music_bar(6.4, Dm, 'suspense', 1.2)
    music_bar(8.2, [c + 2 for c in Dm], 'suspense', 1.4)
    music.add(pad([midi(62), midi(67), midi(71)], 1.4, 0.8, 0.2), 8.9, 0.9)
    # D: after the pop, playful pizzicato 10.3 - 12.6
    for k in range(9):
        m = [72, 76, 79, 76, 74, 77, 81, 77, 79][k]
        music.add(pluck(midi(m), 0.35, 0.7), 10.6 + k * 0.22, 0.35, 0.2)
        if k % 2 == 0:
            music.add(bass(midi([48, 50, 53, 55, 48][k // 2] - 12), 0.3), 10.6 + k * 0.22, 0.5)
    music.add(pad([midi(60), midi(64), midi(67)], 1.8, 0.4, 0.7), 10.6, 0.6)
    # E: hold during ah.. ah.. (sparse rising notes), silence at CHOO
    for k, m in enumerate([67, 69, 71, 72]):
        music.add(bell(midi(m + 12), 0.5, 0.5), 12.7 + k * 0.22, 0.35)
    # F: laughing finale 14.8 - 20, full and bouncy
    prog = [(14.8, C), (16.8, G), (17.8, Am), (18.8, F)]
    mel3 = [(0, 79, 0.5), (0.5, 76, 0.5), (1, 79, 0.5), (1.5, 81, 0.5), (2, 79, 0.5), (2.5, 76, 0.5), (3, 72, 0.5), (3.5, 74, 0.5)]
    music_bar(14.8, C, 'walk', 0.85, mel3)
    music_bar(16.8, G, 'walk', 0.85, [(0, 74, 0.5), (0.5, 77, 0.5), (1, 79, 0.5), (1.5, 83, 0.5)])
    music_bar(17.8, Am, 'walk', 0.85, [(0, 81, 0.5), (0.5, 79, 0.5), (1, 76, 0.5), (1.5, 79, 0.5)])
    # final cadence F -> C, ring out by 20 s
    for k, m in enumerate([65, 69, 72, 77]):
        music.add(pluck(midi(m), 0.5, 0.6), 18.8 + k * 0.012, 0.35)
    music.add(bass(midi(41 - 12 + 12), 0.4), 18.8, 0.8)
    music.add(kick(), 18.8, 0.5)
    music.add(snare(), 19.05, 0.3)
    final = [60, 64, 67, 72, 76]
    for k, m in enumerate(final):
        music.add(pluck(midi(m), 0.75, 0.7) * np.linspace(1, 0, int(0.75 * SR)), 19.2 + k * 0.03, 0.4)
        music.add(bell(midi(m + 12), 0.75, 0.6) * np.linspace(1, 0, int(0.75 * SR)), 19.2 + k * 0.03, 0.4)
    music.add(bass(midi(36), 0.75) * np.linspace(1, 0, int(0.75 * SR)), 19.2, 0.9)
    music.add(kick(), 19.2, 0.6)
    music.add(clap(), 19.2, 0.4)

    # -------------------------------------------------------------- SFX
    # footsteps from the dino walk phase
    prev = None
    for i in range(int(16 * SR / 400)):
        t = i * 400 / SR
        d = anim.dino(t)
        ph, amt = d['uDMisc'][2], d['uDMisc'][3]
        s = math.sin(ph)
        if prev is not None and (s > 0) != (prev > 0) and amt > 0.3:
            sfx.add(footstep(1.0 + 0.1 * rng.random()), t, 0.5 * amt, -0.3)
        prev = s
    # discovery "!" ding + little gasp
    sfx.add(bell(midi(88), 1.0, 1.0), 2.95, 0.5, 0.1)
    sfx.add(bell(midi(95), 0.8, 1.0), 3.02, 0.35, 0.1)
    vox.add(syllable(420, 'o', 0.22, h=0.03, fall=1.25), 2.98, 0.35, -0.2)
    sfx.add(harp_gliss(72, 10, 0.05), 3.1, 0.35, 0.2)
    # egg shimmer throughout
    sfx.add(sparkle_burst(6.5, 22, 2200, 2.0), 3.4, 0.18, 0.3)
    # curious "hmm?" from dino at the head tilt
    vox.add(voice(lambda x: 300 * (1 + 0.35 * x * x), 'u', 0.35) * env_adsr(int(0.35 * SR), 0.03, 0.1, 0.7, 0.12), 4.2, 0.3, -0.2)
    # egg wobbles: wooden toks timed to tilt peaks
    prev_sign = 0
    for i in range(int(6.4 * SR / 200), int(10.2 * SR / 200)):
        t = i * 200 / SR
        e = anim.egg(t)
        tx = e['uEWob'][0]
        sgn = 1 if tx > 0 else -1
        if prev_sign and sgn != prev_sign and abs(e['uEWob'][0]) + abs(e['uEWob'][1]) > 0.0:
            wob_amt = min(1.0, abs(anim.kf(t, [(6.4, 0.0), (7.0, 0.07), (7.6, 0.0), (8.2, 0.0), (8.6, 0.1), (9.0, 0.06), (9.4, 0.16), (10.15, 0.22)])) * 7)
            if wob_amt > 0.15:
                sfx.add(tok(600 + 200 * rng.random()), t, 0.5 * wob_amt, 0.35)
        prev_sign = sgn
    # cracks
    sfx.add(crack(0.7), 8.5, 0.8, 0.35)
    sfx.add(crack(0.9), 9.0, 0.9, 0.35)
    sfx.add(crack(1.0), 9.6, 1.0, 0.35)
    sfx.add(crack(1.0), 9.95, 1.0, 0.35)
    # rising tension whine
    sfx.add(slide_whistle(500, 1200, 1.2) * 0.4, 9.0, 0.35, 0.2)
    # POP!
    sfx.add(pop(), 10.2, 1.1, 0.3)
    sfx.add(whoosh(0.4, 600, 4000, 0.6), 10.18, 0.6, 0.3)
    sfx.add(sparkle_burst(1.0, 18, 1800, 2.4), 10.2, 0.45, 0.2)
    sfx.add(harp_gliss(67, 15, 0.035), 10.22, 0.45, 0.1)
    vox.add(syllable(330, 'o', 0.38, h=0.05, fall=0.7), 10.25, 0.4, -0.3)      # dino "whoa!"
    # dragon boing jump + flutter + landing
    sfx.add(boing(350, 900, 0.5, 16), 10.3, 0.6, 0.2)
    flutter = np.zeros(int(1.0 * SR))
    for k in range(7):
        w = whoosh(0.1, 300, 900, 0.6)
        flutter[int(k * SR / 7):int(k * SR / 7) + len(w)] += w[:len(flutter) - int(k * SR / 7)]
    sfx.add(flutter, 10.35, 0.35, 0.15)
    vox.add(syllable(760, 'i', 0.22, h=0.0, fall=1.2, scale=1.5), 10.45, 0.35, 0.2)   # tiny "wee!"
    sfx.add(footstep(1.6), 11.3, 0.8, 0.1)
    sfx.add(boing(220, 160, 0.25, 22), 11.3, 0.3, 0.1)
    # dragon curious chirps
    sfx.add(chirp(900, 1500, 0.13), 11.62, 0.35, 0.1)
    sfx.add(chirp(1300, 900, 0.15), 11.92, 0.35, 0.1)
    sfx.add(chirp(900, 1700, 0.18), 12.22, 0.35, 0.1)
    # ah... ah... CHOO!
    vox.add(voice(lambda x: 620 + 180 * x, 'a', 0.38) * env_adsr(int(0.38 * SR), 0.06, 0.1, 0.8, 0.12), 12.85, 0.4, 0.1)
    vox.add(voice(lambda x: 720 + 260 * x, 'a', 0.42) * env_adsr(int(0.42 * SR), 0.06, 0.1, 0.8, 0.1), 13.12, 0.45, 0.1)
    choo_n = highpass(rng.normal(0, 1, int(0.3 * SR)), 1500) * np.exp(-tt(0.3) * 9)
    choo_v = syllable(700, 'u', 0.28, h=0.0, fall=0.6, scale=1.5)
    sfx.add(choo_n, 13.58, 0.6, 0.1)
    vox.add(choo_v, 13.6, 0.55, 0.1)
    sfx.add(whoosh(0.55, 300, 1800, 1.0, crackle=1.0), 13.6, 0.8, -0.1)
    sfx.add(puff(0.6), 14.12, 0.8, -0.4)
    sfx.add(sparkle_burst(0.4, 6, 1500, 1.5), 14.12, 0.25, -0.4)
    # dino yelp + jump
    vox.add(syllable(520, 'i', 0.18, h=0.02, fall=1.3), 13.88, 0.45, -0.3)
    sfx.add(slide_whistle(600, 1500, 0.32), 14.0, 0.45, -0.3)
    sfx.add(footstep(0.9), 14.45, 0.8, -0.3)
    sfx.add(boing(180, 140, 0.3, 14), 14.45, 0.3, -0.3)
    # embarrassed little "hehe" from dragon
    vox.add(syllable(820, 'e', 0.12, h=0.03, fall=0.9, scale=1.5), 14.6, 0.25, 0.15)
    vox.add(syllable(780, 'e', 0.12, h=0.03, fall=0.9, scale=1.5), 14.75, 0.22, 0.15)
    # laughter
    laugh(15.15, 19.5, 300, 4.6, 'a', vox, 0.42, -0.3, seed=1)
    laugh(15.3, 19.6, 620, 5.3, 'i', vox, 0.32, 0.25, seed=2)
    # happy sparkles at the end
    sfx.add(sparkle_burst(4.0, 16, 2000, 2.0), 15.5, 0.15, 0.0)

    # -------------------------------------------------------------- mix
    def reverb(x, rt=1.2, wet=0.18):
        n = int(rt * SR)
        ir = rng.normal(0, 1, (n, 2)) * np.exp(-np.arange(n) / SR * 6.9 / rt)[:, None]
        ir[:, 0] = lowpass(ir[:, 0], 6000)
        ir[:, 1] = lowpass(ir[:, 1], 6000)
        ir /= np.sqrt((ir ** 2).sum(0))
        y = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
        return x + y * wet

    m = reverb(music.buf, 1.4, 0.25) * 0.55
    s = reverb(sfx.buf, 0.8, 0.12) * 0.9
    v = reverb(vox.buf, 0.6, 0.12) * 1.0
    # duck the music a little under the big moments
    duck = np.ones(N)
    for (a, b, g) in [(10.15, 10.8, 0.6), (13.55, 14.4, 0.4), (15.1, 19.6, 0.8)]:
        i0, i1 = int(a * SR), int(b * SR)
        duck[i0:i1] = np.minimum(duck[i0:i1], g)
    duck = lowpass(duck, 8, 1)
    mix = m * duck[:, None] + s + v
    mix = highpass(mix.T, 35).T
    rms = np.sqrt((mix ** 2).mean())
    mix = mix * (0.15 / rms)
    mix = 0.95 * np.tanh(mix / 0.95)                # soft limiter
    # fades
    fi = int(0.02 * SR)
    fo = int(0.35 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    assert mix.shape[0] == N
    out = os.path.join(HERE, 'out', 'soundtrack.wav')
    wavfile.write(out, SR, (mix * 32767).astype(np.int16))
    print('wrote', out, mix.shape, 'peak', np.max(np.abs(mix)))


if __name__ == '__main__':
    build()
