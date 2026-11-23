/* EP05 scene library: cast, props, crowd and time-freeze effects (browser).
 * Kip is drawn ONLY through Kip.renderKip() (locked v1.0.0). Everyone stands upright; nobody is ever rotated. */
(function (root) {
  'use strict';
  const { clamp, lerp, sm, easeOut, easeIO, f, rng, txt, FONT } = root.Engine.H;
  const K = root.Kip, X = root.Extras;
  const TL = () => root.Engine.tl();
  const Lb = {};

  // ---------------------------------------------------------------- cast
  const CAST = {
    max: X.CAST.max,
    mom:  { name: 'Mom', skin: '#f2d3b3', skinLo: '#cfae8c', ink: '#2b1e14', eyeLine: true, hat: 'bun', hatColor: '#5a3522',
            top: 'sweater', topColor: '#d9487a', topDark: '#a8335c', pants: '#3b4f7a', shoe: '#f0f0f0', height: 1.1 },
    prof: { name: 'Professor Tock', skin: '#ecc9a6', skinLo: '#c9a07c', ink: '#2b2018', eyeLine: true, hat: 'bald', hatColor: '#f4f4f8', glasses: true,
            top: 'coat', topColor: '#f4f6fa', topDark: '#c9cfdb', shirt: '#7b3fe0', pants: '#33304a', shoe: '#1d1b26', height: 1.1 },
    wren: { name: 'Wren', skin: '#f3d6c2', skinLo: '#d4b39c', ink: '#1d1a24', eyeLine: true, hat: 'side', hatColor: '#e6ebf6',
            top: 'coat', topColor: '#2b3346', topDark: '#1a2030', shirt: '#2fc6e0', pants: '#1c2130', shoe: '#2fc6e0', height: 0.98 },
    vend: { name: 'Vendor', skin: '#c99068', skinLo: '#a06c48', ink: '#22160e', eyeLine: true, hat: 'flattop', hatColor: '#2a1a12',
            top: 'shirt', topColor: '#e8413b', topDark: '#b02a26', pants: '#2d3142', shoe: '#222', height: 1.08 },
    girl: { name: 'Girl', skin: '#8f5f42', skinLo: '#6a4430', ink: '#1e140e', eyeLine: false, hat: 'curly', hatColor: '#1a120c',
            top: 'shirt', topColor: '#ffc93c', topDark: '#d9a21e', pants: '#7a5cff', shoe: '#ff5e8a', height: 0.74 }
  };
  const VOICE = { kip: 'KIP', max: 'MAX', mom: 'MOM', prof: 'PROF', wren: 'WREN', vend: 'VEND', girl: 'GIRL' };
  const WHO = { KIP: 'kip', MAX: 'max', MOM: 'mom', PROF: 'prof', WREN: 'wren', HOOD: 'wren', VEND: 'vend', GIRL: 'girl' };

  // ---------------------------------------------------------------- timeline helpers
  function since(c, a) {
    const B = TL().beats;
    for (const i of c.run.beats) if (B[i].a === a && c.t >= B[i].start) return c.t - B[i].start;
    return -1;
  }
  function sinceLast(c, a) {
    const B = TL().beats; let r = -1;
    for (const i of c.run.beats) if (B[i].a === a && c.t >= B[i].start) r = c.t - B[i].start;
    return r;
  }
  function beatOf(c, a, v) { const B = TL().beats; for (const i of c.run.beats) if (B[i].a === a && (!v || B[i].v === v)) return B[i]; return null; }
  const after = (c, a) => since(c, a) >= 0;

  // ---------------------------------------------------------------- poses
  const P_CLAP = { armL: { sh: 24, el: -112 }, armR: { sh: 24, el: -112 }, legL: { hip: 6, knee: 0 }, legR: { hip: 6, knee: 0 }, lean: 0, headTilt: 0, bob: 0 };
  const P_CLAP_OPEN = { armL: { sh: 48, el: -80 }, armR: { sh: 48, el: -80 }, legL: { hip: 6, knee: 0 }, legR: { hip: 6, knee: 0 }, lean: 0, headTilt: 0, bob: 0 };
  function clapPose(t0) {   // two quick claps starting at t0 (seconds since action start)
    if (t0 < 0) return null;
    const ph = t0 / 0.22;
    if (t0 > 0.9) return P_CLAP;
    return K.pose({ from: P_CLAP_OPEN, to: P_CLAP, t: Math.abs(Math.sin(ph * Math.PI / 2)) });
  }
  function walkPose(t, amt, run = false) {
    const ph = t * (run ? 13 : 8), s = Math.sin(ph) * amt;
    return { armL: { sh: 12 + s * (run ? 40 : 22), el: -20 }, armR: { sh: 12 - s * (run ? 40 : 22), el: -20 },
      legL: { hip: s * (run ? 28 : 18), knee: -Math.max(0, -Math.sin(ph)) * 25 * amt }, legR: { hip: -s * (run ? 28 : 18), knee: -Math.max(0, Math.sin(ph)) * 25 * amt },
      lean: run ? -6 * amt : 0, headTilt: 0, bob: -Math.abs(Math.cos(ph)) * 8 * amt };
  }
  const P_REACH = { armL: { sh: 12, el: -10 }, armR: { sh: 88, el: -8 }, legL: { hip: 6, knee: 0 }, legR: { hip: 6, knee: 0 }, lean: -2, headTilt: 0, bob: 0 };
  const P_DRAG = { armL: { sh: 12, el: -20 }, armR: { sh: 70, el: 10 }, legL: { hip: 6, knee: 0 }, legR: { hip: 6, knee: 0 }, lean: -8, headTilt: 0, bob: 0 };

  // ---------------------------------------------------------------- characters
  /* Kip: moves in frozen time (real clock) unless o.frozen */
  function kip(c, o = {}) {
    const fr = o.frozen;
    const base = { id: 'kip', expression: c.kExpr('k'), pose: c.kExpr('p', 'idle'), blink: fr ? 0 : K.blinkAt(c.t),
      talk: fr ? 0 : c.talk('KIP'), t: fr ? c.wt : c.t, x: 760, y: 905, scale: 1.0, lookX: 0.3 };
    return K.renderKip(Object.assign(base, o));
  }
  /* Supporting cast. o.live = moves during frozen time (Wren / the stranger, Max in the finale). */
  function person(who, c, o = {}) {
    const spec = CAST[who] || who;
    const fr = c.z > 0.5 && !o.live;
    const tt = fr ? c.wt : c.t;
    return X.renderPerson(spec, Object.assign({ id: who, expression: c.eExpr(who), blink: fr ? 0 : K.blinkAt(c.t, who.length),
      talk: fr ? 0 : (VOICE[who] ? c.talk(VOICE[who]) : 0), t: tt, x: 1250, y: 905, scale: 1.0, flip: true, lookX: -0.4 }, o));
  }
  /* gaze toward whoever is speaking (or toward Kip) */
  function lookFrom(c, me, P) {
    let tgt = WHO[c.b.v];
    if (!tgt || tgt === me || !P[tgt]) tgt = me === 'kip' ? (Object.keys(P).find(k => k !== 'kip') || null) : 'kip';
    if (!tgt || !P[tgt]) return 0.0;
    return clamp((P[tgt].x - P[me].x) / 260, -0.75, 0.75);
  }
  /* head centre in world space for a character placed at x,y with scale s and height h */
  const headAt = (x, y = 905, s = 1, h = 1) => ({ x, y: y - 470 * s * h });

  /* The hooded stranger: Wren's body + a long hood with glowing clock-eyes (a costume prop drawn on top). */
  function hooded(c, o = {}) {
    const x = o.x || 1300, y = o.y || 905, s = o.scale || 1, h = CAST.wren.height, sc = s * h, fl = o.flip === false ? 1 : -1;
    const pose = o.pose || 'idle';
    const body = X.renderPerson(Object.assign({}, CAST.wren, { topColor: '#262b38', topDark: '#171b25', shoe: '#1a1d26', pants: '#151821' }),
      { id: 'hood', x, y, scale: s, flip: fl < 0, expression: 'neutral', pose, t: c.t, blink: 0, shadow: o.shadow !== false });
    const tw = c.talk('HOOD'), glow = 0.75 + 0.25 * Math.sin(c.t * 3) + tw * 0.4;
    const P = K.pose(pose), bob = (P.bob || 0) + Math.sin(c.t * 2.2 + 1) * 1;
    const hand = (o.watch && X.hands({ x, y, scale: sc, flip: fl < 0, pose, t: c.t }).R) || null;
    const eye = ex => `<g transform="translate(${ex} -468)"><ellipse rx="30" ry="22" fill="#ffb347" opacity="${f(0.22 * glow)}"/>
        <circle r="15" fill="#ffd27a"/><circle r="15" fill="none" stroke="#fff3d6" stroke-width="3"/>
        <path d="M0 0 L0 -10 M0 0 L${f(8 * Math.cos(c.t * 2))} ${f(8 * Math.sin(c.t * 2))}" stroke="#5a2a00" stroke-width="2.6" stroke-linecap="round"/></g>`;
    const hood = `<g transform="translate(${f(x)} ${f(y)}) scale(${f(sc * fl)} ${f(sc)})"><g transform="rotate(${f(P.lean || 0)} 0 ${f(-190 + bob)}) translate(0 ${f(bob)})">
      <path d="M-150 -300 Q-178 -470 -128 -585 Q-60 -675 0 -672 Q60 -675 128 -585 Q178 -470 150 -300 Q80 -268 0 -270 Q-80 -268 -150 -300Z" fill="#20242f"/>
      <path d="M-128 -585 Q-60 -675 0 -672 Q60 -675 128 -585 Q90 -640 0 -645 Q-90 -640 -128 -585Z" fill="#323848"/>
      <ellipse cx="0" cy="-458" rx="98" ry="104" fill="#06070b"/>
      <ellipse cx="0" cy="-440" rx="80" ry="70" fill="#0d0f16"/>
      ${eye(-36)}${eye(36)}
      <path d="M-150 -300 Q-120 -230 -70 -200 L70 -200 Q120 -230 150 -300 Q80 -268 0 -270 Q-80 -268 -150 -300Z" fill="#191c25"/>
      <circle cx="0" cy="-238" r="13" fill="#ffd27a" opacity="${f(0.6 + 0.4 * glow)}"/><circle cx="0" cy="-238" r="24" fill="#ffb347" opacity="${f(0.18 * glow)}"/></g></g>`;
    const watch = hand ? pocketWatch(hand.x, hand.y - 20, 0.9, c.t, o.watchGlow || 1) : '';
    return body + hood + watch;
  }
  function pocketWatch(x, y, s, t, glow = 1) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><circle r="${f(60 + 10 * Math.sin(t * 4))}" fill="#ffd27a" opacity="${f(0.18 * glow)}"/>
      <path d="M0 -36 L0 -52" stroke="#d9a441" stroke-width="5"/><circle cy="-56" r="7" fill="none" stroke="#d9a441" stroke-width="4"/>
      <circle r="34" fill="#d9a441"/><circle r="28" fill="#fff8e6"/>
      ${[...Array(12)].map((_, i) => { const a = i / 12 * 6.283; return `<circle cx="${f(Math.cos(a) * 22)}" cy="${f(Math.sin(a) * 22)}" r="2" fill="#5a3a10"/>`; }).join('')}
      <path d="M0 0 L${f(15 * Math.cos(t * 1.3 - 1.57))} ${f(15 * Math.sin(t * 1.3 - 1.57))} M0 0 L${f(10 * Math.cos(t * 0.2))} ${f(10 * Math.sin(t * 0.2))}" stroke="#2a1a08" stroke-width="3" stroke-linecap="round"/></g>`;
  }

  // ---------------------------------------------------------------- crowd (original background people, seeded)
  const SKINS = [['#f2d3b3', '#cfae8c'], ['#c58b5e', '#9a6842'], ['#8a5a3c', '#5e3b26'], ['#e2b48a', '#b98a62'], ['#f6d8c0', '#d8b49a'], ['#a87050', '#7e5034']];
  const HATS = ['flattop', 'curly', 'side', 'bun', 'bald', 'beanie', 'side', 'curly'];
  const TOPS = ['shirt', 'sweater', 'coat', 'hoodie', 'shirt'];
  const TCOL = [['#5b7cfa', '#3f5bd1'], ['#3cc48a', '#2a9468'], ['#f4b63d', '#c98f1f'], ['#a05cf0', '#7a3dc7'], ['#ef5b6c', '#c13c4c'],
    ['#4fc3e8', '#2e9cc0'], ['#e8e2d4', '#c4bcaa'], ['#2e3a55', '#1f283d'], ['#ff8fb1', '#e06a90'], ['#7d8a3c', '#5e6a28']];
  const HCOL = ['#1d1612', '#4a3220', '#8a5a2b', '#c9a061', '#2b2b33', '#d0d4dc', '#7a2a1a'];
  function crowdSpec(i) {
    const r = rng(i * 7919 + 101), sk = SKINS[Math.floor(r() * SKINS.length)], tc = TCOL[Math.floor(r() * TCOL.length)];
    const hat = HATS[Math.floor(r() * HATS.length)];
    return { name: 'Crowd', skin: sk[0], skinLo: sk[1], ink: '#22180f', eyeLine: r() > 0.5, hat, hatColor: hat === 'beanie' ? tc[1] : HCOL[Math.floor(r() * HCOL.length)],
      glasses: r() > 0.8, top: TOPS[Math.floor(r() * TOPS.length)], topColor: tc[0], topDark: tc[1], shirt: '#f2f2f2',
      pants: ['#2f3240', '#3b4f7a', '#4a3a2a', '#24262e'][Math.floor(r() * 4)], shoe: ['#222', '#eee', '#c33', '#335'][Math.floor(r() * 4)], height: 0.92 + r() * 0.18 };
  }
  /* a walker crossing the scene on the world clock (freezes with time). o: {i, y, s, x0, x1, speed, phase, expr, hold} */
  function walker(c, o) {
    const span = o.x1 - o.x0, dir = o.speed >= 0 ? 1 : -1;
    const p = ((o.phase || 0) + c.wt * Math.abs(o.speed)) % span;
    const x = dir > 0 ? o.x0 + p : o.x1 - p;
    const fr = c.z > 0.5;
    const g = X.renderPerson(crowdSpec(o.i), { id: 'cw' + o.i, x, y: o.y, scale: o.s, flip: dir < 0, t: c.wt + o.i,
      pose: o.still ? (o.pose || 'idle') : walkPose(c.wt + o.i * 0.37, 0.8), expression: o.expr || 'neutral', blink: fr ? 0 : K.blinkAt(c.t, o.i), lookX: dir * 0.4, hold: o.hold });
    return { svg: g, x };
  }
  function stander(c, o) {
    const fr = c.z > 0.5;
    return X.renderPerson(crowdSpec(o.i), { id: 'cs' + o.i, x: o.x, y: o.y, scale: o.s, flip: !!o.flip, t: c.wt + o.i, pose: o.pose || 'idle',
      expression: o.expr || 'neutral', blink: fr ? 0 : K.blinkAt(c.t, o.i + 3), lookX: o.lookX || 0, lookY: o.lookY || 0, talk: o.talk || 0, hold: o.hold });
  }

  // ---------------------------------------------------------------- freeze FX
  /* expanding shock-ring from (x,y) when time stops (cyan) or restarts (amber) */
  function ripple(c, x, y) {
    const d = c.zEdge;
    if (d < 0 || d > 1.3 || c.b.zt < 0) return '';
    const col = c.frozen ? '#bff4ff' : '#ffc46b', p = d / 1.3;
    return [0, 0.12, 0.26].map((dd, i) => {
      const q = clamp((d - dd) / 1.3); if (q <= 0) return '';
      return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(40 + q * 2100)}" fill="none" stroke="${col}" stroke-width="${f(26 * (1 - q) + 2)}" opacity="${f((1 - q) * (i ? 0.45 : 0.9))}"/>`;
    }).join('') + (p < 0.25 ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(160 * (1 - p * 4))}" fill="#fff" opacity="${f(0.7 * (1 - p * 4))}"/>` : '');
  }
  /* screen overlay flash at a freeze edge */
  function zFlash(c) {
    const d = c.zEdge;
    if (d < 0 || d > 0.35 || c.b.zt < 0) return '';
    return `<rect width="1920" height="1080" fill="${c.frozen ? '#e6fbff' : '#fff1d6'}" opacity="${f(0.5 * (1 - d / 0.35))}"/>`;
  }
  /* glittering suspended dust while frozen (screen space, behind letterbox) */
  function motes(c, n = 40, seed = 5, col = '#e8fbff') {
    if (c.z < 0.02) return '';
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * 1920, y = r() * 1080, tw = 0.5 + 0.5 * Math.sin(c.t * (1 + r() * 2) + i);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + r() * 2.5)}" fill="${col}" opacity="${f(c.z * 0.6 * tw)}"/>`;
    }
    return s;
  }
  /* glowing golden time-crack polyline from a seed */
  function crack(x, y, len, seed, grow = 1, w = 5, col = '#ffd27a') {
    const r = rng(seed); let px = x, py = y, a = r() * 6.283, d = `M${f(x)} ${f(y)}`, br = '';
    const n = Math.max(1, Math.floor(10 * grow));
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 1.4; const L = len / 10;
      px += Math.cos(a) * L; py += Math.sin(a) * L; d += ` L${f(px)} ${f(py)}`;
      if (r() > 0.6) { const b = a + (r() > 0.5 ? 1 : -1) * (0.6 + r()); br += `M${f(px)} ${f(py)} L${f(px + Math.cos(b) * L * 0.9)} ${f(py + Math.sin(b) * L * 0.9)} `; }
    }
    return `<path d="${d} ${br}" stroke="${col}" stroke-width="${w * 3.5}" fill="none" opacity="0.25" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d} ${br}" stroke="#fff6dc" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  /* zip/speed streak between two points (Kip moving in frozen time) */
  function streak(x0, y0, x1, y1, op = 1) {
    return `<path d="M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}" stroke="#ff9a3c" stroke-width="70" opacity="${f(0.18 * op)}" stroke-linecap="round"/>
      <path d="M${f(x0)} ${f(y0 - 30)} L${f(x1)} ${f(y1 - 30)} M${f(x0)} ${f(y0 + 40)} L${f(x1)} ${f(y1 + 40)}" stroke="#fff" stroke-width="5" opacity="${f(0.5 * op)}" stroke-linecap="round"/>`;
  }

  // ---------------------------------------------------------------- props
  function glass(x, y, s, rot = 0, milk = 0.8) {
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">
      <path d="M-26 -70 L26 -70 L21 0 L-21 0Z" fill="#dff3ff" opacity="0.35" stroke="#ffffff" stroke-width="3"/>
      ${milk > 0 ? `<path d="M${f(-26 + 5 * (1 - milk))} ${f(-70 * milk)} L${f(26 - 5 * (1 - milk))} ${f(-70 * milk)} L21 0 L-21 0Z" fill="#fbfbff"/>` : ''}
      <path d="M-18 -62 L-16 -8" stroke="#fff" stroke-width="4" opacity="0.7"/></g>`;
  }
  function mug(x, y, s) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><rect x="-22" y="-44" width="44" height="44" rx="8" fill="#2fc6b0"/><path d="M22 -34 q20 0 20 14 q0 14 -20 14" stroke="#2fc6b0" stroke-width="8" fill="none"/><ellipse cx="0" cy="-44" rx="20" ry="5" fill="#5a3216"/></g>`;
  }
  function sunglasses(x, y, s) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="M-78 -8 L78 -8" stroke="#111" stroke-width="7"/>
      <path d="M-72 -10 L-8 -10 L-14 18 Q-40 32 -66 18Z M8 -10 L72 -10 L66 18 Q40 32 14 18Z" fill="#111"/><path d="M-60 -4 L-40 -4 M20 -4 L40 -4" stroke="#7ad7ff" stroke-width="4" opacity="0.7"/></g>`;
  }
  function mustache(x, y, s, col = '#1a1210') {
    return `<path transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" d="M0 -4 C-14 -14 -34 -12 -46 2 C-56 12 -66 10 -70 2 C-66 22 -40 24 -24 12 C-14 6 -6 4 0 4 C6 4 14 6 24 12 C40 24 66 22 70 2 C66 10 56 12 46 2 C34 -12 14 -14 0 -4Z" fill="${col}"/>`;
  }
  function pigeon(x, y, s, t, flip = false, peck = true) {
    const p = peck ? Math.max(0, Math.sin(t * 3)) * 8 : 0;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})"><ellipse cx="0" cy="4" rx="34" ry="6" fill="rgba(0,0,0,0.3)"/>
      <path d="M-20 -6 L-20 2 M-6 -6 L-6 2" stroke="#e08a5a" stroke-width="4"/>
      <ellipse cx="-12" cy="-26" rx="34" ry="20" fill="#8e96a8"/><path d="M-46 -30 L-66 -40 L-62 -22Z" fill="#6d7486"/>
      <path d="M-30 -30 Q-10 -46 8 -28" stroke="#6d7486" stroke-width="6" fill="none"/>
      <g transform="translate(0 ${f(p)})"><circle cx="18" cy="-48" r="16" fill="#7b8396"/><path d="M8 -40 Q18 -30 28 -38" stroke="#6ad0a0" stroke-width="6" fill="none"/>
      <circle cx="23" cy="-52" r="4" fill="#ff7a2a"/><circle cx="23" cy="-52" r="1.8" fill="#111"/><path d="M33 -48 L44 -45 L33 -42Z" fill="#e0b070"/></g></g>`;
  }
  function balloon(x, y, s, t, sx = null, sy = null) {
    const bx = x + Math.sin(t * 1.3) * 6 * s, by = y + Math.cos(t * 1.1) * 4 * s;
    const str = sx !== null ? `<path d="M${f(bx)} ${f(by + 80 * s)} Q${f((bx + sx) / 2 + 20)} ${f((by + sy) / 2)} ${f(sx)} ${f(sy)}" stroke="#eee" stroke-width="2.5" fill="none"/>` : `<path d="M${f(bx)} ${f(by + 80 * s)} q14 40 -6 90 q-14 30 6 60" stroke="#eee" stroke-width="2.5" fill="none"/>`;
    return `${str}<g transform="translate(${f(bx)} ${f(by)}) scale(${f(s)})"><ellipse cx="0" cy="0" rx="58" ry="70" fill="#ff4f7b"/><ellipse cx="-20" cy="-26" rx="14" ry="22" fill="#fff" opacity="0.35"/><path d="M-8 70 L8 70 L0 80Z" fill="#e03a64"/></g>`;
  }
  function cookie(x, y, s) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><circle r="22" fill="#d9a35a"/><circle cx="-8" cy="-6" r="4" fill="#4a2a10"/><circle cx="8" cy="2" r="4" fill="#4a2a10"/><circle cx="-2" cy="10" r="3.5" fill="#4a2a10"/></g>`;
  }
  function smoothie(x, y, s) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="M-20 -60 L20 -60 L15 0 L-15 0Z" fill="#ff7bc1"/><rect x="-22" y="-66" width="44" height="8" rx="3" fill="#fff"/><path d="M6 -66 L14 -96" stroke="#3ce0c2" stroke-width="5"/></g>`;
  }
  /* original hover-car: rounded pod, glowing underside */
  function hoverCar(x, y, s, col, t, o = {}) {
    const fl = o.flip ? -1 : 1, glow = o.glow === undefined ? 1 : o.glow;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s * fl)} ${f(s)})">
      ${o.trail ? `<path d="M-120 -10 L${-120 - o.trail} -14 L${-120 - o.trail} -2Z" fill="${o.trailCol || '#ff4fd8'}" opacity="0.5"/>` : ''}
      <ellipse cx="0" cy="30" rx="120" ry="16" fill="${o.under || '#6ff0ff'}" opacity="${f(0.35 * glow)}"/>
      <path d="M-130 0 Q-130 -40 -80 -46 L-40 -86 Q0 -100 50 -86 L96 -46 Q132 -40 132 0 Q132 22 100 22 L-100 22 Q-130 22 -130 0Z" fill="${col}"/>
      <path d="M-34 -80 Q0 -92 44 -80 L80 -48 L-70 -48Z" fill="#a9e8ff" opacity="0.85"/><path d="M8 -86 L8 -48" stroke="${col}" stroke-width="6"/>
      <path d="M-130 -6 L132 -6" stroke="#fff" stroke-width="4" opacity="0.35"/>
      <circle cx="122" cy="-14" r="8" fill="#fff6c0"/><circle cx="-124" cy="-14" r="7" fill="#ff4a5a"/></g>`;
  }
  function confetti(t0, t, n = 90, seed = 3) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * 1920, sp = 220 + r() * 300, y = -50 + (t - t0) * sp - r() * 500, rot = (t * 300 * (r() - 0.5)) + r() * 360;
      const col = ['#ffd34d', '#ff5470', '#34d399', '#38bdf8', '#f07a2a', '#a78bfa'][i % 6];
      if (y > -40 && y < 1100) s += `<rect x="-8" y="-4" width="16" height="8" fill="${col}" transform="translate(${f(x + Math.sin(t * 3 + i) * 30)} ${f(y)}) rotate(${f(rot)})"/>`;
    }
    return s;
  }
  /* parallax: a layer at depth d (0 = moves with the world, 1 = fixed to screen) */
  const par = (cam, d) => `translate(${f((cam.x - 960) * d)} ${f((cam.y - 540) * d)})`;

  // ---------------------------------------------------------------- dialogue camera (EP05: slow lateral tracking on every shot)
  function dcam(c, P, o = {}) {
    const b = c.b, who = WHO[b.v], keys = Object.keys(P);
    const mid = keys.reduce((a, k) => a + P[k].x, 0) / Math.max(1, keys.length);
    const dur = Math.max(0.5, b.end - b.start), u = clamp(c.lt / dur);
    const push = 1 + 0.045 * easeIO(u), track = (c.bi % 2 ? 1 : -1) * 40 * (u - 0.5);
    const baseY = o.y || 540;
    if (!b.v || !who || !P[who]) return { z: (o.wideZ || 1.0) * push, x: (o.wideX || mid) + track, y: baseY };
    const exp = who === 'kip' ? JSON.stringify(b.k || '') : ((b.e || {})[who] || '');
    const h = (c.bi * 5 + 2) % 6;
    let kind = ['wide', 'med', 'cu', 'ots', 'med', 'two'][h];
    if (/sad|fear|surprise|angry/.test(exp)) kind = h % 2 ? 'cu' : 'ecu';
    if (o.force) kind = o.force;
    const tgt = P[who], hy = (tgt.y || 905) - 470 * (tgt.s || 1) * (tgt.h || 1);
    const other = keys.filter(k => k !== who).sort((a, bb) => Math.abs(P[a].x - tgt.x) - Math.abs(P[bb].x - tgt.x))[0];
    if (kind === 'wide') return { z: (o.wideZ || 1.02) * push, x: mid + track, y: baseY };
    if (kind === 'two') return { z: 1.18 * push, x: mid + track, y: baseY - 20 };
    if (kind === 'ots' && other) return { z: 1.42 * push, x: lerp(P[other].x, tgt.x, 0.68) + track * 0.5, y: hy + 60 };
    if (kind === 'med') return { z: 1.32 * push, x: lerp(mid, tgt.x, 0.65) + track, y: hy + 70 };
    if (kind === 'ecu') return { z: 1.85 * push, x: tgt.x + track * 0.3, y: hy + 10 };
    return { z: 1.55 * push, x: tgt.x + track * 0.5, y: hy + 30 };
  }

  Object.assign(Lb, { CAST, VOICE, WHO, since, sinceLast, beatOf, after, P_CLAP, P_CLAP_OPEN, clapPose, walkPose, P_REACH, P_DRAG,
    kip, person, lookFrom, headAt, hooded, pocketWatch, crowdSpec, walker, stander, ripple, zFlash, motes, crack, streak,
    glass, mug, sunglasses, mustache, pigeon, balloon, cookie, smoothie, hoverCar, confetti, par, dcam });
  root.L5 = Lb;
})(typeof window !== 'undefined' ? window : globalThis);
