"""EP02 animation: turns out/timeline.json into shader uniforms for any time t.

Everything is procedural: blocking + walking from moves, facial expressions from each line's
emotion, lip-sync from the voice clips, eye/head look-at, blinks, idle breathing, scripted events,
and an automatic shot library for the cameras.
"""
import json
import math
import os

import script

PI = math.pi
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')


# ------------------------------------------------------------------ helpers
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def lerp(a, b, t):
    if isinstance(a, (tuple, list)):
        return tuple(lerp(x, y, t) for x, y in zip(a, b))
    return a + (b - a) * t


def kf(t, keys, ease=smooth):
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            if t1 == t0:
                return v1
            return lerp(v0, v1, ease((t - t0) / (t1 - t0)))
    return keys[-1][1]


def pulse(t, t0, dur):
    x = (t - t0) / dur
    if abs(x) >= 1:
        return 0.0
    return 0.5 + 0.5 * math.cos(x * PI)


def damped(t, t0, freq=9.0, decay=6.0):
    if t < t0:
        return 0.0
    x = t - t0
    return math.exp(-decay * x) * math.sin(freq * x * 2 * PI)


def jump_arc(t, t0, t1, h):
    if t < t0 or t > t1:
        return 0.0
    x = (t - t0) / (t1 - t0)
    return 4 * h * x * (1 - x)


def wrap(a):
    while a > PI:
        a -= 2 * PI
    while a < -PI:
        a += 2 * PI
    return a


def hsh(x):
    return (math.sin(x * 12.9898 + 78.233) * 43758.5453) % 1.0


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def mul(a, s):
    return tuple(x * s for x in a)


def norm(a):
    l = math.sqrt(sum(x * x for x in a)) or 1.0
    return tuple(x / l for x in a)


# ------------------------------------------------------------------ data
TL = json.load(open(os.path.join(OUT, 'timeline.json')))
LIPS = json.load(open(os.path.join(OUT, 'voices', 'lines.json')))
SCENE_DEF = {s['id']: s for s in script.SCENES}
SCENES = TL['scenes']
ITEMS = TL['items']
BY_SCENE = {}
for it in ITEMS:
    BY_SCENE.setdefault(it['scene'], []).append(it)

LOC_ID = {'clearing': 0.0, 'pond': 1.0, 'nest': 2.0}
SIZE = {'tiko': 1.0, 'mama': 1.55, 'sparky': 0.47, 'prof': 1.0, 'coco': 1.0}
STAR_GROUND = (0.05, 0.09, -0.55)
STAR_PLACED = (-0.42, 0.07, -0.8)
PERCH_Y = {'s3': 1.245, 's5b': 1.03, 's7': 1.03, 's8': 1.03}


def scene_at(t):
    for s in SCENES:
        if t < s['t1']:
            return s
    return SCENES[-1]


def find_event(sid, name):
    for it in BY_SCENE.get(sid, []):
        if it['type'] == 'event' and it['name'] == name:
            return it
    return None


def find_clip(sid, event, key=None):
    for it in BY_SCENE.get(sid, []):
        if it['type'] == 'clip' and it['event'] == event and (key is None or it['key'] == key):
            return it
    return None


def ev_time(sid, name, default=1e9):
    e = find_event(sid, name)
    return e['t0'] if e else default


# ------------------------------------------------------------------ emotions -> face
# eye scale, brow raise, brow angle, smile, eye open, base mouth, head pitch, arm, tremble
EMO = {
    'neutral':     (1.00, 0.0, 0.0, 0.6, 1.0, 0.0, 0.0, 0.0, 0.0),
    'happy':       (1.05, 0.3, 0.0, 1.0, 1.0, 0.0, 0.05, 0.1, 0.0),
    'excited':     (1.15, 0.8, 0.0, 1.0, 1.0, 0.1, 0.08, 0.6, 0.0),
    'surprised':   (1.28, 1.0, 0.2, 0.0, 1.0, 0.2, 0.06, 0.3, 0.0),
    'shocked':     (1.34, 1.0, 0.3, -0.3, 1.0, 0.3, 0.08, 0.7, 0.0),
    'sly':         (0.95, 0.2, -0.4, 0.8, 0.72, 0.0, -0.02, 0.0, 0.0),
    'deadpan':     (0.95, -0.2, 0.0, 0.0, 0.6, 0.0, 0.0, 0.0, 0.0),
    'offended':    (1.10, 0.4, -0.6, -0.6, 0.9, 0.0, 0.08, 0.5, 0.0),
    'awe':         (1.26, 0.8, 0.3, 0.6, 1.0, 0.12, 0.0, 0.2, 0.0),
    'scared':      (1.30, 1.0, 0.9, -0.8, 1.0, 0.1, -0.05, 0.8, 0.012),
    'panic':       (1.32, 1.0, 1.0, -0.9, 1.0, 0.15, 0.0, 0.9, 0.018),
    'confused':    (1.05, 0.5, 0.5, -0.2, 0.95, 0.0, 0.0, 0.2, 0.0),
    'innocent':    (1.15, 0.6, 0.3, 0.9, 1.0, 0.0, 0.03, 0.0, 0.0),
    'hungry':      (1.10, 0.4, 0.5, 0.3, 0.85, 0.05, 0.05, 0.3, 0.0),
    'scheming':    (0.92, -0.2, -0.5, 1.0, 0.65, 0.0, 0.0, 0.3, 0.0),
    'curious':     (1.12, 0.6, 0.2, 0.5, 1.0, 0.0, 0.03, 0.1, 0.0),
    'wise':        (0.95, 0.1, 0.15, 0.6, 0.78, 0.0, 0.0, 0.1, 0.0),
    'worried':     (1.10, 0.5, 0.9, -0.6, 1.0, 0.0, -0.03, 0.2, 0.004),
    'suspicious':  (0.95, -0.3, -0.45, -0.2, 0.55, 0.0, -0.02, 0.0, 0.0),
    'nervous':     (1.15, 0.7, 0.7, 0.4, 1.0, 0.0, 0.0, 0.4, 0.006),
    'sad':         (1.05, 0.2, 1.0, -1.0, 0.7, 0.0, -0.2, 0.0, 0.0),
    'heartbroken': (1.22, 0.4, 1.0, -1.0, 0.88, 0.05, -0.12, 0.0, 0.003),
    'upset':       (1.05, 0.1, 0.8, -0.8, 0.9, 0.0, -0.05, 0.5, 0.0),
    'overwhelmed': (1.25, 0.9, 1.0, -0.8, 0.6, 0.1, -0.12, 1.0, 0.015),
    'helpful':     (1.05, 0.5, 0.2, 0.8, 1.0, 0.0, 0.03, 0.4, 0.0),
    'tender':      (1.00, 0.3, 0.4, 0.8, 0.82, 0.0, -0.03, 0.1, 0.0),
    'hopeful':     (1.12, 0.6, 0.5, 0.4, 1.0, 0.0, 0.06, 0.1, 0.0),
    'moved':       (1.15, 0.6, 0.6, 0.8, 0.88, 0.0, 0.0, 0.3, 0.0),
    'sheepish':    (1.00, 0.4, 0.6, 0.5, 0.8, 0.0, -0.08, 0.2, 0.0),
    'proud':       (1.05, 0.4, -0.1, 1.0, 0.85, 0.0, 0.12, 0.6, 0.0),
    'angry':       (0.95, -0.3, -1.0, -0.8, 0.8, 0.0, -0.04, 0.4, 0.0),
    'listening':   (1.16, 0.7, 0.35, 0.0, 1.0, 0.0, 0.04, 0.0, 0.0),
    'laugh':       (1.00, 0.6, 0.0, 1.0, 1.0, 0.0, 0.12, 0.6, 0.0),
}


