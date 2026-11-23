"""Animation timeline for the 20 s short: returns shader uniforms for a given time."""
import math

PI = math.pi


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = clamp(x)
    return x ** 3


def lerp(a, b, t):
    if isinstance(a, (tuple, list)):
        return tuple(lerp(x, y, t) for x, y in zip(a, b))
    return a + (b - a) * t


def kf(t, keys, ease=smooth):
    """keys: list of (time, value). Piecewise eased interpolation."""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            if t1 == t0:
                return v1
            return lerp(v0, v1, ease((t - t0) / (t1 - t0)))
    return keys[-1][1]


def pulse(t, t0, dur):
    """0 -> 1 -> 0 bump centred at t0."""
    x = (t - t0) / dur
    if abs(x) >= 1:
        return 0.0
    return 0.5 + 0.5 * math.cos(x * PI)


def blink(t, times, dur=0.16):
    v = 1.0
    for b in times:
        v = min(v, 1.0 - pulse(t, b, dur / 2))
    return v


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


# ------------------------------------------------------------------ layout
EGG = (0.42, 0.0, 0.22)
D_HOME = -0.52
G_LAND = (0.06, 0.0, -0.12)


def dino(t):
    u = {}
    # walking in: x from -2.4 to -0.78 between 0 and 3.0 s, then a little step at 4.6
    x = kf(t, [(0.0, -2.45), (3.0, -0.80)], ease=lambda s: 1 - (1 - s) ** 1.6)
    x += kf(t, [(4.5, 0.0), (5.4, 0.20)])          # creeps closer
    x += kf(t, [(10.15, 0.0), (10.45, -0.10)])      # startled back
    x += kf(t, [(13.95, 0.0), (14.35, -0.05)])
    walk_amt = kf(t, [(0.0, 1.0), (2.6, 1.0), (3.1, 0.0), (4.5, 0.0), (4.7, 0.6), (5.3, 0.6), (5.5, 0.0)])
    walk_phase = (x + 2.45) * 10.5
    y = abs(math.sin(walk_phase)) * 0.045 * walk_amt
    # startled hop after the fireball
    y += jump_arc(t, 14.0, 14.45, 0.28)
    # laughing bounce
    lg = smooth((t - 15.1) / 0.4)
    y += lg * abs(math.sin((t - 15.1) * 2 * PI * 2.3)) * 0.05
    yaw = -0.42 + 0.05 * math.sin(walk_phase) * walk_amt
    yaw += kf(t, [(15.0, 0.0), (15.8, -0.12)])
    # squash & stretch
    sy, sxz = 1.0, 1.0
    s = 0.04 * math.sin(walk_phase * 2) * walk_amt
    sy += s; sxz -= s * 0.5
    duck = pulse(t, 13.86, 0.14)                      # duck under the fireball
    sy -= duck * 0.22; sxz += duck * 0.12
    land = pulse(t, 14.5, 0.1)
    sy -= land * 0.15; sxz += land * 0.08
    pop = damped(t, 10.2, 3.0, 5.0)
    sy += pop * 0.12; sxz -= pop * 0.06
    lb = lg * math.sin((t - 15.1) * 2 * PI * 2.3 * 2) * 0.05
    sy += lb; sxz -= lb * 0.5
    lean = kf(t, [(0.0, -0.06), (2.8, -0.06), (3.2, 0.06), (3.6, 0.0), (5.6, -0.12), (6.6, -0.05),
                  (9.6, 0.04), (10.1, 0.0), (10.3, 0.2), (11.0, 0.1), (12.6, 0.0), (13.7, 0.0),
                  (13.85, -0.22), (14.4, 0.0)])
    lean += lg * (0.1 * math.sin((t - 15.1) * 2 * PI * 1.15) + 0.08)
    u['uDPos'] = (x, y, 0.0)
    u['uDYaw'] = yaw
    u['uDSquash'] = (sy, sxz, lean)
    # head: pitch, roll, yaw
    pitch = kf(t, [(0, 0.0), (2.9, 0.0), (3.2, -0.12), (4.0, -0.18), (6.4, -0.12), (9.8, -0.18),
                   (10.25, 0.2), (11.0, 0.1), (11.6, -0.05), (13.7, -0.05), (13.85, -0.25), (14.1, 0.1),
                   (14.6, 0.0), (15.1, 0.0), (15.4, 0.2)])
    pitch += lg * 0.12 * math.sin((t - 15.1) * 2 * PI * 2.3)
    roll = kf(t, [(0, 0.0), (3.6, 0.0), (4.2, 0.28), (5.2, 0.28), (5.7, -0.12), (6.4, 0.0),
                  (11.5, 0.0), (12.0, 0.22), (12.8, 0.22), (13.2, 0.0)])
    roll += 0.05 * math.sin(walk_phase) * walk_amt
    roll += lg * 0.15 * math.sin((t - 15.1) * 2 * PI * 0.8)
    hyaw = kf(t, [(0, 0.15), (2.6, 0.15), (3.0, -0.05), (12.6, -0.05), (14.0, -0.05)])
    u['uDHead'] = (pitch, roll, hyaw, 0.0)
    # face
    eo = blink(t, [1.4, 4.9, 7.3, 11.9, 14.65, 14.85])
    laugh = smooth((t - 15.15) / 0.3)
    mouth = kf(t, [(0, 0.0), (2.95, 0.0), (3.1, 0.35), (3.5, 0.0), (10.15, 0.0), (10.3, 0.6), (11.0, 0.3), (11.6, 0.0),
                   (13.8, 0.0), (13.9, 0.85), (14.6, 0.6), (14.9, 0.0)])
    mouth = max(mouth, laugh * (0.65 + 0.3 * abs(math.sin((t - 15.1) * 2 * PI * 2.3))))
    escale = kf(t, [(0, 1.0), (2.9, 1.0), (3.05, 1.22), (3.8, 1.1), (9.8, 1.1), (10.2, 1.32), (11.2, 1.18),
                    (12.5, 1.1), (13.75, 1.1), (13.9, 1.38), (14.7, 1.25), (15.1, 1.0)])
    u['uDFace'] = (eo, laugh, mouth, escale)
    tail = t * 2 * PI * (1.6 + 1.6 * laugh) + walk_phase * 0.5
    arm = kf(t, [(0, 0.0), (10.15, 0.0), (10.3, 0.9), (11.2, 0.3), (12.0, 0.0), (13.8, 0.0), (13.9, 1.0),
                 (14.7, 0.5), (15.0, 0.2)])
    arm = max(arm, laugh * (0.45 + 0.25 * math.sin((t - 15.1) * 2 * PI * 2.3)))
    u['uDMisc'] = (tail, arm, walk_phase, walk_amt)
    # look direction (side, up) in eye space; looking toward the egg/dragon
    lx = kf(t, [(0, 0.0), (2.7, 0.0), (3.0, 0.25), (12.6, 0.25)])
    ly = kf(t, [(0, 0.0), (3.0, -0.25), (6.0, -0.25), (10.2, -0.1), (10.6, 0.25), (11.4, -0.05),
                (13.6, 0.05), (13.9, 0.45), (14.2, 0.1), (15.0, 0.0)])
    u['uDLook'] = (lx, ly)
    return u


