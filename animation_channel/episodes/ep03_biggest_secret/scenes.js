/* Scene library for EP03 "What If Everyone Could See Your Biggest Secret?" (browser).
 * Kip is drawn ONLY through Kip.renderKip() (locked v1.0.0). Secret signs float above heads as separate props,
 * so his design is never altered. Supporting cast is defined below (episode-only). */
(function (root) {
  'use strict';
  const { clamp, lerp, sm, easeOut, easeIO, f, rng, txt } = root.Engine.H;
  const K = root.Kip, X = root.Extras;
  const S = {};
  const TL = () => root.Engine.tl();

  // ---------------------------------------------------------------- supporting cast (EP03)
  const CAST = {
    mom:    { name: 'Mom', skin: '#f2d3b3', skinLo: '#cfae8c', ink: '#2b1e14', eyeLine: true, hat: 'bun', hatColor: '#5a3522',
              top: 'sweater', topColor: '#d9487a', topDark: '#a8335c', pants: '#3b4f7a', shoe: '#f0f0f0', height: 1.1 },
    lily:   { name: 'Lily', skin: '#f6d8c0', skinLo: '#d8b49a', ink: '#24180f', eyeLine: true, hat: 'side', hatColor: '#1e1410', glasses: true,
              top: 'sweater', topColor: '#2f4fa3', topDark: '#22397a', pants: '#3a3d4a', shoe: '#c92a4a', height: 0.98 },
    teach:  { name: 'Mr. Grumbold', skin: '#e9c4a2', skinLo: '#c49c78', ink: '#2b2018', eyeLine: true, hat: 'bald', hatColor: '#8a8a92', glasses: true,
              top: 'shirt', topColor: '#8a6a4a', topDark: '#6a4f36', pants: '#3a3530', shoe: '#2a2018', height: 1.14 },
    cop:    { name: 'Officer Dan', skin: '#9a6a4a', skinLo: '#74503a', ink: '#1e1410', eyeLine: false, hat: 'flattop', hatColor: '#1a1a22',
              top: 'shirt', topColor: '#2c4a8a', topDark: '#1f3566', pants: '#1f2a44', shoe: '#111', height: 1.16 },
    baker:  { name: 'Rosa', skin: '#d9a07a', skinLo: '#b07c58', ink: '#24160e', eyeLine: true, hat: 'bun', hatColor: '#f4f4f4',
              top: 'coat', topColor: '#ffffff', topDark: '#d9dde4', shirt: '#e0485a', pants: '#3a3d4a', shoe: '#333', height: 1.04 },
    driver: { name: 'Bus Driver', skin: '#f0cfae', skinLo: '#c9a582', ink: '#2b1e14', eyeLine: true, hat: 'beanie', hatColor: '#2f6fd6',
              top: 'shirt', topColor: '#8f98a8', topDark: '#6b7383', pants: '#2b2f3a', shoe: '#222', height: 1.05 }
  };
  const VOICE = { kip: 'KIP', max: 'MAX', mom: 'MOM', lily: 'LILY', teach: 'TEACH', cop: 'COP', baker: 'BAKER', driver: 'DRIVER' };
  const WHO = { KIP: 'kip', MAX: 'max', MOM: 'mom', LILY: 'lily', TEACH: 'teach', COP: 'cop', BAKER: 'baker', DRIVER: 'driver' };
  const SIGNS = () => TL().signs || {};

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
    if (kind === 'med') return { z: 1.34 * push, x: lerp(mid, tgt.x, 0.65), y: hy + 70 };
    return { z: 1.62 * push, x: tgt.x, y: hy + 5 };
  }

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

  // ---------------------------------------------------------------- secret signs (props above heads)
  function wrap(text, n = 20) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) lines.push(cur);
    return lines;
  }
  /* sign centred at x, bottom edge at y. o: {loading, pct, glitch, s, op, col, id} */
  function sign(c, x, y, key, o = {}) {
    const s = o.s || 1, op = o.op === undefined ? 1 : o.op;
    if (op <= 0.01) return '';
    const col = o.col || '#ff4fd8';
    const text = o.loading ? '' : (SIGNS()[key] || key);
    const lines = o.loading ? [] : wrap(text, o.n || 20);
    const fs = 30, lh = 38, w = o.loading ? 360 : Math.max(300, Math.max(...lines.map(l => l.length)) * fs * 0.66 + 70), h = o.loading ? 120 : lines.length * lh + 74;
    const gl = o.glitch ? (Math.random() < 0.35 ? (Math.random() - 0.5) * 24 : 0) : 0;
    const bob = Math.sin(c.t * 2 + x * 0.01) * 6;
    let inner = '';
    if (o.loading) {
      const pct = Math.floor(clamp(o.pct || 0) * 99);
      inner = `<g transform="translate(-120 ${f(-h / 2 + 6)}) rotate(${f(c.t * 360)})">${[...Array(8)].map((_, i) => `<circle cx="${f(Math.cos(i * 0.785) * 18)}" cy="${f(Math.sin(i * 0.785) * 18)}" r="5" fill="#fff" opacity="${f(0.2 + i * 0.1)}"/>`).join('')}</g>
        ${txt(30, -h / 2 - 2, 'LOADING SECRET...', 26, { fill: '#fff' })}<rect x="-150" y="${f(-h / 2 + 26)}" width="300" height="14" rx="7" fill="#3a1046"/><rect x="-150" y="${f(-h / 2 + 26)}" width="${f(300 * clamp(o.pct || 0))}" height="14" rx="7" fill="${col}"/>
        ${txt(0, -h / 2 + 34 + 30, pct + '%', 24, { fill: '#ffd34d' })}`;
    } else {
      inner = txt(0, -h + 32, 'BIGGEST SECRET', 18, { fill: col, ls: 4 }) + lines.map((l, i) => txt(0, -h + 74 + i * lh, l, fs, { fill: '#fff' })).join('');
    }
    return `<g transform="translate(${f(x + gl)} ${f(y + bob)}) scale(${f(s * (0.85 + 0.15 * op))})" opacity="${f(op)}">
      <rect x="${f(-w / 2 - 10)}" y="${f(-h - 10)}" width="${f(w + 20)}" height="${f(h + 20)}" rx="26" fill="${col}" opacity="0.18"/>
      <rect x="${f(-w / 2)}" y="${f(-h)}" width="${f(w)}" height="${f(h)}" rx="20" fill="#1a0a2a" fill-opacity="0.82" stroke="${col}" stroke-width="5"/>
      <path d="M-14 0 L0 18 L14 0Z" fill="${col}"/>
      ${inner}
      ${[...Array(4)].map((_, i) => `<rect x="${f(-w / 2)}" y="${f(-h + ((c.t * 60 + i * 37) % h))}" width="${f(w)}" height="2" fill="#fff" opacity="0.07"/>`).join('')}</g>`;
  }
  const signY = p => (p.y || 905) - 640 * (p.s || 1) * (p.h || 1);
  /* pop-in amount for a sign that appears at action a (or always on if a is null) */
  function shown(c, a, d = 0.5) { if (!a) return 1; const t = since(c, a); return t < 0 ? 0 : easeOut(t / d); }

  function pigeon(x, y, s, t, flip = false) {
    const fl = Math.sin(t * 22) * 0.8;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})"><ellipse cx="0" cy="0" rx="34" ry="22" fill="#8d93a6"/><circle cx="28" cy="-18" r="14" fill="#7a8094"/>
      <path d="M40 -18 L54 -14 L40 -12Z" fill="#ffb347"/><circle cx="32" cy="-21" r="3" fill="#000"/><path d="M-10 -6 Q-30 ${f(-40 * fl)} -56 ${f(-30 * fl)}" stroke="#6b7083" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M-30 6 L-50 14" stroke="#6b7083" stroke-width="10" stroke-linecap="round"/><path d="M-4 20 L-6 32 M8 20 L8 32" stroke="#ffb347" stroke-width="4"/></g>`;
  }
  function teddy(x, y, s, wink = 0, t = 0) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">
      <ellipse cx="0" cy="-70" rx="70" ry="80" fill="#a8743f"/><ellipse cx="0" cy="-50" rx="40" ry="46" fill="#e2b98a"/>
      <circle cx="-60" cy="-150" r="24" fill="#a8743f"/><circle cx="60" cy="-150" r="24" fill="#a8743f"/><circle cx="0" cy="-185" r="62" fill="#a8743f"/>
      <circle cx="-60" cy="-150" r="11" fill="#e2b98a"/><circle cx="60" cy="-150" r="11" fill="#e2b98a"/><ellipse cx="0" cy="-168" rx="26" ry="20" fill="#e2b98a"/>
      <ellipse cx="0" cy="-176" rx="10" ry="7" fill="#2a1a10"/><path d="M-10 -160 Q0 -152 10 -160" stroke="#2a1a10" stroke-width="4" fill="none"/>
      <circle cx="-24" cy="-200" r="8" fill="#111"/>${wink > 0.5 ? `<path d="M14 -200 Q24 -194 34 -200" stroke="#111" stroke-width="5" fill="none"/>` : `<circle cx="24" cy="-200" r="8" fill="#111"/>`}
      <path d="M-30 -132 L0 -118 L30 -132 L22 -110 L0 -114 L-22 -110Z" fill="#d6334a"/>
      <ellipse cx="-62" cy="-80" rx="20" ry="40" fill="#a8743f" transform="rotate(25 -62 -80)"/><ellipse cx="62" cy="-80" rx="20" ry="40" fill="#a8743f" transform="rotate(-25 62 -80)"/>
      <ellipse cx="-36" cy="0" rx="28" ry="20" fill="#a8743f"/><ellipse cx="36" cy="0" rx="28" ry="20" fill="#a8743f"/></g>`;
  }
  function phoneFlash(k) { return k > 0 ? `<rect width="1920" height="1080" fill="#fff" opacity="${f(k * 0.8)}"/>` : ''; }

  // ---------------------------------------------------------------- shared sets
  function classroomBG(c) {
    let s = `<rect width="1920" height="1080" fill="#f1e3c6"/>${[...Array(24)].map((_, i) => `<path d="M${i * 82} 0 V900" stroke="#e6d4b0" stroke-width="16"/>`).join('')}
      <rect x="560" y="140" width="900" height="420" rx="12" fill="#2f5a46" stroke="#8a5a35" stroke-width="22"/>
      ${txt(1010, 260, 'MATH QUIZ FRIDAY', 52, { fill: '#e8f0e8', font: "'Comic Sans MS', 'Arial Black'", w: 700 })}${txt(1010, 350, '7 × 8 = ?', 60, { fill: '#e8f0e8', font: "'Comic Sans MS', 'Arial Black'", w: 700 })}
      ${txt(1010, 470, 'NO TALKING ABOUT THE SIGNS', 34, { fill: '#ffd34d', font: "'Comic Sans MS', 'Arial Black'", w: 700 })}
      <circle cx="1680" cy="220" r="70" fill="#fff" stroke="#333" stroke-width="10"/><path d="M1680 220 L1680 170 M1680 220 L1715 238" stroke="#333" stroke-width="8"/>
      <rect x="140" y="200" width="260" height="300" rx="10" fill="#bfe6ff" stroke="#fff" stroke-width="14"/><path d="M270 200 V500 M140 350 H400" stroke="#fff" stroke-width="8"/>
      <rect y="900" width="1920" height="180" fill="#c9a77a"/>${[...Array(10)].map((_, i) => `<path d="M${i * 200} 900 V1080" stroke="#b08c5e" stroke-width="5"/>`).join('')}`;
    return s;
  }
  const desk = (x, w = 260) => `<g transform="translate(${x} 900)"><rect x="${-w / 2}" y="-190" width="${w}" height="24" rx="6" fill="#b5835a"/><rect x="${-w / 2 + 14}" y="-166" width="14" height="166" fill="#6b5a4a"/><rect x="${w / 2 - 28}" y="-166" width="14" height="166" fill="#6b5a4a"/></g>`;
  function bedroomBG(c, morning = true) {
    return `<rect width="1920" height="1080" fill="${morning ? '#d8e6ff' : '#c9d6f0'}"/>${[...Array(24)].map((_, i) => `<path d="M${i * 82} 0 V900" stroke="#c8d8f4" stroke-width="14"/>`).join('')}
      <rect x="1200" y="160" width="520" height="440" rx="10" fill="${morning ? '#9fd7ff' : '#7fb7ff'}" stroke="#fff" stroke-width="18"/>
      <circle cx="1620" cy="250" r="50" fill="#fff2b0"/>${clouds(c.t, 0.8, '#fff', 4).replace(/<g /g, '<g clip-path="url(#bwc)" ')}
      <clipPath id="bwc"><rect x="1200" y="160" width="520" height="440"/></clipPath>
      <rect x="160" y="230" width="230" height="300" rx="8" fill="#f07a2a"/>${txt(275, 330, 'SPACE', 40, { fill: '#fff' })}${txt(275, 380, 'CAMP', 40, { fill: '#fff' })}<circle cx="275" cy="460" r="40" fill="#ffd34d"/>
      <rect x="470" y="300" width="260" height="20" fill="#8a5a35"/><rect x="490" y="250" width="40" height="50" fill="#d6334a"/><rect x="540" y="236" width="34" height="64" fill="#3d6fe0"/><rect x="584" y="260" width="44" height="40" fill="#34d399"/>
      <rect y="900" width="1920" height="180" fill="#9a7a5e"/><ellipse cx="960" cy="985" rx="420" ry="60" fill="#3d6fe0" opacity="0.5"/>
      <g transform="translate(330 900)"><rect x="-230" y="-120" width="520" height="90" rx="20" fill="#e9ecf5"/><rect x="-250" y="-260" width="40" height="260" rx="14" fill="#6b4f3a"/><rect x="290" y="-180" width="40" height="180" rx="14" fill="#6b4f3a"/>
        <path d="M-200 -120 Q60 -190 300 -125 L300 -60 L-200 -60Z" fill="#3b5bdb"/><ellipse cx="-150" cy="-140" rx="70" ry="34" fill="#fff"/></g>`;
  }

  // ---------------------------------------------------------------- HOOK (flash-forward)
  S.hook = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 960, s: 1.05 } };
    const pct = clamp((c.t - 0.5) / 6.6);
    const svg = `${classroomBG(c)}${desk(470)}${desk(1450)}
      ${person('max', c, { x: 420, scale: 0.95, flip: false, expression: 'surprise', lookX: 0.7 })}
      ${person('lily', c, { x: 1500, scale: 0.95, expression: 'surprise', lookX: -0.7 })}
      ${person('teach', c, { x: 1760, scale: 1.0, expression: 'surprise', lookX: -0.8 })}
      ${kip(c, { x: 960, lookY: -0.7, lookX: Math.sin(c.t * 4) * 0.3 })}
      ${sign(c, 960, signY(P.kip), 'kip', { loading: true, pct: a === 'reveal' ? 0.99 : pct, glitch: a === 'loading' || a === 'reveal' })}
      ${sign(c, 420, signY({ s: 0.95, h: 1.06 }), 'max', { s: 0.75 })}${sign(c, 1500, signY({ s: 0.95 }), 'lily', { s: 0.75 })}`;
    let cam = { z: lerp(1.0, 1.25, easeIO(c.rt / 6)), x: 960, y: 500 };
    if (a === 'loading') cam = { z: lerp(1.4, 1.9, easeIO(lt / 3)), x: 960, y: 330 + Math.sin(c.t * 50) * 4 };
    if (a === 'reveal') cam = { z: 2.0, x: 960, y: 320 };
    const overlay = a === 'reveal' ? `<rect width="1920" height="1080" fill="#fff" opacity="${f(clamp(lt / 0.3))}"/>` : '';
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- TITLE
  S.title = c => {
    const lt = c.lt, g = lt < 0.5 ? (1 - lt / 0.5) * 14 : 0;
    const face = K.renderKip({ id: 'tk', x: 960, y: 1900, scale: 2.4, expression: { ...K.EXPRESSIONS.fear, pupil: 0.5 }, lookY: -0.8, t: c.t, shadow: false, blink: 0 });
    const title = (dx, col) => `${txt(960 + dx, 170, 'WHAT IF EVERYONE COULD SEE', 66, { fill: col, ls: 4 })}${txt(960 + dx, 300, 'YOUR BIGGEST SECRET?', 122, { fill: col })}`;
    const svg = `<radialGradient id="tg" cx="0.5" cy="0.7" r="0.8"><stop offset="0" stop-color="#3a0f4a"/><stop offset="1" stop-color="#07030f"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#tg)"/>${face}
      ${sign(c, 960, 640, 'kip', { loading: true, pct: clamp(lt / 4), s: 1.3, glitch: true })}
      <g opacity="${f(easeOut(lt / 0.4))}">${g ? title(-g, '#ff2e63') + title(g, '#08d9d6') : ''}${title(0, '#fff')}</g>
      ${txt(960, 380, 'KIP · EPISODE 3', 36, { fill: '#ff4fd8', ls: 6, op: sm(1.0, 1.6, lt) })}`;
    return { svg, cam: { z: 1 + lt * 0.015 } };
  };

  // ---------------------------------------------------------------- BEDROOM: the morning it began
  S.bedroom = c => {
    const a = c.b.a, lt = c.lt;
    const tUp = since(c, 'alarm'), tWin = since(c, 'window'), tMom = since(c, 'momDoor');
    const lying = tUp < 0 ? 1 : 1 - easeOut(tUp / 0.6);
    const P = { kip: { x: 900, s: 1.05 } };
    if (tWin >= 0) P.max = { x: 1460, s: 0.9 };
    let kipG;
    if (lying > 0.02) {
      kipG = `<g transform="translate(${f(lerp(900, 360, lying))} ${f(lerp(905, 760, lying))}) rotate(${f(-90 * lying)})">${K.renderKip({ id: 'bk', x: 0, y: 0, scale: 0.9,
        expression: lying > 0.9 ? { ...K.EXPRESSIONS.happy, lidUp: 1, lidLo: 0, smile: 0.4, open: 0 } : 'surprise', pose: 'idle', t: c.t, blink: lying > 0.9 ? 1 : 0, shadow: false })}</g>
        ${lying > 0.9 ? [0, 1, 2].map(i => { const p = (c.t * 0.4 + i / 3) % 1; return txt(420 + p * 160, 520 - p * 220, 'Z', 40 + p * 50, { fill: '#5a6fb0', op: 1 - p }); }).join('') : ''}`;
    } else {
      kipG = kip(c, { x: 900, lookX: tMom >= 0 ? -0.8 : lookFrom(c, 'kip', P), lookY: a === 'noSign' ? -0.8 : 0 });
    }
    const maxG = tWin >= 0 ? `<clipPath id="mwin"><rect x="1209" y="169" width="502" height="422"/></clipPath><g clip-path="url(#mwin)">${person('max', c, { x: 1460, y: 1060, scale: 0.9, lookX: lookFrom(c, 'max', P) })}
      ${sign(c, 1460, 1060 - 640 * 0.9 * 1.06, 'max', { op: shown(c, 'window', 0.6), s: 0.7, n: 18 })}</g>` : '';
    const momG = tMom >= 0 ? person('mom', c, { x: lerp(60, 200, easeOut(tMom / 0.6)), flip: false, lookX: 0.7 }) + sign(c, 200, signY({ s: 1, h: 1.1 }), 'mom', { loading: true, pct: 0.12 + 0.02 * Math.sin(c.t), s: 0.8 }) : '';
    const alarm = tUp >= 0 && tUp < 1.6 ? txt(700, 420, 'RIIING!', 70, { fill: '#ff5470', stroke: '#fff', sw: 8, tr: `rotate(${f(Math.sin(c.t * 60) * 6)} 700 420)` }) : '';
    const svg = `${bedroomBG(c)}${maxG}${momG}${kipG}${alarm}`;
    let cam = dcam(c, P);
    if (a === 'sleep') cam = { z: lerp(1.0, 1.15, lt / 4), x: 600, y: 600 };
    if (a === 'alarm') cam = { z: 1.15, x: 700, y: 560 };
    if (a === 'up') cam = { z: 1.3, x: 900, y: 480 };
    if (a === 'read' && c.b.v === 'KIP') cam = { z: 1.6, x: 1400, y: 360 };
    if (a === 'laughFit') cam = { z: 1.2, x: 1100, y: 520 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- STREET: everyone's secrets
  S.street = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 620, s: 1.05 }, max: { x: 860, s: 1.0 }, baker: { x: 1250, s: 1.0 }, cop: { x: 1600, s: 1.0 } };
    const tp = since(c, 'pigeon'), ts = since(c, 'snap');
    let bird = '';
    if (tp >= 0) {
      const q = clamp(tp / 1.6), hx = 1600, hy = 905 - 600 * 1.16;
      bird = pigeon(lerp(2050, hx + 20, easeOut(q)), lerp(120, hy - 30, easeIO(q)) + (q < 1 ? Math.sin(c.t * 9) * 10 : 0), 1.0, q < 1 ? c.t : 0, true);
    }
    const copPose = tp >= 1.2 ? { armL: { sh: 150, el: 40 }, armR: { sh: 150, el: 40 }, lean: -6, bob: Math.sin(c.t * 30) * 4 } : undefined;
    const stand = `<g transform="translate(1250 900)"><rect x="-200" y="-260" width="400" height="260" fill="#f3d9b0"/><rect x="-220" y="-290" width="440" height="40" rx="10" fill="#e05a2b"/>
      ${[0, 1, 2, 3, 4].map(i => `<circle cx="${-150 + i * 75}" cy="-275" r="16" fill="#c8843a"/><circle cx="${-150 + i * 75}" cy="-275" r="4" fill="#4a2a10"/>`).join('')}${txt(0, -140, 'HOMEMADE!', 40, { fill: '#e05a2b' })}</g>`;
    const svg = `${sky('st', '#6aa8e8', '#d7ebff')}${clouds(c.t, 0.7)}${streetBG(c, false)}
      ${person('cop', c, { x: 1600, pose: copPose, lookX: lookFrom(c, 'cop', P) })}
      ${person('baker', c, { x: 1250, lookX: lookFrom(c, 'baker', P), y: 905 })}${stand}
      ${person('max', c, { x: 860, flip: false, lookX: lookFrom(c, 'max', P) })}
      ${kip(c, { x: 620, lookX: lookFrom(c, 'kip', P), pose: ts >= 0 && a !== 'posted' ? { armR: { sh: 100, el: -40 } } : undefined })}
      ${ts >= 0 && a === 'snap' ? `<rect x="${f(620 + 70)}" y="${f(905 - 420)}" width="60" height="100" rx="10" fill="#111"/>` : ''}
      ${sign(c, 860, signY({ s: 1, h: 1.06 }), 'max', { s: 0.62, n: 18 })}${sign(c, 1250, signY({ s: 1, h: 1.04 }), 'baker', { s: 0.62, n: 18 })}${sign(c, 1600, signY({ s: 1, h: 1.16 }), 'cop', { s: 0.62, n: 18 })}
      ${bird}`;
    let cam = dcam(c, P);
    if (a === 'pigeon') cam = { z: 1.2, x: 1550, y: 480 };
    if (a === 'readBaker' && c.b.v === 'KIP') cam = { z: 1.45, x: 1250, y: 380 };
    if (a === 'cop' && c.b.v === 'MAX') cam = { z: 1.45, x: 1600, y: 360 };
    const overlay = phoneFlash(ts >= 0 && ts < 1.8 ? Math.max(0, 1 - ((ts * 3) % 1) * 4) * (ts < 1.5 ? 1 : 0) : 0);
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- CLASSROOM
  function classScene(c, part2) {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 760, s: 1.05 }, max: { x: 420, s: 1.0 }, lily: { x: 1180, s: 1.0 }, teach: { x: 1640, s: 1.0 } };
    const tMax = since(c, 'maxLeaves');
    const maxX = tMax < 0 ? 420 : lerp(420, -300, easeIO(tMax / 1.8));
    const lilyOn = part2 ? 1 : shown(c, 'lilySign', 0.8);
    const tf = since(c, 'flicker'), tr = since(c, 'kipReveal');
    const pct = tf < 0 ? 0 : clamp(tf / 10);
    let kipSign = '';
    if (part2) {
      if (tr < 0) kipSign = sign(c, 760, signY(P.kip), 'kip', { loading: true, pct: tr < 0 ? Math.min(0.97, pct) : 1, glitch: true });
      else kipSign = sign(c, 760, signY(P.kip), 'kip', { op: easeOut((tr - 1.2) / 0.5), glitch: tr < 1.6, s: 0.85 });
    }
    const hiding = a === 'hide';
    const opera = since(c, 'opera');
    const notes = opera >= 0 && opera < 3 ? [0, 1, 2, 3].map(i => { const p = (opera * 0.8 + i / 4) % 1; return txt(1700 + p * 120, 380 - p * 200, '♪', 50, { fill: '#d6334a', op: 1 - p }); }).join('') : '';
    const svg = `${classroomBG(c)}${desk(420)}${desk(1180)}
      ${person('teach', c, { x: 1640, lookX: lookFrom(c, 'teach', P), pose: opera >= 0 && opera < 2.4 ? 'cheer' : undefined })}
      ${person('lily', c, { x: 1180, lookX: lookFrom(c, 'lily', P) })}
      ${tMax < 2.2 ? person('max', c, { x: maxX, flip: tMax >= 0 ? true : false, pose: tMax >= 0 ? walkPose(c.t, 1) : undefined, lookX: lookFrom(c, 'max', P) }) + sign(c, maxX, signY({ s: 1, h: 1.06 }), 'max', { s: 0.6, n: 18 }) : ''}
      ${kip(c, { x: 760, lookX: lookFrom(c, 'kip', P), lookY: (a === 'loading' || tf >= 0 && tf < 2) ? -0.8 : 0,
        pose: hiding ? { armL: { sh: 165, el: 20 }, armR: { sh: 165, el: 20 } } : undefined })}
      ${hiding ? `<g transform="translate(760 ${f(905 - 690 * 1.05)})"><rect x="-90" y="-30" width="180" height="40" rx="8" fill="#d6334a"/><rect x="-70" y="-70" width="140" height="40" rx="8" fill="#3d6fe0"/></g>` : ''}
      ${kipSign}${sign(c, 1180, signY({ s: 1, h: 0.98 }), 'lily', { op: lilyOn, s: 0.66, n: 18 })}${sign(c, 1640, signY({ s: 1, h: 1.14 }), 'teach', { s: 0.6, n: 18 })}${notes}`;
    let cam = dcam(c, P);
    if (a === 'opera') cam = { z: 1.45, x: 1600, y: 420 };
    if (a === 'lilySign') cam = { z: lerp(1.3, 1.6, easeIO(lt / 1.6)), x: 1180, y: 360 };
    if (a === 'flicker') cam = { z: lerp(1.2, 1.6, easeIO(lt / 2)), x: 760, y: 360 };
    if (a === 'kipReveal') cam = { z: lerp(1.9, 1.5, easeIO(lt / 2.6)), x: 760, y: 300 + Math.sin(c.t * 40) * 3 * (lt < 1.2 ? 1 : 0) };
    if (a === 'kipSecret' && c.b.v === 'MAX' && c.bi === beatOf(c, 'kipSecret').i) cam = { z: 1.5, x: 760, y: 320 };
    if (a === 'maxLeaves') cam = { z: 1.0, x: 800, y: 540 };
    return { svg, cam };
  }
  S.class = c => classScene(c, false);
  S.class2 = c => classScene(c, true);

  // ---------------------------------------------------------------- HOME: Mom's sign
  S.home = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 780, s: 1.05 }, mom: { x: 1250, s: 1.0 } };
    const tm = since(c, 'momSign');
    const conf = since(c, 'momRead');
    const kipCheer = c.b.k === 'excited' && c.b.a === 'momRead' && c.b.v === 'KIP' && c.b.t.includes('STAYING');
    const svg = `<rect width="1920" height="1080" fill="#f6e6c8"/>
      ${[...Array(30)].map((_, i) => `<path d="M${i * 66} 0 V900" stroke="#ead2a8" stroke-width="18"/>`).join('')}
      <rect x="1500" y="250" width="320" height="650" rx="12" fill="#8a5a35"/><rect x="1525" y="280" width="270" height="600" rx="8" fill="#ffe9c0"/>
      <rect x="120" y="300" width="300" height="220" rx="10" fill="#fff" stroke="#c9a46a" stroke-width="12"/>${txt(270, 425, 'FAMILY', 26, { fill: '#a0623a' })}
      <g transform="translate(560 250)"><rect width="260" height="180" rx="8" fill="#fff" stroke="#c9a46a" stroke-width="10"/>${txt(130, 80, 'MOVING', 30, { fill: '#999' })}${txt(130, 125, 'BOXES', 30, { fill: '#999' })}</g>
      <g transform="translate(300 900)">${[0, 1, 2].map(i => `<rect x="${i * 120 - 60}" y="${-110 - (i === 1 ? 100 : 0)}" width="110" height="100" fill="#c98b52" stroke="#8a5a35" stroke-width="4"/>${txt(i * 120 - 5, -50 - (i === 1 ? 100 : 0), 'BOX', 22, { fill: '#6b4630' })}`).join('')}</g>
      <rect y="900" width="1920" height="180" fill="#b07a4e"/>
      ${person('mom', c, { x: 1250, lookX: lookFrom(c, 'mom', P), pose: kipCheer ? 'cheer' : undefined })}
      ${kip(c, { x: 780, lookX: lookFrom(c, 'kip', P), lookY: a === 'momLoad' ? -0.5 : 0 })}
      ${sign(c, 780, signY(P.kip), 'kip', { s: 0.62, n: 18 })}
      ${sign(c, 1250, signY({ s: 1, h: 1.1 }), 'mom', { loading: tm < 0, pct: since(c, 'momLoad') < 0 ? 0.12 : 0.12 + 0.85 * clamp(since(c, 'momLoad') / 6), glitch: tm >= 0 && tm < 0.4, s: 0.72, n: 18, col: '#ffd34d', op: since(c, 'momLoad') < 0 ? 0 : 1 })}
      ${kipCheer ? confetti(c.b.start, c.t, 70, 6) : ''}`;
    let cam = dcam(c, P);
    if (a === 'momSign') cam = { z: lerp(1.3, 1.6, easeIO(lt / 2)), x: 1250, y: 330 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- MAX'S HOUSE: the new secret
  S.maxhouse = c => {
    const a = c.b.a, lt = c.lt;
    const tl = since(c, 'lilyRun');
    const lx = tl < 0 ? 1500 : lerp(2100, 1250, easeOut(tl / 1.0));
    const P = { kip: { x: 760, s: 1.05 }, lily: { x: 1250, s: 1.0 } };
    const tph = since(c, 'phone');
    const phone = tph >= 0 && a === 'phone' ? `<g transform="translate(960 470) scale(${f(easeOut(tph / 0.4))})"><rect x="-260" y="-360" width="520" height="720" rx="50" fill="#111"/><rect x="-235" y="-320" width="470" height="640" rx="24" fill="#1d2440"/>
      ${txt(0, -270, 'ROSA: look at Max!!', 26, { fill: '#9fb3c8', w: 700 })}<g transform="translate(0 260)">${X.renderPerson('max', { id: 'phm', x: 0, y: 0, scale: 0.45, expression: 'sad', t: c.t })}</g>
      ${sign(c, 0, -20, 'max2', { s: 0.72, n: 18, col: '#ffd34d' })}</g>` : '';
    const svg = `${sky('mh', '#f3a361', '#ffe2b0')}${clouds(c.t, 0.6, '#ffe8d0')}
      <rect x="1000" y="220" width="820" height="680" fill="#cfe3f0"/><path d="M960 240 L1410 40 L1860 240Z" fill="#3d6fe0"/>
      <rect x="1360" y="560" width="160" height="340" rx="8" fill="#2bc4b3"/>${txt(1440, 520, 'MAX', 40, { fill: '#2bc4b3' })}
      <rect x="1100" y="320" width="200" height="170" rx="8" fill="#ffe3a8" stroke="#fff" stroke-width="12"/><rect x="1580" y="320" width="200" height="170" rx="8" fill="#ffe3a8" stroke="#fff" stroke-width="12"/>
      ${fence(880, '#ffffff', '#c9ced8')}${grass(900, '#7fa94a', '#5e8a35', 9)}
      ${person('lily', c, { x: lx, pose: tl >= 0 && tl < 1.0 ? walkPose(c.t, 1, true) : undefined, lookX: -0.6 })}${sign(c, lx, signY({ s: 1, h: 0.98 }), 'lily', { s: 0.6, n: 18 })}
      ${kip(c, { x: 760, lookX: 0.6 })}${sign(c, 760, signY(P.kip), 'kip', { s: 0.6, n: 18 })}
      ${phone ? `<rect width="1920" height="1080" fill="#000" opacity="0.45"/>${phone}` : ''}`;
    let cam = dcam(c, P);
    if (a === 'phone') cam = { z: 1.0, x: 960, y: 540 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- RACE across town (climax montage)
  S.race = c => {
    const a = c.b.a, lt = c.lt;
    const scroll = c.rt * (a === 'ride' ? 900 : 520);
    const shops = ['BAKERY', 'BOOKS', 'CAFE', 'TOYS', 'PARK', 'BANK'];
    let bg = `${sky('rc', '#f09a5a', '#ffd9a0')}`;
    for (let i = -1; i < 6; i++) {
      const x = ((i * 420 - scroll * 0.6) % 2520 + 2520) % 2520 - 420;
      bg += `<rect x="${f(x)}" y="260" width="400" height="640" fill="${i % 2 ? '#e9dcc9' : '#f3e7d6'}"/><rect x="${f(x + 40)}" y="300" width="320" height="80" rx="12" fill="#6b5a4a"/>${txt(x + 200, 355, shops[(i + 6) % 6], 40, { fill: '#fff' })}
        <rect x="${f(x + 50)}" y="480" width="300" height="240" fill="#ffd27a" opacity="0.6" stroke="#6b5a4a" stroke-width="8"/>`;
    }
    bg += `<rect y="880" width="1920" height="200" fill="#8a91a3"/>${[...Array(8)].map((_, i) => { const x = ((i * 300 - scroll) % 2400 + 2400) % 2400 - 200; return `<rect x="${f(x)}" y="975" width="140" height="14" fill="#fff" opacity="0.8"/>`; }).join('')}`;
    const riding = a === 'ride' || a === 'bike' && lt > 3;
    const run = walkPose(c.t, 1, true);
    const P = { kip: { x: 820, s: 1.05 } };
    let extra = '';
    if (a === 'bike' || a === 'ride') {
      const bx = a === 'bike' ? lerp(-300, 1100, easeOut(lt / 1.2)) : 1100;
      extra += `<g transform="translate(${f(bx)} 905)"><circle cx="-110" cy="-55" r="55" fill="none" stroke="#222" stroke-width="10"/><circle cx="110" cy="-55" r="55" fill="none" stroke="#222" stroke-width="10"/>
        <path d="M-110 -55 L-20 -150 L80 -150 L110 -55 M-20 -150 L10 -55 L-110 -55" stroke="#e05a2b" stroke-width="12" fill="none"/><rect x="40" y="-230" width="140" height="80" fill="#f3d9b0" stroke="#c8843a" stroke-width="5"/>${txt(110, -180, 'ROSA', 26, { fill: '#e05a2b' })}</g>`;
      extra += person('baker', c, { x: bx - 20, y: 905 - 110, scale: 0.9, flip: false, pose: { legL: { hip: 60, knee: -70 }, legR: { hip: 40, knee: -60 } }, lookX: 0.4 }) + sign(c, bx - 20, 905 - 110 - 640 * 0.9 * 1.04, 'baker', { s: 0.5, n: 18 });
      P.baker = { x: bx, s: 0.9 };
    }
    if (a === 'block' || a === 'pigeons') {
      extra += person('cop', c, { x: 1350, lookX: -0.5, pose: a === 'pigeons' ? { armL: { sh: 100, el: 0 }, armR: { sh: 100, el: 0 } } : { armR: { sh: 95, el: 0 } } }) + sign(c, 1350, signY({ s: 1, h: 1.16 }), 'cop', { s: 0.6, n: 18 });
      const tpg = since(c, 'pigeons');
      for (let i = 0; i < 9; i++) {
        const px = 1500 + (i % 3) * 120 + (tpg > 0 ? tpg * (300 + i * 60) : 0), py = 860 - Math.floor(i / 3) * 40 - (tpg > 0 ? tpg * tpg * (120 + i * 30) : 0);
        extra += pigeon(px, py, 0.7, tpg > 0 ? c.t + i : 0, true);
      }
      P.cop = { x: 1350, s: 1.0 };
    }
    if (a === 'teachCheer' || a === 'opera2') {
      extra += person('teach', c, { x: 1400, lookX: -0.5, pose: 'cheer' }) + sign(c, 1400, signY({ s: 1, h: 1.14 }), 'teach', { s: 0.55, n: 18 });
      if (a === 'opera2') extra += [0, 1, 2, 3].map(i => { const p = (lt * 0.8 + i / 4) % 1; return txt(1460 + p * 140, 380 - p * 200, '♪', 54, { fill: '#d6334a', op: 1 - p }); }).join('');
      P.teach = { x: 1400, s: 1.0 };
    }
    const lilyX = a === 'clock' ? 560 : -400;
    if (a === 'clock') { extra += person('lily', c, { x: 560, flip: false, pose: walkPose(c.t + 0.3, 1, true), lookX: 0.5 }) + sign(c, 560, signY({ s: 1, h: 0.98 }), 'lily', { s: 0.55, n: 18 }); P.lily = { x: 560, s: 1.0 }; }
    const kipG = riding ? '' : kip(c, { x: 820, pose: (a === 'block' || a === 'teachCheer') ? undefined : run, lookX: 0.6 }) + sign(c, 820, signY(P.kip), 'kip', { s: 0.55, n: 18 });
    const kipBike = riding ? K.renderKip({ id: 'kr', x: 1180, y: 905 - 240, scale: 0.8, expression: 'excited', pose: 'cheer', t: c.t, blink: K.blinkAt(c.t), talk: c.talk('KIP'), lookX: 0.5, shadow: false }) : '';
    const clk = a === 'clock' ? `<g transform="translate(1500 300)"><circle r="150" fill="#fff" stroke="#333" stroke-width="14"/><path d="M0 0 L0 -100" stroke="#333" stroke-width="10" transform="rotate(${f(354 + lt * 2)})"/><path d="M0 0 L0 -70" stroke="#333" stroke-width="14" transform="rotate(178)"/>${txt(0, 210, '5:59', 70, { fill: '#ff5470', stroke: '#000', sw: 8 })}</g>` : '';
    const svg = `${bg}${extra}${kipG}${kipBike}${clk}`;
    let cam = dcam(c, P);
    if (a === 'run1') cam = { z: 1.2, x: 820, y: 500 + Math.sin(c.t * 14) * 6 };
    if (a === 'ride') cam = { z: 1.15, x: 1100, y: 520 + Math.sin(c.t * 18) * 5 };
    if (a === 'pigeons' || a === 'opera2') cam = { z: 1.05, x: 1150, y: 520 };
    if (a === 'clock') cam = { z: 1.1, x: 1000, y: 520 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- BUS STATION at sunset
  S.station = c => {
    const a = c.b.a, lt = c.lt;
    const ta = since(c, 'kipArrive'), tn = since(c, 'kipNew'), th = since(c, 'hug'), tln = since(c, 'lilyNew');
    const kx = ta < 0 ? -300 : lerp(-300, 760, easeOut(ta / 0.9));
    const lilyIn = since(c, 'hug2') >= 0 || th >= 0;
    const P = { kip: { x: 760, s: 1.05 }, max: { x: 1120, s: 1.0 }, driver: { x: 1650, s: 1.0 } };
    if (lilyIn) P.lily = { x: 470, s: 1.0 };
    const hug = th >= 0;
    const kipSignKey = tn >= 0 ? 'kip2' : 'kip';
    const svg = `${sky('bs', '#5a3a8a', '#ff9a5a')}<circle cx="1500" cy="640" r="140" fill="#ffd27a" opacity="0.9"/>
      ${[...Array(14)].map((_, i) => `<rect x="${i * 140}" y="${640 - (i * 53) % 180}" width="100" height="${300 + (i * 53) % 180}" fill="#4a2f5e" opacity="0.7"/>`).join('')}
      <rect x="100" y="380" width="900" height="30" fill="#3a3a4a"/><rect x="140" y="410" width="20" height="490" fill="#3a3a4a"/><rect x="940" y="410" width="20" height="490" fill="#3a3a4a"/>
      <rect x="380" y="430" width="340" height="80" rx="10" fill="#1d2440"/>${txt(550, 485, 'DEPARTURES 6:00', 34, { fill: '#ffd34d', font: "'Courier New', monospace", w: 700 })}
      <g transform="translate(1520 900)"><rect x="-420" y="-460" width="840" height="400" rx="40" fill="#ffc83d"/><rect x="-400" y="-420" width="780" height="140" rx="16" fill="#9fd7ff"/>
        <rect x="-430" y="-110" width="860" height="40" rx="16" fill="#e0a82a"/><circle cx="-260" cy="-60" r="60" fill="#222"/><circle cx="260" cy="-60" r="60" fill="#222"/><circle cx="-260" cy="-60" r="24" fill="#888"/><circle cx="260" cy="-60" r="24" fill="#888"/>
        ${txt(0, -230, 'SUMMER EXPRESS', 50, { fill: '#7a4a10' })}</g>
      <rect y="900" width="1920" height="180" fill="#6b6f7f"/>
      ${person('driver', c, { x: 1650, lookX: lookFrom(c, 'driver', P) })}${sign(c, 1650, signY({ s: 1, h: 1.05 }), 'driver', { s: 0.55, n: 18 })}
      ${lilyIn ? person('lily', c, { x: 470, flip: false, lookX: 0.6, pose: hug ? 'cheer' : undefined }) + sign(c, 470, signY({ s: 1, h: 0.98 }), tln >= 0 ? 'lily2' : 'lily', { s: 0.6, n: 18, col: tln >= 0 ? '#ffd34d' : undefined, glitch: tln >= 0 && tln < 0.5 }) : ''}
      ${person('max', c, { x: hug ? 960 : 1120, lookX: lookFrom(c, 'max', P), pose: hug ? { armL: { sh: 70, el: -60 }, armR: { sh: 70, el: -60 } } : undefined })}${sign(c, hug ? 960 : 1120, signY({ s: 1, h: 1.06 }), 'max2', { s: 0.58, n: 18, op: since(c, 'kip2') >= 0 ? 1 - sm(0, 1, since(c, 'kip2') - 3) : 1 })}
      ${kip(c, { x: hug ? 820 : kx, pose: ta >= 0 && ta < 0.9 ? walkPose(c.t, 1, true) : (hug ? { armL: { sh: 70, el: -60 }, armR: { sh: 70, el: -60 } } : undefined), lookX: lookFrom(c, 'kip', P) })}
      ${sign(c, hug ? 820 : kx, signY(P.kip), kipSignKey, { s: tn >= 0 ? 0.8 : 0.58, n: 18, col: tn >= 0 ? '#ffd34d' : undefined, glitch: tn >= 0 && tn < 0.8 })}`;
    let cam = dcam(c, P);
    if (a === 'bus') cam = { z: 1.0, x: 1200, y: 540 };
    if (a === 'kipArrive') cam = { z: 1.05, x: 900, y: 540 };
    if (a === 'kipNew') cam = { z: lerp(1.3, 1.65, easeIO(lt / 2.4)), x: 760, y: 320 };
    if (a === 'hug' || a === 'hug2') cam = { z: 1.15, x: 860, y: 520 };
    if (a === 'lilyNew') cam = { z: 1.5, x: 470, y: 330 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- ENDING: next morning
  S.ending = c => {
    const a = c.b.a, lt = c.lt;
    const tt = since(c, 'teddy'), ts = since(c, 'teddySign'), tw = since(c, 'wink');
    const P = { kip: { x: 760, s: 1.05 } };
    if (tt >= 0) P.max = { x: 1180, s: 1.0 };
    const wink = tw >= 0 && tw > 0.5 && tw < 1.0 ? 1 : 0;
    const svg = `${bedroomBG(c)}
      ${tt >= 0 ? person('max', c, { x: 1180, lookX: lookFrom(c, 'max', P), pose: { armL: { sh: 60, el: -80 }, armR: { sh: 60, el: -80 } } }) : ''}
      ${tt >= 0 ? teddy(1180, 905 - 280, 0.75, wink) : ''}
      ${ts >= 0 ? sign(c, 1480, 905 - 330, 'teddy', { loading: ts < 1.2, pct: clamp(ts / 1.2), glitch: ts < 1.4, s: 0.85 }) : ''}
      ${kip(c, { x: 760, lookX: a === 'camera' ? 0 : lookFrom(c, 'kip', P), pose: a === 'teddyRead' && c.b.t.includes('Nope') ? walkPose(c.t, 1, true) : undefined })}`;
    let cam = dcam(c, P);
    if (a === 'mirror') cam = { z: 1.3, x: 760, y: 470 };
    if (a === 'teddySign') cam = { z: lerp(1.2, 1.6, easeIO(lt / 2.4)), x: 1180, y: 420 };
    if (a === 'wink') cam = { z: 2.4, x: 1180, y: 480 };
    if (a === 'camera') cam = { z: lerp(1.6, 1.85, easeIO(lt / 4)), x: 760, y: 430 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- OUTRO
  S.outro = c => {
    const lt = c.lt;
    const click = lt > 4.5 && lt < 5.2, subbed = lt > 5;
    const cx = lerp(1700, 1150, easeOut((lt - 3) / 1.2)), cy = lerp(1000, 760, easeOut((lt - 3) / 1.2));
    const svg = `<linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a0f3a"/><stop offset="1" stop-color="#0a1830"/></linearGradient><rect width="1920" height="1080" fill="url(#og)"/>
      ${confetti(c.b.start + 5, c.t, 50, 8)}
      ${kip(c, { x: 450, y: 960, scale: 1.1, pose: 'wave', expression: 'happy', lookX: 0.5 })}
      <g transform="translate(1030 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d0f1c" stroke="#3b4a6b" stroke-width="5"/>${txt(0, 20, 'EP 2', 80, { fill: '#2c3550' })}${txt(0, 165, 'WATCH EP 2', 28, { fill: '#9fb3c8' })}</g>
      <g transform="translate(1500 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d0f1c" stroke="#ff4fd8" stroke-width="5"/>${txt(0, 20, '?', 110, { fill: '#2c3550' })}${txt(0, 165, 'NEXT: A DAY AS YOUR BEST FRIEND', 22, { fill: '#ff4fd8' })}</g>
      <g transform="translate(1150 700) scale(${f(click ? 0.94 : 1)})"><rect x="-230" y="-55" width="460" height="110" rx="55" fill="${subbed ? '#3b4a6b' : '#e62e3d'}"/>${txt(0, 18, subbed ? 'SUBSCRIBED ✓' : 'SUBSCRIBE', 48, { fill: '#fff' })}</g>
      <path transform="translate(${f(cx)} ${f(cy)})" d="M0 0 L0 60 L16 46 L28 72 L40 66 L28 40 L48 40 Z" fill="#fff" stroke="#000" stroke-width="4"/>
      <g transform="translate(1260 900)" opacity="${f(sm(1.5, 2.5, lt))}"><rect x="-430" y="-50" width="860" height="100" rx="24" fill="#fff"/>${txt(0, 15, 'What would YOUR secret sign say?', 40, { fill: '#223' })}</g>`;
    return { svg, cam: { z: 1 } };
  };

  root.SCENES = S;
})(typeof window !== 'undefined' ? window : globalThis);