# ------------------------------------------------------------------ per-scene precompute
class SceneState:
    def __init__(self, s):
        self.id = s['id']
        self.t0, self.t1 = s['t0'], s['t1']
        self.d = SCENE_DEF[self.id]
        self.items = BY_SCENE.get(self.id, [])
        self.cast = dict(self.d['cast'])
        self.lines = [i for i in self.items if i['type'] in ('line', 'clip')]
        self.moves = [i for i in self.items if i['type'] == 'move']
        self.cams = [i for i in self.items if i['type'] == 'cam']
        self.events = [i for i in self.items if i['type'] == 'event']
        # emotion keyframes per character
        self.emo = {c: [] for c in self.cast}
        for it in self.items:
            if it['type'] != 'line':
                continue
            for p in it['parts']:
                w = p['who']
                if w in self.emo:
                    self.emo[w].append((it['t0'] - 0.25, it['emo']))
            # Tiko reacts to thoughts he hears
            if it['mode'] == 'think' and 'tiko' in self.emo and it['who'] != 'tiko' and self.d.get('mind'):
                self.emo['tiko'].append((it['t0'] + 0.15, 'listening'))
        # event-driven expressions
        for ev in self.events:
            n, a, b = ev['name'], ev['t0'], ev['t1']
            if n == 'star_fall':
                for c in ('tiko', 'sparky'):
                    self.emo[c].append((a + 0.4, 'curious'))
                    self.emo[c].append((a + 2.05, 'shocked'))
            if n == 'sneeze_up' or n == 'sneeze_star':
                if 'tiko' in self.emo:
                    self.emo['tiko'].append((a + 0.3, 'worried'))
            if n == 'touch_star':
                self.emo['tiko'].append((a, 'curious'))
                self.emo['tiko'].append((a + 1.2, 'shocked'))
                self.emo['sparky'].append((a + 1.25, 'scared'))
            if n == 'heartbreak':
                self.emo['tiko'].append((a + 0.1, 'heartbroken'))
            if n == 'star_crack':
                self.emo['tiko'].append((a + 0.6, 'overwhelmed'))
            if n == 'star_dim':
                self.emo['tiko'].append((a + 0.2, 'sad'))
            if n == 'surprise':
                for c in self.cast:
                    if c != 'tiko':
                        self.emo[c].append((b - 0.1, 'excited'))
                self.emo['tiko'].append((b + 0.05, 'shocked'))
            if n == 'confetti':
                self.emo['tiko'].append((a + 0.6, 'awe'))
            if n == 'treehouse_reveal':
                self.emo['tiko'].append((a + 0.8, 'awe'))
            if n == 'fireworks':
                for c in self.cast:
                    self.emo[c].append((a + 0.9, 'awe' if c != 'sparky' else 'proud'))
            if n == 'star_to_coco':
                for c in self.cast:
                    if c != 'coco':
                        self.emo[c].append((a + 1.7, 'shocked'))
                self.emo['coco'].append((a + 1.7, 'awe'))
            if n == 'everyone_laughs':
                for c in self.cast:
                    self.emo[c].append((a, 'laugh'))
                    self.emo[c].append((b + 0.3, 'happy'))
            if n == 'coco_flyaway':
                for c in ('tiko', 'sparky'):
                    self.emo[c].append((a + 0.5, 'confused'))
            if n == 'hook_open':
                self.emo['tiko'].append((a, 'listening'))
        for c in self.emo:
            self.emo[c].sort(key=lambda x: x[0])
        # moves per character, sorted
        self.mv = {c: sorted([m for m in self.moves if m['who'] == c], key=lambda m: m['t0']) for c in self.cast}

    # ---------------------------------------------------------- blocking
    def mark(self, who, t):
        x, z, yaw = self.cast[who]
        walk_amt, dist, run = 0.0, 0.0, False
        for m in self.mv[who]:
            if t <= m['t0']:
                break
            tx, tz, tyaw = m['to']
            d = math.hypot(tx - x, tz - z)
            a = clamp((t - m['t0']) / (m['t1'] - m['t0']))
            e = smooth(a)
            # face the direction of travel while walking, then turn to the final yaw
            travel_yaw = math.atan2(tz - z, tx - x) if d > 0.05 else tyaw
            if t < m['t1']:
                nx, nz = lerp(x, tx, e), lerp(z, tz, e)
                turn_in = smooth(a / 0.2)
                turn_out = smooth((a - 0.8) / 0.2)
                y1 = yaw + wrap(travel_yaw - yaw) * turn_in
                yaw_now = y1 + wrap(tyaw - y1) * turn_out
                walk_amt = math.sin(PI * clamp(a)) ** 0.5 * (1.0 if d > 0.05 else 0.0)
                dist += d * e
                run = m['run']
                return nx, nz, yaw_now, walk_amt, dist, run
            x, z, yaw = tx, tz, tyaw
            dist += d
        return x, z, yaw, 0.0, dist, False

    def present(self, who):
        return who in self.cast

    # ---------------------------------------------------------- emotion
    def emotion(self, who, t):
        keys = self.emo.get(who, [])
        cur, prev, tc = 'neutral', 'neutral', -1e9
        for (kt, e) in keys:
            if kt <= t:
                prev, cur, tc = cur, e, kt
            else:
                break
        a = smooth((t - tc) / 0.35)
        return blend_emo(EMO.get(prev, EMO['neutral']), EMO.get(cur, EMO['neutral']), a), cur

    # ---------------------------------------------------------- speech
    def speaking(self, who, t):
        """mouth open, mouth width, speaking flag (0/1), loud flag"""
        for it in self.lines:
            if it['type'] == 'line':
                if it['mode'] == 'think' or not (it['t0'] - 0.05 <= t <= it['t1'] + 0.1):
                    continue
                for p in it['parts']:
                    if p['who'] != who:
                        continue
                    lt = t - it['t0'] - p.get('delay', 0.0)
                    o, w = lip_sample(p['key'], lt)
                    return o, w, 1.0, it['loud']
            else:
                if it['who'] == who and it['t0'] - 0.05 <= t <= it['t1'] + 0.1:
                    o, w = lip_sample(it['key'], t - it['t0'])
                    return o, w, 1.0, True
        return 0.0, 0.5, 0.0, False

    def active_line(self, t):
        best = None
        for it in self.lines:
            if it['type'] == 'line' and it['t0'] <= t <= it['t1'] + 0.35:
                best = it
        return best

    def last_speaker(self, t, exclude=None):
        best = None
        for it in self.lines:
            if it['type'] != 'line' or it['mode'] == 'narr':
                continue
            if it['t0'] <= t and it['who'] != exclude and (it['who'] in self.cast):
                best = it
        return best


def blend_emo(a, b, t):
    return tuple(lerp(x, y, t) for x, y in zip(a, b))


def lip_sample(key, lt):
    d = LIPS.get(key)
    if d is None or lt < 0:
        return 0.0, 0.5
    i = lt * 100.0
    n = len(d['open'])
    if i >= n - 1:
        return 0.0, 0.5
    i0 = int(i)
    f = i - i0
    o = d['open'][i0] * (1 - f) + d['open'][i0 + 1] * f
    w = d['width'][i0] * (1 - f) + d['width'][i0 + 1] * f
    return o, w


STATES = {s['id']: SceneState(s) for s in SCENES}


# ------------------------------------------------------------------ geometry of characters
def to_world(pos, yaw, S, local, sy=1.0, sxz=1.0, lean=0.0):
    lx, ly, lz = local
    ly *= sy
    lx *= sxz
    lz *= sxz
    c, s = math.cos(-lean), math.sin(-lean)
    lx, ly = lx * c - ly * s, lx * s + ly * c
    lx, ly, lz = lx * S, ly * S, lz * S
    cy, sy_ = math.cos(yaw), math.sin(yaw)
    return (pos[0] + lx * cy - lz * sy_, pos[1] + ly, pos[2] + lx * sy_ + lz * cy)


HEAD_LOCAL = {'tiko': (0.36, 1.03, 0.0), 'mama': (0.36, 1.03, 0.0), 'sparky': (0.2, 0.98, 0.0),
              'prof': (0.66, 0.53, 0.0), 'coco': (0.1, 0.66, 0.0)}


# ------------------------------------------------------------------ character uniforms
class Frame:
    """Holds everything computed for one time t."""

    def __init__(self, t):
        self.t = t
        self.sc = scene_at(t)
        self.st = STATES[self.sc['id']]
        self.u = {'uTime': t}
        self.base = {}      # who -> (pos, yaw, S)
        self.heads = {}
        self.chars = {}


def look_angles(pos, yaw, head_w, target):
    dx, dy, dz = target[0] - head_w[0], target[1] - head_w[1], target[2] - head_w[2]
    rel = wrap(math.atan2(dz, dx) - yaw)
    elev = math.atan2(dy, math.hypot(dx, dz) + 1e-6)
    return rel, elev


def char_base(fr, who):
    st, t = fr.st, fr.t
    x, z, yaw, walk_amt, dist, run = st.mark(who, t)
    y = 0.0
    if who == 'coco':
        y = PERCH_Y.get(st.id, 1.03)
    S = SIZE[who]
    return (x, y, z), yaw, S, walk_amt, dist, run


def look_target(fr, who, head_w, look, active):
    """World-space point the character looks at."""
    st, t = fr.st, fr.t
    if look == 'camera':
        return fr.cam_pos
    if look == 'star':
        return fr.star_pos
    if look in st.cast and look != who:
        return fr.heads_guess[look]
    if look == 'treehouse':
        return (-0.6, 2.5, 3.15)
    if look == 'sky':
        return (0.4, 5.0, 3.8)
    if look == 'cocofly':
        cc = st.cast.get('coco', (16.0, 1.5, 0))
        return (cc[0] + 1.5, 2.6, cc[1] + 0.5)
    return None