def dragon(t):
    u = {}
    if t < 10.3:
        u['uGPos'] = (EGG[0], 0.05, EGG[2]); u['uGYaw'] = PI + 0.5
        u['uGSquash'] = (1, 1, 0, 0.0)
        u['uGHead'] = (0, 0, 0, 0); u['uGFace'] = (1, 0, 0, 1); u['uGMisc'] = (0, 0, 0, 0); u['uGLook'] = (0, 0)
        return u
    # jump out of the egg
    ja = clamp((t - 10.3) / 1.0)
    px = lerp(EGG[0], G_LAND[0], ja)
    pz = lerp(EGG[2], G_LAND[2], ja)
    py = 0.08 * (1 - ja) + jump_arc(t, 10.3, 11.3, 0.62)
    scale = 0.47 * ease_out((t - 10.3) / 0.25)
    sy, sxz = 1.0, 1.0
    # stretch in flight, squash on landing
    if 10.3 < t < 11.3:
        st = 0.18 * math.sin(clamp((t - 10.3) / 1.0) * PI)
        sy += st * 0.6; sxz -= st * 0.3
    land = damped(t, 11.3, 2.5, 4.0)
    sy -= land * 0.22; sxz += land * 0.12
    yaw = PI + 0.5
    yaw += kf(t, [(10.3, 0.6), (11.3, 0.0)])
    # ah.. ah.. CHOO
    ahh = kf(t, [(12.55, 0.0), (13.0, 0.5), (13.1, 0.45), (13.5, 1.0), (13.58, 1.0), (13.64, -0.6), (13.85, -0.4), (14.3, 0.0)])
    sy += max(ahh, 0) * 0.08 - max(-ahh, 0) * 0.15
    sxz -= max(ahh, 0) * 0.03 - max(-ahh, 0) * 0.08
    lean = -max(ahh, 0) * 0.15 + max(-ahh, 0) * 0.3
    lg = smooth((t - 15.25) / 0.4)
    hop = lg * abs(math.sin((t - 15.25) * 2 * PI * 2.0)) * 0.09
    py += hop
    lb = lg * math.sin((t - 15.25) * 2 * PI * 4.0) * 0.06
    sy += lb; sxz -= lb * 0.5
    lean += lg * (0.12 * math.sin((t - 15.25) * 2 * PI * 1.0) - 0.05)
    yaw += lg * -0.1
    u['uGPos'] = (px, py, pz)
    u['uGYaw'] = yaw
    u['uGSquash'] = (sy, sxz, lean, scale)
    pitch = kf(t, [(11.3, 0.0), (11.6, -0.1), (12.4, -0.05)]) + max(ahh, 0) * 0.42 - max(-ahh, 0) * 0.35
    pitch += lg * (0.15 + 0.12 * math.sin((t - 15.25) * 2 * PI * 2.0))
    roll = kf(t, [(11.3, 0.0), (11.6, 0.3), (11.9, -0.25), (12.2, 0.25), (12.5, 0.0)])
    roll += lg * 0.18 * math.sin((t - 15.25) * 2 * PI * 0.9)
    hyaw = kf(t, [(11.3, 0.0), (11.6, 0.35), (11.9, -0.3), (12.2, 0.0)])
    u['uGHead'] = (pitch, roll, hyaw, 0.0)
    eo = kf(t, [(10.3, 0.0), (10.7, 0.0), (10.95, 1.0), (12.6, 1.0), (13.0, 0.55), (13.1, 0.6), (13.5, 0.15), (13.58, 0.0),
                (13.8, 0.0), (14.05, 1.0)])
    eo = min(eo, blink(t, [11.75, 12.25, 14.9]))
    laugh = smooth((t - 15.3) / 0.3)
    mouth = kf(t, [(10.3, 0.5), (10.9, 0.4), (11.3, 0.0), (12.8, 0.0), (13.0, 0.25), (13.1, 0.15), (13.5, 0.45), (13.58, 0.4),
                   (13.62, 1.0), (13.9, 0.8), (14.2, 0.0)])
    mouth = max(mouth, laugh * (0.6 + 0.35 * abs(math.sin((t - 15.25) * 2 * PI * 2.6))))
    escale = kf(t, [(10.3, 1.0), (11.0, 1.15), (12.5, 1.1), (13.0, 1.0), (14.0, 1.0), (14.1, 1.3), (14.9, 1.2), (15.3, 1.0)])
    u['uGFace'] = (eo, laugh, mouth, escale)
    flap = 0.0
    if 10.3 < t < 11.4:
        flap = 0.7 * math.sin((t - 10.3) * 2 * PI * 7.0)
    flap += 0.25 * math.sin(t * 2 * PI * 1.3) * (1 - lg)
    flap += lg * 0.75 * math.sin((t - 15.25) * 2 * PI * 4.5)
    flap += kf(t, [(13.55, 0.0), (13.62, 0.8), (14.0, 0.0)])
    tail = t * 2 * PI * (1.2 + 1.8 * lg)
    arm = kf(t, [(10.3, 0.8), (11.3, 0.2), (11.6, 0.0), (13.7, 0.0), (13.9, 1.0), (14.8, 1.0), (15.1, 0.3)])
    arm = max(arm, lg * (0.5 + 0.4 * math.sin((t - 15.25) * 2 * PI * 2.0)))
    nose = clamp(max(ahh, 0)) * (0.7 + 0.3 * math.sin(t * 40))
    u['uGMisc'] = (flap, tail, arm, nose)
    lx = kf(t, [(11.3, 0.0), (11.6, 0.4), (11.9, -0.35), (12.2, -0.15), (12.5, -0.25)])
    ly = kf(t, [(11.3, 0.0), (12.4, -0.05), (13.0, 0.2), (13.6, 0.2), (14.1, 0.0)])
    u['uGLook'] = (lx, ly)
    return u


