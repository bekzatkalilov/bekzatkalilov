/* Episode render engine: timeline -> SVG frame (1920x1080). Runs in the browser. */
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
      if (last && last.s === b.s && b.s !== 'card') { last.end = b.end; last.beats.push(i); }
      else RUNS.push({ s: b.s, start: i === 0 ? 0 : b.start, end: b.end, beats: [i] });
      b.run = RUNS.length - 1;
    });
    // hour markers for HUD
    TL.hours = [];
    timing.beats.forEach(b => {
      if (b.s !== 'card') return;
      const m = (b.card + ' ' + (b.sub || '')).match(/HOUR (\d+)/);
      if (m) TL.hours.push({ t: b.start, h: +m[1] });
    });
  }

  function beatAt(t) {
    const B = TL.beats; let i = 0;
    for (let k = 0; k < B.length; k++) if (t >= B[k].start - 0.001) i = k;
    return i;
  }

  function hoursAt(t) {
    const hs = TL.hours; if (!hs.length || t < hs[0].t) return 0;
    for (let i = 0; i < hs.length - 1; i++) if (t < hs[i + 1].t) {
      return lerp(hs[i].h, hs[i + 1].h, clamp((t - hs[i].t) / (hs[i + 1].t - hs[i].t)));
    }
    return hs[hs.length - 1].h;
  }

  /* mouth envelope (0..1) for a speaker at time t */
  function talkOf(c, who) {
    const b = c.b; if (b.v !== who) return 0;
    for (const s of b.sentences) {
      if (c.t >= s.start && c.t < s.end) {
        const i = Math.floor((c.t - s.start) * 30);
        return clamp((s.env[i] || 0) * 7);
      }
    }
    return 0;
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
    const size = sub.text.length > 34 ? 56 : 64;
    const who = beat.v !== 'N' ? { KIP: '#f07a2a', MAX: '#2bc4b3', DOC: '#b38bff' }[beat.v] : null;
    return `<g transform="translate(960 ${who ? 990 : 995}) scale(${f(pop)})">
      ${who ? `<text x="0" y="-74" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="30" fill="${who}" stroke="#000" stroke-width="7" paint-order="stroke">${{ KIP: 'KIP', MAX: 'MAX', DOC: 'DOCTOR' }[beat.v]}</text>` : ''}
      <text x="0" y="0" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="${size}" stroke="#000" stroke-width="13" paint-order="stroke" stroke-linejoin="round">${spans}</text></g>`;
  }

  const HUD_SCENES = new Set(['room', 'car', 'kitchen', 'lab', 'halluc', 'arcade', 'haunt']);
  function hud(c) {
    if (!HUD_SCENES.has(c.b.s)) return '';
    if (c.b.s === 'room' && c.t < (TL.hours[0] || { t: 1e9 }).t && c.b.a !== 'day' && !['maxIn', 'max'].includes(c.b.a)) { /* pre-challenge */ }
    let h = c.b.s === 'haunt' ? 84 + c.t / 10 : hoursAt(c.t);
    const day = Math.min(11, Math.floor(h / 24) + 1), pct = clamp(h / 264);
    const blink = Math.floor(c.t * 2) % 2 === 0;
    return `<g transform="translate(48 44)">
      <rect width="330" height="74" rx="16" fill="#000" opacity="0.55"/>
      <circle cx="34" cy="37" r="9" fill="#ff3b55" opacity="${blink ? 1 : 0.3}"/>
      ${txt(56, 33, `AWAKE ${Math.floor(h)}h`, 26, { a: 'start', fill: '#fff' })}
      ${txt(56, 58, `DAY ${day} OF 11`, 16, { a: 'start', fill: '#9fb3c8', w: 700, ls: 2 })}
      <rect x="200" y="46" width="110" height="10" rx="5" fill="#2a2f3f"/>
      <rect x="200" y="46" width="${f(110 * pct)}" height="10" rx="5" fill="${pct > 0.6 ? '#ff5470' : pct > 0.3 ? '#ffb347' : '#34d399'}"/>
    </g>`;
  }

  function frame(t) {
    const B = TL.beats, bi = beatAt(t), b = B[bi], run = RUNS[b.run];
    const c = { t, b, bi, lt: t - b.start, run, rt: t - run.start, rdur: run.end - run.start, H: H_,
      kExpr: (k, fb, tr) => kExpr({ b, bi, lt: t - b.start }, k, fb, tr), talk: who => talkOf({ b, t }, who),
      sentIdx: () => { let k = 0; b.sentences.forEach((s, i) => { if (t >= s.start - 0.05) k = i; }); return k; },
      runBeatIdx: () => run.beats.indexOf(bi), hours: hoursAt(t) };
    const sc = root.SCENES[b.s] || root.SCENES.room;
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
    const fade = b.s === 'card' || b.s === 'title' ? 0 : clamp(1 - tin / 0.3);
    const flash = (b.s === 'card' || b.s === 'title') ? clamp(1 - tin / 0.25) : 0;
    const out = clamp(1 - (run.end - t) / 0.18) * (run.end < TL.duration - 1 ? 1 : 0);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
      <rect width="1920" height="1080" fill="#000"/>
      <g transform="translate(${f(960 + hx)} ${f(540 + hy)}) rotate(${f(cam.r)}) scale(${f(Math.max(z, 1.0) * (1 + 0.012 * Math.abs(cam.r)))}) translate(${f(-cam.x)} ${f(-cam.y)})">${svg}</g>
      ${r.overlay || ''}
      <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#vg)"/>
      ${hud(c)}
      ${subtitle(t)}
      ${fade > 0 ? `<rect width="1920" height="1080" fill="#000" opacity="${f(fade)}"/>` : ''}
      ${flash > 0 ? `<rect width="1920" height="1080" fill="#fff" opacity="${f(flash * 0.7)}"/>` : ''}
      ${out > 0 ? `<rect width="1920" height="1080" fill="#000" opacity="${f(out * 0.8)}"/>` : ''}
    </svg>`;
  }

  root.Engine = { load, frame, beatAt, H: H_, runs: () => RUNS, tl: () => TL };
})(typeof window !== 'undefined' ? window : globalThis);