def compute_char(fr, who):
    st, t = fr.st, fr.t
    pos, yaw, S, walk_amt, dist, run = char_base(fr, who)
    emo, emo_name = st.emotion(who, t)
    es, br, ba, sm, eo, mbase, hp, arm, trem = emo
    o, w, spk, loud = st.speaking(who, t)
    seed = {'tiko': 1.0, 'sparky': 2.0, 'prof': 3.0, 'coco': 4.0, 'mama': 5.0}[who]
    # --- look target
    act = st.active_line(t)
    look = None
    my_line = None
    for it in st.lines:
        if it['type'] == 'line' and it['who'] == who and it['t0'] - 0.3 <= t <= it['t1'] + 0.6:
            my_line = it
    if my_line is not None:
        look = my_line.get('look')
    elif act is not None and act['who'] != who and act['who'] in st.cast:
        look = act['who'] if not (act['mode'] == 'think' and who != 'tiko') else None
    else:
        ls = st.last_speaker(t, exclude=who)
        if ls is not None:
            look = ls['who']
    # Tiko always looks toward whoever is thinking
    if who == 'tiko' and act is not None and act['mode'] == 'think' and act['who'] in st.cast and act['who'] != 'tiko':
        look = act['who']
    override = event_look(fr, who)
    if override is not None:
        look = override
    head_w = to_world(pos, yaw, S, HEAD_LOCAL[who])
    hyaw, hpitch, lx, ly = 0.0, 0.0, 0.0, 0.0
    tgt = None
    if look == 'away':
        hyaw, hpitch, lx, ly = 0.45 * math.sin(seed * 3.1), 0.08, 0.5 * math.sin(seed * 3.1), 0.25
    elif look == 'down':
        hpitch, ly = -0.28, -0.35
    elif look in ('none', None):
        pass
    else:
        tgt = look_target(fr, who, head_w, look, act)
    if tgt is not None:
        rel, elev = look_angles(pos, yaw, head_w, tgt)
        lim = 0.85 if who != 'prof' else 0.6
        hyaw = clamp(rel * 0.75, -lim, lim)
        lx = clamp((rel - hyaw) * 1.1 + rel * 0.15, -0.6, 0.6)
        hpitch = clamp(elev * 0.6, -0.45, 0.45)
        ly = clamp((elev - hpitch) * 1.2, -0.5, 0.5)
    # --- talking body language
    bob = 0.0
    if spk:
        bob = 0.07 * o + 0.025 * math.sin(t * 7.0 + seed)
        if loud:
            bob += 0.03 * math.sin(t * 11.0)
    idle = 0.02 * math.sin(t * 1.3 + seed * 2.0)
    pitch = hp + hpitch + bob * 0.8 + idle * 0.5
    roll = 0.06 * math.sin(t * 0.7 + seed) + (0.15 if emo_name in ('confused', 'curious', 'innocent') else 0.0)
    if emo_name == 'listening':
        roll += 0.12
    roll += trem * math.sin(t * 47.0 + seed) * 4.0
    hyaw += 0.04 * math.sin(t * 0.9 + seed * 1.7)
    # --- blinks
    eye = eo
    bp = 3.1 + 1.3 * hsh(seed)
    ph = (t + seed * 1.37) % bp
    eye = min(eye, 1.0 - pulse(ph, bp - 0.12, 0.09))
    # --- mouth
    mouth = clamp(max(o * (1.05 if loud else 0.9), mbase if not spk else 0.0), 0.0, 1.0)
    width = clamp(w * 0.9 + (0.25 if sm > 0.5 else 0.0) - (0.2 if emo_name in ('shocked', 'surprised', 'awe') else 0.0))
    laugh = 1.0 if emo_name == 'laugh' else 0.0
    smile = sm
    # --- body
    breath = 0.012 * math.sin(t * 2.2 + seed)
    sy, sxz = 1.0 + breath, 1.0 - breath * 0.5
    lean = 0.03 * math.sin(t * 0.8 + seed) + (0.05 * o if spk else 0.0)
    ybob = 0.0
    walk_phase = dist * (10.5 if who in ('tiko', 'mama') else 14.0) / S
    if walk_amt > 0:
        k = 1.6 if run else 1.0
        walk_phase *= 1.0
        ybob = abs(math.sin(walk_phase)) * (0.045 if not run else 0.09) * walk_amt * S
        sy += 0.04 * math.sin(walk_phase * 2) * walk_amt * k
        lean += (-0.06 if not run else -0.16) * walk_amt
    armv = arm * (0.6 + 0.4 * math.sin(t * 3.0 + seed)) if (spk or emo_name in ('panic', 'overwhelmed', 'excited')) else arm * 0.3
    if spk and loud:
        armv = max(armv, 0.5 + 0.3 * math.sin(t * 6.0))
    if emo_name == 'laugh':
        lb = math.sin(t * 2 * PI * 2.3 + seed)
        ybob += abs(lb) * 0.05 * S
        sy += lb * 0.05
        pitch += 0.12 * lb
    c = dict(pos=(pos[0], pos[1] + ybob, pos[2]), yaw=yaw, S=S, sy=sy, sxz=sxz, lean=lean,
             pitch=pitch, roll=roll, hyaw=hyaw, eye=eye, laugh=laugh, mouth=mouth, es=es,
             width=width, br=br, ba=ba, smile=smile, arm=armv, tail=t * 2 * PI * (1.4 + 1.5 * laugh) + seed,
             walk_phase=walk_phase, walk_amt=walk_amt, lx=lx, ly=ly, glow=0.0, extra={},
             lookat=look if (look in st.cast and look != who) else None)
    event_char(fr, who, c)
    return c


# ------------------------------------------------------------------ events
def ev(fr, name):
    return find_event(fr.st.id, name)


def event_look(fr, who):
    st, t = fr.st, fr.t
    e = ev(fr, 'star_fall')
    if e and e['t0'] <= t <= e['t1'] + 0.4 and who in ('tiko', 'sparky'):
        return 'star'
    e = ev(fr, 'touch_star')
    if e and e['t0'] <= t <= e['t0'] + 1.3 and who in ('tiko', 'sparky'):
        return 'star'
    e = ev(fr, 'sneeze_up')
    if e and e['t0'] + 1.6 <= t <= e['t1'] and who == 'tiko':
        return 'star'
    for n in ('fireworks', 'treehouse_reveal', 'star_to_coco', 'sneeze_star'):
        e = ev(fr, n)
        if e and e['t0'] + 0.3 <= t <= e['t1'] + 0.3:
            if n == 'treehouse_reveal':
                return 'treehouse'
            if n == 'fireworks' and who != 'sparky':
                return 'sky'
            if n in ('star_to_coco', 'sneeze_star'):
                return 'star'
    e = ev(fr, 'place_star')
    if e and e['t0'] <= t <= e['t1'] and who == 'tiko':
        return 'star'
    e = ev(fr, 'coco_flyaway')
    if e and e['t0'] <= t <= e['t1'] + 0.5 and who in ('tiko', 'sparky'):
        return 'cocofly'
    return None