def egg(t):
    u = {}
    glow = 0.55 + 0.2 * math.sin(t * 2 * PI * 0.8)
    glow += kf(t, [(2.8, 0.0), (3.2, 0.5), (4.0, 0.15)])
    glow += kf(t, [(6.4, 0.0), (9.5, 0.6), (10.15, 1.2), (10.4, 0.0)])
    wob = kf(t, [(6.4, 0.0), (7.0, 0.07), (7.6, 0.0), (8.2, 0.0), (8.6, 0.1), (9.0, 0.06), (9.4, 0.16), (10.15, 0.22)])
    f = 3.2 if t < 9.3 else 9.0
    tx = wob * math.sin(t * 2 * PI * f)
    tz = wob * math.sin(t * 2 * PI * f * 1.3 + 1.0)
    squash = 1.0 - 0.06 * pulse(t, 10.1, 0.12) + 0.05 * pulse(t, 10.22, 0.06)
    hop = 0.0
    if 9.4 < t < 10.15:
        hop = abs(math.sin((t - 9.4) * 2 * PI * 4.0)) * 0.03
    opened = t >= 10.2
    if opened:
        tx = 0.06 * damped(t, 10.2, 3.5, 5.0)
        tz = 0.0
        glow = 0.25 + 0.15 * math.sin(t * 2 * PI * 0.8)
    u['uEPos'] = (EGG[0], hop, EGG[2])
    u['uEWob'] = (tx, tz, squash, glow)
    crack = kf(t, [(8.5, 0.0), (9.0, 0.35), (9.6, 0.6), (10.0, 1.0)])
    interior = kf(t, [(10.2, 1.5), (11.0, 0.8), (13.0, 0.4)]) if opened else 0.0
    burst = (math.exp(-(t - 10.2) * 6.0) if opened else 0.0)
    u['uECrack'] = (crack, 1.0 if opened else 0.0, interior, burst)
    # cap flies up, spins, lands to the side
    if opened:
        ca = clamp((t - 10.2) / 0.85)
        cx = lerp(EGG[0], EGG[0] + 0.55, ca)
        cz = lerp(EGG[2], EGG[2] + 0.35, ca)
        cy = jump_arc(t, 10.2, 11.05, 0.9) + hop
        rz = -ca * 2.6
        rx = ca * 0.5
        if t > 11.05:
            b = damped(t, 11.05, 3, 6) * 0.15
            cy = abs(b) * 0.5
            rz = -2.6 + b
        u['uCapPos'] = (cx, cy, cz)
        u['uCapRot'] = (rx, 0.0, rz)
    else:
        u['uCapPos'] = (EGG[0], hop, EGG[2])
        u['uCapRot'] = (0, 0, 0)
    return u


