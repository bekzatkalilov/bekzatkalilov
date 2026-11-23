"""Synthesise every line of the script with each character's own Kokoro neural voice.

Outputs (in out/voices/):
  <idx>_<who>.wav     48 kHz mono, pitch-shifted per character, silence trimmed
  lines.json          per line: file, duration, lip-sync curves (100 Hz) for mouth open + width

usage: python voices.py [--models DIR]
"""
import hashlib
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

import script

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out', 'voices')
SR = 48000
LIP_HZ = 100


def all_lines():
    """Flatten the script into a list of (scene_id, beat_index, beat) for every line incl. chorus parts."""
    res = []
    for sc in script.SCENES:
        for bi, b in enumerate(sc['beats']):
            if b['kind'] == 'line':
                res.append((sc['id'], bi, b))
    return res


def line_key(sid, b, spk):
    return f"{sid}:{spk}:" + hashlib.md5(b['text'].encode()).hexdigest()[:8]


def tts_text(text):
    # Kokoro reads ALL-CAPS words as acronyms; keep emphasis for subtitles only.
    words = []
    for w in text.split(' '):
        core = ''.join(ch for ch in w if ch.isalpha())
        if len(core) > 1 and core.isupper() and core not in ('OK',):
            w = w.lower()
        words.append(w)
    t = ' '.join(words).replace('—', '...')
    return t


def pitch_shift(x, sr, ratio):
    if abs(ratio - 1.0) < 1e-3:
        return x
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
                        '-af', f'rubberband=pitch={ratio}:transients=smooth:formant=shifted',
                        '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def trim(x, thr=0.012, pad=0.04):
    a = np.abs(x)
    k = int(0.01 * SR)
    env = np.convolve(a, np.ones(k) / k, mode='same')
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return x
    i0 = max(idx[0] - int(pad * SR), 0)
    i1 = min(idx[-1] + int(pad * SR), len(x))
    y = x[i0:i1].copy()
    f = int(0.008 * SR)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    return y


def lip_curves(x):
    """Mouth opening (0..1) and width (0 round 'oo' .. 1 wide 'ee') at LIP_HZ."""
    hop = SR // LIP_HZ
    win = int(0.032 * SR)
    n = len(x) // hop + 1
    xp = np.concatenate([np.zeros(win // 2), x, np.zeros(win)])
    rms = np.zeros(n)
    cen = np.zeros(n)
    w = np.hanning(win)
    freqs = np.fft.rfftfreq(win, 1 / SR)
    for i in range(n):
        seg = xp[i * hop:i * hop + win] * w
        rms[i] = np.sqrt(np.mean(seg ** 2) + 1e-12)
        sp = np.abs(np.fft.rfft(seg))
        band = (freqs > 200) & (freqs < 5000)
        cen[i] = np.sum(freqs[band] * sp[band]) / (np.sum(sp[band]) + 1e-9)
    ref = np.percentile(rms, 92) + 1e-6
    o = np.clip((rms / ref - 0.10) / 0.85, 0, 1) ** 0.75
    # attack/release smoothing so the jaw moves like a jaw
    sm = np.zeros_like(o)
    v = 0.0
    for i, t in enumerate(o):
        k = 0.65 if t > v else 0.35
        v += (t - v) * k
        sm[i] = v
    width = np.clip((cen - 900) / 1800, 0, 1)
    width = np.convolve(width, np.ones(5) / 5, mode='same')
    return sm, width


def main():
    models = os.path.join(os.path.dirname(HERE), 'models')
    if '--models' in sys.argv:
        models = sys.argv[sys.argv.index('--models') + 1]
    os.makedirs(OUT, exist_ok=True)
    from kokoro_onnx import Kokoro
    kok = Kokoro(os.path.join(models, 'kokoro-v1.0.onnx'), os.path.join(models, 'voices-v1.0.bin'))
    meta_path = os.path.join(OUT, 'lines.json')
    old = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    meta = {}
    for li, (sid, bi, b) in enumerate(all_lines()):
        speakers = [b['who']] + list(b.get('chorus', []))
        for spk in speakers:
            cast = script.CAST[spk]
            key = line_key(sid, b, spk)
            text = tts_text(b['text'])
            h = hashlib.md5(f"{text}|{cast['voice']}|{cast['speed']}|{cast['pitch']}|{b.get('loud')}".encode()).hexdigest()[:10]
            fn = f'{sid}_{spk}_{h}.wav'
            path = os.path.join(OUT, fn)
            reuse = next((ov for ov in old.values() if ov['hash'] == h and os.path.exists(os.path.join(OUT, ov['file']))), None)
            if reuse is not None:
                meta[key] = reuse
                continue
            s, sr = kok.create(text, voice=cast['voice'], speed=cast['speed'], lang='en-gb' if cast['voice'][0] == 'b' else 'en-us')
            s = np.asarray(s, dtype=np.float32)
            s = pitch_shift(s, sr, cast['pitch'])
            s = resample_poly(s, SR, sr).astype(np.float32)
            s = trim(s)
            s = s / (np.max(np.abs(s)) + 1e-6) * (0.92 if b.get('loud') else 0.8)
            sf.write(path, s, SR, subtype='FLOAT')
            op, wd = lip_curves(s)
            meta[key] = dict(hash=h, file=fn, dur=len(s) / SR, open=[round(float(v), 3) for v in op],
                             width=[round(float(v), 3) for v in wd])
            print(f'{key:16s} {len(s)/SR:5.2f}s  {cast["voice"]:10s} {b["text"][:60]}', flush=True)
    for xk, (spk, text, _sub) in script.EXTRA.items():
        cast = script.CAST[spk]
        key = f'x:{xk}'
        h = hashlib.md5(f"{text}|{cast['voice']}|{cast['speed']}|{cast['pitch']}".encode()).hexdigest()[:10]
        fn = f'x_{xk}.wav'
        path = os.path.join(OUT, fn)
        if key in old and old[key]['hash'] == h and os.path.exists(path):
            meta[key] = old[key]
            continue
        s, sr = kok.create(text, voice=cast['voice'], speed=cast['speed'], lang='en-gb' if cast['voice'][0] == 'b' else 'en-us')
        s = pitch_shift(np.asarray(s, dtype=np.float32), sr, cast['pitch'])
        s = trim(resample_poly(s, SR, sr).astype(np.float32))
        s = s / (np.max(np.abs(s)) + 1e-6) * 0.85
        sf.write(path, s, SR, subtype='FLOAT')
        op, wd = lip_curves(s)
        n0 = int(len(op) * 0.55)
        peak = (n0 + int(np.argmax(op[n0:]))) / LIP_HZ
        meta[key] = dict(hash=h, file=fn, dur=len(s) / SR, peak=peak, open=[round(float(x), 3) for x in op],
                         width=[round(float(x), 3) for x in wd])
        print(f'{key:16s} {len(s)/SR:5.2f}s  {cast["voice"]:10s} {text}', flush=True)
    json.dump(meta, open(meta_path, 'w'))
    tot = sum(v['dur'] for k, v in meta.items())
    print('lines:', len(meta), 'total speech %.1fs' % tot)


if __name__ == '__main__':
    main()