def event_char(fr, who, c):
    st, t = fr.st, fr.t
    sid = st.id
    # ---- hook: eyes snap open
    e = ev(fr, 'hook_open')
    if e and who == 'tiko':
        c['eye'] = min(c['eye'], kf(t, [(e['t0'], 0.0), (e['t0'] + 0.35, 0.0), (e['t0'] + 0.5, 1.0)]))
    # ---- sneezes (Sparky)
    for n in ('sneeze_up', 'sneeze_star'):
        e = ev(fr, n)
        if e and who == 'sparky':
            clip = find_clip(sid, n)
            if clip:
                tp = clip['peak']
                ahh = kf(t, [(clip['t0'], 0.0), (clip['t0'] + 0.3, 0.5), (clip['t0'] + 0.45, 0.4), (tp - 0.08, 1.0),
                             (tp, -0.7), (tp + 0.25, -0.4), (tp + 0.7, 0.0)])
                up = 1.0 if n == 'sneeze_up' else -0.3
                c['pitch'] += max(ahh, 0) * 0.45 * up - max(-ahh, 0) * 0.35 * (1 if n == 'sneeze_up' else -0.6)
                c['sy'] += max(ahh, 0) * 0.08 - max(-ahh, 0) * 0.15
                c['sxz'] -= max(ahh, 0) * 0.03 - max(-ahh, 0) * 0.08
                c['lean'] += -max(ahh, 0) * 0.15 + max(-ahh, 0) * 0.3
                c['eye'] = min(c['eye'], 1.0 - clamp(max(ahh, 0) * 1.2) * 0.9 if t < tp + 0.2 else c['eye'])
                c['extra']['nose'] = clamp(max(ahh, 0)) * (0.7 + 0.3 * math.sin(t * 40))
                c['extra']['flapk'] = kf(t, [(tp - 0.05, 0.0), (tp, 0.8), (tp + 0.4, 0.0)])
    # ---- star fall: startle hop at the crash
    e = ev(fr, 'star_fall')
    if e and who in ('tiko', 'sparky'):
        tc = e['t0'] + 2.0
        c['pos'] = add(c['pos'], (0, jump_arc(t, tc + 0.05, tc + 0.5, 0.25 * c['S']), 0))
        land = pulse(t, tc + 0.55, 0.1)
        c['sy'] -= land * 0.15
        c['arm'] = max(c['arm'], kf(t, [(tc, 0.0), (tc + 0.1, 1.0), (tc + 1.2, 0.4)]) if t > tc else 0.0)
    # ---- touch star
    e = ev(fr, 'touch_star')
    if e and who == 'tiko':
        a = e['t0']
        c['arm'] = max(c['arm'], kf(t, [(a, 0.0), (a + 0.6, 0.7), (a + 1.2, 0.8), (a + 1.4, 1.0), (a + 2.4, 0.2)]))
        c['lean'] += kf(t, [(a, 0.0), (a + 0.8, 0.2), (a + 1.2, 0.22), (a + 1.35, -0.15), (a + 2.4, 0.0)])
        jolt = damped(t, a + 1.25, 4.0, 4.0)
        c['sy'] += jolt * 0.15
        c['sxz'] -= jolt * 0.07
    # ---- glasses
    if who == 'prof':
        e = ev(fr, 'glasses_down')
        g = 0.0
        if sid == 's2':
            if e:
                g = kf(t, [(e['t0'], 0.0), (e['t0'] + 0.7, 1.0)], ease=ease_out) + damped(t, e['t0'] + 0.7, 3.0, 6.0) * 0.08
        else:
            g = 1.0
        c['extra']['glasses'] = g
    # ---- Coco flies away
    e = ev(fr, 'coco_flyaway')
    if who == 'coco' and e:
        a = clamp((t - e['t0']) / 1.8)
        if t > e['t0']:
            c['pos'] = add(c['pos'], (a * a * 3.5, a * 2.6 + jump_arc(t, e['t0'], e['t0'] + 0.4, 0.15), a * 1.0))
            c['extra']['flap'] = 0.9 * math.sin((t - e['t0']) * 2 * PI * 6.0)
            c['extra']['spread'] = smooth((t - e['t0']) / 0.2)
            c['lean'] = -0.3 * smooth((t - e['t0']) / 0.4)
        if t > e['t0'] + 1.8:
            c['S'] = 0.0
    if who == 'coco' and sid == 's3':
        e = ev(fr, 'coco_flyaway')
        if e and t > e['t1']:
            c['S'] = 0.0
    # ---- Tiko runs off
    e = ev(fr, 'tiko_runs')
    if who == 'tiko' and e and t > e['t1'] + 0.4:
        c['S'] = 0.0
    # ---- star crack: hold head
    e = ev(fr, 'star_crack')
    if who == 'tiko' and e:
        k = kf(t, [(e['t0'] + 0.4, 0.0), (e['t0'] + 1.0, 1.0)])
        e2 = ev(fr, 'star_dim')
        if e2:
            k *= 1.0 - smooth((t - e2['t0']) / 1.0)
        c['arm'] = max(c['arm'], k * 1.0)
        c['pitch'] -= 0.15 * k
        c['eye'] = min(c['eye'], 1.0 - 0.6 * k)
    # ---- surprise: hidden in darkness, jump out
    e = ev(fr, 'surprise')
    if e and who != 'tiko' and who != 'prof':
        tb = e['t1']
        h = jump_arc(t, tb, tb + 0.55, 0.3 * c['S'] ** 0.5)
        c['pos'] = add(c['pos'], (0, h, 0))
        c['arm'] = max(c['arm'], kf(t, [(tb - 0.05, 0.0), (tb + 0.1, 1.0), (tb + 2.0, 1.0), (tb + 2.8, 0.3)]) if t > tb - 0.05 else 0.0)
    if e and who == 'tiko':
        tb = e['t1']
        jolt = damped(t, tb + 0.05, 3.0, 4.0)
        c['sy'] += jolt * 0.18
        c['pos'] = add(c['pos'], (0, jump_arc(t, tb + 0.05, tb + 0.45, 0.2), 0))
    # ---- fireworks: Sparky blasts upward
    e = ev(fr, 'fireworks')
    if e and who == 'sparky':
        for k in range(3):
            tk = e['t0'] + 0.1 + k * 1.2
            p = pulse(t, tk, 0.25)
            c['pitch'] += p * 0.6
            c['sy'] -= p * 0.08
            c['extra']['mouth_force'] = max(c['extra'].get('mouth_force', 0.0), p)
        c['extra']['flapk'] = 0.4 * math.sin(t * 20.0) * (1 if e['t0'] <= t <= e['t1'] else 0)
    # ---- place star
    e = ev(fr, 'place_star')
    if e and who == 'tiko':
        k = kf(t, [(e['t0'], 0.0), (e['t0'] + 0.8, 1.0), (e['t0'] + 1.4, 1.0), (e['t1'], 0.0)])
        c['lean'] += 0.3 * k
        c['arm'] = max(c['arm'], 0.6 * k)
    # ---- star lands on Coco
    if who == 'coco':
        e = ev(fr, 'star_to_coco')
        if e and t > e['t0'] + 1.6:
            c['glow'] = 1.0
            jolt = damped(t, e['t0'] + 1.6, 3.0, 4.0)
            c['sy'] += jolt * 0.15
    # Tiko's eyes glow while he carries the active star
    if who == 'tiko':
        c['glow'] = tiko_glow(fr)
    # to-camera finale: Tiko turns to face the lens
    if who == 'tiko' and st.id == 's8':
        for cm in st.cams:
            if cm['shot'] == 'to_camera' and t >= cm['t0']:
                k = smooth((t - cm['t0']) / 0.8)
                c['yaw'] = c['yaw'] + wrap(-PI / 2 - c['yaw']) * k * 0.85


def tiko_glow(fr):
    st, t = fr.st, fr.t
    sid = st.id
    if sid == 'hook':
        return 1.0
    if sid == 's1':
        e = ev(fr, 'touch_star')
        if e is None or t < e['t0'] + 1.3:
            return 0.0
        return kf(t, [(e['t0'] + 1.3, 0.0), (e['t0'] + 1.6, 1.0), (e['t0'] + 3.0, 0.7)]) + mind_boost(fr) * 0.3
    if sid in ('s2', 's3', 's4', 's5'):
        return 0.7 + mind_boost(fr) * 0.3
    if sid == 's6':
        e = ev(fr, 'star_dim')
        base = 0.75 + mind_boost(fr) * 0.25
        if e:
            base *= 1.0 - smooth((t - e['t0']) / 1.2)
        return base
    return 0.0


def mind_boost(fr):
    st, t = fr.st, fr.t
    if not st.d.get('mind'):
        return 0.0
    m = 0.0
    for it in st.lines:
        if it['type'] == 'line' and it['mode'] == 'think':
            m = max(m, smooth((t - it['t0'] + 0.2) / 0.3) * (1 - smooth((t - it['t1']) / 0.4)))
    return m


# ------------------------------------------------------------------ star, effects
def star_state(fr, chars):
    """Returns (pos, size, glow, crack, red, spin, trail_vel, trail_amt)."""
    st, t = fr.st, fr.t
    sid = st.id
    spin = t * 0.8
    hidden = ((0, -10, 0), 0.0, 0.0, 0.0, 0.0, spin, (0, 0, 0), 0.0)

    def pendant(glow, crack=0.0, red=0.0):
        c = chars.get('tiko')
        if c is None or c['S'] <= 0.01:
            return hidden
        p = to_world(c['pos'], c['yaw'], c['S'], (0.36, 0.56, 0.0), c['sy'], c['sxz'], c['lean'])
        return (p, 0.075, glow, crack, red, c['yaw'] + PI / 2 + 0.25 * math.sin(t * 1.5), (0, 0, 0), 0.0)
    ground = STAR_GROUND
    if sid == 'title':
        return ((0.05, 0.13, 0.8), 0.16, 1.0 + 0.2 * math.sin(t * 3.0), 0.0, 0.0, t * 0.35, (0, 0, 0), 0.0)
    if sid == 'hook':
        return pendant(1.2 + 0.3 * math.sin(t * 6.0))
    if sid == 's1':
        e = ev(fr, 'star_fall')
        if e is None or t < e['t0']:
            return hidden
        tc = e['t0'] + 2.0
        if t < tc:
            a = clamp((t - e['t0']) / 2.0)
            a2 = a ** 1.6
            start = (-2.5, 9.0, 6.0)
            p = lerp(start, ground, a2)
            vel = sub(ground, start)
            return (p, 0.2, 2.2, 0.0, 0.0, t * 6.0, mul(norm(vel), 6.0), 1.0)
        e2 = ev(fr, 'touch_star')
        if e2 and t >= e2['t0'] + 1.25:
            k = smooth((t - e2['t0'] - 1.25) / 0.35)
            pd = pendant(1.0)
            if k < 1.0:
                p = lerp(ground, pd[0], k)
                p = (p[0], p[1] + 0.15 * math.sin(k * PI), p[2])
                return (p, lerp(0.16, 0.075, k), 2.0, 0.0, 0.0, spin * 3, (0, 0, 0), 0.0)
            return pendant(0.9 + 0.3 * mind_boost(fr))
        glow = 1.0 + 0.25 * math.sin(t * 3.0) + 2.0 * math.exp(-(t - tc) * 3.0)
        if e2 and t > e2['t0']:
            glow += kf(t, [(e2['t0'], 0.0), (e2['t0'] + 1.2, 0.8), (e2['t0'] + 1.3, 3.0)])
        return (ground, 0.16, glow, 0.0, 0.0, t * 0.5, (0, 0, 0), 0.0)
    if sid in ('s2', 's3', 's4', 's5'):
        return pendant(0.9 + 0.4 * mind_boost(fr))
    if sid == 's6':
        e = ev(fr, 'star_crack')
        if e is None or t < e['t0']:
            return pendant(0.9 + 0.4 * mind_boost(fr))
        a = t - e['t0']
        flick = 0.5 + 0.5 * math.sin(t * 37.0) * math.sin(t * 13.0)
        red = smooth(a / 1.5)
        crack = kf(t, [(e['t0'] + 0.8, 0.0), (e['t0'] + 1.0, 0.5), (e['t0'] + 2.2, 0.75), (e['t0'] + 2.4, 1.0)])
        glow = 1.0 + 1.2 * flick
        e2 = ev(fr, 'star_dim')
        if e2 and t > e2['t0']:
            k = smooth((t - e2['t0']) / 1.2)
            glow = lerp(glow, 0.12, k)
            red = lerp(red, 0.0, k)
        return pendant(glow, crack, red)
    if sid == 's7':
        return pendant(0.12, 1.0, 0.0)
    if sid == 's8':
        e1 = ev(fr, 'place_star')
        if e1 is None or t < e1['t0'] + 0.6:
            return pendant(0.12, 1.0, 0.0)
        gpos = STAR_PLACED
        gpos2 = add(STAR_PLACED, (0, 0.05, 0))
        if t < e1['t0'] + 1.3:
            pd = pendant(0.12, 1.0)
            k = smooth((t - e1['t0'] - 0.6) / 0.7)
            return (lerp(pd[0], gpos, k), lerp(0.075, 0.1, k), 0.12, 1.0, 0.0, spin, (0, 0, 0), 0.0)
        e2 = ev(fr, 'sneeze_star')
        clip = find_clip(st.id, 'sneeze_star')
        hit = clip['peak'] + 0.45 if clip else 1e9
        if e2 is None or t < hit:
            return (gpos, 0.1, 0.12, 1.0, 0.0, 0.3, (0, 0, 0), 0.0)
        e3 = ev(fr, 'star_to_coco')
        if e3 is None or t < e3['t0']:
            # flare, hover, zoom into the sky
            k = t - hit
            crack = max(0.0, 1.0 - k * 2.0)
            up = smooth((k - 0.5) / 1.0) ** 2
            p = lerp(gpos2, (0.4, 9.0, 3.0), up)
            p = (p[0], p[1] + 0.2 * smooth(k / 0.4), p[2])
            return (p, 0.12, 2.5, crack, 0.0, t * 8.0, (0.0, 4.0 * smooth((k - 0.5) / 0.5), 0.0), smooth((k - 0.5) / 0.3))
        # falls onto Coco's head
        cc = chars.get('coco')
        crown = to_world(cc['pos'], cc['yaw'], cc['S'], (0.0, 0.86, 0.0)) if cc else (1.95, 1.9, 1.25)
        a = clamp((t - e3['t0']) / 1.6)
        if a < 1.0:
            p = lerp((1.2, 7.5, 2.5), crown, a ** 2)
            return (p, 0.1, 1.8, 0.0, 0.0, t * 6.0, mul(norm(sub(crown, (1.2, 7.5, 2.5))), 3.0), 1.0 - a * 0.5)
        return (add(crown, (0.0, 0.01 * math.sin(t * 4.0), 0.0)), 0.085 * (1.0 + 0.25 * pulse(t, e3['t0'] + 1.65, 0.15)),
                1.2 + 0.2 * math.sin(t * 5.0), 0.0, 0.0, t * 0.8, (0, 0, 0), 0.0)
    return hidden


