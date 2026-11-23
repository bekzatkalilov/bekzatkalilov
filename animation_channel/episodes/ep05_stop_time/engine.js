/* EP05 render engine: timeline -> SVG frame (1920x1080). Runs in the browser.
 * New for EP05: global time-freeze state (beat.z), a "frozen" colour grade scenes apply to the world
 * layers (c.F), cinematic letterbox, frost vignette and a new subtitle style. */
(function (root) {
  'use strict';
  const W = 1920, H = 1080;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeIO = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const f = n => (Math.round(n * 100) / 100).toString();
  function rng(seed) { let s = Math.floor(seed) % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const FONT = "'Inter Display', 'Inter', 'DejaVu Sans', sans-serif";
  function txt(x, y, s, size, o = {}) {
    return `<text x="${f(x)}" y="${f(y)}" font-family="${o.font || FONT}" font-weight="${o.w || 900}" font-size="${size}" fill="${o.fill || '#fff'}" text-anchor="${o.a || 'middle'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 8}" paint-order="stroke" stroke-linejoin="round"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.op !== undefined ? ` opacity="${f(o.op)}"` : ''}${o.tr ? ` transform="${o.tr}"` : ''}>${esc(s)}</text>`;
  }
  const H_ = { W, H, clamp, lerp, sm, easeOut, easeIO, f, rng, txt, esc, FONT };

  let TL = null, RUNS = [];
  function load(timing) {
    TL = timing; RUNS = [];
    let z = 0, zt = -100;
    timing.beats.forEach((b, i) => {
      const last = RUNS[RUNS.length - 1];
      if (last && last.s === b.s) { last.end = b.end; last.beats.push(i); }
      else RUNS.push({ s: b.s, start: i === 0 ? 0 : b.start, end: b.end, beats: [i] });
      b.run = RUNS.length - 1;
      if (b.z !== undefined && b.z !== z) { z = b.z; zt = i === 0 ? -100 : b.start; }
      b.zv = z; b.zt = zt;
    });
    // frozen intervals -> world clock (stands still while time is stopped)
    FZ = []; let open = null;
    timing.beats.forEach(b => {
      if (b.zv && open === null) open = Math.max(0, b.zt);
      if (!b.zv && open !== null) { FZ.push([open, b.zt]); open = null; }
    });
    if (open !== null) FZ.push([open, 1e9]);
  }
  let FZ = [];
  function worldTime(t) {
    let w = t;
    for (const [a, b] of FZ) if (t > a) w -= Math.min(t, b) - a;
    return w;
  }

  function beatAt(t) {
    const B = TL.beats; let i = 0;
    for (let k = 0; k < B.length; k++) if (t >= B[k].start - 0.001) i = k;
    return i;
  }

  /* mouth envelope (0..1) for a speaker at time t */
  function talkOf(c, who) {
    const b = c.b;
    const at = (start, env) => { const i = Math.floor((c.t - start) * 30); return clamp((env[i] || 0) * 7); };
    if (b.v === who) for (const s of b.sentences) if (c.t >= s.start && c.t < s.end) return at(s.start, s.env);
    for (const ch of (b.choirs || [])) if (ch.v === who && c.t >= ch.start && c.t < ch.end) return at(ch.start, ch.env);
    return 0;
  }
  /* supporting-cast expression: b.e[who], inherited within the scene run, tweened at changes */
  function eExpr(c, who, fallback = 'neutral', tr = 0.35) {
    const B = TL.beats, run = RUNS[c.b.run];
    const get = i => { for (let k = i; k >= run.beats[0]; k--) if (B[k].e && B[k].e[who]) return B[k].e[who]; return fallback; };
    const cur = get(c.bi), lt = c.t - c.b.start;
    if (c.bi > run.beats[0]) { const prev = get(c.bi - 1); if (prev !== cur && lt < tr) return { from: prev, to: cur, t: lt / tr }; }
    return cur;
  }
  function prevDefined(i, key, run) {
    for (let k = i; k >= run.beats[0]; k--) if (TL.beats[k][key]) return TL.beats[k][key];
    return null;
  }
  /* Kip expression / pose: blends from the previous beat in the same run */
  function kExpr(c, key = 'k', fallback = 'neutral', tr = 0.4) {
    const B = TL.beats, run = RUNS[c.b.run];
    const cur = c.b[key] || prevDefined(c.bi, key, run) || fallback;
    const pIdx = c.bi - 1;
    if (pIdx >= run.beats[0] && pIdx >= 0) {
      const prev = B[pIdx][key] || prevDefined(pIdx, key, run) || fallback;
      if (JSON.stringify(prev) !== JSON.stringify(cur) && c.lt < tr) return { from: prev, to: cur, t: c.lt / tr };
    }
    return cur;
  }

  /* time-freeze amount 0..1 at time t (0.55 s transitions) */
  function zAmt(b, t) {
    const d = t - b.zt;
    return b.zv ? sm(0, 0.55, d) : 1 - sm(0, 0.55, d);
  }
  /* colour matrix: identity -> icy monochrome blue */
  function fzMatrix(a) {
    const L = [0.2126, 0.7152, 0.0722];
    const ice = [[0.55, 0.0], [0.78, 0.04], [1.02, 0.13]];   // [gain, offset] per channel
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let k = 0; k < 3; k++) row.push(lerp(r === k ? 1 : 0, L[k] * ice[r][0], a));
      row.push(0, lerp(0, ice[r][1], a));
      rows.push(row.map(v => f(v)).join(' '));
    }
    rows.push('0 0 0 1 0');
    return rows.join(' ');
  }

  /* subtitles: dark rounded caption box + coloured speaker tag (EP05 style) */
  const COL = { KIP: '#ff8f3a', MAX: '#34d3c0', MOM: '#ff86b8', PROF: '#c8a2ff', HOOD: '#9aa6b8', WREN: '#8fe3ff',
    VEND: '#ffcf5a', ANN: '#7fd0ff', GIRL: '#ffb3d9', TRAIN: '#9ef0c4', N: '#ffd34d' };
  function subtitle(t) {
    const B = TL.beats; const bi = beatAt(t);
    let sub = null, beat = null;
    for (const k of [bi, bi - 1]) {
      if (k < 0) continue;
      for (const s of B[k].subs) if (t >= s.start && t < s.end) { sub = s; beat = B[k]; }
      if (sub) break;
    }
    if (!sub) return '';
    const hl = (beat.hl || []).map(w => w.toLowerCase().replace(/[^a-z0-9']/g, ''));
    const words = sub.text.split(' ');
    const since = t - sub.start, pop = easeOut(since / 0.15);
    const spans = words.map(w => {
      const on = hl.includes(w.toLowerCase().replace(/[^a-z0-9']/g, ''));
      return `<tspan fill="${on ? '#ffd34d' : '#ffffff'}">${esc(w)}</tspan>`;
    }).join(' ');
    const size = 50;
    const tw = sub.text.length * size * 0.54 + 70;
    const who = beat.v === 'N' ? 'NARRATOR' : (beat.chorus ? 'KIP + WREN' : (TL.names[beat.v] || beat.v));
    const col = COL[beat.v] || '#8fd8ff';
    const tagW = who.length * 15 + 40;
    return `<g transform="translate(960 ${f(1000 + (1 - pop) * 14)})" opacity="${f(0.3 + 0.7 * pop)}">
      <rect x="${f(-tw / 2)}" y="-46" width="${f(tw)}" height="72" rx="20" fill="#05070d" fill-opacity="0.78" stroke="${col}" stroke-opacity="0.55" stroke-width="2.5"/>
      <rect x="${f(-tw / 2 + 18)}" y="-66" width="${f(tagW)}" height="34" rx="11" fill="${col}"/>
      <text x="${f(-tw / 2 + 18 + tagW / 2)}" y="-42" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="20" letter-spacing="2" fill="#05070d">${esc(who)}</text>
      <text x="0" y="8" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}">${spans}</text></g>`;
  }

  function frame(t) {
    const B = TL.beats, bi = beatAt(t), b = B[bi], run = RUNS[b.run];
    const z = zAmt(b, t);
    const c = { t, b, bi, lt: t - b.start, run, rt: t - run.start, rdur: run.end - run.start, H: H_, z,
      zEdge: t - b.zt, frozen: b.zv === 1, wt: worldTime(t),
      kExpr: (k, fb, tr) => kExpr({ b, bi, lt: t - b.start }, k, fb, tr), talk: who => talkOf({ b, t }, who),
      eExpr: (who, fb, tr) => eExpr({ b, bi, t }, who, fb, tr),
      F: svg => (z > 0.005 ? `<g filter="url(#fz)">${svg}</g>` : svg) };
    const sc = root.SCENES[b.s];
    const r = sc(c) || {};
    const svg = typeof r === 'string' ? r : r.svg;
    const cam = Object.assign({ z: 1 + 0.05 * (c.rt / Math.max(1, c.rdur)), x: 960, y: 540 }, r.cam || {});
    // gentle floating "steadicam" drift (stops dead while time is frozen — a deliberate stylistic touch)
    const drift = 1 - 0.85 * z;
    const hx = (Math.sin(t * 0.55) * 7 + Math.sin(t * 1.7) * 2) * drift, hy = (Math.cos(t * 0.5) * 4) * drift;
    const tin = c.rt, zz0 = cam.z * (1 + 0.05 * (1 - easeOut(tin / 0.7)));
    // keep the view inside the 1920x1080 world (no black edges)
    const zz = Math.max(zz0, 1.0), mx = 960 / zz + 14, my = 540 / zz + 10;
    cam.x = Math.max(mx, Math.min(1920 - mx, cam.x)); cam.y = Math.max(my, Math.min(1080 - my, cam.y));
    const fade = b.s === 'hook' || b.s === 'title' ? 0 : clamp(1 - tin / 0.3);
    const flash = b.s === 'title' ? clamp(1 - tin / 0.25) : 0;
    const out = clamp(1 - (run.end - t) / 0.18) * (run.end < TL.duration - 1 ? 1 : 0);
    const frost = z > 0.01 && !r.noFrost ? `<radialGradient id="frost" cx="0.5" cy="0.5" r="0.72"><stop offset="0.62" stop-color="#cfefff" stop-opacity="0"/><stop offset="1" stop-color="#dff6ff" stop-opacity="${f(0.42 * z)}"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#frost)"/>
      <g transform="translate(70 118)" opacity="${f(z)}"><circle r="24" fill="none" stroke="#bfefff" stroke-width="4"/><path d="M0 -14 L0 0 L10 6" stroke="#bfefff" stroke-width="4" fill="none" stroke-linecap="round"/>
      <text x="40" y="9" font-family="${FONT}" font-weight="800" font-size="24" letter-spacing="5" fill="#dff6ff">TIME STOPPED</text></g>` : '';
    const bar = r.bars === undefined ? 62 : r.bars;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <defs><filter id="fz" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${fzMatrix(z)}"/></filter></defs>
      <rect width="1920" height="1080" fill="#000"/>
      <g transform="translate(${f(960 + hx)} ${f(540 + hy)}) scale(${f(zz)}) translate(${f(-cam.x)} ${f(-cam.y)})">${svg}</g>
      ${r.overlay || ''}
      <radialGradient id="vg" cx="0.5" cy="0.5" r="0.78"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#vg)"/>
      ${frost}
      ${bar ? `<rect width="1920" height="${bar}" fill="#000"/><rect y="${1080 - bar}" width="1920" height="${bar}" fill="#000"/>` : ''}
      ${subtitle(t)}
      ${fade > 0 ? `<rect width="1920" height="1080" fill="#000" opacity="${f(fade)}"/>` : ''}
      ${flash > 0 ? `<rect width="1920" height="1080" fill="#fff" opacity="${f(flash * 0.7)}"/>` : ''}
      ${out > 0 ? `<rect width="1920" height="1080" fill="#000" opacity="${f(out * 0.8)}"/>` : ''}
    </svg>`;
  }

  root.Engine = { load, frame, beatAt, H: H_, runs: () => RUNS, tl: () => TL };
})(typeof window !== 'undefined' ? window : globalThis);