def fireball(t, dr):
    u = {}
    t0, t1 = 13.6, 14.12
    # mouth position estimate (dragon faces -x, toward the camera)
    gx, gy, gz = G_LAND
    start = (gx - 0.3, 0.52, gz - 0.12)
    mid = (-0.4, 1.45, -0.08)
    end = (-0.72, 1.68, 0.3)
    if t0 <= t <= t1:
        a = (t - t0) / (t1 - t0)
        # quadratic bezier
        p = tuple((1 - a) ** 2 * s + 2 * (1 - a) * a * m + a * a * e for s, m, e in zip(start, mid, end))
        v = tuple(2 * (1 - a) * (m - s) + 2 * a * (e - m) for s, m, e in zip(start, mid, end))
        size = 0.07 + 0.05 * smooth(a / 0.3)
        inten = 1.0
    else:
        p, v, size, inten = end, (0, 0, 0), 0.0, 0.0
    u['uFB'] = (p[0], p[1], p[2], size)
    smoke = 0.0
    if t > t1:
        smoke = clamp((t - t1) / 1.1)
        if smoke >= 1.0:
            smoke = 0.0
    burst_age = clamp((t - 10.2) / 1.6) if t >= 10.2 else 0.0
    sparkle = (1 - burst_age) if t >= 10.2 else 0.0
    # small sparkle burst at the poof too
    u['uFBp'] = (inten, smoke, burst_age, sparkle)
    u['uFBVel'] = v
    u['uSmokePos'] = end
    return u