def sparky_mouth_world(c):
    return to_world(c['pos'], c['yaw'], c['S'], (0.45, 0.82, 0.0))


def effects(fr, chars):
    """Fireball, smoke, dust, feathers, fireworks, thought rings, point lights, flash, shake."""
    st, t = fr.st, fr.t
    sid = st.id
    u = fr.u
    fb = ((0, -10, 0), 0.0)
    fbp = (0.0, 0.0, 0.0, 0.0)
    fbv = (0, 0, 0)
    smoke_pos = (0, -10, 0)
    dust = (0, -10, 0, -1.0)
    feath = (0, -10, 0, -1.0)
    fw = [(0, -10, 0, -1.0)] * 3
    fwc = [(1, 1, 1, 0.0)] * 3
    flash, shake = 0.0, 0.0
    lights = []
    sp = chars.get('sparky')

    def fireball_path(t0, t1, start, end, mid=None):
        nonlocal fb, fbp, fbv
        if t0 <= t <= t1:
            a = (t - t0) / (t1 - t0)
            m = mid or lerp(start, end, 0.5)
            p = tuple((1 - a) ** 2 * s + 2 * (1 - a) * a * mm + a * a * e for s, mm, e in zip(start, m, end))
            v = tuple(2 * (1 - a) * (mm - s) + 2 * a * (e - mm) for s, mm, e in zip(start, m, end))
            fb = (p, 0.06 + 0.05 * smooth(a / 0.3))
            fbp = (1.0, fbp[1], 0.0, 0.0)
            fbv = v
            lights.append((p, (1.0, 0.5, 0.15), 3.0, 5.0))
    # sneeze up -> fireball into the sky
    e = ev(fr, 'sneeze_up')
    if e and sp:
        clip = find_clip(sid, 'sneeze_up')
        if clip:
            tp = clip['peak']
            start = sparky_mouth_world(sp)
            fireball_path(tp, tp + 0.9, start, (start[0] - 0.3, 7.0, start[2] + 1.5), (start[0] - 0.1, 3.0, start[2] + 0.5))
            shake = max(shake, 0.012 * math.exp(-(t - tp) * 5.0) if t > tp else 0.0)
    # star crash
    e = ev(fr, 'star_fall')
    if e:
        tc = e['t0'] + 2.0
        if t >= tc:
            dust = (STAR_GROUND[0], 0.0, STAR_GROUND[2], t - tc)
            flash = max(flash, 0.7 * math.exp(-(t - tc) * 8.0))
            shake = max(shake, 0.04 * math.exp(-(t - tc) * 4.0))
    e = ev(fr, 'touch_star')
    if e:
        tf = e['t0'] + 1.25
        if t >= tf:
            flash = max(flash, 0.85 * math.exp(-(t - tf) * 6.0))
            shake = max(shake, 0.02 * math.exp(-(t - tf) * 5.0))
    e = ev(fr, 'coco_flyaway')
    if e and t >= e['t0']:
        cc = st.cast['coco']
        feath = (cc[0], PERCH_Y.get(sid, 1.2) + 0.4, cc[1], t - e['t0'])
    e = ev(fr, 'star_crack')
    if e and e['t0'] <= t:
        a = t - e['t0']
        e2 = ev(fr, 'star_dim')
        k = 1.0 - (smooth((t - e2['t0']) / 0.6) if e2 else 0.0)
        shake = max(shake, (0.006 + 0.01 * pulse(a, 1.0, 0.2) + 0.012 * pulse(a, 2.3, 0.2)) * k)
    # fireworks
    e = ev(fr, 'fireworks')
    if e and sp:
        cols = [(1.0, 0.35, 0.5), (0.35, 0.85, 1.0), (1.0, 0.85, 0.3)]
        for k in range(3):
            tk = e['t0'] + 0.1 + k * 1.2
            start = sparky_mouth_world(sp)
            top = (-0.6 + k * 1.3, 4.3 + 0.4 * k, 3.5 + 0.5 * k)
            fireball_path(tk, tk + 0.75, start, top, (start[0], 2.0, start[2] + 0.6))
            age = t - (tk + 0.75)
            if age >= 0:
                fw[k] = (top[0], top[1], top[2], age)
                fwc[k] = (cols[k][0], cols[k][1], cols[k][2], 1.0)
                if age < 1.2:
                    lights.append((top, cols[k], 2.5 * math.exp(-age * 2.5), 0.08))
    # sneeze onto the star
    e = ev(fr, 'sneeze_star')
    if e and sp:
        clip = find_clip(sid, 'sneeze_star')
        if clip:
            tp = clip['peak']
            start = sparky_mouth_world(sp)
            end = add(STAR_PLACED, (0, 0.03, 0))
            fireball_path(tp, tp + 0.45, start, end, (lerp(start, end, 0.5)[0], 0.55, lerp(start, end, 0.5)[2]))
            if t > tp + 0.45:
                flash = max(flash, 0.6 * math.exp(-(t - tp - 0.45) * 7.0))
                fbp = (fbp[0], clamp((t - tp - 0.45) / 1.1) if t < tp + 1.55 else 0.0, 0.0, 0.0)
                smoke_pos = end
    if sid == 's1':
        e = ev(fr, 'sneeze_up')
        # fireball pops into a puff high above (off-screen) - no smoke needed
    # thought ripples
    rings = [(0, -10, 0, 0.0)] * 3
    if st.d.get('mind'):
        k = 0
        for it in st.lines:
            if it['type'] != 'line' or it['mode'] != 'think':
                continue
            a = smooth((t - it['t0'] + 0.2) / 0.3) * (1 - smooth((t - it['t1']) / 0.4))
            if a <= 0.001 or k >= 3:
                continue
            w = it['who']
            if w in chars and chars[w]['S'] > 0.01:
                c = chars[w]
                p = to_world(c['pos'], c['yaw'], c['S'], HEAD_LOCAL[w])
                p = add(p, (0, 0.12 * c['S'], 0))
            else:
                # off-screen critters: ripples from bushes / around Tiko
                hh = hsh(len(it['text']) * 1.3)
                tk = chars.get('tiko')
                base = tk['pos'] if tk else (0, 0, 0)
                ang = hh * 2 * PI
                p = (base[0] + math.cos(ang) * 1.3, 0.5 + hh * 0.6, base[2] + 0.8 + math.sin(ang) * 0.9)
            rings[k] = (p[0], p[1], p[2], a)
            k += 1
    # star light
    sp_ = fr.star
    if sp_[1] > 0.01 and sp_[2] > 0.05:
        col = lerp((0.4, 0.95, 1.0), (1.0, 0.3, 0.2), sp_[4])
        lights.append((sp_[0], col, 0.35 * sp_[2], 6.0))
    u['uFB'] = (fb[0][0], fb[0][1], fb[0][2], fb[1])
    u['uFBp'] = fbp
    u['uFBVel'] = fbv
    u['uSmokePos'] = smoke_pos
    u['uDust'] = dust
    u['uFeath'] = feath
    u['uFW'] = fw
    u['uFWc'] = fwc
    u['uRing'] = rings
    return lights, flash, shake


