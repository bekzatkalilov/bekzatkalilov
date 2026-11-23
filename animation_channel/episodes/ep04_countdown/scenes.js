/* Scene library for EP04 "What If Everyone Had a Countdown Above Their Head?" (browser).
 * Kip is drawn ONLY through Kip.renderKip() (locked v1.0.0). Max comes from character/extras.js.
 * Lily, Mom, Mr. Grumbold and Rosa use the same specs as EP03. Countdowns float above heads as separate
 * props, so no character design is altered. */
(function (root) {
  'use strict';
  const { clamp, lerp, sm, easeOut, easeIO, f, rng, txt } = root.Engine.H;
  const K = root.Kip, X = root.Extras;
  const S = {};
  const TL = () => root.Engine.tl();

  // ---------------------------------------------------------------- cast (same specs as EP03 + the news anchor)
  const CAST = {
    mom:   { name: 'Mom', skin: '#f2d3b3', skinLo: '#cfae8c', ink: '#2b1e14', eyeLine: true, hat: 'bun', hatColor: '#5a3522',
             top: 'sweater', topColor: '#d9487a', topDark: '#a8335c', pants: '#3b4f7a', shoe: '#f0f0f0', height: 1.1 },
    lily:  { name: 'Lily', skin: '#f6d8c0', skinLo: '#d8b49a', ink: '#24180f', eyeLine: true, hat: 'side', hatColor: '#1e1410', glasses: true,
             top: 'sweater', topColor: '#2f4fa3', topDark: '#22397a', pants: '#3a3d4a', shoe: '#c92a4a', height: 0.98 },
    teach: { name: 'Mr. Grumbold', skin: '#e9c4a2', skinLo: '#c49c78', ink: '#2b2018', eyeLine: true, hat: 'bald', hatColor: '#8a8a92', glasses: true,
             top: 'shirt', topColor: '#8a6a4a', topDark: '#6a4f36', pants: '#3a3530', shoe: '#2a2018', height: 1.14 },
    baker: { name: 'Rosa', skin: '#d9a07a', skinLo: '#b07c58', ink: '#24160e', eyeLine: true, hat: 'bun', hatColor: '#f4f4f4',
             top: 'coat', topColor: '#ffffff', topDark: '#d9dde4', shirt: '#e0485a', pants: '#3a3d4a', shoe: '#333', height: 1.04 },
    news:  { name: 'News Anchor', skin: '#b9825e', skinLo: '#8f6040', ink: '#1e1410', eyeLine: true, hat: 'side', hatColor: '#2a1a12',
             top: 'coat', topColor: '#3b4a8a', topDark: '#2a3566', shirt: '#f2f2f2', pants: '#2a2f3a', shoe: '#222', height: 1.0 }
  };
  const VOICE = { kip: 'KIP', max: 'MAX', mom: 'MOM', lily: 'LILY', teach: 'TEACH', baker: 'BAKER', news: 'NEWS' };
  const WHO = { KIP: 'kip', MAX: 'max', MOM: 'mom', LILY: 'lily', TEACH: 'teach', BAKER: 'baker', NEWS: 'news' };
  const HGT = { kip: 1.0, max: 1.06, mom: 1.1, lily: 0.98, teach: 1.14, baker: 1.04, news: 1.0 };

  // ---------------------------------------------------------------- timeline helpers
  function since(c, a) {
    const B = TL().beats;
    for (const i of c.run.beats) if (B[i].a === a && c.t >= B[i].start) return c.t - B[i].start;
    return -1;
  }
  function beatOf(c, a, v) { const B = TL().beats; for (const i of c.run.beats) if (B[i].a === a && (!v || B[i].v === v)) return B[i]; return null; }
  /* in-story time of day (seconds after midnight) */
  const clock = c => (TL().clocks[c.b.s] || 0) + c.rt;
  const toZero = c => TL().zero - clock(c);
  /* countdown that hits 0 at the start of action zeroA; anchored so it reads `val` at anchor time (real seconds before) */
  function cdAnchor(c, zeroA, anchorT, val) {
    const z = beatOf(c, zeroA); if (!z) return 99;
    if (c.t < anchorT) return val + (anchorT - c.t);
    return val * (z.start - c.t) / Math.max(0.1, z.start - anchorT);
  }
  /* hook + climax: Lily's "Three... two... one..." line reads 3 at its start */
  function cdLily(c) { const b = beatOf(c, 'count', 'LILY'); return b ? cdAnchor(c, 'zero', b.start + 0.1, 3) : 99; }

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
  function lookFrom(c, me, P) {
    let tgt = WHO[c.b.v];
    if (!tgt || tgt === me || !P[tgt]) tgt = me === 'kip' ? (Object.keys(P).find(k => k !== 'kip') || null) : 'kip';
    if (!tgt || !P[tgt]) return 0.0;
    return clamp((P[tgt].x - P[me].x) / 260, -0.75, 0.75);
  }
  const headY = p => (p.y || 905) - 470 * (p.s || 1.0) * (p.h || 1);
  const topY = (who, x, s = 1, y = 905) => y - 640 * s * (HGT[who] || 1);

  // ---------------------------------------------------------------- the countdown prop
  const pad2 = n => String(n).padStart(2, '0');
  function fmt(secs) {
    if (typeof secs === 'string') return secs;
    const v = Math.max(0, Math.ceil(secs - 1e-6));
    return `${pad2(Math.floor(v / 3600))}:${pad2(Math.floor(v % 3600 / 60))}:${pad2(v % 60)}`;
  }
  /* timer(c, x, bottomY, o)  o: {secs | text, s, op, glitch, done, label} */
  function timer(c, x, y, o = {}) {
    const s = o.s || 1, op = o.op === undefined ? 1 : o.op;
    if (op <= 0.01) return '';
    const isNum = typeof o.secs === 'number';
    const v = isNum ? o.secs : 1e9;
    const zero = isNum && v <= 0.001;
    let col = o.col || (o.done || zero ? '#ffd34d' : v < 60 ? '#ff3b4a' : v < 86400 ? '#ffb020' : '#5ff0ff');
    if (o.done) col = '#3dff8a';
    const pulse = isNum && v < 60 && !zero ? 0.5 + 0.5 * Math.cos((v % 1) * Math.PI * 2) : 0;
    let text = o.text || fmt(o.secs);
    if (o.glitch) { const r = rng(Math.floor(c.t * 20) + 7); text = text.replace(/[0-9]/g, () => String(Math.floor(r() * 10))); }
    const fs = o.text ? 54 : 62, w = Math.max(330, text.length * fs * 0.64 + 70), h = 122;
    const gl = o.glitch ? (rng(Math.floor(c.t * 30))() - 0.5) * 22 : 0;
    const bob = Math.sin(c.t * 2 + x * 0.01) * 6;
    const label = o.label || (o.done ? 'LIFE CHANGED ✓' : zero ? 'ZERO!' : 'LIFE CHANGES IN');
    const burst = zero && o.zt !== undefined && o.zt >= 0 && o.zt < 1.2 ? [...Array(12)].map((_, i) => {
      const a = i / 12 * Math.PI * 2, d = 120 + o.zt * 260;
      return `<path d="M${f(Math.cos(a) * (d - 60))} ${f(-h / 2 + Math.sin(a) * (d - 60))} L${f(Math.cos(a) * d)} ${f(-h / 2 + Math.sin(a) * d)}" stroke="#ffd34d" stroke-width="8" stroke-linecap="round" opacity="${f(1 - o.zt / 1.2)}"/>`; }).join('') : '';
    return `<g transform="translate(${f(x + gl)} ${f(y + bob)}) scale(${f(s * (0.85 + 0.15 * op) * (1 + pulse * 0.05))})" opacity="${f(op)}">
      ${burst}
      <rect x="${f(-w / 2 - 12)}" y="${f(-h - 12)}" width="${f(w + 24)}" height="${f(h + 24)}" rx="30" fill="${col}" opacity="${f(0.16 + pulse * 0.25)}"/>
      <rect x="${f(-w / 2)}" y="${f(-h)}" width="${f(w)}" height="${f(h)}" rx="22" fill="#08101c" fill-opacity="0.88" stroke="${col}" stroke-width="5"/>
      <path d="M-14 0 L0 18 L14 0Z" fill="${col}"/>
      ${txt(0, -h + 30, label, 19, { fill: col, ls: 4 })}
      <text x="0" y="${f(-h + 96)}" text-anchor="middle" font-family="'DejaVu Sans Mono', 'Courier New', monospace" font-weight="700" font-size="${fs}" fill="${col}" opacity="0.18" letter-spacing="2">${o.text ? '' : '88:88:88'}</text>
      <text x="0" y="${f(-h + 96)}" text-anchor="middle" font-family="'DejaVu Sans Mono', 'Courier New', monospace" font-weight="700" font-size="${fs}" fill="#fff" stroke="${col}" stroke-width="2" letter-spacing="2">${text}</text>
      ${[...Array(3)].map((_, i) => `<rect x="${f(-w / 2)}" y="${f(-h + ((c.t * 50 + i * 41) % h))}" width="${f(w)}" height="2" fill="#fff" opacity="0.06"/>`).join('')}</g>`;
  }
  function popOn(c, a, d = 0.5) { const t = since(c, a); return t < 0 ? 0 : easeOut(t / d); }

  // ---------------------------------------------------------------- props / FX
  function towel(x, y, s, h = 1.1) {  // pink towel turban over Mom's head (a prop; hides her countdown)
    const sc = s * h;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(sc)})">
      <path d="M-128 -500 Q-140 -640 0 -668 Q140 -640 128 -500 Q90 -548 0 -552 Q-90 -548 -128 -500Z" fill="#ff9ec4"/>
      <path d="M-120 -560 Q0 -610 120 -580 M-100 -610 Q10 -650 110 -615" stroke="#e0709c" stroke-width="8" fill="none"/>
      <path d="M40 -660 Q100 -720 70 -760 Q140 -720 110 -640Z" fill="#ff9ec4" stroke="#e0709c" stroke-width="5"/></g>`;
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
  function puppy(x, y, s, t, o = {}) {   // original puppy "Zero": cream coat, brown ear, red collar with a gold 0 tag
    const wag = Math.sin(t * 18) * 25, hop = o.hop ? -Math.abs(Math.sin(t * 9)) * 30 : 0, fl = o.flip ? -1 : 1, tongue = o.tongue !== false;
    return `<g transform="translate(${f(x)} ${f(y + hop)}) scale(${f(s * fl)} ${f(s)})">
      <ellipse cx="0" cy="4" rx="90" ry="14" fill="rgba(0,0,0,0.3)"/>
      <g transform="rotate(${f(-30 + wag)} -70 -80)"><path d="M-70 -80 Q-120 -120 -110 -160" stroke="#f3e2c4" stroke-width="18" fill="none" stroke-linecap="round"/></g>
      <ellipse cx="-10" cy="-70" rx="80" ry="50" fill="#f3e2c4"/><ellipse cx="0" cy="-55" rx="50" ry="30" fill="#fff6e6"/>
      ${[-55, -20, 25, 55].map((lx, i) => `<rect x="${lx - 11}" y="-50" width="22" height="${f(50 + (o.hop ? Math.sin(t * 9 + i) * 6 : 0))}" rx="10" fill="#f3e2c4"/>`).join('')}
      <circle cx="70" cy="-140" r="62" fill="#f3e2c4"/>
      <ellipse cx="22" cy="-150" rx="24" ry="44" fill="#a8743f" transform="rotate(25 22 -150)"/><ellipse cx="118" cy="-150" rx="22" ry="40" fill="#f0d6ae" transform="rotate(-25 118 -150)"/>
      <circle cx="52" cy="-150" r="20" fill="#a8743f" opacity="0.85"/>
      <circle cx="52" cy="-150" r="9" fill="#111"/><circle cx="92" cy="-150" r="9" fill="#111"/><circle cx="55" cy="-153" r="3" fill="#fff"/><circle cx="95" cy="-153" r="3" fill="#fff"/>
      <ellipse cx="74" cy="-122" rx="22" ry="16" fill="#fff6e6"/><ellipse cx="74" cy="-128" rx="10" ry="7" fill="#2a1a10"/>
      ${tongue ? `<path d="M68 -110 q6 20 12 0Z" fill="#ff7b9c"/>` : ''}
      <path d="M30 -92 Q70 -80 110 -95" stroke="#e0313f" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="72" cy="-80" r="12" fill="#ffd34d" stroke="#c99a1a" stroke-width="3"/>
      <text x="72" y="-75" text-anchor="middle" font-family="Arial Black" font-size="14" fill="#7a5a10">0</text></g>`;
  }
  function cat(x, y, s, t, o = {}) {   // Mr. Whiskers: grey tabby
    const col = o.col || '#8e8a9a', st = o.stripe || '#6a6676', tail = Math.sin(t * 3) * 15;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(o.flip ? -s : s)} ${f(s)})">
      <ellipse cx="0" cy="3" rx="70" ry="10" fill="rgba(0,0,0,0.25)"/>
      <path d="M-60 -50 Q-120 ${f(-90 + tail)} -100 ${f(-150 + tail)}" stroke="${col}" stroke-width="14" fill="none" stroke-linecap="round"/>
      <ellipse cx="-5" cy="-48" rx="62" ry="38" fill="${col}"/>${[-30, -5, 20].map(sx => `<path d="M${sx} -84 q6 18 0 34" stroke="${st}" stroke-width="7" fill="none"/>`).join('')}
      <rect x="-45" y="-30" width="16" height="30" rx="7" fill="${col}"/><rect x="25" y="-30" width="16" height="30" rx="7" fill="${col}"/>
      <circle cx="55" cy="-95" r="42" fill="${col}"/><path d="M22 -120 L28 -158 L50 -130Z M88 -120 L82 -158 L60 -130Z" fill="${col}"/>
      <path d="M30 -125 L32 -145 L44 -130Z M80 -125 L78 -145 L66 -130Z" fill="#ffb3c7"/>
      <ellipse cx="42" cy="-100" rx="7" ry="${o.happy ? 3 : 9}" fill="#1a1a1a"/><ellipse cx="68" cy="-100" rx="7" ry="${o.happy ? 3 : 9}" fill="#1a1a1a"/>
      <path d="M50 -84 L55 -80 L60 -84" stroke="#ff7b9c" stroke-width="4" fill="none"/>
      <path d="M30 -82 L5 -86 M30 -78 L5 -76 M80 -82 L105 -86 M80 -78 L105 -76" stroke="#ddd" stroke-width="2"/></g>`;
  }
  function iceCream(x, y, s, bite = 0) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="M-26 0 L0 80 L26 0Z" fill="#e0a85a" stroke="#b07a3a" stroke-width="3"/>
      <circle cx="0" cy="-14" r="30" fill="#ff9ec4"/><circle cx="-10" cy="-48" r="26" fill="#fff3d6"/><circle cx="8" cy="-78" r="${f(24 * (1 - bite * 0.5))}" fill="#7a4a2a"/><circle cx="4" cy="-102" r="7" fill="#e0313f"/></g>`;
  }
  function guitar(x, y, s, rot = -30) {
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(s)})"><rect x="-8" y="-210" width="16" height="170" fill="#6b4630"/><rect x="-16" y="-240" width="32" height="40" rx="6" fill="#4a2f1e"/>
      <ellipse cx="0" cy="0" rx="62" ry="54" fill="#e08a2e"/><ellipse cx="0" cy="-40" rx="46" ry="40" fill="#e08a2e"/><circle cx="0" cy="-10" r="18" fill="#3a2414"/>
      <path d="M-4 -210 V30 M4 -210 V30" stroke="#eee" stroke-width="1.5"/></g>`;
  }
  function skateboard(x, y, s, rot = 0) {
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><rect x="-110" y="-14" width="220" height="16" rx="8" fill="#3d6fe0"/><rect x="-80" y="-12" width="160" height="6" fill="#ffd34d"/>
      <circle cx="-70" cy="10" r="12" fill="#eee" stroke="#333" stroke-width="3"/><circle cx="70" cy="10" r="12" fill="#eee" stroke="#333" stroke-width="3"/></g>`;
  }
  function listPaper(x, y, s, k, t, done = 3) {   // the bucket list
    if (k <= 0.01) return '';
    const items = ['1. DESSERT FIRST', '2. COOL SKATE TRICK', '3. LEARN GUITAR', '4. NICE TO GRUMBOLD', '5. EAT 3 PIZZAS', '6. TOUCH A CLOUD', '7. ??? (MOST IMPORTANT)'];
    const h = 120 + items.length * 52;
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s * easeOut(k))}) rotate(${f(Math.sin(t * 1.5) * 2)})">
      <rect x="-250" y="${-h / 2}" width="500" height="${h}" rx="10" fill="#fffbe8" stroke="#d9c9a0" stroke-width="5"/>
      ${txt(0, -h / 2 + 64, "KIP'S BUCKET LIST", 38, { fill: '#e05a2b' })}
      ${items.map((it, i) => `${txt(-220, -h / 2 + 124 + i * 52, it, 28, { fill: i === 6 ? '#d6334a' : '#334', a: 'start', font: "'Comic Sans MS', 'Arial Black'", w: 700 })}${i === 3 || i < done ? `<path d="M-225 ${-h / 2 + 114 + i * 52} H${-225 + it.length * 17}" stroke="#d6334a" stroke-width="4"/>` : ''}`).join('')}</g>`;
  }
  function phone(x, y, s, lit = 1) {
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><rect x="-22" y="-40" width="44" height="80" rx="8" fill="#111"/><rect x="-18" y="-34" width="36" height="66" rx="4" fill="${lit ? '#8fe9ff' : '#223'}"/></g>`;
  }
  function stars(x, y, t, n = 3, r = 60) {
    return [...Array(n)].map((_, i) => { const a = t * 6 + i * 2.1; return txt(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, '★', 34, { fill: '#ffd34d', stroke: '#000', sw: 3 }); }).join('');
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
  function tree(x, y, s, cols, seed = 1) {
    const r = rng(seed); let can = '';
    for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2, d = r() * 110; can += `<circle cx="${f(Math.cos(a) * d)}" cy="${f(-420 + Math.sin(a) * d * 0.7)}" r="${f(110 + r() * 50)}" fill="${cols[i % cols.length]}"/>`; }
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 0 Q-24 -200 -16 -330 L16 -330 Q24 -200 30 0Z" fill="#6b4630"/><path d="M-6 -250 Q-70 -300 -110 -330" stroke="#6b4630" stroke-width="18" fill="none"/>${can}</g>`;
  }
  function parkBG(c, tod) {
    const sun = tod === 'sunset';
    const T = sun ? ['#4a2f7a', '#ff9a5a', '#5f8a3a', '#4a6e2c', ['#3f6a33', '#4c7a3a', '#2f5528'], '#e8b48a']
      : ['#5fb7ff', '#d4eeff', '#5cb85c', '#479a47', ['#4caf50', '#5cc261', '#3e9a43'], '#f0e2c0'];
    const r = rng(12);
    let grassBl = '';
    for (let i = 0; i < 120; i++) { const x = r() * 1920, yy = 900 + r() * 180, h = 10 + r() * 16; grassBl += `<path d="M${f(x)} ${f(yy)} l${f(-3 + r() * 6)} ${f(-h)}" stroke="${T[3]}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`; }
    return `${sky('pk' + tod, T[0], T[1])}
      ${sun ? `<circle cx="1480" cy="660" r="150" fill="#ffd27a" opacity="0.95"/><circle cx="1480" cy="660" r="260" fill="#ffd27a" opacity="0.18"/>` : `<circle cx="1650" cy="160" r="80" fill="#fff2b0"/>`}
      ${clouds(c.t, sun ? 0.5 : 0.85, sun ? '#ffc6a0' : '#fff', 6)}
      <path d="M0 720 Q300 600 640 690 Q980 600 1300 680 Q1620 610 1920 690 L1920 900 L0 900Z" fill="${sun ? '#6b5a8a' : '#8fd18f'}" opacity="0.8"/>
      ${tree(160, 900, 1.15, T[4], 3)}${tree(1780, 900, 1.25, T[4], 5)}
      <g transform="translate(1260 900)"><path d="M-20 0 L-20 -330 M120 0 L120 -330" stroke="#c94a3a" stroke-width="14"/><path d="M-30 -330 H130" stroke="#c94a3a" stroke-width="16"/>
        <path d="M10 -320 L10 -150 M90 -320 L90 -150" stroke="#555" stroke-width="4"/><rect x="0" y="-150" width="100" height="14" rx="4" fill="#333"/></g>
      <g transform="translate(560 900)"><rect x="-150" y="-120" width="300" height="20" rx="6" fill="#8a5a35"/><rect x="-150" y="-170" width="300" height="18" rx="6" fill="#8a5a35"/>
        <rect x="-130" y="-100" width="14" height="100" fill="#444"/><rect x="116" y="-100" width="14" height="100" fill="#444"/></g>
      <g transform="translate(980 900)"><rect x="-8" y="-420" width="16" height="420" fill="#2f3542"/><rect x="-30" y="-450" width="60" height="40" rx="10" fill="#2f3542"/>
        <circle cx="0" cy="-418" r="${sun ? 30 : 0}" fill="#ffe7a0" opacity="0.6"/></g>
      <rect y="890" width="1920" height="190" fill="${T[2]}"/><path d="M0 980 Q960 930 1920 990 L1920 1040 Q960 980 0 1030Z" fill="${T[5]}" opacity="0.8"/>${grassBl}`;
  }
  function bedroomBG(c, o = {}) {
    const aft = o.aft;
    return `<rect width="1920" height="1080" fill="${aft ? '#e6dcf5' : '#d8e6ff'}"/>${[...Array(24)].map((_, i) => `<path d="M${i * 82} 0 V900" stroke="${aft ? '#d8cdee' : '#c8d8f4'}" stroke-width="14"/>`).join('')}
      <rect x="1200" y="160" width="520" height="440" rx="10" fill="${aft ? '#ffd9a0' : '#9fd7ff'}" stroke="#fff" stroke-width="18"/>
      <clipPath id="bwc"><rect x="1200" y="160" width="520" height="440"/></clipPath>
      <g clip-path="url(#bwc)"><circle cx="${aft ? 1450 : 1620}" cy="${aft ? 420 : 250}" r="50" fill="#fff2b0"/>${clouds(c.t, 0.8, '#fff', 4)}</g>
      <path d="M1460 160 V600 M1200 380 H1720" stroke="#fff" stroke-width="10"/>
      <rect x="160" y="230" width="230" height="300" rx="8" fill="#f07a2a"/>${txt(275, 330, 'SPACE', 40, { fill: '#fff' })}${txt(275, 380, 'CAMP', 40, { fill: '#fff' })}<circle cx="275" cy="460" r="40" fill="#ffd34d"/>
      <rect x="470" y="300" width="260" height="20" fill="#8a5a35"/><rect x="490" y="250" width="40" height="50" fill="#d6334a"/><rect x="540" y="236" width="34" height="64" fill="#3d6fe0"/><rect x="584" y="260" width="44" height="40" fill="#34d399"/>
      <g transform="translate(1830 140) scale(0.8)"><rect x="-80" y="0" width="160" height="60" rx="8" fill="#222"/>${txt(0, 44, fmt(o.clockSecs || 0).slice(0, 5), 40, { fill: '#ff5470', font: "'DejaVu Sans Mono', monospace", w: 700 })}</g>
      <rect y="900" width="1920" height="180" fill="#9a7a5e"/><ellipse cx="960" cy="985" rx="420" ry="60" fill="#3d6fe0" opacity="0.5"/>
      <g transform="translate(330 900)"><rect x="-230" y="-120" width="520" height="90" rx="20" fill="#e9ecf5"/><rect x="-250" y="-260" width="40" height="260" rx="14" fill="#6b4f3a"/><rect x="290" y="-180" width="40" height="180" rx="14" fill="#6b4f3a"/>
        <path d="M-200 -120 Q60 -190 300 -125 L300 -60 L-200 -60Z" fill="#3b5bdb"/><ellipse cx="-150" cy="-140" rx="70" ry="34" fill="#fff"/></g>`;
  }
  function kitchenBG(c) {
    let tiles = '';
    for (let y = 420; y < 640; y += 44) for (let x = 0; x < 1920; x += 44) tiles += `<rect x="${x + 2}" y="${y + 2}" width="40" height="40" fill="${(x + y) % 88 ? '#fdf6e8' : '#f3e8d2'}"/>`;
    return `<rect width="1920" height="1080" fill="#fde2b8"/>${tiles}
      <rect x="0" y="600" width="1920" height="40" fill="#c98b52"/><rect x="0" y="640" width="1920" height="260" fill="#e6b07a"/>
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${40 + i * 270}" y="670" width="240" height="200" rx="8" fill="#d99e64" stroke="#b9804a" stroke-width="5"/><circle cx="${250 + i * 270}" cy="770" r="7" fill="#7a4a2a"/>`).join('')}
      
      <rect x="1500" y="140" width="280" height="440" rx="18" fill="#e9eef5" stroke="#c9d2de" stroke-width="6"/><path d="M1500 300 H1780" stroke="#c9d2de" stroke-width="6"/><rect x="1530" y="200" width="12" height="70" rx="5" fill="#9aa"/>
      <rect y="900" width="1920" height="180" fill="#b07a4e"/>`;
  }
  function tvSet(c, x, y, s, o = {}) {   // wall TV with the live news broadcast
    const lt = c.t;
    const w = 640, h = 360;
    const ticker = 'BREAKING: EVERYONE ON EARTH WAKES UP WITH A COUNTDOWN  •  EXPERTS: "NO REASON TO PANIC"  •  ';
    const tx = -((lt * 140) % 1400);
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">
      <rect x="${-w / 2 - 22}" y="${-h / 2 - 22}" width="${w + 44}" height="${h + 44}" rx="18" fill="#15161c"/>
      <clipPath id="tvc"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}"/></clipPath>
      <g clip-path="url(#tvc)">
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#16306a"/>
        ${[...Array(9)].map((_, i) => `<path d="M${-w / 2 + i * 80} ${-h / 2} L${-w / 2 + i * 80 + 160} ${h / 2}" stroke="#1f3f85" stroke-width="30"/>`).join('')}
        <g transform="translate(150 -40)"><circle r="80" fill="#0e1f48"/>${txt(0, 14, '🌍', 70)}</g>
        ${X.renderPerson(CAST.news, { id: 'nws', x: -120, y: 330, scale: 0.62, expression: c.eExpr('news', 'neutral'), talk: c.talk('NEWS'), blink: K.blinkAt(c.t, 4), t: c.t, lookX: 0, shadow: false })}
        ${timer(c, -120, 330 - 640 * 0.62 + 10, { text: '37 YEARS', s: 0.42 })}
        <rect x="${-w / 2}" y="${h / 2 - 64}" width="${w}" height="64" fill="#d6334a"/><g transform="translate(${f(tx)} 0)">${txt(-w / 2 + 170, h / 2 - 22, ticker + ticker, 26, { fill: '#fff', a: 'start' })}</g>
        <rect x="${-w / 2}" y="${h / 2 - 64}" width="150" height="64" fill="#fff"/>
        ${txt(-w / 2 + 75, h / 2 - 22, 'LIVE', 30, { fill: '#d6334a' })}
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="url(#tvsh)"/>
      </g>
      <linearGradient id="tvsh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient></g>`;
  }
  function streetBG(c) {
    const shops = [['BAKERY', '#ff9f68', '#e05a2b'], ['BOOKS', '#7aa7ff', '#3d6fe0'], ['CAFE', '#9fd16b', '#5a9a2e'], ['TOYS', '#ff7bb0', '#d93a7a']];
    let s = `<rect y="880" width="1920" height="200" fill="#9aa3b5"/><rect y="880" width="1920" height="16" fill="#c9cfdb"/>`;
    shops.forEach(([n, col, dk], i) => {
      const x = i * 480;
      s += `<rect x="${x}" y="200" width="480" height="680" fill="${i % 2 ? '#e9dcc9' : '#f3e7d6'}"/><rect x="${x + 40}" y="480" width="400" height="300" fill="#bfe6ff" stroke="#6b5a4a" stroke-width="10"/>
        ${[...Array(8)].map((_, k) => `<path d="M${x + 40 + k * 50} 430 h50 v50 q-25 20 -50 0Z" fill="${k % 2 ? col : '#fff'}"/>`).join('')}
        <rect x="${x + 90}" y="300" width="300" height="90" rx="14" fill="${dk}"/>${txt(x + 240, 362, n, 48, { fill: '#fff' })}
        <rect x="${x + 180}" y="620" width="120" height="160" fill="${dk}" opacity="0.4"/>`;
    });
    // tiny townsfolk in the shop windows, each with their own countdown
    const r = rng(21);
    for (let i = 0; i < 4; i++) {
      const x = i * 480 + 120 + r() * 200;
      const secs = [3 * 86400 * 365, 5 * 3600 + 1200, 12 * 86400 * 365, 26 * 3600][i];
      s += `<g opacity="0.85"><circle cx="${f(x)}" cy="640" r="34" fill="#3a2f4a"/><rect x="${f(x - 30)}" y="672" width="60" height="110" rx="20" fill="#3a2f4a"/></g>
        ${timer(c, x, 590, { secs: secs > 86400 * 300 ? undefined : secs - c.rt, text: secs > 86400 * 300 ? Math.round(secs / 86400 / 365) + ' YEARS' : undefined, s: 0.32 })}`;
    }
    return s + `<rect x="0" y="180" width="1920" height="22" fill="#6b5a4a"/>`;
  }
  function classroomBG(c, board = ['COUNTDOWN SCIENCE', 'ZERO = ???', 'NO PANICKING']) {
    return `<rect width="1920" height="1080" fill="#f1e3c6"/>${[...Array(24)].map((_, i) => `<path d="M${i * 82} 0 V900" stroke="#e6d4b0" stroke-width="16"/>`).join('')}
      <rect x="560" y="140" width="900" height="420" rx="12" fill="#2f5a46" stroke="#8a5a35" stroke-width="22"/>
      ${txt(1010, 260, board[0], 52, { fill: '#e8f0e8', font: "'Comic Sans MS', 'Arial Black'", w: 700 })}${txt(1010, 350, board[1], 60, { fill: '#e8f0e8', font: "'Comic Sans MS', 'Arial Black'", w: 700 })}
      ${txt(1010, 470, board[2], 34, { fill: '#ffd34d', font: "'Comic Sans MS', 'Arial Black'", w: 700 })}
      <circle cx="1850" cy="110" r="50" fill="#fff" stroke="#333" stroke-width="8"/><path d="M1850 110 L1850 76 M1850 110 L1874 122" stroke="#333" stroke-width="6"/>
      <rect x="140" y="200" width="260" height="300" rx="10" fill="#bfe6ff" stroke="#fff" stroke-width="14"/><path d="M270 200 V500 M140 350 H400" stroke="#fff" stroke-width="8"/>
      <rect y="900" width="1920" height="180" fill="#c9a77a"/>${[...Array(10)].map((_, i) => `<path d="M${i * 200} 900 V1080" stroke="#b08c5e" stroke-width="5"/>`).join('')}`;
  }
  const desk = (x, w = 260) => `<g transform="translate(${x} 900)"><rect x="${-w / 2}" y="-190" width="${w}" height="24" rx="6" fill="#b5835a"/><rect x="${-w / 2 + 14}" y="-166" width="14" height="166" fill="#6b5a4a"/><rect x="${w / 2 - 28}" y="-166" width="14" height="166" fill="#6b5a4a"/></g>`;

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
    if (o.force) kind = o.force;
    const tgt = P[who], hy = headY(tgt);
    // keep the countdown above the speaker's head in frame on close-ups
    if (kind === 'wide') return { z: (o.wideZ || 1.02) * push, x: mid, y: 540 };
    if (kind === 'two') return { z: 1.16 * push, x: mid, y: 540 };
    if (kind === 'med') return { z: 1.3 * push, x: lerp(mid, tgt.x, 0.65), y: hy + 20 };
    return { z: 1.5 * push, x: tgt.x, y: hy - 30 };
  }

  // ---------------------------------------------------------------- shared: the park countdown scene (hook + climax)
  function parkCount(c, hook) {
    const a = c.b.a, lt = c.lt;
    const v = cdLily(c), zt = since(c, 'zero');
    const tp = hook ? -1 : since(c, 'puppy'), th = hook ? -1 : since(c, 'hug');
    const tRun = hook ? -1 : since(c, 'run'), arrived = hook || since(c, 'arrive') >= 0;
    const kx = hook ? 740 : (arrived ? 760 : lerp(-250, 760, easeOut(Math.max(0, tRun) / 1.9)));
    const P = { kip: { x: kx, s: 1.05 }, max: { x: 1130, s: 1.0, h: 1.06 }, lily: { x: 1450, s: 1.0, h: 0.98 } };
    const momIn = tp >= 0;
    if (momIn) P.mom = { x: 1650, s: 1.0, h: 1.1 };
    const done = zt >= 0;
    const kipT = done ? { secs: 0, zt, s: 0.78, op: 1 - sm(4, 6, zt) } : { secs: v, s: 0.78 };
    const maxT = done ? { secs: 0, zt, s: 0.7, op: 1 - sm(4, 6, zt) } : { secs: v, s: 0.7 };
    const flash = zt >= 0 && zt < 0.5 ? 1 - zt / 0.5 : 0;
    const running = !hook && !arrived && tRun < 1.9;
    const lookUp = a === 'count' || a === 'lookUp' || a === 'hookOpen';
    const px = tp < 0 ? -400 : lerp(2100, kx + 160, easeOut(tp / 1.6));
    const hugPose = { armL: { sh: 70, el: -60 }, armR: { sh: 70, el: -60 } };
    const svg = `${parkBG(c, 'sunset')}
      ${person('lily', c, { x: 1450, lookX: lookFrom(c, 'lily', P), lookY: lookUp ? -0.6 : 0, pose: th >= 0 ? 'cheer' : (lookUp && v < 4 && !done ? 'scared' : undefined) })}
      ${timer(c, 1450, topY('lily', 0) , { secs: 0, done: true, s: 0.6, op: done ? 1 - sm(4, 6, zt) : 1 })}
      ${momIn ? person('mom', c, { x: lerp(2100, 1650, easeOut(tp / 1.4)), lookX: -0.6, pose: since(c, 'family') >= 0 && c.b.v === 'MOM' ? 'wave' : undefined }) + timer(c, lerp(2100, 1650, easeOut(tp / 1.4)), topY('mom', 0), { secs: 0, done: true, s: 0.6 }) : ''}
      ${person('max', c, { x: th >= 0 ? 1010 : 1130, lookX: lookFrom(c, 'max', P), lookY: lookUp ? -0.6 : 0, pose: th >= 0 ? hugPose : (lookUp && v < 4 && !done ? 'scared' : undefined) })}
      ${timer(c, th >= 0 ? 1010 : 1130, topY('max', 0), maxT)}
      ${kip(c, { x: th >= 0 ? 860 : kx, lookX: running ? 0.6 : lookFrom(c, 'kip', P), lookY: lookUp ? -0.7 : 0, pose: running ? walkPose(c.t, 1, true) : (th >= 0 ? hugPose : undefined) })}
      ${timer(c, th >= 0 ? 860 : kx, topY('kip', 0, 1.05), kipT)}
      ${!hook && since(c, 'listShow') >= 0 && since(c, 'lookUp') < 0 ? listPaper(kx - 400, 500, 0.62, clamp(since(c, 'listShow') / 0.4), c.t, 3) : ''}
      ${tp >= 0 ? puppy(th >= 0 ? 935 : px, th >= 0 ? 700 : 905, 0.9, c.t, { hop: tp < 1.6 || th >= 0, flip: true }) : ''}
      ${since(c, 'nothing') >= 0 && since(c, 'bark') < 0 ? `<path d="M${f(1000 + Math.sin(c.t * 2) * 60)} ${f(200 + since(c, 'nothing') * 260)} q20 -10 30 0 q-10 20 -30 0Z" fill="#c94a3a"/>` : ''}
      ${since(c, 'family') >= 0 && c.b.k === 'excited' ? confetti(c.b.start, c.t, 90, 7) : ''}
      ${th >= 0 ? `<g opacity="${f(clamp(th / 0.6))}">${[0, 1, 2, 3, 4].map(i => { const p = (th * 0.5 + i / 5) % 1; return txt(700 + i * 120, 520 - p * 220, '♥', 50, { fill: '#ff5470', op: 1 - p }); }).join('')}</g>` : ''}`;
    let cam = dcam(c, P, { wideX: 1060 });
    if (a === 'hookOpen') cam = { z: 1.55, x: kx, y: 330 };
    if (a === 'count') {
      const who = c.b.v;
      cam = who === 'KIP' ? { z: lerp(1.5, 1.75, easeIO(lt / 3)), x: kx, y: 330 } : who === 'MAX' ? { z: 1.4, x: 1000, y: 360 } : { z: lerp(1.25, 1.85, easeIO(lt / 3)), x: (kx + 1130) / 2, y: 300 + Math.sin(c.t * 40) * 3 };
    }
    if (a === 'zero') cam = hook ? { z: 2.1, x: kx, y: 260 } : { z: lerp(1.9, 1.05, easeIO(lt / 2.6)), x: lerp(kx, 1060, easeIO(lt / 2.6)), y: lerp(270, 540, easeIO(lt / 2.6)) };
    if (a === 'nothing') cam = { z: 1.0, x: 1060, y: 540 };
    if (a === 'run') cam = { z: 1.1, x: lerp(500, 900, lt / 2), y: 540 };
    if (a === 'listShow' || a === 'listRead' && c.b.v === 'KIP') cam = { z: 1.3, x: kx - 180, y: 480 };
    if (a === 'bark' || a === 'bark2') cam = { z: 1.05, x: 1200, y: 540 };
    if (a === 'puppy') cam = { z: lerp(1.0, 1.25, easeIO(lt / 2.6)), x: lerp(1300, kx + 200, easeIO(lt / 2.6)), y: 600 };
    if (a === 'hug') cam = { z: lerp(1.15, 1.3, lt / 2.6), x: 960, y: 520 };
    let overlay = flash > 0 ? `<rect width="1920" height="1080" fill="#fff" opacity="${f(flash * (hook ? 1 : 0.9))}"/>` : '';
    if (hook && a === 'zero') overlay = `<rect width="1920" height="1080" fill="#fff" opacity="${f(clamp(lt / 0.25))}"/>`;
    if (hook && a === 'hookOpen' || hook && a === 'count' && c.bi === 1) overlay += txt(960, 120, '3:59 PM', 46, { fill: '#fff', stroke: '#000', sw: 8, op: 0.9 });
    return { svg, cam, overlay };
  }
  S.hook = c => parkCount(c, true);
  S.climax = c => parkCount(c, false);

  // ---------------------------------------------------------------- TITLE
  S.title = c => {
    const lt = c.lt, g = lt < 0.5 ? (1 - lt / 0.5) * 14 : 0;
    const face = K.renderKip({ id: 'tk', x: 960, y: 1920, scale: 2.4, expression: { ...K.EXPRESSIONS.fear, pupil: 0.5 }, lookY: -0.8, t: c.t, shadow: false, blink: 0 });
    const title = (dx, col) => `${txt(960 + dx, 160, 'WHAT IF EVERYONE HAD A', 66, { fill: col, ls: 4 })}${txt(960 + dx, 290, 'COUNTDOWN ABOVE THEIR HEAD?', 104, { fill: col })}`;
    const secs = 8 * 3600 - lt * 900;   // fast-spinning clock for the title
    const svg = `<radialGradient id="tg" cx="0.5" cy="0.7" r="0.8"><stop offset="0" stop-color="#4a2a0a"/><stop offset="1" stop-color="#07030f"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#tg)"/>
      ${[...Array(16)].map((_, i) => `<path d="M960 640 L${f(960 + Math.cos(i / 16 * 6.283 + lt * 0.3) * 1600)} ${f(640 + Math.sin(i / 16 * 6.283 + lt * 0.3) * 1600)}" stroke="#ffb020" stroke-width="40" opacity="0.05"/>`).join('')}
      ${face}
      ${timer(c, 960, 650, { secs, s: 1.4, glitch: lt < 0.4 })}
      <g opacity="${f(easeOut(lt / 0.4))}">${g ? title(-g, '#ff2e63') + title(g, '#08d9d6') : ''}${title(0, '#fff')}</g>
      ${txt(960, 370, 'KIP · EPISODE 4', 36, { fill: '#ffb020', ls: 6, op: sm(1.0, 1.6, lt) })}`;
    return { svg, cam: { z: 1 + lt * 0.015 } };
  };

  // ---------------------------------------------------------------- BEDROOM 8:01 AM
  S.bedroom = c => {
    const a = c.b.a, lt = c.lt;
    const tUp = since(c, 'alarm'), tWin = since(c, 'window'), tMom = since(c, 'momDoor'), tMir = since(c, 'mirror');
    const lying = tUp < 0 ? 1 : 1 - easeOut(tUp / 0.6);
    const atMirror = tMir >= 0 && tWin < 0;
    const kx = atMirror ? lerp(900, 740, easeIO(tMir / 0.8)) : (tWin >= 0 ? lerp(740, 900, easeIO(tWin / 0.6)) : 900);
    const P = { kip: { x: kx, s: 1.05 } };
    if (tWin >= 0) P.max = { x: 1460, s: 0.9 };
    if (tMom >= 0) P.mom = { x: 200, s: 1.0 };
    const kT = toZero(c);
    let kipG;
    if (lying > 0.02) {
      kipG = `<g transform="translate(${f(lerp(900, 360, lying))} ${f(lerp(905, 760, lying))}) rotate(${f(-90 * lying)})">${K.renderKip({ id: 'bk', x: 0, y: 0, scale: 0.9,
        expression: lying > 0.9 ? { ...K.EXPRESSIONS.happy, lidUp: 1, lidLo: 0, smile: 0.4, open: 0 } : 'surprise', pose: 'idle', t: c.t, blink: lying > 0.9 ? 1 : 0, shadow: false })}</g>
        ${lying > 0.9 ? [0, 1, 2].map(i => { const p = (c.t * 0.4 + i / 3) % 1; return txt(420 + p * 160, 520 - p * 220, 'Z', 40 + p * 50, { fill: '#5a6fb0', op: 1 - p }); }).join('') : ''}
        ${timer(c, lerp(900, 230, lying), lerp(233, 690, lying), { secs: kT, s: 0.6 })}`;
    } else {
      kipG = kip(c, { x: kx, lookX: atMirror ? 0.6 : (tMom >= 0 ? -0.8 : lookFrom(c, 'kip', P)), lookY: a === 'mirror' ? -0.6 : 0 }) + timer(c, kx, topY('kip', 0, 1.05), { secs: kT, s: 0.7 });
    }
    // standing mirror on the left: shows Kip's reflection and his countdown
    const mirror = `<g transform="translate(1040 900)"><rect x="-120" y="-760" width="240" height="740" rx="110" fill="#8a5a35"/><clipPath id="mclip"><rect x="-100" y="-740" width="200" height="700" rx="95"/></clipPath>
      <g clip-path="url(#mclip)"><rect x="-100" y="-740" width="200" height="700" fill="#cfe6ff"/>
      ${atMirror ? K.renderKip({ id: 'mk', x: lerp(-60, 10, easeIO(tMir / 0.8)), y: -15, scale: 0.95, expression: c.kExpr('k'), pose: c.kExpr('p', 'idle'), blink: K.blinkAt(c.t), talk: c.talk('KIP'), t: c.t, lookX: -0.6, lookY: a === 'mirror' ? -0.6 : 0, shadow: false }) + timer(c, lerp(-60, 10, easeIO(tMir / 0.8)), -625, { secs: kT, s: 0.5 }) : ''}
      <path d="M-80 -700 L40 -740 M-100 -500 L100 -640" stroke="#fff" stroke-width="16" opacity="0.35"/></g><rect x="-60" y="-20" width="120" height="20" fill="#6b4630"/></g>`;
    const maxG = tWin >= 0 ? `<clipPath id="mwin"><rect x="1209" y="169" width="502" height="422"/></clipPath><g clip-path="url(#mwin)">${person('max', c, { x: 1460, y: 1080, scale: 0.9, lookX: lookFrom(c, 'max', P) })}
      ${timer(c, 1460, topY('max', 0, 0.9, 1080), { text: '61 YEARS', s: 0.55, op: popOn(c, 'window', 0.6) })}</g>` : '';
    const momX = tMom >= 0 ? lerp(-120, 200, easeOut(tMom / 0.6)) : -400;
    const momG = tMom >= 0 ? person('mom', c, { x: momX, flip: false, lookX: 0.7 }) + towel(momX, 905, 1.0) + `<circle cx="${f(momX + 10)}" cy="${f(905 - 700)}" r="${f(18 + 4 * Math.sin(c.t * 6))}" fill="#ffb020" opacity="0.35"/>` : '';
    const alarm = tUp >= 0 && tUp < 1.5 ? txt(700, 420, 'RIIING!', 70, { fill: '#ff5470', stroke: '#fff', sw: 8, tr: `rotate(${f(Math.sin(c.t * 60) * 6)} 700 420)` }) : '';
    const svg = `${bedroomBG(c, { clockSecs: clock(c) })}${tMom >= 0 ? '' : mirror}${maxG}${momG}${kipG}${alarm}`;
    let cam = dcam(c, P);
    if (a === 'sleep') cam = { z: lerp(1.0, 1.15, lt / 4), x: 600, y: 600 };
    if (a === 'alarm') cam = { z: 1.15, x: 700, y: 560 };
    if (a === 'up') cam = { z: 1.3, x: 900, y: 450 };
    if (a === 'mirror') cam = { z: lerp(1.25, 1.5, easeIO(lt / 4)), x: 900, y: 330 };
    if (a === 'window' && c.b.v === 'MAX' && c.bi === beatOf(c, 'window', 'MAX').i) cam = { z: 1.35, x: 1360, y: 400 };
    let overlay = '';
    if (a === 'sleep') overlay = `<g opacity="${f(sm(0.2, 0.8, lt) * (1 - sm(3.5, 4.2, lt)))}"><rect x="660" y="60" width="600" height="90" rx="20" fill="#000" opacity="0.6"/>${txt(960, 122, '8 HOURS EARLIER...', 50, { fill: '#ffd34d', ls: 4 })}</g>`;
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- KITCHEN 8:15 AM
  S.kitchen = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 940, s: 1.05 }, max: { x: 1250, s: 1.0, h: 1.06 }, mom: { x: 1580, s: 1.0, h: 1.1 } };
    const tsp = since(c, 'spit');
    const spray = tsp >= 0 && tsp < 1.2 ? [...Array(16)].map((_, i) => { const r = rng(i + 3); const d = tsp * (300 + r() * 300); return `<circle cx="${f(980 + d)}" cy="${f(470 - 60 * Math.sin(i) + tsp * tsp * 300 * r())}" r="${f(6 + r() * 8)}" fill="#fff" opacity="${f(1 - tsp / 1.2)}"/>`; }).join('') : '';
    const table = `<g transform="translate(1100 900)"><rect x="-360" y="-250" width="720" height="26" rx="8" fill="#8a5a35"/><rect x="-330" y="-224" width="18" height="224" fill="#6b4630"/><rect x="312" y="-224" width="18" height="224" fill="#6b4630"/>
      <ellipse cx="-180" cy="-262" rx="70" ry="12" fill="#fff"/><g transform="translate(-180 -274)">${[0, 1, 2].map(i => `<ellipse cx="0" cy="${-i * 10}" rx="50" ry="10" fill="#e0a85a" stroke="#b07a3a" stroke-width="2"/>`).join('')}<rect x="-14" y="-38" width="28" height="12" fill="#ffe16a"/></g>
      <rect x="-60" y="-320" width="40" height="70" rx="6" fill="#fff" opacity="0.9"/><rect x="120" y="-300" width="60" height="50" rx="8" fill="#ffd34d"/></g>`;
    const svg = `${kitchenBG(c)}${tvSet(c, 480, 290, 0.85)}${table}
      ${person('mom', c, { x: 1580, lookX: lookFrom(c, 'mom', P) })}${towel(1580, 905, 1.0)}
      ${person('max', c, { x: 1250, lookX: a === 'tv' ? -0.7 : lookFrom(c, 'max', P), lookY: a === 'tv' ? -0.4 : 0 })}${timer(c, 1250, topY('max', 0) + 10, { text: '61 YEARS', s: 0.5 })}
      ${kip(c, { x: 940, lookX: a === 'tv' ? -0.7 : lookFrom(c, 'kip', P), lookY: a === 'tv' ? -0.4 : 0, pose: tsp >= 0 && tsp < 1.4 ? 'surprise' : undefined })}${timer(c, 940, topY('kip', 0, 1.05) + 10, { secs: toZero(c), s: 0.55 })}
      ${spray}`;
    let cam = dcam(c, P);
    if (a === 'tv') {
      const first = c.bi === beatOf(c, 'tv').i;
      cam = c.b.v === 'NEWS' ? { z: first ? lerp(1.0, 1.6, easeIO(lt / 3)) : 1.75, x: 480, y: 300 } : { z: 1.5, x: 940, y: 300 };
    }
    if (a === 'spit') cam = { z: 1.3, x: 1020, y: 420 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- STREET 8:40 AM: Rosa's zero
  S.street = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 520, s: 1.05 }, max: { x: 800, s: 1.0, h: 1.06 }, baker: { x: 1300, s: 1.0, h: 1.04 } };
    const anc = beatOf(c, 'bakerCount');
    const v = anc ? cdAnchor(c, 'bakerZero', anc.start + 0.2, 5) : 99;
    const tz = since(c, 'bakerZero');
    const onPhone = since(c, 'call') >= 0 || tz > 0.6;
    const stand = `<g transform="translate(1300 900)"><rect x="-220" y="-250" width="440" height="250" fill="#f3d9b0"/><rect x="-240" y="-280" width="480" height="40" rx="10" fill="#e05a2b"/>
      ${[0, 1, 2, 3, 4].map(i => `<circle cx="${-170 + i * 85}" cy="-264" r="18" fill="#c8843a"/><circle cx="${-170 + i * 85}" cy="-264" r="5" fill="#4a2a10"/>`).join('')}${txt(0, -130, 'FRESH COOKIES', 40, { fill: '#e05a2b' })}</g>`;
    const bakerPose = onPhone ? { armR: { sh: 150, el: 120 } } : (tz >= 0 ? 'surprise' : undefined);
    const hb = X.hands({ x: 1300, y: 905, scale: 1.04, flip: true, pose: bakerPose, t: c.t });
    const svg = `${sky('st', '#6aa8e8', '#d7ebff')}${clouds(c.t, 0.7)}${streetBG(c)}
      ${person('baker', c, { x: 1300, lookX: lookFrom(c, 'baker', P), lookY: a === 'bakerCount' ? -0.6 : 0, pose: bakerPose })}
      ${onPhone ? phone(hb.R.x, hb.R.y - 10, 1.0) : ''}${tz >= 0 && tz < 1.6 ? txt(hb.R.x - 60, hb.R.y - 90, 'RING!', 44, { fill: '#ff5470', stroke: '#fff', sw: 6 }) : ''}
      ${stand}
      ${timer(c, 1300, topY('baker', 0), { secs: tz >= 0 ? 0 : v, zt: tz, s: 0.62, op: tz >= 0 ? 1 - sm(3, 4, tz) : 1 })}
      ${person('max', c, { x: 800, flip: false, lookX: lookFrom(c, 'max', P) })}${timer(c, 800, topY('max', 0), { text: '61 YEARS', s: 0.5 })}
      ${kip(c, { x: 520, lookX: lookFrom(c, 'kip', P), lookY: a === 'bakerCount' ? -0.4 : 0 })}${timer(c, 520, topY('kip', 0, 1.05), { secs: toZero(c), s: 0.55 })}
      ${since(c, 'call') >= 0 && c.b.sfx && c.b.sfx.includes('confetti') ? confetti(c.b.start, c.t, 70, 4) : ''}`;
    let cam = dcam(c, P);
    if (a === 'baker' && c.b.v === 'BAKER') cam = { z: 1.3, x: 1250, y: 360 };
    if (a === 'bakerCount') cam = { z: lerp(1.2, 1.5, easeIO(lt / 2)), x: 1100, y: 330 };
    if (a === 'bakerZero') cam = { z: 1.6, x: 1300, y: 300 + (tz < 0.4 ? Math.sin(c.t * 50) * 5 : 0) };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- CLASSROOM 9:00 AM
  S.class = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 760, s: 1.05 }, max: { x: 420, s: 1.0, h: 1.06 }, lily: { x: 1180, s: 1.0, h: 0.98 }, teach: { x: 1640, s: 1.0, h: 1.14 } };
    const anc = beatOf(c, 'teachCount');
    const v = anc ? cdAnchor(c, 'teachZero', anc.speechEnd - 0.8, 10) : 99;
    const tz = since(c, 'teachZero'), opera = since(c, 'opera');
    const ducking = since(c, 'duck') >= 0 && tz < 1.0;
    const duckY = ducking ? 120 * easeOut(since(c, 'duck') / 0.3) : 0;
    const catIn = tz >= 0;
    const cq = clamp(tz / 1.2);
    const catX = lerp(270, 1500, easeIO(cq)), catY = lerp(420, 905, cq) - Math.sin(cq * Math.PI) * 220;
    const teachPose = opera >= 0 && opera < 2.6 ? 'cheer' : (since(c, 'cat') >= 0 ? { armL: { sh: 60, el: -80 }, armR: { sh: 60, el: -80 } } : undefined);
    const notes = opera >= 0 && opera < 3 ? [0, 1, 2, 3].map(i => { const p = (opera * 0.8 + i / 4) % 1; return txt(1700 + p * 120, 380 - p * 200, '♪', 50, { fill: '#d6334a', op: 1 - p }); }).join('') : '';
    const svg = `${classroomBG(c)}${desk(420)}${desk(1180)}
      ${person('teach', c, { x: 1640, lookX: catIn && tz < 1.4 ? -0.8 : lookFrom(c, 'teach', P), lookY: a === 'teachCount' ? -0.7 : 0, pose: teachPose })}
      ${timer(c, 1640, topY('teach', 0), { secs: tz >= 0 ? 0 : v, zt: tz, s: 0.58, op: tz >= 0 ? 1 - sm(4, 5, tz) : 1 })}
      ${catIn ? cat(since(c, 'cat') >= 0 ? 1560 : catX, since(c, 'cat') >= 0 ? 700 : catY, 0.9, c.t, { flip: true, happy: since(c, 'cat') >= 0 }) : ''}
      ${person('lily', c, { x: 1180, y: 905 + duckY, lookX: lookFrom(c, 'lily', P) })}${timer(c, 1180, topY('lily', 0) + duckY, { secs: 0, done: true, s: 0.55 })}
      ${person('max', c, { x: 420, y: 905 + duckY, flip: false, lookX: lookFrom(c, 'max', P) })}${timer(c, 420, topY('max', 0) + duckY, { text: '61 YEARS', s: 0.5 })}
      ${kip(c, { x: 760, y: 905 + duckY, lookX: lookFrom(c, 'kip', P), pose: ducking ? 'scared' : undefined })}${timer(c, 760, topY('kip', 0, 1.05) + duckY, { secs: toZero(c), s: 0.55 })}
      ${desk(420).replace('translate(420 900)', 'translate(420 1080)')}
      ${notes}${since(c, 'cat') >= 0 && c.b.v === 'TEACH' ? `<g opacity="0.9">${[0, 1, 2].map(i => { const p = (c.t * 0.6 + i / 3) % 1; return txt(1500 + i * 60, 600 - p * 160, '♥', 44, { fill: '#ff5470', op: 1 - p }); }).join('')}</g>` : ''}`;
    let cam = dcam(c, P);
    if (a === 'lilyZero' && c.b.v === 'KIP' && c.bi === beatOf(c, 'lilyZero').i) cam = { z: 1.5, x: 1100, y: 300 };
    if (a === 'teachLook') cam = { z: 1.2, x: 1300, y: 420 };
    if (a === 'teachCount') cam = { z: lerp(1.45, 1.8, easeIO(lt / 3)), x: 1640, y: 300 };
    if (a === 'duck') cam = { z: 1.05, x: 1000, y: 540 };
    if (a === 'teachZero') cam = { z: lerp(1.05, 1.3, easeIO(lt / 2.4)), x: lerp(900, 1450, easeIO(lt / 2.4)), y: 520 };
    if (a === 'opera') cam = { z: 1.45, x: 1600, y: 420 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- PARK 12:00 PM: bucket list, Max's number changes
  S.list = c => {
    const a = c.b.a, lt = c.lt;
    const tl = since(c, 'listOpen'), tf = since(c, 'skateFall'), tg = since(c, 'strum'), tb = since(c, 'brainfreeze');
    const tm = since(c, 'maxTimer'), tr = since(c, 'kipRuns');
    const P = { kip: { x: 820, s: 1.05 }, max: { x: 1220, s: 1.0, h: 1.06 }, lily: { x: 1530, s: 1.0, h: 0.98 } };
    const phase = since(c, 'guitar') >= 0 ? 'guitar' : since(c, 'skate') >= 0 ? 'skate' : 'ice';
    let kx = 820, ky = 905, kPose, kRot = 0, prop = '';
    if (phase === 'skate') {
      if (tf < 0) { kx = 820; prop = skateboard(820, 905, 1.0); ky = 875; }
      else if (tf < 2.0) {
        const q = clamp(tf / 0.9);
        kx = lerp(820, 600, q); ky = 875 - Math.sin(q * Math.PI) * 260 + (q >= 1 ? 30 : 0); kRot = q < 1 ? -q * 300 : -90;
        prop = skateboard(lerp(820, 1350, clamp(tf / 1.4)), 905, 1.0, tf * 200);
        kPose = 'surprise';
      }
    }
    const fallen = phase === 'skate' && tf >= 0.9;
    let kipG;
    const kOpts = { x: 0, y: 0, lookX: lookFrom(c, 'kip', P), pose: kPose };
    if (tr >= 0) {
      const rx = lerp(820, -300, easeIO(tr / 1.6));
      kipG = kip(c, { x: rx, flip: true, pose: walkPose(c.t, 1, true), lookX: 0.5 }) + timer(c, rx, topY('kip', 0, 1.05), { secs: toZero(c), s: 0.55 });
    } else if (fallen) {
      kipG = `<g transform="translate(780 890) rotate(-90)">${kip(c, { x: 0, y: 0, shadow: false, lookX: 0, pose: 'scared' })}</g>${stars(660, 760, c.t)}`;
    } else {
      kipG = `<g transform="translate(${f(kx)} ${f(ky)}) rotate(${f(kRot)} 0 -300)">${kip(c, kOpts)}</g>` + timer(c, kx, topY('kip', 0, 1.05) - (905 - ky), { secs: toZero(c), s: 0.55 });
    }
    let front = '';
    if (phase === 'ice') {
      const hp = X.hands({ x: 820, y: 905, scale: 1.05, pose: c.kExpr('p', 'idle'), t: c.t });
      front = iceCream(hp.R.x, hp.R.y - 20, 1.0, tb >= 0 ? 1 : 0);
    }
    if (phase === 'guitar' && !fallen && tr < 0) front = guitar(830, 660, 0.9, -60);
    const strumFX = tg >= 0 && tg < 2.0 ? [0, 1, 2].map(i => { const p = (tg * 1.2 + i / 3) % 1; return txt(950 + p * 120, 560 - p * 160, ['♪', '✗', '♫'][i], 50, { fill: '#555', op: 1 - p }); }).join('') : '';
    const freeze = tb >= 0 && tb < 1.6 ? `<g transform="translate(820 260)">${[...Array(6)].map((_, i) => `<path d="M0 0 L${f(Math.cos(i * 1.047) * 60)} ${f(Math.sin(i * 1.047) * 60)}" stroke="#8fe9ff" stroke-width="8" stroke-linecap="round"/>`).join('')}</g>` : '';
    // Max's countdown: 61 years until it glitches and syncs with Kip
    let maxT = { text: '61 YEARS', s: 0.55 };
    if (tm >= 0) maxT = tm < 1.3 ? { secs: toZero(c), glitch: true, s: 0.6 + 0.1 * Math.sin(tm * 30) } : { secs: toZero(c), s: 0.6 };
    const svg = `${parkBG(c, 'day')}
      ${person('lily', c, { x: 1530, lookX: tr >= 0 ? -0.8 : lookFrom(c, 'lily', P), pose: c.b.a === 'kipGone' ? 'point' : undefined })}${timer(c, 1530, topY('lily', 0), { secs: 0, done: true, s: 0.5 })}
      ${person('max', c, { x: 1250, lookX: tm >= 0 && tm < 2.4 ? 0 : (tr >= 0 ? -0.8 : lookFrom(c, 'max', P)), lookY: tm >= 0 && tm < 2.4 ? -0.8 : 0, pose: a === 'hurt' ? 'sad' : undefined })}
      ${timer(c, 1220, topY('max', 0), maxT)}
      ${tm >= 0 && tm < 1.0 ? `<circle cx="1220" cy="${f(topY('max', 0) - 60)}" r="${f(tm * 400)}" fill="none" stroke="#ffb020" stroke-width="${f(14 * (1 - tm))}"/>` : ''}
      ${prop}${kipG}${front}${freeze}${strumFX}
      ${listPaper(960, 470, 0.85, tl >= 0 && since(c, 'icecream') < 0 ? clamp(tl / 0.4) : 0, c.t, 0)}`;
    let cam = dcam(c, P);
    if (a === 'listOpen') cam = { z: 1.15, x: 960, y: 500 };
    if (a === 'brainfreeze') cam = { z: 1.6, x: 820, y: 360 };
    if (a === 'skateFall') cam = { z: 1.05, x: 900, y: 540 };
    if (a === 'strum') cam = { z: 1.3, x: 950, y: 480 };
    if (a === 'hurt') cam = { z: 1.5, x: 1220, y: 340 };
    if (a === 'maxTimer') cam = { z: lerp(1.3, 1.7, easeIO(lt / 2.4)), x: 1220, y: 300 };
    if (a === 'kipRuns') cam = { z: 1.0, x: 900, y: 540 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- HOME 2:30 PM: pillow fort + Mom's towel
  S.home = c => {
    const a = c.b.a, lt = c.lt;
    const tIn = since(c, 'momIn'), tOff = since(c, 'towelOff');
    const P = { kip: { x: 820, s: 1.05 } };
    const momX = tIn < 0 ? -400 : lerp(-150, 1300, easeOut(tIn / 1.2));
    if (tIn >= 0) P.mom = { x: 1300, s: 1.0, h: 1.1 };
    const towelK = tOff < 0 ? 0 : clamp(tOff / 0.9);
    const momPose = tOff >= 0 && tOff < 1.2 ? { armL: { sh: 150, el: 30 }, armR: { sh: 150, el: 30 } } : undefined;
    const fort = `<g transform="translate(820 905)">
      ${[-260, -140, 140, 260].map((x, i) => `<rect x="${x - 70}" y="${-200 - (i % 2) * 40}" width="140" height="${200 + (i % 2) * 40}" rx="40" fill="${['#ffd34d', '#7aa7ff', '#ff9ec4', '#9fd16b'][i]}" stroke="#fff" stroke-width="6"/>`).join('')}
      <rect x="-330" y="-110" width="660" height="110" rx="30" fill="#e9ecf5" stroke="#cfd6e4" stroke-width="5"/>
      <g transform="translate(250 -260)"><path d="M-60 0 Q-60 -70 0 -70 Q60 -70 60 0Z" fill="#d6334a"/><rect x="-66" y="-6" width="132" height="14" rx="6" fill="#a8263a"/>${txt(0, -24, 'SAFE', 22, { fill: '#fff' })}</g>
      <g transform="translate(-250 -260)">${[0, 1, 2].map(i => `<rect x="${-40 + i * 20}" y="${-60 + i * 8}" width="40" height="60" rx="6" fill="${['#ff8a3a', '#34d399', '#a78bfa'][i]}" transform="rotate(${-10 + i * 10})"/>`).join('')}</g></g>`;
    const svg = `${bedroomBG(c, { aft: true, clockSecs: clock(c) })}
      ${kip(c, { x: 820, lookX: tIn >= 0 ? 0.6 : 0, lookY: a === 'momTimer' ? -0.5 : 0 })}${timer(c, 820, topY('kip', 0, 1.05), { secs: toZero(c), s: 0.55 })}
      ${fort}
      ${tIn >= 0 ? person('mom', c, { x: momX, lookX: lookFrom(c, 'mom', P), pose: momPose }) : ''}
      ${tIn >= 0 && towelK < 1 ? `<g transform="translate(0 ${f(-towelK * 160)}) rotate(${f(towelK * 30)} ${f(momX)} 200)" opacity="${f(1 - towelK)}">${towel(momX, 905, 1.0)}</g>` : ''}
      ${tOff >= 0 ? timer(c, 1300, topY('mom', 0), { secs: toZero(c), s: 0.65, op: clamp((tOff - 0.6) / 0.4), glitch: tOff < 1.4 }) : ''}`;
    let cam = dcam(c, P);
    if (a === 'fort') cam = { z: lerp(1.0, 1.25, easeIO(lt / 5)), x: 820, y: 500 };
    if (a === 'knock') cam = { z: 1.05, x: 900, y: 540 };
    if (a === 'towelOff') cam = { z: lerp(1.25, 1.6, easeIO(lt / 2.4)), x: 1300, y: 300 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- ENDING: next morning, classroom
  S.ending = c => {
    const a = c.b.a, lt = c.lt;
    const P = { kip: { x: 700, s: 1.05 }, max: { x: 400, s: 1.0, h: 1.06 }, lily: { x: 1060, s: 1.0, h: 0.98 }, teach: { x: 1600, s: 1.0, h: 1.14 } };
    const anc = beatOf(c, 'newCount', 'TEACH');
    const v = anc ? cdAnchor(c, 'kittens', anc.speechEnd - 0.6, 3) : 99;
    const tt = since(c, 'teachTimer'), tk = since(c, 'kittens');
    const kitCols = ['#8e8a9a', '#f0a24a', '#333', '#f4f4f4', '#c9a46a', '#8e8a9a'];
    let kits = '';
    if (tk >= 0) {
      kits += cat(lerp(2050, 1350, easeOut(tk / 1.2)), 905, 0.9, c.t, { flip: true, happy: true });
      for (let i = 0; i < 6; i++) {
        const q = clamp((tk - 0.4 - i * 0.25) / 1.0);
        if (q > 0) kits += cat(lerp(2050, 1150 + i * 110 - (i % 2) * 40, easeOut(q)), 905 + (i % 2) * 40 - Math.abs(Math.sin(c.t * 10 + i)) * 12 * (q < 1 ? 1 : 0.3), 0.42, c.t + i, { flip: true, col: kitCols[i], stripe: '#0003', happy: true });
      }
    }
    const svg = `${classroomBG(c, ['GOOD MORNING!', 'NO MORE COUNTDOWNS', 'LIFE IS NORMAL AGAIN'])}${desk(400)}${desk(1060)}
      ${person('teach', c, { x: 1600, lookX: tk >= 0 ? 0.6 : lookFrom(c, 'teach', P), lookY: a === 'newCount' ? -0.6 : 0, pose: tk >= 0 ? 'surprise' : undefined })}
      ${tt >= 0 ? timer(c, 1600, topY('teach', 0), { secs: tk >= 0 ? 0 : v, zt: tk, s: 0.58, op: popOn(c, 'teachTimer', 0.4) * (tk >= 0 ? 1 - sm(3, 4, tk) : 1), glitch: tt < 0.6 }) : ''}
      ${person('lily', c, { x: 1060, lookX: lookFrom(c, 'lily', P) })}
      ${person('max', c, { x: 400, flip: false, lookX: lookFrom(c, 'max', P) })}
      ${kip(c, { x: 700, lookX: a === 'camera' ? 0 : lookFrom(c, 'kip', P) })}
      ${kits}`;
    let cam = dcam(c, P);
    if (a === 'teachTimer') cam = { z: lerp(1.2, 1.5, easeIO(lt / 1.8)), x: 1550, y: 330 };
    if (a === 'newCount' && c.b.v === 'TEACH') cam = { z: lerp(1.45, 1.75, easeIO(lt / 2.5)), x: 1600, y: 300 };
    if (a === 'kittens') cam = { z: 1.05, x: 1250, y: 560 };
    if (a === 'kitRead' && c.b.v === 'TEACH') cam = { z: 1.5, x: 1500, y: 380 };
    if (a === 'camera') cam = { z: lerp(1.6, 1.85, easeIO(lt / 4)), x: 700, y: 420 };
    return { svg, cam };
  };

  // ---------------------------------------------------------------- OUTRO
  S.outro = c => {
    const lt = c.lt;
    const click = lt > 4.5 && lt < 5.2, subbed = lt > 5;
    const cx = lerp(1700, 1150, easeOut((lt - 3) / 1.2)), cy = lerp(1000, 760, easeOut((lt - 3) / 1.2));
    const svg = `<linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a1f0a"/><stop offset="1" stop-color="#0a1830"/></linearGradient><rect width="1920" height="1080" fill="url(#og)"/>
      ${confetti(c.b.start + 5, c.t, 50, 8)}
      ${kip(c, { x: 450, y: 960, scale: 1.1, pose: 'wave', expression: 'happy', lookX: 0.5 })}
      ${puppy(640, 960, 0.8, c.t, { hop: true, flip: false })}
      <g transform="translate(1030 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d0f1c" stroke="#3b4a6b" stroke-width="5"/>${txt(0, 20, 'EP 3', 80, { fill: '#2c3550' })}${txt(0, 165, 'WATCH EP 3', 28, { fill: '#9fb3c8' })}</g>
      <g transform="translate(1500 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d0f1c" stroke="#ffb020" stroke-width="5"/>${txt(0, 30, '⏸', 110, { fill: '#2c3550' })}${txt(0, 165, 'NEXT: PAUSE TIME FOR EVERYONE', 22, { fill: '#ffb020' })}</g>
      <g transform="translate(1150 700) scale(${f(click ? 0.94 : 1)})"><rect x="-230" y="-55" width="460" height="110" rx="55" fill="${subbed ? '#3b4a6b' : '#e62e3d'}"/>${txt(0, 18, subbed ? 'SUBSCRIBED ✓' : 'SUBSCRIBE', 48, { fill: '#fff' })}</g>
      <path transform="translate(${f(cx)} ${f(cy)})" d="M0 0 L0 60 L16 46 L28 72 L40 66 L28 40 L48 40 Z" fill="#fff" stroke="#000" stroke-width="4"/>
      <g transform="translate(1260 900)" opacity="${f(sm(1.5, 2.5, lt))}"><rect x="-460" y="-50" width="920" height="100" rx="24" fill="#fff"/>${txt(0, 15, 'What would YOUR countdown count to?', 40, { fill: '#223' })}</g>`;
    return { svg, cam: { z: 1 } };
  };

  root.SCENES = S;
})(typeof window !== 'undefined' ? window : globalThis);
