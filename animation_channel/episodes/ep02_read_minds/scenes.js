/* Scene library for EP02 "What If You Could Read Everyone's Mind?" (browser).
 * Kip is drawn ONLY through Kip.renderKip() (locked v1.0.0). The Thinking Star floats above his head
 * as a separate prop, so his design is never altered. Supporting cast is defined below (episode-only). */
(function (root) {
  'use strict';
  const { clamp, lerp, sm, easeOut, easeIO, f, rng, txt } = root.Engine.H;
  const K = root.Kip, X = root.Extras;
  const S = {};
  const TL = () => root.Engine.tl();

  // ---------------------------------------------------------------- supporting cast (EP02)
  const CAST = {
    mom:  { name: 'Mom', skin: '#f2d3b3', skinLo: '#cfae8c', ink: '#2b1e14', eyeLine: true, hat: 'bun', hatColor: '#5a3522',
            top: 'sweater', topColor: '#d9487a', topDark: '#a8335c', pants: '#3b4f7a', shoe: '#f0f0f0', height: 1.1 },
    gran: { name: 'Grandpa Shelby', skin: '#e8c4a0', skinLo: '#c49a74', ink: '#2b2018', eyeLine: true, hat: 'bald', hatColor: '#eeeef4',
            top: 'sweater', topColor: '#6b8f5e', topDark: '#4d6b42', pants: '#5a4a3e', shoe: '#3a2a20', height: 0.98 },
    coco: { name: 'Coco', skin: '#c88b62', skinLo: '#a06a45', ink: '#20150e', eyeLine: true, hat: 'curly', hatColor: '#e04f8c',
            top: 'shirt', topColor: '#9b5de5', topDark: '#7240b8', pants: '#2f3240', shoe: '#ff6fa8', height: 0.97 }
  };
  const VOICE = { kip: 'KIP', max: 'MAX', mom: 'MOM', gran: 'GRAN', coco: 'COCO' };
  const WHO = { KIP: 'kip', MAX: 'max', MOM: 'mom', GRAN: 'gran', COCO: 'coco' };

  // ---------------------------------------------------------------- timeline helpers
  /* seconds since the first beat in this scene-run with action a started (-1 if not yet) */
  function since(c, a) {
    const B = TL().beats;
    for (const i of c.run.beats) if (B[i].a === a && c.t >= B[i].start) return c.t - B[i].start;
    return -1;
  }
  function beatOf(c, a) { const B = TL().beats; for (const i of c.run.beats) if (B[i].a === a) return B[i]; return null; }
  const popIn = (lt, at, dur = 0.35) => easeOut((lt - at) / dur);

  // ---------------------------------------------------------------- characters
  function walkPose(t, amt, run = false) {
    const ph = t * (run ? 13 : 8), s = Math.sin(ph) * amt;
    return { armL: { sh: 12 + s * (run ? 40 : 22), el: -20 }, armR: { sh: 12 - s * (run ? 40 : 22), el: -20 },
      legL: { hip: s * (run ? 28 : 18), knee: -Math.max(0, -Math.sin(ph)) * 25 * amt }, legR: { hip: -s * (run ? 28 : 18), knee: -Math.max(0, Math.sin(ph)) * 25 * amt },
      lean: run ? -8 * amt : 0, headTilt: 0, bob: -Math.abs(Math.cos(ph)) * 8 * amt };
  }
  function kip(c, o = {}) {
    return K.renderKip(Object.assign({ id: 'kip', expression: c.kExpr('k'), pose: c.kExpr('p', 'idle'),
      blink: K.blinkAt(c.t), talk: c.talk('KIP'), t: c.t, x: 760, y: 905, scale: 1.05, lookX: 0.3 }, o));
  }
  function person(who, c, o = {}) {
    const spec = CAST[who] || who;
    return X.renderPerson(spec, Object.assign({ id: who, expression: c.eExpr(who), blink: K.blinkAt(c.t, who.length),
      talk: VOICE[who] ? c.talk(VOICE[who]) : 0, t: c.t, x: 1250, y: 905, scale: 1.0, flip: true, lookX: -0.4 }, o));
  }
  /* glasses for Grandpa Shelby: g = 0 pushed up on his head, 1 on his nose */
  function glasses(x, y, scale, flip, g) {
    const sc = scale * CAST.gran.height, gy = lerp(-585, -478, g), rot = lerp(-8, 0, g);
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -sc : sc)} ${f(sc)})"><g transform="rotate(${f(rot)} 0 ${f(gy)})">
      <circle cx="-40" cy="${f(gy)}" r="34" fill="#cfe9ff" fill-opacity="0.18" stroke="#c8902e" stroke-width="7"/>
      <circle cx="40" cy="${f(gy)}" r="34" fill="#cfe9ff" fill-opacity="0.18" stroke="#c8902e" stroke-width="7"/>
      <path d="M-6 ${f(gy - 4)} Q0 ${f(gy - 12)} 6 ${f(gy - 4)}" stroke="#c8902e" stroke-width="6" fill="none"/></g></g>`;
  }
  /* who should a character at x look at: the current speaker (or Kip) */
  function lookFrom(c, me, P) {
    let tgt = WHO[c.b.v];
    if (!tgt || tgt === me || !P[tgt]) tgt = me === 'kip' ? (Object.keys(P).find(k => k !== 'kip') || null) : 'kip';
    if (!tgt || !P[tgt]) return 0.0;
    const d = P[tgt].x - P[me].x;
    return clamp(d / 260, -0.75, 0.75);
  }
  const headY = p => (p.y || 905) - 470 * (p.s || 1.0);

  // ---------------------------------------------------------------- props / FX
  function starSVG(x, y, r, o = {}) {
    const glow = o.glow === undefined ? 1 : o.glow, red = o.red || 0, crack = o.crack || 0, t = o.t || 0, id = o.id || 'st';
    const col = red > 0.5 ? '#ff5a4a' : '#7ff3ff', core = red > 0.5 ? '#ffe0d8' : '#ffffff';
    let pts = '';
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts += `${f(Math.cos(a) * rr)},${f(Math.sin(a) * rr)} `; }
    const rays = [...Array(8)].map((_, i) => { const a = i * Math.PI / 4 + t * 0.6, l = r * (1.6 + 0.4 * Math.sin(t * 5 + i)); return `<path d="M${f(Math.cos(a) * r * 1.1)} ${f(Math.sin(a) * r * 1.1)} L${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}" stroke="${col}" stroke-width="4" stroke-linecap="round" opacity="${f(0.55 * glow)}"/>`; }).join('');
    const cracks = crack > 0 ? `<path d="M${f(-r * 0.5)} ${f(-r * 0.2)} L${f(-r * 0.1)} ${f(r * 0.05)} L${f(r * 0.15)} ${f(-r * 0.3)} L${f(r * 0.45)} ${f(r * 0.1)}" stroke="#2a0a0a" stroke-width="${f(r * 0.09)}" fill="none" opacity="${f(clamp(crack * 2))}"/>
      <path d="M${f(-r * 0.05)} ${f(r * 0.05)} L${f(-r * 0.15)} ${f(r * 0.45)}" stroke="#2a0a0a" stroke-width="${f(r * 0.08)}" opacity="${f(clamp(crack * 2 - 1))}"/>` : '';
    return `<g transform="translate(${f(x)} ${f(y)})">
      <radialGradient id="${id}g"><stop offset="0" stop-color="${col}" stop-opacity="${f(0.75 * glow)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>
      <circle r="${f(r * 3.2)}" fill="url(#${id}g)"/>${rays}
      <g transform="rotate(${f(Math.sin(t * 1.7) * 12)})"><polygon points="${pts}" fill="${col}" stroke="${core}" stroke-width="${f(r * 0.12)}" stroke-linejoin="round"/>
      <polygon points="${pts}" fill="${core}" opacity="${f(0.55 * glow)}" transform="scale(0.55)"/>${cracks}</g></g>`;
  }
  /* star floating above Kip at (x, feetY) with scale s */
  function kipStar(c, x, y, s, o = {}) {
    return starSVG(x + 10 * s, y - 655 * s + Math.sin(c.t * 2.2) * 8, 28 * s, Object.assign({ t: c.t, id: 'ks' }, o));
  }
  function rings(x, y, k, t, col = '#7ff3ff') {
    if (k <= 0.01) return '';
    let s = '';
    for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(70 + p * 170)}" fill="none" stroke="${col}" stroke-width="${f(7 * (1 - p))}" opacity="${f(k * (1 - p) * 0.8)}"/>`; }
    return s;
  }
  function thoughtBubble(x, y, w, h, text, k, toX, toY, t) {
    if (k <= 0.01) return '';
    const sc = 0.6 + 0.4 * easeOut(k), wob = Math.sin(t * 3) * 4;
    let lumps = '';
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; lumps += `<circle cx="${f(Math.cos(a) * w * 0.42)}" cy="${f(Math.sin(a) * h * 0.36)}" r="${f(h * 0.32)}" fill="#fff"/>`; }
    const tail = [0.35, 0.6, 0.8].map((q, i) => `<circle cx="${f((toX - x) * q)}" cy="${f(h * 0.4 + (toY - y - h * 0.4) * q)}" r="${f(h * (0.12 - i * 0.03))}" fill="#fff"/>`).join('');
    const size = text.length > 12 ? 34 : 44;
    return `<g transform="translate(${f(x)} ${f(y + wob)}) scale(${f(sc)})" opacity="${f(clamp(k * 1.5))}">
      <g stroke="#7ff3ff" stroke-width="10" opacity="0.35">${lumps}</g>${lumps}<ellipse rx="${f(w * 0.46)}" ry="${f(h * 0.42)}" fill="#fff"/>${tail}
      ${txt(0, size * 0.36, text, size, { fill: '#1b2a4a' })}</g>`;
  }
  function confetti(t0, t, n = 110, seed = 3) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * 1920, sp = 220 + r() * 300, y = -50 + (t - t0) * sp - r() * 500, rot = (t * 300 * (r() - 0.5)) + r() * 360;
      const col = ['#ffd34d', '#ff5470', '#34d399', '#38bdf8', '#f07a2a', '#a78bfa'][i % 6];
      if (y > -40 && y < 1100) s += `<rect x="-8" y="-4" width="16" height="8" fill="${col}" transform="translate(${f(x + Math.sin(t * 3 + i) * 30)} ${f(y)}) rotate(${f(rot)})"/>`;
    }
    return s;
  }
  function firework(x, y, age, col, seed) {
    if (age < 0 || age > 2.2) return '';
    const r = rng(seed); let s = '';
    const sp = 1 - Math.exp(-age * 3), fade = clamp(1 - age / 2.2);
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2 + r() * 0.2, d = (180 + r() * 60) * sp;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + age * age * 40;
      s += `<path d="M${f(x + Math.cos(a) * d * 0.7)} ${f(y + Math.sin(a) * d * 0.7 + age * age * 30)} L${f(px)} ${f(py)}" stroke="${col}" stroke-width="5" stroke-linecap="round" opacity="${f(fade)}"/><circle cx="${f(px)}" cy="${f(py)}" r="5" fill="#fff" opacity="${f(fade)}"/>`;
    }
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(60 * Math.exp(-age * 5))}" fill="#fff" opacity="${f(0.8 * Math.exp(-age * 4))}"/>`;
    return s;
  }

  // ---------------------------------------------------------------- backgrounds
  function sky(id, top, bot) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient><rect width="1920" height="1080" fill="url(#${id})"/>`;
  }
  function clouds(t, op = 0.9, col = '#ffffff', seed = 2) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < 5; i++) {
      const y = 80 + r() * 260, sp = 6 + r() * 10, w = 160 + r() * 160, x = ((r() * 2400 + t * sp) % 2400) - 240;
      s += `<g opacity="${f(op)}" fill="${col}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(w * 0.28)}"/><ellipse cx="${f(x - w * 0.35)}" cy="${f(y - w * 0.12)}" rx="${f(w * 0.45)}" ry="${f(w * 0.3)}"/><ellipse cx="${f(x + w * 0.3)}" cy="${f(y - w * 0.18)}" rx="${f(w * 0.5)}" ry="${f(w * 0.34)}"/></g>`;
    }
    return s;
  }
  function grass(y, c1, c2, seed = 4) {
    const r = rng(seed); let bl = '';
    for (let i = 0; i < 140; i++) { const x = r() * 1920, yy = y + 10 + r() * (1080 - y), h = 10 + r() * 16; bl += `<path d="M${f(x)} ${f(yy)} l${f(-3 + r() * 6)} ${f(-h)}" stroke="${c2}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`; }
    return `<rect y="${y}" width="1920" height="${1080 - y}" fill="${c1}"/>${bl}`;
  }
  function tree(x, y, s, cols, seed = 1) {
    const r = rng(seed); let can = '';
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, d = r() * 110; can += `<circle cx="${f(Math.cos(a) * d)}" cy="${f(-420 + Math.sin(a) * d * 0.7)}" r="${f(110 + r() * 50)}" fill="${cols[i % cols.length]}"/>`; }
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 0 Q-24 -200 -16 -330 L16 -330 Q24 -200 30 0Z" fill="#6b4630"/><path d="M-6 -250 Q-70 -300 -110 -330" stroke="#6b4630" stroke-width="18" fill="none"/>${can}</g>`;
  }
  function fence(y, col, dark) {
    let s = '';
    for (let x = -20; x < 1940; x += 70) s += `<path d="M${x} ${y} L${x} ${y - 230} L${x + 30} ${y - 260} L${x + 60} ${y - 230} L${x + 60} ${y}Z" fill="${col}" stroke="${dark}" stroke-width="3"/>`;
    return s + `<rect x="0" y="${y - 190}" width="1920" height="22" fill="${dark}"/><rect x="0" y="${y - 70}" width="1920" height="22" fill="${dark}"/>`;
  }
  function houseSide(x, w, top, wall, trim, winLit, extra = '') {
    let siding = '';
    for (let y = top + 40; y < 900; y += 34) siding += `<path d="M${x} ${y} H${x + w}" stroke="${trim}" stroke-width="3" opacity="0.35"/>`;
    return `<rect x="${x}" y="${top}" width="${w}" height="${900 - top}" fill="${wall}"/>${siding}
      <rect x="${x + 90}" y="${top + 120}" width="230" height="200" rx="8" fill="${winLit}" stroke="#fff" stroke-width="14"/><path d="M${x + 205} ${top + 120} V${top + 320} M${x + 90} ${top + 220} H${x + 320}" stroke="#fff" stroke-width="8"/>
      <path d="M${x + 96} ${top + 126} q40 90 0 190" fill="#ffb3c7" opacity="0.6"/>${extra}`;
  }
  function stringLights(pts, lit, t, seed = 5) {
    let s = '', d = `M${pts[0][0]} ${pts[0][1]}`;
    const bulbs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 70;
      d += ` Q${mx} ${my} ${x1} ${y1}`;
      for (let k = 1; k < 8; k++) { const q = k / 8; bulbs.push([(1 - q) ** 2 * x0 + 2 * (1 - q) * q * mx + q * q * x1, (1 - q) ** 2 * y0 + 2 * (1 - q) * q * my + q * q * y1]); }
    }
    s += `<path d="${d}" stroke="#2a2a33" stroke-width="3" fill="none"/>`;
    const cols = ['#ffd34d', '#ff7bb0', '#7ff3ff', '#9fd16b', '#ffa25a'];
    bulbs.forEach(([x, y], i) => {
      const col = cols[i % cols.length], tw = 0.85 + 0.15 * Math.sin(t * 4 + i);
      if (lit > 0.01) s += `<circle cx="${f(x)}" cy="${f(y + 12)}" r="26" fill="${col}" opacity="${f(0.22 * lit * tw)}"/>`;
      s += `<ellipse cx="${f(x)}" cy="${f(y + 12)}" rx="8" ry="11" fill="${lit > 0.5 ? col : '#555566'}" opacity="${f(lit > 0.5 ? tw : 0.9)}"/>`;
    });
    return s;
  }
  function treehouse(x, y, lit) {
    return `<g transform="translate(${x} ${y})">
      <rect x="-170" y="0" width="340" height="24" rx="6" fill="#8a5a35"/>
      <rect x="-130" y="-170" width="260" height="170" fill="#c98b52"/>${[0, 1, 2, 3, 4].map(i => `<path d="M-130 ${-34 * i} H130" stroke="#8a5a35" stroke-width="4"/>`).join('')}
      <path d="M-160 -165 L0 -290 L160 -165Z" fill="#d6334a"/><path d="M-160 -165 L0 -290 L160 -165" stroke="#9e2236" stroke-width="10" fill="none"/>
      <rect x="-40" y="-130" width="80" height="80" rx="6" fill="${lit ? '#ffd27a' : '#2a2f45'}" stroke="#fff" stroke-width="8"/>
      ${lit ? `<circle cx="0" cy="-90" r="90" fill="#ffd27a" opacity="0.18"/>` : ''}
      <path d="M-150 24 V40 M150 24 V40" stroke="#6b4630" stroke-width="10"/>
      ${[...Array(9)].map((_, i) => `<path d="M60 ${40 + i * 50} H110" stroke="#8a5a35" stroke-width="10"/>`).join('')}<path d="M60 24 V480 M110 24 V480" stroke="#6b4630" stroke-width="9"/>
      ${txt(0, -195, 'KIP', 40, { fill: '#fff', stroke: '#9e2236', sw: 8 })}</g>`;
  }
  function yardBG(c, tod) {
    const T = {
      day: ['#5fb7ff', '#cdeaff', '#4caf50', '#3d8b40', '#e8d4b0', '#c7b28a', '#bfe6ff'],
      aft: ['#f3a361', '#ffe2b0', '#7fa94a', '#5e8a35', '#e8c79e', '#c4a07a', '#ffd9a0'],
      night: ['#0b1030', '#25305e', '#1f4d36', '#163828', '#3b3e57', '#2b2d40', '#ffd27a']
    }[tod];
    const night = tod === 'night';
    const stars = night ? [...Array(70)].map((_, i) => { const r = rng(i + 9); return `<circle cx="${f(r() * 1920)}" cy="${f(r() * 520)}" r="${f(1 + r() * 2)}" fill="#fff" opacity="${f(0.3 + 0.6 * Math.abs(Math.sin(c.t * (1 + r()) + i)))}"/>`; }).join('') : '';
    const sun = night ? `<circle cx="1720" cy="140" r="60" fill="#f1eeff"/><circle cx="1745" cy="125" r="56" fill="${T[0]}"/>` : `<circle cx="${tod === 'aft' ? 1600 : 1700}" cy="${tod === 'aft' ? 300 : 150}" r="80" fill="#fff2b0" opacity="0.95"/>`;
    return `${sky('ysky' + tod, T[0], T[1])}${stars}${sun}${night ? '' : clouds(c.t, 0.85, tod === 'aft' ? '#ffe8d0' : '#fff')}
      ${houseSide(-40, 560, 120, T[4], T[5], night ? '#ffd27a' : T[6])}
      ${fence(880, night ? '#5a4a40' : '#d9b48a', night ? '#3a2e28' : '#a9845c')}
      ${tree(1600, 880, 1.25, night ? ['#1d4a33', '#24573c', '#163f2b'] : tod === 'aft' ? ['#7aa443', '#8fb84e', '#6b9437'] : ['#4caf50', '#5cc261', '#3e9a43'], 3)}
      ${grass(880, T[2], T[3])}`;
  }

  // ---------------------------------------------------------------- dialogue camera
  function dcam(c, P, o = {}) {
    const b = c.b, who = WHO[b.v], keys = Object.keys(P);
    const mid = keys.reduce((a, k) => a + P[k].x, 0) / Math.max(1, keys.length);
    const dur = Math.max(0.5, b.end - b.start), push = 1 + 0.035 * clamp(c.lt / dur);
    if (!b.v || !who || !P[who]) return { z: (o.wideZ || 1.0) * push, x: o.wideX || mid, y: 540 };
    const exp = who === 'kip' ? (b.k || '') : ((b.e || {})[who] || '');
    const h = (c.bi * 7 + 3) % 5;
    let kind = ['wide', 'med', 'cu', 'med', 'two'][h];
    if (['sad', 'fear', 'surprise'].includes(exp)) kind = 'cu';
    if (b.mode === 'think') kind = (c.bi % 2) ? 'two' : 'med';   // keep the thinker + bubble in frame
    let tgt = P[who];
    if (o.force) kind = o.force;
    const hy = headY(tgt);
    if (kind === 'wide') return { z: (o.wideZ || 1.02) * push, x: mid, y: 540 };
    if (kind === 'two') return { z: 1.16 * push, x: mid, y: 560 };
    if (kind === 'med') return { z: 1.34 * push, x: lerp(mid, tgt.x, 0.65), y: hy + 120 };
    return { z: 1.72 * push, x: tgt.x, y: hy + 62 };
  }

  // ---------------------------------------------------------------- HOOK
  S.hook = c => {
    const a = c.b.a, lt = c.lt, rt = c.rt;
    const P = { kip: { x: 960, s: 1.05 } };
    const thinkers = [['coco', 330, 'b1', "DON'T TELL KIP!"], ['gran', 1590, 'b2', 'SHH...'], ['max', 1300, 'b3', 'TONIGHT...']];
    let people = '', fx = '';
    thinkers.forEach(([w, x, act, word], i) => {
      const st = since(c, act), k = st < 0 ? 0 : sm(0, 0.3, st) * (1 - sm(1.4, 1.8, st));
      people += person(w, c, { x, y: 905, scale: 0.92, flip: x > 960, expression: w === 'max' ? 'neutral' : 'fear', lookX: x > 960 ? -0.6 : 0.6 });
      fx += rings(x, 905 - 470 * 0.92, k, c.t) + thoughtBubble(x + (x > 960 ? -60 : 60), 270, 380, 150, word, k, x, 905 - 600 * 0.92, c.t);
    });
    const shout = a === 'shout';
    const svg = `${sky('hk', '#6aa8e8', '#d7ebff')}${clouds(c.t, 0.7)}
      ${streetBG(c, false)}
      <rect width="1920" height="1080" fill="#1a1d5a" opacity="0.25"/>
      ${people}
      ${kip(c, { x: 960, blink: a === 'hookOpen' ? (lt < 0.35 ? 1 : 0) : K.blinkAt(c.t), lookX: shout ? 0 : Math.sin(c.t * 2.5) * 0.6 })}
      ${kipStar(c, 960, 905, 1.05, { glow: 1.2 })}${rings(960, 905 - 470 * 1.05, 0.6, c.t * 1.3)}${fx}`;
    let cam = { z: lerp(1.75, 1.5, easeOut(rt / 3)), x: 960, y: 470 };
    if (a === 'b1' || a === 'b2' || a === 'b3') cam = { z: 1.08, x: 960, y: 540 };
    if (shout) cam = { z: lerp(1.5, 2.0, easeOut(lt / 0.4)), x: 960, y: 450 };
    const overlay = shout ? `<rect width="1920" height="1080" fill="#7ff3ff" opacity="${f(0.25 * Math.exp(-lt * 4))}"/>` : '';
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- TITLE
  S.title = c => {
    const lt = c.lt, g = lt < 0.5 ? (1 - lt / 0.5) * 14 : 0;
    const face = K.renderKip({ id: 'tk', x: 960, y: 1900, scale: 2.4, expression: { ...K.EXPRESSIONS.surprise, open: 0.5, pupil: 0.55 }, lookX: Math.sin(c.t * 3) * 0.3, t: c.t, shadow: false, blink: 0 });
    const title = (dx, col) => `${txt(960 + dx, 200, 'WHAT IF YOU COULD', 74, { fill: col, ls: 6 })}${txt(960 + dx, 330, "READ EVERYONE'S MIND?", 118, { fill: col })}`;
    const svg = `<radialGradient id="tg" cx="0.5" cy="0.7" r="0.8"><stop offset="0" stop-color="#0f3550"/><stop offset="1" stop-color="#030812"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#tg)"/>${rings(960, 780, 0.9, c.t)}${rings(960, 780, 0.5, c.t + 0.4)}
      ${face}${starSVG(985, 1900 - 690 * 2.4 + Math.sin(c.t * 2) * 12, 62, { t: c.t, id: 'tst', glow: 1.3 })}
      <g opacity="${f(easeOut(lt / 0.4))}">${g ? title(-g, '#ff2e63') + title(g, '#08d9d6') : ''}${title(0, '#fff')}</g>
      ${txt(960, 410, 'KIP · EPISODE 2', 36, { fill: '#7ff3ff', ls: 6, op: sm(1.0, 1.6, lt) })}`;
    return { svg, cam: { z: 1 + lt * 0.015 } };
  };

  // ---------------------------------------------------------------- YARD (morning): the falling star
  const CRATER = [1000, 880];
  S.yard = c => {
    const a = c.b.a, lt = c.lt;
    const tThrow = since(c, 'throw'), tFall = since(c, 'starfall'), tTouch = since(c, 'touch');
    let kx = 720;
    const tNear = since(c, 'near');
    if (tNear >= 0) kx = lerp(720, 850, easeIO(tNear / 1.0));
    const walking = tNear >= 0 && tNear < 1.0;
    const P = { kip: { x: kx, s: 1.05 }, max: { x: 1240, s: 1.0 } };
    // ball
    let ball = '', hold = null;
    if (tThrow < 0) hold = { side: 1, svg: '<circle r="20" fill="#ff5470" stroke="#fff" stroke-width="4"/>' };
    else if (tThrow < 1.6) { const q = tThrow / 1.6; ball = `<circle cx="${f(lerp(1180, 1300, q))}" cy="${f(560 - 900 * easeOut(q))}" r="${f(20 * (1 - q * 0.7))}" fill="#ff5470" stroke="#fff" stroke-width="4"/>`; }
    const maxPose = tThrow >= 0 && tThrow < 0.8 ? { armR: { sh: 160, el: 10 }, armL: { sh: 20, el: -10 } } : (tFall > 1.6 && tFall < 2.6 ? 'surprise' : 'idle');
    // star
    let star = '', streak = '', flash = 0;
    if (tFall >= 0 && tTouch < 0.9) {
      const q = clamp(tFall / 1.6), sx = lerp(1700, CRATER[0], q), sy = lerp(-60, CRATER[1] - 40, q * q);
      if (q < 1) { streak = `<path d="M${f(sx)} ${f(sy)} L${f(sx + 260)} ${f(sy - 300)}" stroke="#bff4ff" stroke-width="14" stroke-linecap="round" opacity="0.6"/>`; star = starSVG(sx, sy, 30, { t: c.t, id: 'fs', glow: 1.4 }); }
      else {
        flash = Math.exp(-(tFall - 1.6) * 5);
        let sy2 = CRATER[1] - 40, sx2 = CRATER[0];
        if (tTouch >= 0) { const k = easeIO((tTouch - 0.5) / 0.4); sx2 = lerp(sx2, kx + 10, k); sy2 = lerp(sy2, 905 - 655 * 1.05, k); }
        star = `<ellipse cx="${CRATER[0]}" cy="${CRATER[1] + 6}" rx="90" ry="18" fill="#3a2a1a" opacity="0.6"/>` + starSVG(sx2, sy2, 34, { t: c.t, id: 'fs', glow: 1 + 0.3 * Math.sin(c.t * 4) + (tTouch >= 0 ? 1.5 * sm(0.3, 0.5, tTouch) : 0) });
      }
    }
    const hasStar = tTouch >= 0.9;
    const kipPose = walking ? walkPose(c.t, 1) : (a === 'touch' && lt < 1.2 ? { armR: { sh: 70, el: 10 }, armL: { sh: 12, el: -10 }, lean: -8 } : undefined);
    const thinkK = c.think('MAX');
    const bubText = c.b.t && c.b.t.includes('pizza') ? 'PIZZA + BOX' : c.b.t && c.b.t.includes('Eleventy') ? '7? ...11-12!' : '...';
    const svg = `${yardBG(c, 'day')}${streak}
      ${person('max', c, { x: 1240, pose: maxPose, hold, lookX: tFall >= 0 && tFall < 1.6 ? -0.2 : lookFrom(c, 'max', P), lookY: tThrow >= 0 && tThrow < 1.6 ? -0.8 : 0 })}
      ${kip(c, { x: kx, pose: kipPose, lookX: tFall >= 0 && tFall < 1.8 ? 0.4 : lookFrom(c, 'kip', P), lookY: (tThrow >= 0 && tThrow < 1.6) ? -0.8 : 0 })}
      ${star}${ball}${hasStar ? kipStar(c, kx, 905, 1.05) : ''}
      ${hasStar ? rings(kx, 905 - 470 * 1.05, thinkK, c.t) : ''}
      ${hasStar ? thoughtBubble(1240, 250, 420, 160, bubText, thinkK, 1240, 905 - 600, c.t) : ''}`;
    let cam = dcam(c, P);
    if (a === 'establish') cam = { z: lerp(1.0, 1.06, lt / 4), x: 960, y: 540 };
    if (a === 'throw') cam = { z: 1.0, x: 1100, y: lerp(540, 470, easeIO(lt / 1.5)) };
    if (a === 'starfall') cam = { z: 1.0, x: 1100, y: 540 };
    if (a === 'crater') cam = { z: 1.25, x: 1000, y: 620 };
    if (a === 'touch') cam = { z: lerp(1.2, 1.45, easeIO(lt / 2.6)), x: lerp(930, kx, easeIO(lt / 2.6)), y: lerp(640, 500, easeIO(lt / 2.6)) };
    const shake = flash * 14;
    if (shake) { cam.x += Math.sin(c.t * 90) * shake; cam.y += Math.cos(c.t * 77) * shake; }
    const tf = tTouch >= 0 ? Math.exp(-Math.max(0, tTouch - 1.0) * 5) * (tTouch > 1.0 ? 1 : 0) : 0;
    const overlay = `<rect width="1920" height="1080" fill="#fff" opacity="${f(Math.max(flash * 0.8, tf * 0.9))}"/>`;
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- PARK: Grandpa Shelby
  S.park = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 600, s: 1.05 }, max: { x: 860, s: 1.0 }, gran: { x: 1330, s: 1.0 } };
    const tg = since(c, 'glasses');
    const g = tg < 0 ? 0 : clamp(easeOut(tg / 0.7) + Math.exp(-(tg - 0.7) * 6) * Math.sin((tg - 0.7) * 18) * 0.06 * (tg > 0.7 ? 1 : 0), 0, 1.05);
    const th = c.think('GRAN');
    const word = c.b.t && c.b.t.includes('glasses') ? 'GLASSES??' : c.b.t && c.b.t.includes('turnips') ? 'TURNIPS!' : c.b.t && c.b.t.includes('tonight') ? 'TONIGHT!' : '...';
    const r = rng(8);
    const flowers = [...Array(30)].map(() => `<circle cx="${f(r() * 1920)}" cy="${f(900 + r() * 170)}" r="${f(5 + r() * 4)}" fill="${['#ff7bb0', '#ffd34d', '#fff'][Math.floor(r() * 3)]}"/>`).join('');
    const svg = `${sky('pk', '#6cc0ff', '#d9f1ff')}${clouds(c.t, 0.9, '#fff', 5)}
      <path d="M0 640 Q480 520 960 610 T1920 600 V1080 H0Z" fill="#8fcf6a"/>
      ${tree(240, 860, 1.0, ['#3e9a43', '#4caf50', '#5cc261'], 7)}${tree(1720, 870, 1.15, ['#59b05a', '#4a9e4c', '#6cc46c'], 9)}${tree(1050, 690, 0.55, ['#4caf50', '#3e9a43'], 11)}
      ${grass(880, '#6dbb4f', '#4f9a37', 6)}
      <path d="M700 1080 Q900 960 1200 900 L1900 860 L1920 900 L1260 950 Q1000 1000 900 1080Z" fill="#e3cfa2"/>
      <g transform="translate(1560 900)"><rect x="-150" y="-110" width="300" height="20" rx="6" fill="#a0623a"/><rect x="-150" y="-80" width="300" height="20" rx="6" fill="#a0623a"/><rect x="-150" y="-150" width="300" height="18" rx="6" fill="#a0623a"/>
        <rect x="-140" y="-60" width="14" height="60" fill="#3a3a44"/><rect x="126" y="-60" width="14" height="60" fill="#3a3a44"/></g>
      <rect x="430" y="560" width="14" height="340" fill="#3a3a44"/><circle cx="437" cy="550" r="26" fill="#ffe9a8"/>${flowers}
      ${person('max', c, { x: 860, flip: false, lookX: lookFrom(c, 'max', P) })}
      ${kip(c, { x: 600, lookX: lookFrom(c, 'kip', P) })}
      ${person('gran', c, { x: 1330, lookX: lookFrom(c, 'gran', P), pose: a === 'glasses' ? 'surprise' : undefined })}${glasses(1330, 905, 1.0, true, g)}
      ${kipStar(c, 600, 905, 1.05)}${rings(1330, 905 - 470, th, c.t)}${thoughtBubble(1250, 230, 400, 150, word, th, 1330, 905 - 600, c.t)}`;
    let cam = dcam(c, P);
    if (a === 'glasses') cam = { z: 1.8, x: 1330, y: 420 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- PORCH: Coco
  S.porch = c => {
    const a = c.b.a, lt = c.lt;
    const tr = since(c, 'cocoRun');
    const cx = tr < 0 ? 1300 : lerp(1300, 2300, easeIO(tr / 1.2));
    const P = { kip: { x: 600, s: 1.05 }, max: { x: 830, s: 1.0 } };
    if (tr < 0) P.coco = { x: 1300, s: 1.0 };
    const th = c.think('COCO');
    const word = c.b.t && c.b.t.includes('hedge') ? 'DONT LOOK!' : 'POOR KIP...';
    const svg = `${sky('pc', '#7cc6ff', '#e2f3ff')}${clouds(c.t, 0.8, '#fff', 3)}
      <rect x="1000" y="140" width="920" height="760" fill="#f4e1c1"/><path d="M960 160 L1460 -20 L1960 160Z" fill="#b5523b"/>
      ${[...Array(18)].map((_, i) => `<path d="M1000 ${180 + i * 40} H1920" stroke="#d9c29c" stroke-width="3"/>`).join('')}
      <rect x="1500" y="520" width="190" height="380" rx="10" fill="#4a7bd1"/><circle cx="1665" cy="720" r="10" fill="#ffd34d"/>
      <rect x="1100" y="300" width="250" height="200" rx="8" fill="#bfe6ff" stroke="#fff" stroke-width="14"/><path d="M1225 300 V500 M1100 400 H1350" stroke="#fff" stroke-width="8"/>
      <rect x="1450" y="880" width="290" height="30" fill="#c9b08a"/><rect x="1470" y="850" width="250" height="30" fill="#d9c29c"/>
      ${fence(880, '#ffffff', '#c9ced8')}
      <g>${[...Array(9)].map((_, i) => `<circle cx="${180 + i * 75}" cy="${790 - (i % 2) * 20}" r="80" fill="${i % 2 ? '#3e9a43' : '#4caf50'}"/>`).join('')}<rect x="100" y="780" width="760" height="120" fill="#3e9a43"/></g>
      <g transform="translate(${f(560 + Math.sin(c.t * 2) * 2)} 760)"><rect x="-38" y="-38" width="76" height="76" fill="#ff5470"/><rect x="-8" y="-38" width="16" height="76" fill="#ffd34d"/><path d="M-20 -50 Q0 -30 20 -50 Q0 -36 -20 -50" stroke="#ffd34d" stroke-width="8" fill="none"/></g>
      ${grass(900, '#6dbb4f', '#4f9a37', 8)}
      ${person('max', c, { x: 830, flip: false, lookX: lookFrom(c, 'max', P) })}
      ${kip(c, { x: 600, lookX: tr >= 0 ? 0.7 : lookFrom(c, 'kip', P) })}
      ${person('coco', c, { x: cx, pose: tr >= 0 ? walkPose(c.t, 1, true) : undefined, flip: tr >= 0 ? false : true, lookX: lookFrom(c, 'coco', Object.assign({ coco: { x: cx } }, P)) })}
      ${kipStar(c, 600, 905, 1.05)}${rings(cx, 905 - 470, th, c.t)}${thoughtBubble(1230, 230, 400, 150, word, th, 1300, 905 - 600, c.t)}`;
    let cam = dcam(c, P);
    if (a === 'cocoRun') cam = { z: 1.0, x: 1100, y: 540 };
    if (a === 'gone') cam = { z: 1.25, x: 720, y: 560 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- STREET: too many voices
  function streetBG(c, busy) {
    const shops = [['BAKERY', '#ff9f68', '#e05a2b'], ['BOOKS', '#7aa7ff', '#3d6fe0'], ['CAFE', '#9fd16b', '#5a9a2e'], ['TOYS', '#ff7bb0', '#d93a7a']];
    let s = `<rect y="880" width="1920" height="200" fill="#9aa3b5"/><rect y="880" width="1920" height="16" fill="#c9cfdb"/>`;
    shops.forEach(([n, col, dk], i) => {
      const x = i * 480;
      s += `<rect x="${x}" y="200" width="480" height="680" fill="${i % 2 ? '#e9dcc9' : '#f3e7d6'}"/><rect x="${x + 40}" y="480" width="400" height="300" fill="#bfe6ff" stroke="#6b5a4a" stroke-width="10"/>
        ${[...Array(8)].map((_, k) => `<path d="M${x + 40 + k * 50} 430 h50 v50 q-25 20 -50 0Z" fill="${k % 2 ? col : '#fff'}"/>`).join('')}
        <rect x="${x + 90}" y="300" width="300" height="90" rx="14" fill="${dk}"/>${txt(x + 240, 362, n, 48, { fill: '#fff' })}
        <rect x="${x + 180}" y="620" width="120" height="160" fill="${dk}" opacity="0.4"/>`;
    });
    return s + `<rect x="0" y="180" width="1920" height="22" fill="#6b5a4a"/>`;
  }
  S.street = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 900, s: 1.05 }, max: { x: 1260, s: 1.0 } };
    const crowd = ['friendA', 'friendB', 'scientist', 'doc', 'randy'];
    const speakers = ['MAIL', 'LADY', 'BAKER', 'JOG', 'DOG'];
    const busy = a === 'crowd';
    let people = '', fx = '';
    crowd.forEach((w, i) => {
      const dir = i % 2 ? -1 : 1, sp = 70 + i * 18, base = (i * 450 + c.t * sp * dir) % 2600;
      const x = dir > 0 ? base - 300 : 2300 - ((base + 2600) % 2600);
      const y = 860 + (i % 2) * 12, sc = 0.74 + (i % 3) * 0.03;
      const op = busy ? 1 : 0.0;
      if (op > 0) people += `<g opacity="${op}">${X.renderPerson(w, { id: 'cr' + i, x, y, scale: sc, flip: dir < 0, pose: walkPose(c.t + i, 1), t: c.t, blink: K.blinkAt(c.t, i + 3), expression: 'neutral' })}</g>`;
      const k = c.think(speakers[i]);
      fx += rings(x, y - 470 * sc, k, c.t) + thoughtBubble(x + 40, 230 + (i % 2) * 40, 360, 140, ['TRIPPED?', 'MY HAIR!', 'RACCOON?', 'LEFT?', 'TOO BRIGHT!'][i], k, x, y - 600 * sc, c.t);
    });
    const noise = busy ? 0.18 * (0.5 + 0.5 * Math.sin(c.t * 17)) : 0;
    const svg = `${sky('st', '#6aa8e8', '#d7ebff')}${clouds(c.t, 0.7)}${streetBG(c, busy)}
      ${people}${person('max', c, { x: 1260, lookX: lookFrom(c, 'max', P) })}
      ${kip(c, { x: 900, lookX: busy ? Math.sin(c.t * 3) * 0.8 : lookFrom(c, 'kip', P) })}
      ${kipStar(c, 900, 905, 1.05, { glow: busy ? 1.4 : 1 })}${fx}
      <rect width="1920" height="1080" fill="#7ff3ff" opacity="${f(noise * 0.4)}"/>`;
    let cam = dcam(c, P);
    if (busy) cam = { z: lerp(1.0, 1.25, easeIO(c.rt / 12)), x: 900 + Math.sin(c.t * 0.8) * 40, y: 520 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- HOME: Mom at the front door
  S.home = c => {
    const a = c.b.a, lt = c.lt;
    const tin = since(c, 'momIn');
    const mx = tin < 0 ? 1650 : lerp(1650, 1250, easeOut(tin / 1.0));
    const P = { kip: { x: 760, s: 1.05 }, max: { x: 470, s: 1.0 }, mom: { x: mx, s: 1.0 } };
    const th = c.think('MOM');
    const hb = since(c, 'heartbreak');
    const grey = hb >= 0 ? sm(0, 0.5, hb) * (1 - sm(4, 6, hb)) : 0;
    const word = c.b.t && c.b.t.includes('early') ? 'NOT YET!!' : 'MOVE OUT...';
    const svg = `<rect width="1920" height="1080" fill="#f6e6c8"/>
      ${[...Array(30)].map((_, i) => `<path d="M${i * 66} 0 V900" stroke="#ead2a8" stroke-width="18"/>`).join('')}
      <rect x="1380" y="250" width="380" height="650" rx="12" fill="#8a5a35"/><rect x="1410" y="280" width="320" height="600" rx="8" fill="#ffe9c0"/><circle cx="1700" cy="600" r="12" fill="#ffd34d"/>
      <rect x="120" y="300" width="300" height="220" rx="10" fill="#ffffff" stroke="#c9a46a" stroke-width="12"/><circle cx="270" cy="410" r="60" fill="#ffd2a8"/>${txt(270, 425, 'FAMILY', 26, { fill: '#a0623a' })}
      <rect x="560" y="240" width="200" height="160" rx="8" fill="#fff" stroke="#c9a46a" stroke-width="10"/>${txt(660, 335, 'KIP', 40, { fill: '#f07a2a' })}
      <rect y="900" width="1920" height="180" fill="#b07a4e"/>${[...Array(12)].map((_, i) => `<path d="M${i * 170} 900 V1080" stroke="#9a6a42" stroke-width="5"/>`).join('')}
      <rect x="1200" y="880" width="400" height="40" rx="18" fill="#d9487a" opacity="0.7"/>
      ${person('max', c, { x: 470, flip: false, scale: 0.98, lookX: lookFrom(c, 'max', P) })}
      ${kip(c, { x: 760, lookX: lookFrom(c, 'kip', P) })}
      ${person('mom', c, { x: mx, pose: tin >= 0 && tin < 1.0 ? walkPose(c.t, 1) : (a === 'momIn' && lt > 1 ? 'wave' : undefined), lookX: lookFrom(c, 'mom', P) })}
      ${kipStar(c, 760, 905, 1.05)}${rings(mx, 905 - 470 * 1.1, th, c.t)}${thoughtBubble(1250, 220, 420, 150, word, th, mx, 905 - 640, c.t)}`;
    let cam = dcam(c, P);
    if (a === 'momIn') cam = { z: 1.08, x: 1020, y: 540 };
    if (a === 'heartbreak') cam = { z: lerp(1.6, 2.0, easeIO(lt / 1.6)), x: 760, y: 430 };
    const overlay = grey > 0 ? `<rect width="1920" height="1080" fill="#20243a" opacity="${f(grey * 0.45)}" style="mix-blend-mode:saturation"/><rect width="1920" height="1080" fill="#000" opacity="${f(grey * 0.2)}"/>` : '';
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- YARD2 (afternoon): bananas
  S.yard2 = c => {
    const a = c.b.a, lt = c.lt;
    const tr = since(c, 'kipRuns');
    const kx = tr < 0 ? 760 : lerp(760, -300, easeIO(tr / 1.4));
    const P = { kip: { x: 760, s: 1.05 }, max: { x: 1180, s: 1.0 } };
    const th = c.think('MAX');
    const word = c.b.t && c.b.t.includes('Bananas') ? 'BANANAS!!' : 'GO AWAY...';
    const hb = since(c, 'heartbreak'), grey = hb >= 0 ? sm(0, 0.4, hb) : 0;
    const svg = `${yardBG(c, 'aft')}
      ${person('max', c, { x: 1180, lookX: tr >= 0 ? -0.8 : lookFrom(c, 'max', P), pose: a === 'alone' ? { armR: { sh: 100, el: 0 } } : undefined })}
      ${tr < 1.6 ? kip(c, { x: kx, pose: tr >= 0 ? walkPose(c.t, 1, true) : undefined, flip: tr >= 0, lookX: lookFrom(c, 'kip', P) }) + kipStar(c, kx, 905, 1.05) : ''}
      ${rings(1180, 905 - 470, th, c.t)}${thoughtBubble(1180, 230, 420, 150, word, th, 1180, 905 - 600, c.t)}`;
    let cam = dcam(c, P);
    if (a === 'heartbreak') cam = { z: lerp(1.6, 2.0, easeIO(lt / 1.8)), x: 760, y: 430 };
    if (a === 'kipRuns') cam = { z: 1.0, x: 900, y: 540 };
    if (a === 'alone') cam = { z: 1.3, x: 1100, y: 560 };
    const overlay = grey > 0 ? `<rect width="1920" height="1080" fill="#1a2040" opacity="${f(grey * 0.25)}"/>` : '';
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- KITCHEN: code red
  S.kitchen = c => {
    const a = c.b.a, lt = c.lt;
    const tb = since(c, 'burst'), tg = since(c, 'granGo');
    const mxx = tb < 0 ? 200 : lerp(200, 560, easeOut(tb / 0.6));
    const gx = tg < 0 ? 860 : lerp(860, 300, clamp(tg / 7));
    const P = { max: { x: 560, s: 1.0 }, gran: { x: 860, s: 1.0 }, mom: { x: 1200, s: 1.0 }, coco: { x: 1470, s: 1.0 } };
    const svg = `<rect width="1920" height="1080" fill="#cfeee6"/>${[...Array(12)].map((_, i) => `<path d="M0 ${i * 80} H1920" stroke="#bfe3da" stroke-width="3"/>`).join('')}
      <rect x="100" y="250" width="240" height="650" rx="10" fill="#8a5a35"/><rect x="125" y="275" width="190" height="600" fill="#a8744a"/>
      <rect x="980" y="160" width="860" height="200" rx="10" fill="#f6f1e6"/>${[0, 1, 2, 3].map(i => `<rect x="${1000 + i * 210}" y="180" width="190" height="160" rx="8" fill="#fffaf0" stroke="#d9cfb8" stroke-width="4"/>`).join('')}
      <rect x="980" y="640" width="860" height="260" fill="#f6f1e6"/><rect x="960" y="620" width="900" height="34" rx="8" fill="#e0b98a"/>
      <g transform="translate(1660 620)"><rect x="-90" y="-60" width="180" height="60" rx="10" fill="#ffd1e0"/><rect x="-70" y="-110" width="140" height="50" rx="10" fill="#ffe8f0"/>
        ${[-40, -10, 20, 50].map(x => `<rect x="${x - 4}" y="-140" width="8" height="30" fill="#7ff3ff"/><ellipse cx="${x}" cy="-148" rx="5" ry="9" fill="#ffd34d"/>`).join('')}${txt(0, -24, 'HAPPY B-DAY', 18, { fill: '#d93a7a' })}</g>
      ${[0, 1, 2].map(i => `<g transform="translate(${1150 + i * 110} ${560 - Math.sin(c.t * 2 + i) * 6})"><ellipse rx="40" ry="50" fill="${['#ff5470', '#38bdf8', '#ffd34d'][i]}"/><path d="M0 50 q8 40 -4 80" stroke="#666" stroke-width="2" fill="none"/></g>`).join('')}
      <rect x="1400" y="760" width="170" height="140" fill="#c98b52"/>${txt(1485, 840, 'PARTY', 28, { fill: '#fff' })}
      <rect y="900" width="1920" height="180" fill="#e9e4da"/>${[...Array(14)].map((_, i) => `<path d="M${i * 140} 900 V1080 M0 ${980 + (i % 2) * 50} H1920" stroke="#d6d0c4" stroke-width="3"/>`).join('')}
      ${person('coco', c, { x: 1470, lookX: lookFrom(c, 'coco', P) })}
      ${person('mom', c, { x: 1200, lookX: lookFrom(c, 'mom', P) })}
      ${person('gran', c, { x: gx, flip: tg >= 0 ? true : false, pose: tg >= 0 ? walkPose(c.t * 0.35, 0.6) : undefined, lookX: lookFrom(c, 'gran', P) })}${glasses(gx, 905, 1.0, tg >= 0, 1)}
      ${person('max', c, { x: mxx, flip: false, pose: tb >= 0 && tb < 0.6 ? walkPose(c.t, 1, true) : (a === 'burst' ? 'scared' : undefined), lookX: lookFrom(c, 'max', P) })}`;
    let cam = dcam(c, P, { wideX: 960 });
    if (a === 'burst' && lt < 1.2) cam = { z: 1.0, x: 960, y: 540 };
    if (a === 'granGo') cam = { z: lerp(1.3, 1.1, easeIO(lt / 3)), x: lerp(860, 600, easeIO(lt / 4)), y: 560 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- HILL at sunset: the star cracks
  S.hill = c => {
    const a = c.b.a, lt = c.lt;
    const tc = since(c, 'crack'), td = since(c, 'dim'), tgi = since(c, 'granIn');
    const gx = tgi < 0 ? -300 : lerp(-300, 760, clamp(tgi / 4.0));
    const P = { kip: { x: 1180, s: 1.05 } };
    if (tgi >= 0) P.gran = { x: gx, s: 1.0 };
    let red = 0, crack = 0, glow = 1;
    if (tc >= 0) { red = sm(0, 1.2, tc); crack = sm(0.8, 2.6, tc); glow = 1 + 0.9 * Math.abs(Math.sin(c.t * 23) * Math.sin(c.t * 7)); }
    if (td >= 0) { glow = lerp(glow, 0.15, sm(0, 1.2, td)); red = lerp(red, 0, sm(0, 1.2, td)); }
    const storm = a === 'storm' || (tc >= 0 && td < 0);
    let swirl = '';
    if (storm) {
      const words = ["DON'T LET HIM", 'GO AWAY!', 'FOREVER!', 'TURNIPS!', 'SECRET!', 'TONIGHT!'];
      words.forEach((w, i) => { const ang = c.t * 1.4 + i * Math.PI / 3, rx = 560, ry = 300; swirl += txt(1180 + Math.cos(ang) * rx, 470 + Math.sin(ang) * ry, w, 44, { fill: i % 2 ? '#ff8a7a' : '#ffd0c8', stroke: '#3a0a10', sw: 8, op: 0.85 }); });
    }
    const svg = `${sky('hs', '#3b2a6b', '#ff8a4a')}<circle cx="560" cy="700" r="150" fill="#ffd27a" opacity="0.95"/><circle cx="560" cy="700" r="260" fill="#ffd27a" opacity="0.15"/>
      ${clouds(c.t * 0.5, 0.5, '#ffb38a', 7)}
      ${[...Array(16)].map((_, i) => { const w = 60 + (i * 37) % 70, h = 90 + (i * 53) % 160; return `<rect x="${i * 125}" y="${760 - h}" width="${w}" height="${h + 40}" fill="#4a2f5e" opacity="0.8"/>`; }).join('')}
      <path d="M-40 1080 L-40 860 Q700 700 1300 790 Q1700 840 1960 820 L1960 1080Z" fill="#3e5a3a"/>
      ${tree(1560, 830, 1.0, ['#2f4a2e', '#3a5a38', '#28402a'], 13)}
      ${tgi >= 0 ? person('gran', c, { x: gx, flip: false, pose: tgi < 4 ? walkPose(c.t * 0.4, 0.6) : undefined, lookX: 0.6 }) + glasses(gx, 905, 1.0, false, 1) : ''}
      ${kip(c, { x: 1180, lookX: tgi >= 0 ? -0.7 : 0, lookY: a === 'sunset' ? 0.3 : 0, rim: 0.9 })}
      ${kipStar(c, 1180, 905, 1.05, { glow, red, crack })}${storm ? rings(1180, 905 - 470 * 1.05, 0.9, c.t * 1.5, '#ff6a5a') : ''}${swirl}
      <rect width="1920" height="1080" fill="#ff2030" opacity="${f(storm ? 0.12 + 0.08 * Math.sin(c.t * 9) : 0)}" style="mix-blend-mode:multiply"/>`;
    let cam = dcam(c, P);
    if (a === 'sunset') cam = { z: lerp(1.0, 1.08, lt / 2), x: 960, y: 540 };
    if (a === 'crack' || storm) cam = { z: lerp(1.35, 1.7, clamp((tc) / 6)), x: 1180 + Math.sin(c.t * 40) * 6 * (td < 0 ? 1 : 0), y: 470 };
    if (a === 'dim') cam = { z: 1.5, x: 1180, y: 480 };
    if (a === 'granIn') cam = { z: 1.0, x: 960, y: 540 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- PARTY (night)
  function partyScene(c, twist) {
    const a = c.b.a, lt = c.lt;
    const tl = since(c, 'lightsOn'), ts = since(c, 'surprise');
    const lit = twist ? 1 : (tl < 0 ? 0 : sm(0.6, 0.8, tl));
    const P = { kip: { x: 760, s: 1.05 }, mom: { x: 1150, s: 1.0 }, max: { x: 1400, s: 1.0 }, coco: { x: 1640, s: 1.0 }, gran: { x: 430, s: 1.0 } };
    const hidden = !twist && ts < 0;
    const jump = (st, d) => st < 0 ? 0 : Math.max(0, Math.sin(clamp(st / 0.5) * Math.PI)) * d;
    const jy = twist ? 0 : jump(ts, 60);
    let cast = '';
    if (!hidden) {
      cast += person('gran', c, { x: 430, flip: false, y: 905 - jy * 0.3, lookX: lookFrom(c, 'gran', P), pose: ts >= 0 && ts < 2 ? 'cheer' : undefined }) + glasses(430, 905 - jy * 0.3, 1.0, false, 1);
      cast += person('mom', c, { x: 1150, y: 905 - jy, lookX: lookFrom(c, 'mom', P), pose: (ts >= 0 && ts < 2.5) ? 'cheer' : (a === 'laugh' ? 'cheer' : undefined) });
      cast += person('max', c, { x: 1400, y: 905 - jy, lookX: lookFrom(c, 'max', P), pose: (ts >= 0 && ts < 2.5) || a === 'fireworks' ? 'cheer' : undefined });
    }
    // Coco
    const tlc = since(c, 'landCoco');
    if (!hidden) cast += person('coco', c, { x: 1640, y: 905 - jy, lookX: lookFrom(c, 'coco', P), pose: (ts >= 0 && ts < 2.5) || a === 'laugh' ? 'cheer' : undefined });
    // star
    let star = '';
    const trl = since(c, 'release');
    if (twist) {
      if (trl < 0) {
        const k = a === 'hold' ? 1 : 1;
        star = kipStar(c, 760, 905, 1.05, { glow: 0.4, crack: 1 });
      } else if (tlc < 0) {
        const q = clamp(trl / 2.4);
        star = starSVG(lerp(770, 1300, q), lerp(905 - 655 * 1.05, -80, easeIO(q)), 32, { t: c.t, id: 'rs', glow: 1.6, crack: 1 - q });
      } else {
        const q = clamp(tlc / 1.2), hx = 1640, hy = 905 - 690 * 0.97;
        star = starSVG(lerp(1400, hx, q), lerp(-80, hy + Math.sin(c.t * 2.2) * 8, easeOut(q)), 26, { t: c.t, id: 'rs', glow: 1.3 });
      }
    } else {
      star = kipStar(c, 760, 905, 1.05, { glow: 0.15, crack: 1 });
    }
    const cocoGlow = twist && tlc >= 1.2 ? rings(1640, 905 - 470 * 0.97, 0.7, c.t) : '';
    // fireworks
    let fw = '';
    const tf = since(c, 'fireworks');
    if (tf >= 0) [[560, 230, '#ff7bb0'], [1050, 170, '#7ff3ff'], [1500, 250, '#ffd34d']].forEach(([x, y, col], i) => {
      const t0 = i * 1.1 + 0.6;
      if (tf > i * 1.1 && tf < t0) fw += `<circle cx="${f(1400 + (x - 1400) * (tf - i * 1.1) / 0.6)}" cy="${f(800 - (800 - y) * (tf - i * 1.1) / 0.6)}" r="7" fill="#ffd27a"/>`;
      fw += firework(x, y, tf - t0, col, i + 3);
    });
    const r = rng(21);
    const svg = `${yardBG(c, 'night')}
      ${treehouse(1560, 330, lit > 0.5)}
      ${stringLights([[0, 300], [520, 330], [1000, 300], [1440, 360], [1920, 320]], lit, c.t)}
      <g transform="translate(960 880)"><rect x="-180" y="-120" width="360" height="22" rx="8" fill="#f2f2f2"/><rect x="-160" y="-98" width="16" height="98" fill="#ccc"/><rect x="144" y="-98" width="16" height="98" fill="#ccc"/>
        <g transform="translate(0 -120)"><rect x="-80" y="-60" width="160" height="60" rx="10" fill="#ffd1e0"/><rect x="-60" y="-105" width="120" height="45" rx="10" fill="#ffe8f0"/>
        ${[-30, 0, 30].map(x => `<rect x="${x - 4}" y="-135" width="8" height="30" fill="#7ff3ff"/><ellipse cx="${x}" cy="${f(-142 + Math.sin(c.t * 9 + x) * 1.5)}" rx="6" ry="10" fill="#ffd34d" opacity="${lit > 0.5 ? 1 : 0}"/>`).join('')}</g></g>
      ${[0, 1, 2, 3].map(i => `<g transform="translate(${180 + i * 120} ${520 + Math.sin(c.t * 1.5 + i) * 8})" opacity="${lit > 0.5 ? 1 : 0.25}"><ellipse rx="44" ry="54" fill="${['#ff5470', '#38bdf8', '#ffd34d', '#a78bfa'][i]}"/><path d="M0 54 q10 50 -6 120" stroke="#888" stroke-width="2" fill="none"/></g>`).join('')}
      ${cast}${kip(c, { x: 760, lookX: a === 'camera' ? 0 : (a === 'treehouse' ? 0.5 : lookFrom(c, 'kip', P)), lookY: a === 'treehouse' || a === 'release' || a === 'fireworks' ? -0.8 : 0 })}
      ${star}${cocoGlow}${fw}
      ${ts >= 0 && ts < 6 ? confetti(c.t - ts, c.t, 110, 4) : ''}
      <rect width="1920" height="1080" fill="#02030c" opacity="${f(0.62 * (1 - lit))}"/>`;
    let cam = dcam(c, P, { wideZ: 1.0 });
    if (a === 'dark') cam = { z: lerp(1.3, 1.15, easeIO(lt / 3)), x: 820, y: 520 };
    if (a === 'surprise') cam = { z: lerp(1.0, 1.04, lt), x: 1050, y: 540 };
    if (a === 'treehouse') cam = { z: lerp(1.1, 1.45, easeIO(lt / 3.4)), x: lerp(960, 1520, easeIO(lt / 3)), y: lerp(560, 300, easeIO(lt / 3)) };
    if (a === 'tree') cam = { z: 1.15, x: 1200, y: 420 };
    if (a === 'fireworks') cam = { z: 1.0, x: 1000, y: 470 };
    if (a === 'release') cam = { z: lerp(1.2, 1.0, easeIO(lt / 2)), x: lerp(780, 1100, easeIO(lt / 2.4)), y: lerp(500, 420, easeIO(lt / 2.4)) };
    if (a === 'landCoco') cam = { z: lerp(1.0, 1.6, easeIO((lt - 0.6) / 1.4)), x: lerp(1300, 1640, easeIO(lt / 1.4)), y: lerp(420, 380, easeIO(lt / 1.4)) };
    if (a === 'laugh') cam = { z: 1.02, x: 1040, y: 540 };
    if (a === 'camera') cam = { z: lerp(1.6, 1.85, easeIO(lt / 4)), x: 760, y: 430 };
    return { svg, cam };
  }
  S.party = c => partyScene(c, false);
  S.party2 = c => partyScene(c, true);

  // ---------------------------------------------------------------- OUTRO
  S.outro = c => {
    const lt = c.lt;
    const click = lt > 4.5 && lt < 5.2, subbed = lt > 5;
    const cx = lerp(1700, 1150, easeOut((lt - 3) / 1.2)), cy = lerp(1000, 760, easeOut((lt - 3) / 1.2));
    const svg = `<linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f1a3a"/><stop offset="1" stop-color="#062430"/></linearGradient><rect width="1920" height="1080" fill="url(#og)"/>
      ${confetti(c.b.start + 5, c.t, 50, 8)}
      ${kip(c, { x: 450, y: 960, scale: 1.1, pose: 'wave', expression: 'happy', lookX: 0.5 })}${kipStar(c, 450, 960, 1.1, { glow: 0.6 })}
      <g transform="translate(1030 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d0f1c" stroke="#3b4a6b" stroke-width="5"/>${txt(0, 20, 'EP 1', 80, { fill: '#2c3550' })}${txt(0, 165, 'WATCH EP 1', 28, { fill: '#9fb3c8' })}</g>
      <g transform="translate(1500 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d0f1c" stroke="#7ff3ff" stroke-width="5"/><circle cx="0" cy="0" r="12" fill="#2c3550"/>${txt(0, 20, '?', 110, { fill: '#2c3550' })}${txt(0, 165, 'NEXT: SHRINK TO ANT SIZE', 26, { fill: '#7ff3ff' })}</g>
      <g transform="translate(1150 700) scale(${f(click ? 0.94 : 1)})"><rect x="-230" y="-55" width="460" height="110" rx="55" fill="${subbed ? '#3b4a6b' : '#e62e3d'}"/>${txt(0, 18, subbed ? 'SUBSCRIBED ✓' : 'SUBSCRIBE', 48, { fill: '#fff' })}</g>
      <path transform="translate(${f(cx)} ${f(cy)})" d="M0 0 L0 60 L16 46 L28 72 L40 66 L28 40 L48 40 Z" fill="#fff" stroke="#000" stroke-width="4"/>
      <g transform="translate(1260 900)" opacity="${f(sm(1.5, 2.5, lt))}"><rect x="-420" y="-50" width="840" height="100" rx="24" fill="#fff"/>${txt(0, 15, 'What would YOU do with mind-reading?', 38, { fill: '#223' })}</g>`;
    return { svg, cam: { z: 1 } };
  };

  root.SCENES = S;
})(typeof window !== 'undefined' ? window : globalThis);