# ------------------------------------------------------------------ lighting presets
TOD = {
    #           sun dir                 sun col              sky top              sky hor            fog                 amb                 key col            night fogd clouds grade
    'morning':      ((-0.55, 0.62, 0.65), (1.55, 1.25, 0.95), (0.28, 0.55, 0.95), (0.98, 0.86, 0.72), (0.62, 0.78, 0.85), (0.5, 0.65, 0.95), (1.45, 1.28, 1.08), 0.0, 0.05, 1.0, (1.0, 1.0, 1.0)),
    'late_morning': ((-0.4, 0.8, 0.45),   (1.6, 1.42, 1.15),  (0.25, 0.55, 1.0),  (0.86, 0.9, 0.95),  (0.65, 0.8, 0.9),   (0.5, 0.66, 0.95), (1.4, 1.3, 1.15),  0.0, 0.045, 0.9, (1.0, 1.0, 1.0)),
    'noon':         ((-0.3, 0.88, 0.35),  (1.65, 1.5, 1.25),  (0.22, 0.52, 1.0),  (0.8, 0.88, 0.97),  (0.66, 0.8, 0.92),  (0.5, 0.66, 0.95), (1.35, 1.3, 1.2),  0.0, 0.04, 0.8, (1.0, 1.0, 1.0)),
    'afternoon':    ((0.5, 0.55, 0.65),   (1.6, 1.22, 0.85),  (0.3, 0.48, 0.85),  (1.0, 0.84, 0.66),  (0.76, 0.75, 0.7),  (0.5, 0.58, 0.85), (1.3, 1.15, 1.0),  0.0, 0.05, 1.2, (0.98, 0.96, 0.95)),
    'late_afternoon': ((0.6, 0.35, 0.7),  (1.75, 1.05, 0.6),  (0.32, 0.42, 0.78), (1.0, 0.72, 0.48), (0.85, 0.66, 0.52), (0.5, 0.52, 0.78), (1.3, 1.05, 0.85), 0.0, 0.05, 1.0, (1.02, 0.98, 0.95)),
    'sunset':       ((0.15, 0.13, 0.98),  (1.85, 0.78, 0.38), (0.2, 0.22, 0.5),   (1.0, 0.5, 0.3),    (0.78, 0.46, 0.36), (0.42, 0.34, 0.55), (0.95, 0.65, 0.55), 0.15, 0.05, 1.3, (1.02, 0.96, 0.98)),
    'night':        ((-0.35, 0.55, 0.75), (0.28, 0.36, 0.62), (0.02, 0.03, 0.09), (0.08, 0.1, 0.22),  (0.05, 0.07, 0.15), (0.13, 0.17, 0.32), (0.28, 0.32, 0.5), 1.0, 0.06, 0.5, (1.0, 1.0, 1.0)),
}
LANTERN_LIGHTS = [((-1.4, 1.35, 2.2), (1.0, 0.65, 0.35)), ((0.8, 1.3, 2.1), (1.0, 0.55, 0.45)),
                  ((2.2, 1.2, 1.8), (1.0, 0.75, 0.4))]