def camera(t):
    """Returns (pos, target, fov, roll, focus, aperture)."""
    shake = 0.0
    dx = dino(t)['uDPos'][0]
    fpt = None
    if t < 3.4:   # A: establishing, tilt down from canopy, dino enters
        a = t / 3.4
        pos = kf(t, [(0, (-0.7, 1.4, -5.0)), (3.4, (-0.45, 0.85, -3.5))])
        tar = kf(t, [(0, (-0.6, 2.1, 0.5)), (1.6, (-0.55, 0.75, 0.3)), (3.4, (-0.25, 0.55, 0.2))])
        fov = 50
        ap = 3.0
        fpt = (dx + 0.3, 0.8, -0.1)
    elif t < 6.4:  # B: close on the dino's face, lit by the egg
        pos = kf(t, [(3.4, (0.28, 0.82, -1.55)), (6.4, (0.18, 0.8, -1.2))])
        tar = kf(t, [(3.4, (-0.42, 0.88, 0.05)), (5.4, (-0.22, 0.86, 0.05)), (6.4, (-0.22, 0.84, 0.05))])
        fov = 42
        ap = 7.0
        fpt = (dx + 0.45, 0.95, -0.15)
    elif t < 10.0:  # C: two-shot, then push in on the shaking egg
        pos = kf(t, [(6.4, (-0.05, 0.75, -2.55)), (8.6, (0.05, 0.72, -2.35)), (10.0, (0.36, 0.5, -1.25))])
        tar = kf(t, [(6.4, (0.0, 0.55, 0.1)), (8.6, (0.08, 0.5, 0.1)), (10.0, (0.38, 0.38, 0.2))])
        fov = 44
        ap = 4.5
        fpt = lerp((0.0, 0.6, 0.05), EGG, smooth((t - 8.6) / 1.4))
        shake = kf(t, [(8.5, 0.0), (9.4, 0.004), (10.0, 0.012)])
    elif t < 12.6:  # D: pop and the dragon jumps out
        pos = kf(t, [(10.0, (0.15, 0.62, -2.3)), (12.6, (-0.05, 0.62, -2.15))])
        tar = kf(t, [(10.0, (0.2, 0.5, 0.1)), (10.8, (0.15, 0.75, 0.05)), (11.5, (-0.05, 0.5, 0.0)), (12.6, (-0.1, 0.5, 0.0))])
        fov = 46
        ap = 4.0
        fpt = (0.05, 0.5, -0.05)
        shake = 0.03 * math.exp(-(t - 10.2) * 5.0) if t > 10.2 else 0.0
    elif t < 14.8:  # E: ah.. ah.. CHOO
        pos = kf(t, [(12.6, (0.1, 0.62, -1.75)), (13.55, (0.12, 0.6, -1.55)), (13.65, (-0.25, 0.85, -2.75)), (14.8, (-0.3, 0.88, -2.6))],
                 ease=lambda s: s if False else smooth(s))
        tar = kf(t, [(12.6, (0.08, 0.5, -0.05)), (13.55, (0.1, 0.45, -0.1)), (13.65, (-0.3, 0.75, 0.0)), (14.8, (-0.25, 0.65, 0.0))])
        # hard cut at the sneeze
        if t >= 13.6:
            b = clamp((t - 13.6) / 1.2)
            pos = lerp((-0.25, 0.98, -3.25), (-0.3, 0.9, -2.95), smooth(b))
            tar = lerp((-0.28, 0.92, 0.0), (-0.22, 0.7, 0.0), smooth(b))
        fov = 46
        ap = 3.5
        fpt = (-0.15, 0.6, -0.1)
        shake = 0.02 * math.exp(-(t - 13.62) * 4.0) if t > 13.62 else 0.0
    else:           # F: both laughing, slow crane out
        b = (t - 14.8) / 5.2
        pos = lerp((-0.22, 0.75, -2.9), (-0.35, 1.1, -3.8), smooth(b))
        tar = lerp((-0.22, 0.55, 0.0), (-0.2, 0.62, 0.05), smooth(b))
        fov = 46
        ap = 3.0
        fpt = (-0.2, 0.6, -0.1)
    # handheld-ish micro motion + shake
    hx = 0.004 * math.sin(t * 1.3) + shake * math.sin(t * 91.0)
    hy = 0.003 * math.sin(t * 1.7 + 1.0) + shake * math.sin(t * 77.0 + 2.0)
    pos = (pos[0] + hx, pos[1] + hy, pos[2])
    focus = math.dist(pos, fpt) if fpt else math.dist(pos, tar)
    return pos, tar, fov, 0.0, focus, ap


def uniforms(t):
    u = {'uTime': t}
    u.update(dino(t))
    dr = dragon(t)
    u.update(dr)
    u.update(egg(t))
    u.update(fireball(t, dr))
    pos, tar, fov, roll, focus, ap = camera(t)
    u['uCamPos'] = pos
    u['uCamTar'] = tar
    u['uFov'] = fov
    u['uCamRoll'] = roll
    return u, focus, ap
