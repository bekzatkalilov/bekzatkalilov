/* EP02 render engine (adapted from EP01): timeline -> SVG frame (1920x1080). Runs in the browser. */
(function (root) {
  'use strict';
  const W = 1920, H = 1080;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeIO = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const f = n => (Math.round(n * 100) / 100).toString();
  function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function txt(x, y, s, size, o = {}) {
    return `<text x="${f(x)}" y="${f(y)}" font-family="${o.font || "'Arial Black', Arial, sans-serif"}" font-weight="${o.w || 900}" font-size="${size}" fill="${o.fill || '#fff'}" text-anchor="${o.a || 'middle'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 8}" paint-order="stroke" stroke-linejoin="round"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.op !== undefined ? ` opacity="${f(o.op)}"` : ''}${o.tr ? ` transform="${o.tr}"` : ''}>${esc(s)}</text>`;
  }
  const H_ = { W, H, clamp, lerp, sm, easeOut, easeIO, f, rng, txt, esc };

  let TL = null, RUNS = [];
  function load(timing) {
    TL = timing; RUNS = [];
    timing.beats.forEach((b, i) => {
      const last = RUNS[RUNS.length - 1];
      if (last && last.s === b.s) { last.end = b.end; last.beats.push(i); }
      else RUNS.push({ s: b.s, start: i === 0 ? 0 : b.start, end: b.end, beats: [i] });
      b.run = RUNS.length - 1;
    });
  }

  function beatAt(t) {
    const B = TL.beats; let i = 0;
    for (let k = 0; k < B.length; k++) if (t >= B[k].start - 0.001) i = k;
    return i;
  }

  /* mouth envelope (0..1) for a speaker at time t */
  function talkOf(c, who) {
    const b = c.b;
    if (b.mode === 'think') return 0;
    const at = (start, env) => { const i = Math.floor((c.t - start) * 30); return clamp((env[i] || 0) * 7); };
    if (b.v === who) for (const s of b.sentences) if (c.t >= s.start && c.t < s.end) return at(s.start, s.env);
    for (const ch of (b.choirs || [])) if (ch.v === who && c.t >= ch.start && c.t < ch.end) return at(ch.start, ch.env);
    return 0;
  }
  /* is this character currently thinking out loud (for bubbles / ripples)? 0..1 */
  function thinkOf(c, who) {
    const b = c.b; if (b.mode !== 'think' || b.v !== who) return 0;
    return sm(0, 0.25, c.t - b.start) * (1 - sm(b.speechEnd - 0.1, b.speechEnd + 0.4, c.t));
  }
  /* supporting-cast expression: b.e[who], inherited within the scene run, tweened at changes */
  function eExpr(c, who, fallback = 'neutral', tr = 0.35) {
    const B = TL.beats, run = RUNS[c.b.run];
    const get = i => { for (let k = i; k >= run.beats[0]; k--) if (B[k].e && B[k].e[who]) return B[k].e[who]; return fallback; };
    const cur = get(c.bi), lt = c.t - c.b.start;
    if (c.bi > run.beats[0]) { const prev = get(c.bi - 1); if (prev !== cur && lt < tr) return { from: prev, to: cur, t: lt / tr }; }
    return cur;
  }

  /* expression for a character: blends from previous beat in the same run */
  function kExpr(c, key = 'k', fallback = 'neutral', tr = 0.4) {
    const B = TL.beats, run = RUNS[c.b.run];
    const cur = c.b[key] || prevDefined(c.bi, key, run) || fallback;
    const pIdx = c.bi - 1;
    if (pIdx >= run.beats[0] && pIdx >= 0) {
      const prev = B[pIdx][key] || prevDefined(pIdx, key, run) || fallback;
      if (prev !== cur && c.lt < tr) return { from: prev, to: cur, t: c.lt / tr };
    }
    return cur;
  }
  function prevDefined(i, key, run) {
    for (let k = i; k >= run.beats[0]; k--) if (TL.beats[k][key]) return TL.beats[k][key];
    return null;
  }

  /* subtitles */
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
    const since = t - sub.start, pop = 0.88 + 0.12 * easeOut(since / 0.12);
    const spans = words.map(w => {
      const on = hl.includes(w.toLowerCase().replace(/[^a-z0-9']/g, ''));
      return `<tspan fill="${on ? '#ffd34d' : '#ffffff'}">${esc(w)}</tspan>`;
    }).join(' ');
    const size = sub.text.length > 34 ? 54 : 62;
    const COL = { KIP: '#f07a2a', MAX: '#2bc4b3', MOM: '#ff7bb0', GRAN: '#9fd16b', COCO: '#c48bff', N: '#ffd34d' };
    const think = beat.mode === 'think';
    const who = beat.v === 'N' ? null : (beat.chorus ? 'EVERYONE' : (TL.names[beat.v] || beat.v));
    const wcol = beat.chorus ? '#ffd34d' : (COL[beat.v] || '#8fd8ff');
    const label = who ? (think ? who + ' (THINKING)' : who) : '';
    return `<g transform="translate(960 995) scale(${f(pop)})">
      ${label ? `<text x="0" y="-72" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="30" fill="${think ? '#8fe9ff' : wcol}" stroke="#000" stroke-width="7" paint-order="stroke">${esc(label)}</text>` : ''}
      <text x="0" y="0" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-style="${think ? 'italic' : 'normal'}" font-size="${size}" stroke="${think ? '#062a3a' : '#000'}" stroke-width="13" paint-order="stroke" stroke-linejoin="round">${think ? spans.replace(/#ffffff/g, '#bff4ff') : spans}</text></g>`;
  }

  function hud() { return ''; }

  function frame(t) {
    const B = TL.beats, bi = beatAt(t), b = B[bi], run = RUNS[b.run];
    const c = { t, b, bi, lt: t - b.start, run, rt: t - run.start, rdur: run.end - run.start, H: H_,
      kExpr: (k, fb, tr) => kExpr({ b, bi, lt: t - b.start }, k, fb, tr), talk: who => talkOf({ b, t }, who),
      think: who => thinkOf({ b, t }, who), eExpr: (who, fb, tr) => eExpr({ b, bi, t }, who, fb, tr),
      sentIdx: () => { let k = 0; b.sentences.forEach((s, i) => { if (t >= s.start - 0.05) k = i; }); return k; },
      runBeatIdx: () => run.beats.indexOf(bi) };
    const sc = root.SCENES[b.s] || root.SCENES.yard;
    const r = sc(c) || {};
    const svg = typeof r === 'string' ? r : r.svg;
    const cam = Object.assign({ z: 1 + 0.05 * (c.rt / Math.max(1, c.rdur)), x: 960, y: 540, r: 0 }, r.cam || {});
    // handheld drift
    const hx = Math.sin(t * 0.7) * 6 + Math.sin(t * 1.9) * 2, hy = Math.cos(t * 0.6) * 4;
    // run-in transition
    const tin = c.rt, z = cam.z * (1 + 0.06 * (1 - easeOut(tin / 0.6)));
    // keep the view inside the 1920x1080 world (no black edges)
    const zz = Math.max(z, 1.0), mx = 960 / zz + 14, my = 540 / zz + 10;
    cam.x = Math.max(mx, Math.min(1920 - mx, cam.x)); cam.y = Math.max(my, Math.min(1080 - my, cam.y));
    const fade = b.s === 'title' || b.s === 'hook' ? 0 : clamp(1 - tin / 0.3);
    const flash = b.s === 'title' ? clamp(1 - tin / 0.25) : 0;
    const out = clamp(1 - (run.end - t) / 0.18) * (run.end < TL.duration - 1 ? 1 : 0);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <rect width="1920" height="1080" fill="#000"/>
      <g transform="translate(${f(960 + hx)} ${f(540 + hy)}) rotate(${f(cam.r)}) scale(${f(Math.max(z, 1.0) * (1 + 0.012 * Math.abs(cam.r)))}) translate(${f(-cam.x)} ${f(-cam.y)})">${svg}</g>
      ${r.overlay || ''}
      <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#vg)"/>
      
      ${subtitle(t)}
      ${fade > 0 ? `<rect width="1920" height="1080" fill="#000" opacity="${f(fade)}"/>` : ''}
      ${flash > 0 ? `<rect width="1920" height="1080" fill="#fff" opacity="${f(flash * 0.7)}"/>` : ''}
      ${out > 0 ? `<rect width="1920" height="1080" fill="#000" opacity="${f(out * 0.8)}"/>` : ''}
    </svg>`;
  }

  root.Engine = { load, frame, beatAt, H: H_, runs: () => RUNS, tl: () => TL };
})(typeof window !== 'undefined' ? window : globalThis);