# ------------------------------------------------------------------ cameras
def cam_shot(fr, cam, chars):
    """Returns pos, target, fov, aperture, focus point."""
    st, t = fr.st, fr.t
    shot = cam['shot']
    a = clamp((t - cam['t0']) / max(cam['t1'] - cam['t0'], 0.1))
    who = cam.get('who')
    push = cam.get('push', 0.0)

    def head(w):
        c = chars[w]
        return to_world(c['pos'], c['yaw'], max(c['S'], 0.3), HEAD_LOCAL[w])

    BODY = {'tiko': (0.55, 0.62), 'mama': (0.55, 0.62), 'sparky': (0.45, 0.62), 'prof': (0.3, 0.6), 'coco': (0.35, 0.32)}

    def blocked(cam_p, target, me):
        for o, c in chars.items():
            if o == me or c['S'] <= 0.01:
                continue
            S = SIZE[o]
            cy, r = BODY[o]
            spheres = [(add(c['pos'], (0, cy * S, 0)), r * S)]
            if o in ('tiko', 'mama', 'sparky'):
                spheres.append((to_world(c['pos'], c['yaw'], S, HEAD_LOCAL[o]), 0.43 * S))
            for (ctr, rad) in spheres:
                ab = sub(target, cam_p)
                L2 = sum(x * x for x in ab)
                h = clamp(sum(x * y for x, y in zip(sub(ctr, cam_p), ab)) / L2)
                pt = add(cam_p, mul(ab, h))
                if math.dist(pt, ctr) < rad + 0.04:
                    return True
        return False

    def cu(w, dist_mul=1.0, height=0.0):
        c = chars[w]
        S = SIZE[w]
        h = head(w)
        fwd = (math.cos(c['yaw']), 0.0, math.sin(c['yaw']))
        # aim at the conversation partner's side (3/4 front), from the camera side of the action (-z)
        partner = c.get('lookat')
        if partner is None or partner not in chars or chars[partner]['S'] <= 0.01:
            partner = None
            for o in chars:
                if o != w and chars[o]['S'] > 0.01:
                    pv = sub(chars[o]['pos'], c['pos'])
                    if pv[0] * fwd[0] + pv[2] * fwd[2] <= 0:
                        continue
                    if partner is None or math.dist(chars[o]['pos'], c['pos']) < math.dist(chars[partner]['pos'], c['pos']):
                        partner = o
        base = fwd
        if partner is not None:
            pv = sub(chars[partner]['pos'], c['pos'])
            base = norm((pv[0], 0.0, pv[2]))
            base = norm(add(mul(base, 0.6), mul(fwd, 0.4)))
        dist = {'tiko': 1.2, 'mama': 1.9, 'sparky': 0.95, 'prof': 1.1, 'coco': 0.9}[w] * dist_mul
        dist *= 1.0 - push * smooth(a)
        dist *= 1.0 + 0.04 * (1 - a)
        chosen = None
        for dm in (1.0, 0.8, 0.62):
            for wb in (0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.15, -0.3):
                d = norm((base[0] * wb, 0.0, base[2] * wb - (1.0 - abs(wb))))
                if d[0] * fwd[0] + d[2] * fwd[2] < 0.15:
                    continue
                pos = add(h, add(mul(d, dist * dm), (0, -0.05 * S + height, 0)))
                if not blocked(pos, h, w):
                    chosen = (d, pos)
                    break
            if chosen:
                break
        if chosen is None:
            d = norm((base[0] * 0.2, 0.0, -1.0))
            pos = add(h, add(mul(d, dist), (0, 0.25 * S + height, 0)))
            chosen = (d, pos)
        d, pos = chosen
        right = (d[2], 0.0, -d[0])
        lead = 0.12 * dist * (1 if (fwd[0] * right[0] + fwd[2] * right[2]) > 0 else -1)
        tar = add(add(h, mul(right, lead)), (0, -0.04 * S, 0))
        return pos, tar, 34.0, 7.0, h

    def frame_pts(pts, height=0.75, dist_mul=1.0, fov=40.0, yoff=0.0, xoff=0.0):
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[2] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        span = max(max(abs(p[0] - cx) for p in pts) * 2, 0.6)
        dist = (span * 0.9 + 1.0) * dist_mul
        pos = (cx + xoff + 0.15 * math.sin(t * 0.1), cy + height * 0.3 + yoff, cz - dist * 1.6)
        tar = (cx + xoff * 0.3, cy - 0.05, cz)
        return pos, tar, fov, 4.0, (cx, cy, cz)

    present = [w for w in chars if chars[w]['S'] > 0.01]
    if shot == 'cu' and who in chars and chars[who]['S'] > 0.01:
        return cu(who)
    if shot == 'med' and who in chars:
        pos, tar, fov, ap, fp = cu(who, dist_mul=1.9)
        return pos, add(tar, (0, -0.22 * SIZE[who], 0)), 36.0, 5.0, fp
    if shot == 'xcu_eyes':
        h = head('tiko')
        c = chars['tiko']
        fwd = (math.cos(c['yaw']), 0.0, math.sin(c['yaw']))
        d = norm((fwd[0] * 0.9, 0.0, fwd[2] * 0.9 - 0.45))
        dist = lerp(0.95, 0.72, smooth(a))
        e = add(h, (0.0, 0.05, 0.0))
        eye_pt = add(add(h, mul(fwd, 0.17)), (0.0, 0.08, 0.0))
        return add(e, mul(d, dist)), e, 32.0, 6.0, eye_pt
    if shot in ('two', 'two_tiko_sparky', 'two_low'):
        pts = [head(w) for w in ('tiko', 'sparky') if w in present]
        if shot == 'two_low':
            pos, tar, fov, ap, fp = frame_pts(pts, dist_mul=0.95)
            pos = (pos[0], 0.3, pos[2])
            tar = (tar[0], tar[1] + 0.15, tar[2])
            return pos, tar, 42.0, 4.0, fp
        p = frame_pts(pts, dist_mul=1.0 + 0.06 * (1 - a))
        return p
    if shot == 'two_mama':
        pts = [head(w) for w in ('tiko', 'sparky', 'mama') if w in present]
        return frame_pts(pts, dist_mul=0.95, fov=42.0)
    if shot == 'group':
        pts = [head(w) for w in present]
        return frame_pts(pts, dist_mul=0.75, fov=46.0, yoff=0.2)
    if shot == 'establish':
        lc = {'clearing': 0.0, 'pond': 14.0, 'nest': -14.0}[st.d['loc']]
        pts = [head(w) for w in present] or [(lc, 0.6, 0.0)]
        cx = sum(p[0] for p in pts) / len(pts)
        pos = lerp((cx - 1.2, 2.2, -5.6), (cx - 0.6, 1.3, -4.2), smooth(a))
        tar = lerp((cx - 0.4, 1.6, 1.0), (cx, 0.65, 0.2), smooth(a * 1.3))
        return pos, tar, 50.0, 2.5, (cx, 0.7, 0.0)
    if shot == 'establish_sad':
        tk = head('tiko')
        pos = lerp((tk[0] + 1.4, 2.4, -4.4), (tk[0] + 1.0, 1.7, -3.6), smooth(a))
        return pos, (tk[0] + 0.3, 0.6, tk[2] + 0.2), 44.0, 3.0, tk
    if shot == 'star_ots':
        sp = fr.star[0] if fr.star[1] > 0.01 else STAR_GROUND
        h = head('tiko')
        gp = (sp[0], min(sp[1], 0.5), sp[2])
        tar = lerp(gp, h, 0.48)
        pos = None
        for xo in (-0.3, -0.55, -0.05, -0.8, 0.2):
            p = (gp[0] + xo - 0.08 * a, 0.42 + 0.04 * a, gp[2] - 1.5 + 0.1 * a)
            if not blocked(p, h, 'tiko'):
                pos = p
                break
        if pos is None:
            pos = (gp[0] - 0.3, 0.8, gp[2] - 1.3)
        return pos, tar, 42.0, 4.5, lerp(gp, h, 0.7)
    if shot == 'star_fall_cam':
        sp = fr.star[0] if fr.star[1] > 0.01 else (-2.5, 9.0, 6.0)
        pos = (-0.35 - 0.1 * a, 0.45, -2.7)
        tsky = (-1.6, 4.6, 5.0)
        tgt = (sp[0], min(sp[1], 5.0), sp[2]) if fr.star[1] > 0.01 else tsky
        k = smooth((t - cam['t0'] - 1.2) / 1.0)
        tar = lerp(lerp(tsky, tgt, 0.6), (0.05, 0.45, -0.3), k)
        return pos, tar, 52.0, 2.0, STAR_GROUND
    if shot == 'fireworks_sky':
        pos = (-0.7, 0.35, -2.5)
        return pos, (0.35, 2.4, 3.0), 58.0, 1.5, (0.0, 0.7, 0.4)
    if shot == 'end_crane':
        k = smooth(a)
        pos = lerp((-0.6, 1.0, -1.9), (-0.4, 2.7, -4.6), k)
        tar = lerp((-0.6, 0.9, 0.0), (-0.3, 1.7, 2.2), k)
        return pos, tar, lerp(36.0, 50.0, k), 2.0, tar
    if shot == 'star_macro':
        sp = (0.05, 0.13, 0.8)
        ang = -1.9 + a * 0.5
        r = lerp(0.85, 0.6, smooth(a))
        pos = (sp[0] + math.cos(ang) * r, 0.32 - 0.08 * a, sp[2] + math.sin(ang) * r)
        return pos, add(sp, (0, 0.06, 0)), 36.0, 9.0, sp
    if shot == 'coco_wide':
        cc = head('coco')
        pts = [cc] + [head(w) for w in ('tiko', 'sparky') if w in present]
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[2] for p in pts) / len(pts)
        pos = (cx - 0.6 - 0.2 * a, 0.75, cz - 3.0)
        return pos, (cx + 0.15, 1.05, cz), 46.0, 3.5, (cx, 1.0, cz)
    if shot == 'coco_star':
        cc = head('coco')
        pos = (cc[0] - 0.9, cc[1] + 0.05, cc[2] - 1.6)
        return pos, add(cc, (0, 0.25 - 0.15 * smooth(a * 2), 0)), 40.0, 5.0, cc
    if shot == 'walk_track':
        pts = [head(w) for w in ('tiko', 'sparky') if w in present]
        cx = sum(p[0] for p in pts) / len(pts)
        pos = (cx + 0.6, 0.85, -2.4)
        return pos, (cx + 0.15, 0.7, 0.1), 42.0, 3.5, (cx, 0.7, 0.0)
    if shot == 'mama_reveal':
        mh = head('mama')
        th = head('tiko')
        pos = (th[0] - 0.8, 0.45, th[2] - 1.9)
        tar = lerp(th, mh, 0.7)
        return pos, (tar[0], tar[1] + 0.25, tar[2]), 46.0, 3.0, mh
    if shot == 'sunset_wide':
        th = head('tiko')
        pos = lerp((th[0] - 2.4, 1.0, th[2] - 3.4), (th[0] - 1.9, 0.85, th[2] - 2.8), smooth(a))
        return pos, (th[0] + 0.6, 0.75, th[2] + 1.6), 46.0, 2.0, th
    if shot == 'prof_arrive':
        th, ph = head('tiko'), head('prof')
        mid = lerp(th, ph, 0.5)
        pos = (mid[0] - 0.2, 0.75, mid[2] - 3.4)
        return pos, (mid[0] - 0.1, 0.5, mid[2] + 0.4), 46.0, 3.0, th
    if shot == 'dark_wide':
        th = head('tiko')
        pos = lerp((-1.6, 1.0, -3.6), (-1.1, 0.9, -3.0), smooth(a))
        return pos, (th[0] + 0.5, 0.7, th[2] + 0.8), 48.0, 3.0, th
    if shot == 'party_wide':
        pos = lerp((-0.2, 1.4, -4.6), (-0.1, 1.2, -4.1), smooth(a))
        return pos, (0.0, 0.85, 0.8), 50.0, 2.0, (0.0, 0.8, 0.4)
    if shot == 'setup_wide':
        pos = lerp((-0.4, 1.3, -4.2), (-0.2, 1.15, -3.8), smooth(a))
        return pos, (0.1, 0.7, 0.6), 48.0, 2.5, (0.2, 0.7, 0.6)
    if shot == 'treehouse_reveal':
        th = head('tiko')
        k = smooth(clamp((a - 0.05) / 0.6))
        pos = lerp((th[0] - 0.4, 0.75, th[2] - 1.6), (-2.6, 2.6, -0.4), k)
        tar = lerp(add(th, (0.5, 0.1, 0.8)), (-0.6, 2.45, 3.15), k)
        return pos, tar, lerp(40.0, 50.0, k), 2.0, tar
    if shot == 'to_camera':
        h = head('tiko')
        d = lerp(1.25, 0.95, smooth(a))
        pos = (h[0] + 0.05, h[1] - 0.02, h[2] - d)
        return pos, (h[0] + 0.05, h[1] - 0.04, h[2]), 34.0, 7.0, h
    # fallback: frame everyone present
    pts = [head(w) for w in present] or [(0, 0.6, 0)]
    return frame_pts(pts)


def camera(fr, chars):
    st, t = fr.st, fr.t
    cam = None
    for c in st.cams:
        if c['t0'] <= t:
            cam = c
    if cam is None:
        cam = dict(shot='establish', t0=st.t0, t1=st.t1)
    pos, tar, fov, ap, fpt = cam_shot(fr, cam, chars)
    return pos, tar, fov, ap, fpt


# ------------------------------------------------------------------ master
def uniforms(t):
    fr = Frame(t)
    st = fr.st
    d = st.d
    u = fr.u
    # first pass: rough head positions (for look-at), and a provisional star/camera for look targets
    fr.heads_guess = {}
    for w in st.cast:
        pos, yaw, S, *_ = char_base(fr, w)
        fr.heads_guess[w] = to_world(pos, yaw, S, HEAD_LOCAL[w])
    fr.star = ((0.05, 0.09, 0.8), 0.16, 1.0, 0, 0, 0, (0, 0, 0), 0)
    fr.star_pos = fr.star[0]
    # provisional chars for star pendant position
    fr.cam_pos = (0, 0.8, -3)
    prov = {}
    for w in st.cast:
        pos, yaw, S, *_ = char_base(fr, w)
        prov[w] = dict(pos=pos, yaw=yaw, S=S, sy=1.0, sxz=1.0, lean=0.0)
    fr.star = star_state(fr, prov)
    fr.star_pos = fr.star[0]
    if fr.star[1] < 0.01:
        fr.star_pos = (0.05, 0.1, 0.8)
    # provisional camera for the to-camera look
    cam0 = camera(fr, {w: dict(pos=prov[w]['pos'], yaw=prov[w]['yaw'], S=prov[w]['S']) for w in prov})
    fr.cam_pos = cam0[0]
    chars = {}
    for w in st.cast:
        chars[w] = compute_char(fr, w)
    # special look targets
    for w, c in chars.items():
        pass
    fr.star = star_state(fr, chars)
    # --- write character uniforms
    def dino(i, c):
        if c is None:
            return dict(pos=(0, -10, 0, 0.0), yaw=0.0, sq=(1, 1, 0), head=(0, 0, 0, 0), face=(1, 0, 0, 1), face2=(0.5, 0, 0, 0.5),
                        misc=(0, 0, 0, 0), look=(0, 0, 0, 0))
        return dict(pos=(c['pos'][0], c['pos'][1], c['pos'][2], c['S']), yaw=c['yaw'], sq=(c['sy'], c['sxz'], c['lean']),
                    head=(c['pitch'], c['roll'], c['hyaw'], 0.0), face=(c['eye'], c['laugh'], c['mouth'], c['es']),
                    face2=(c['width'], c['br'], c['ba'], c['smile']), misc=(c['tail'], c['arm'], c['walk_phase'], c['walk_amt']),
                    look=(c['lx'], c['ly'], c['glow'], 0.0))
    d0, d1 = dino(0, chars.get('tiko')), dino(1, chars.get('mama'))
    u['uDPosS'] = [d0['pos'], d1['pos']]
    u['uDYaw'] = [d0['yaw'], d1['yaw']]
    u['uDSquash'] = [d0['sq'], d1['sq']]
    u['uDHead'] = [d0['head'], d1['head']]
    u['uDFace'] = [d0['face'], d1['face']]
    u['uDFace2'] = [d0['face2'], d1['face2']]
    u['uDMisc'] = [d0['misc'], d1['misc']]
    u['uDLook'] = [d0['look'], d1['look']]
    c = chars.get('sparky')
    if c and c['S'] > 0.01:
        flap = 0.25 * math.sin(t * 2 * PI * 1.3) + c['extra'].get('flapk', 0.0)
        if c['walk_amt'] > 0:
            flap += 0.5 * math.sin(t * 2 * PI * 6.0) * c['walk_amt']
        if c['laugh'] > 0:
            flap += 0.6 * math.sin(t * 2 * PI * 4.5)
        mouth = max(c['mouth'], c['extra'].get('mouth_force', 0.0))
        u['uGPos'] = c['pos']
        u['uGYaw'] = c['yaw']
        u['uGSquash'] = (c['sy'], c['sxz'], c['lean'], c['S'])
        u['uGHead'] = (c['pitch'], c['roll'], c['hyaw'], 0.0)
        u['uGFace'] = (c['eye'], c['laugh'], mouth, c['es'])
        u['uGFace2'] = (c['width'], c['br'], c['ba'], c['smile'])
        u['uGMisc'] = (flap, c['tail'], c['arm'], c['extra'].get('nose', 0.0))
        u['uGLook'] = (c['lx'], c['ly'], 0.0, 0.0)
    else:
        u['uGPos'] = (0, -10, 0)
        u['uGSquash'] = (1, 1, 0, 0.0)
        u['uGYaw'] = 0.0
    c = chars.get('prof')
    if c and c['S'] > 0.01:
        u['uTPosS'] = (c['pos'][0], c['pos'][1], c['pos'][2], c['S'])
        u['uTYaw'] = c['yaw']
        u['uTHead'] = (c['pitch'] * 0.8, c['roll'] * 0.7, c['hyaw'], 0.3 + 0.6 * c['mouth'] * 0.3 + (0.4 if c['walk_amt'] > 0 else 0.0))
        u['uTFace'] = (c['eye'], c['laugh'], c['mouth'], c['es'])
        u['uTFace2'] = (c['width'], c['br'], c['ba'], c['smile'])
        bob = 0.01 * math.sin(c['walk_phase'] * 2) * c['walk_amt']
        u['uTMisc'] = (c['walk_phase'], c['walk_amt'], c['extra'].get('glasses', 1.0), bob)
        u['uTLook'] = (c['lx'], c['ly'], 0.0, 0.0)
    else:
        u['uTPosS'] = (0, -10, 0, 0.0)
        u['uTYaw'] = 0.0
    c = chars.get('coco')
    if c and c['S'] > 0.01:
        u['uPPosS'] = (c['pos'][0], c['pos'][1], c['pos'][2], c['S'])
        u['uPYaw'] = c['yaw']
        u['uPHead'] = (c['pitch'], c['roll'] * 1.5, c['hyaw'] * 1.2, 0.0)
        u['uPFace'] = (c['eye'], c['laugh'], c['mouth'], c['es'])
        u['uPFace2'] = (c['width'], c['br'], c['ba'], c['smile'])
        flap = c['extra'].get('flap', 0.08 * math.sin(t * 2.0))
        spread = c['extra'].get('spread', 0.0)
        if c['laugh'] > 0 or c['mouth'] > 0.5:
            spread = max(spread, 0.15 + 0.1 * math.sin(t * 9.0))
        u['uPMisc'] = (flap, spread, math.sin(t * 1.7), c['lean'])
        u['uPLook'] = (c['lx'], c['ly'], c['glow'], 0.0)
    else:
        u['uPPosS'] = (0, -10, 0, 0.0)
        u['uPYaw'] = 0.0
    # --- star
    sp, ss, sg, sc_, sr, sspin, svel, samt = fr.star
    u['uStar'] = (sp[0], sp[1], sp[2], ss)
    u['uStarP'] = (sg, sc_, sr, sspin)
    u['uStarTrail'] = (svel[0], svel[1], svel[2], samt)
    # --- camera
    pos, tar, fov, ap, fpt = camera(fr, chars)
    fr.cam_pos = pos
    lights, flash, shake = effects(fr, chars)
    hx = 0.004 * math.sin(t * 1.3) + shake * math.sin(t * 91.0)
    hy = 0.003 * math.sin(t * 1.7 + 1.0) + shake * math.sin(t * 77.0 + 2.0)
    pos = (pos[0] + hx, pos[1] + hy, pos[2])
    u['uCamPos'] = pos
    u['uCamTar'] = tar
    u['uFov'] = fov
    u['uCamRoll'] = 0.0
    focus = math.dist(pos, fpt)
    # --- environment
    tod = TOD[d['tod']]
    sun = norm(tod[0])
    u['uSunDir'] = sun
    u['uSunCol'] = tod[1]
    u['uSkyTop'] = tod[2]
    u['uSkyHor'] = tod[3]
    u['uFogCol'] = tod[4]
    u['uAmbCol'] = tod[5]
    fwd = norm(sub(tar, pos))
    u['uKeyDir'] = norm((-fwd[0] + 0.3, 0.55, -fwd[2]))
    u['uKeyCol'] = tod[6]
    party = 1.0 if (d.get('party') or d.get('party_setup')) else 0.0
    lit = 0.0
    if d.get('party') and d['tod'] == 'night':
        e = ev(fr, 'surprise')
        lit = smooth((t - e['t1'] + 0.05) / 0.25) if e else 1.0
    conf = -1.0
    e = ev(fr, 'surprise')
    if e and t > e['t1']:
        conf = t - e['t1']
    u['uEnv'] = (tod[7], tod[8], tod[9], LOC_ID[d['loc']])
    u['uParty'] = (party, lit, 1.0 if (d.get('party') and d['tod'] == 'night') else 0.0, conf)
    # night: before the lanterns, keep moonlight; when lit, warm lights
    if lit > 0:
        for (lp, lc) in LANTERN_LIGHTS:
            lights.append((lp, lc, 1.1 * lit, 0.7))
        lights.append(((1.45, 1.0, 0.25), (1.0, 0.7, 0.35), 0.6 * lit, 2.0))
    lights = sorted(lights, key=lambda l: -l[2])[:6]
    pl = [(l[0][0], l[0][1], l[0][2], l[3]) for l in lights] + [(0, -10, 0, 1.0)] * (6 - len(lights))
    plc = [(l[1][0], l[1][1], l[1][2], l[2]) for l in lights] + [(0, 0, 0, 0.0)] * (6 - len(lights))
    u['uPL'] = pl
    u['uPLc'] = plc
    # --- post
    fade = 1.0
    sidx = [s['id'] for s in SCENES].index(st.id)
    fin, fout = 0.4, 0.4
    if st.id != 'hook' and st.id != 'title':
        fade = min(fade, smooth((t - st.t0) / fin))
    if st.id == 'title':
        fade = min(fade, smooth((t - st.t0) / 0.6))
    if st.id != 'hook':
        fade = min(fade, smooth((st.t1 - t) / fout))
    if st.id == 's8':
        e = ev(fr, 'end_card')
        if e:
            fade = min(fade, 1.0 - 0.75 * smooth((t - e['t0']) / 1.2))
    mind = 0.0
    if d.get('mind'):
        mind = 0.55 * mind_boost(fr)
        if st.id == 's6':
            e = ev(fr, 'star_crack')
            if e and t > e['t0']:
                e2 = ev(fr, 'star_dim')
                mind = max(mind, 0.9 * (1.0 - (smooth((t - e2['t0']) / 0.8) if e2 else 0.0)))
    if st.id == 'hook':
        mind = 0.7
    grade = tod[10]
    post = dict(uFade=fade, uMindFx=mind, uGrade=grade, uFlash=flash)
    return u, post, focus, ap


if __name__ == '__main__':
    import sys
    for a in sys.argv[1:]:
        u, post, f, ap = uniforms(float(a))
        print(a, scene_at(float(a))['id'], u['uCamPos'], post)
