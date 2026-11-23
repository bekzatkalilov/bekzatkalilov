/* EP05 "What If You Could Stop Time?" — scenes (browser). Every environment here is new for EP05.
 * World layers go through c.F() (the frozen colour grade); Kip and anyone who can move in stopped time stay in colour.
 * All characters stand upright; the camera never rolls. */
(function (root) {
  'use strict';
  const { clamp, lerp, sm, easeOut, easeIO, f, rng, txt, FONT } = root.Engine.H;
  const K = root.Kip, X = root.Extras, L = root.L5;
  const { since, sinceLast, beatOf, after, kip, person, lookFrom, hooded, walker, stander, ripple, zFlash, motes, crack, streak, par, dcam,
    clapPose, walkPose, P_CLAP, P_REACH, P_DRAG, CAST } = L;
  const S = {};
  const sky = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

  // =====================================================================================================
  // NEON AVENUE — night, rain, magenta/cyan neon, wet reflective street (hook + scene 4)
  // =====================================================================================================
  function avenueBG(c, cam) {
    const r = rng(41), wt = c.wt;
    let far = '';
    for (let i = 0; i < 26; i++) {
      const x = -700 + i * 130 + r() * 60, w = 70 + r() * 110, h = 260 + r() * 480, top = 700 - h;
      far += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h + 100)}" fill="${['#1a0f33', '#160c2c', '#21123d'][i % 3]}"/>`;
      for (let k = 0; k < 14; k++) if (r() > 0.45) far += `<rect x="${f(x + 8 + r() * (w - 20))}" y="${f(top + 12 + r() * (h - 30))}" width="6" height="4" fill="${r() > 0.5 ? '#ff4fd8' : '#4ff0ff'}" opacity="${f(0.35 + r() * 0.5)}"/>`;
      if (r() > 0.7) far += `<rect x="${f(x + w / 2 - 2)}" y="${f(top - 60)}" width="4" height="60" fill="#2a1a4a"/><circle cx="${f(x + w / 2)}" cy="${f(top - 62)}" r="5" fill="#ff3355" opacity="${f(0.5 + 0.5 * Math.sin(wt * 3 + i))}"/>`;
    }
    const flick = (k) => (c.z > 0.5 ? 1 : (Math.sin(wt * 17 + k * 3) > -0.92 ? 1 : 0.35));
    const sign = (x, y, w, h, label, col, k, vert = false) => `<g opacity="${f(flick(k))}">
      <rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="18" fill="${col}" opacity="0.18"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#0b0716" stroke="${col}" stroke-width="5"/>
      ${vert ? label.split('').map((ch, i) => txt(x + w / 2, y + 58 + i * 62, ch, 52, { fill: '#fff', stroke: col, sw: 3 })).join('') : txt(x + w / 2, y + h / 2 + 20, label, 54, { fill: '#fff', stroke: col, sw: 3, ls: 3 })}</g>`;
    const cars = [0, 1, 2, 3].map(i => {
      const sp = 260 + i * 70, dir = i % 2 ? -1 : 1, y = 250 + i * 55;
      const x = dir > 0 ? ((wt * sp + i * 700) % 3200) - 640 : 2560 - ((wt * sp + i * 900) % 3200);
      return L.hoverCar(x, y, 0.32 + i * 0.04, ['#ff4fd8', '#4ff0ff', '#ffd34d', '#8a7dff'][i], c.t, { flip: dir < 0, trail: c.z > 0.5 ? 0 : 260, trailCol: ['#ff4fd8', '#4ff0ff', '#ffd34d', '#8a7dff'][i] });
    }).join('');
    const reflections = [[180, '#ff4fd8'], [420, '#4ff0ff'], [1560, '#ffd34d'], [1780, '#ff4fd8'], [960, '#8a7dff']].map(([x, col]) =>
      `<rect x="${x - 40}" y="770" width="80" height="320" fill="${col}" opacity="0.13"/><rect x="${x - 10}" y="770" width="20" height="320" fill="${col}" opacity="0.18"/>`).join('');
    return `${sky('avsky', [[0, '#07041a'], [0.55, '#2a0f47'], [1, '#5a1a5e']])}
      <g transform="${par(cam, 0.55)}"><rect x="-800" y="-200" width="3520" height="1400" fill="url(#avsky)"/>
        <circle cx="1400" cy="170" r="70" fill="#ffe6f6" opacity="0.85"/><circle cx="1400" cy="170" r="150" fill="#ff8fe0" opacity="0.12"/>${far}</g>
      <g transform="${par(cam, 0.35)}">${cars}</g>
      <g transform="${par(cam, 0.15)}">
        <rect x="-400" y="80" width="760" height="700" fill="#140c26"/><rect x="1500" y="40" width="900" height="740" fill="#170d2c"/>
        ${[...Array(5)].map((_, i) => `<rect x="${-360 + i * 140}" y="${150 + (i % 2) * 40}" width="90" height="120" fill="#2a1a4a"/><rect x="${-360 + i * 140}" y="${380 + (i % 2) * 20}" width="90" height="120" fill="#301d55"/>`).join('')}
        ${sign(90, 130, 110, 520, 'NOODLE', '#ff4fd8', 1, true)}${sign(250, 560, 300, 110, 'OPEN 24/7', '#4ff0ff', 2)}
        ${sign(1560, 110, 420, 130, 'HOLO CAFE', '#4ff0ff', 3)}${sign(1640, 300, 330, 110, 'SYNTH BAR', '#ffd34d', 4)}${sign(1580, 470, 120, 280, '88', '#ff4fd8', 5, true)}
        <rect x="360" y="650" width="1140" height="130" fill="#0e0820"/>
        ${[...Array(8)].map((_, i) => `<rect x="${400 + i * 140}" y="672" width="100" height="90" fill="${i % 3 ? '#1d1240' : '#ff4fd8'}" opacity="${i % 3 ? 1 : 0.25}"/>`).join('')}</g>
      <rect x="-200" y="770" width="2320" height="400" fill="#0b0918"/>
      ${reflections}
      <rect x="-200" y="770" width="2320" height="10" fill="#3a2a6a" opacity="0.8"/>
      ${[...Array(9)].map((_, i) => `<rect x="${-100 + i * 260}" y="990" width="150" height="16" fill="#e8e0ff" opacity="0.18"/>`).join('')}
      <ellipse cx="1180" cy="950" rx="190" ry="22" fill="#4ff0ff" opacity="0.12"/><ellipse cx="420" cy="980" rx="140" ry="16" fill="#ff4fd8" opacity="0.14"/>`;
  }
  /* rain: falls with the world clock; when frozen the drops hang as beads; Kip pushes them aside as he walks */
  function rain(c, front, kx = -999) {
    const r = rng(front ? 77 : 78), n = front ? 70 : 120; let s = '';
    const fr = c.z > 0.5;
    for (let i = 0; i < n; i++) {
      let x = -240 + r() * 2400, y = ((r() * 1200 + c.wt * (front ? 1500 : 1100)) % 1200) - 60;
      x -= (y + 60) * 0.12;
      if (fr && kx > -900) { const dx = x - kx, dy = y - 650; const d = Math.hypot(dx, dy * 0.5); if (d < 170) x += Math.sign(dx || 1) * (170 - d) * 0.9; }
      if (fr) s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${front ? 3.4 : 2.4}" ry="${front ? 6 : 4.5}" fill="#eaffff" opacity="${front ? 0.9 : 0.6}"/><path d="M${f(x)} ${f(y - 14)} L${f(x)} ${f(y - 5)}" stroke="#eaffff" stroke-width="1.5" opacity="0.4"/>`;
      else s += `<path d="M${f(x)} ${f(y)} l-6 ${front ? 46 : 32}" stroke="#bfd8ff" stroke-width="${front ? 2.6 : 1.6}" opacity="${front ? 0.55 : 0.35}"/>`;
    }
    return s;
  }
  function umbrella(col) {
    return `<g transform="translate(-60 0)"><path d="M60 0 L0 -470" stroke="#222" stroke-width="7"/><g transform="translate(0 -180)"><path d="M-190 -290 Q0 -440 190 -290 Q160 -310 127 -290 Q95 -315 63 -290 Q32 -318 0 -290 Q-32 -318 -63 -290 Q-95 -315 -127 -290 Q-160 -310 -190 -290Z" fill="${col}"/></g></g>
      <path d="M0 0 q0 22 -18 22" stroke="#222" stroke-width="7" fill="none"/>`;
  }

  function avenueScene(c, hook) {
    const a = c.b.a, lt = c.lt;
    const tWalk = since(c, 'walk'), tRain = since(c, 'rainWalk'), tCrack = hook ? 99 : since(c, 'crack'), tFoot = since(c, 'footstep'), tReach = since(c, 'reach');
    let kx = hook ? lerp(720, 1000, clamp((c.t - 0.3) / 6)) : (tRain >= 0 ? lerp(760, 1000, easeIO(Math.min(tRain, 7.5) / 7.5)) : (tWalk >= 0 && since(c, 'decide') < 0 ? lerp(560, 760, easeIO(tWalk / 5)) : 760));
    const mx = hook ? 560 : (since(c, 'decide') < 0 ? lerp(360, 560, easeIO(Math.max(0, tWalk) / 5)) : 560);
    const walking = (!hook && tWalk >= 0 && since(c, 'decide') < 0 && tWalk < 5) || (tRain >= 0 && tRain < 7.5 && tFoot < 0) || (hook && c.t < 4.1);
    const hx = 1480, hoodOn = tFoot >= 0;
    const P = { kip: { x: kx }, max: { x: mx, h: 1.06 } };
    if (hoodOn) P.wren = { x: hx, h: 0.98 };
    // camera first (parallax depends on it)
    let cam = dcam(c, P, { wideX: 900 });
    if (a === 'walk') cam = { z: 1.18, x: lerp(mx, kx, 0.5) + 60, y: 560 };
    if (a === 'decide' && c.b.v === 'KIP') cam = { z: 1.6, x: kx, y: 420 };
    if (a === 'clap') cam = { z: lerp(1.5, 1.9, easeIO(lt / 1.4)), x: kx, y: lerp(560, 600, lt / 1.4) };
    if (a === 'rainWalk' || a === 'hookOpen') cam = hook ? { z: lerp(2.1, 1.35, easeIO(c.t / 4)), x: lerp(kx + 120, kx, easeIO(c.t / 4)), y: lerp(440, 520, easeIO(c.t / 4)) } : { z: lerp(1.35, 1.5, easeIO(lt / 8)), x: kx + 80, y: 520 };
    if (a === 'crack') cam = { z: lerp(1.3, 1.65, easeIO(lt / 1.7)), x: lerp(kx, 1260, easeIO(lt / 1.7)), y: 450 };
    if (a === 'crackSee') cam = { z: 1.45, x: (kx + 1260) / 2, y: 470 };
    if (a === 'footstep') cam = { z: 1.9, x: hx - 40, y: lerp(820, 760, lt / 0.8) };
    if (a === 'hoodReveal') cam = { z: lerp(1.9, 1.6, easeIO(lt / 1.4)), x: hx, y: lerp(760, 400, easeIO(lt / 1.2)) };
    if (a === 'hookScream') cam = { z: 2.1, x: kx, y: 400 + Math.sin(c.t * 60) * 6 };
    if (a === 'face' && c.b.v === 'HOOD') cam = { z: 1.55, x: hx - 60, y: 420 };
    if (a === 'reach') cam = c.b.v === 'HOOD' ? { z: lerp(1.25, 1.5, easeIO(lt / 3)), x: (kx + hx) / 2 + 160, y: 480 } : { z: 1.75, x: kx, y: 420 };
    const kPose = (a === 'clap' ? clapPose(lt) : null) || (walking ? walkPose(c.t, 0.8) : undefined);
    const crackG = tCrack >= 0 ? crack(1260, 430, 300, 9, clamp(tCrack / 1.2)) + crack(1260, 430, 220, 12, clamp(tCrack / 1.5)) : '';
    const world = `${avenueBG(c, cam)}${rain(c, false)}
      ${[[380, 22, true, '#ffd34d', 0.55, 790], [230, 9, false, '#4ff0ff', 0.92, 905], [1860, 4, true, '#ff4fd8', 0.92, 905]].map(([x, i, fl, col, s, y]) => stander(c, { i, x, y, s, flip: fl, pose: Object.assign(walkPose(i * 0.7 + 0.4, 0.8), { armR: { sh: 30, el: -120 } }), hold: { side: 1, svg: umbrella(col) } })).join('')}
      ${person('max', c, { x: mx, flip: false, lookX: c.z > 0.5 ? 0.3 : lookFrom(c, 'max', P), pose: walking && c.z < 0.5 ? walkPose(c.t + 0.3, 0.8) : (since(c, 'decide') >= 0 ? { armR: { sh: 70, el: -30 } } : undefined) })}`;
    const hoodOp = hoodOn ? clamp(tFoot / 0.6) : 0;
    const fg = `${crackG}
      ${hoodOn ? `<g opacity="${f(hoodOp)}">${hooded(c, { x: hx, pose: tReach >= 0 && c.b.v === 'HOOD' ? P_REACH : 'idle' })}</g>` : ''}
      ${kip(c, { x: kx, pose: kPose, lookX: hoodOn ? 0.75 : (a === 'crack' || a === 'crackSee' ? 0.6 : (walking ? 0.5 : lookFrom(c, 'kip', P))), lookY: a === 'crack' || a === 'crackSee' ? -0.5 : 0 })}
      ${ripple(c, kx, 640)}`;
    const front = c.F(rain(c, true, a === 'rainWalk' ? kx : -999));
    return { svg: c.F(world) + fg + front, cam, overlay: zFlash(c) + motes(c, 30, 8) + (hook && c.t < 3 ? txt(960, 150, 'TONIGHT, 7:43 PM', 34, { fill: '#dff6ff', ls: 8, op: 0.85 * clamp(c.t / 0.5) * (1 - sm(2.4, 3, c.t)) }) : '') +
      (a === 'hookScream' ? `<rect width="1920" height="1080" fill="#fff" opacity="${f(sm(0.35, 0.6, lt))}"/>` : '') };
  }
  S.hook = c => avenueScene(c, true);
  S.avenue = c => avenueScene(c, false);

  // =====================================================================================================
  // TITLE — a giant clock shatters and the shards stop in mid-air
  // =====================================================================================================
  S.title = c => {
    const lt = c.lt, br = easeOut(clamp((lt - 0.15) / 0.5)), stop = lt > 0.9;
    const r = rng(5);
    let shards = '';
    for (let i = 0; i < 46; i++) {
      const a = r() * 6.283, d = 80 + r() * 520, sp = stop ? 0.9 : lt;
      const x = 960 + Math.cos(a) * d * clamp(sp / 0.9) * br, y = 690 + Math.sin(a) * d * clamp(sp / 0.9) * br;
      const s = 18 + r() * 40, rot = r() * 360 + (stop ? 0.9 : lt) * 200;
      shards += `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" d="M0 ${-s} L${f(s * 0.7)} ${f(s * 0.4)} L${f(-s * 0.5)} ${f(s * 0.6)}Z" fill="#dff6ff" opacity="${f(0.25 + r() * 0.5)}" stroke="#ffffff" stroke-width="2"/>`;
    }
    const face = `<g transform="translate(960 690) scale(0.8)"><circle r="330" fill="#0d1a2e" stroke="#ffd27a" stroke-width="14" opacity="${f(1 - br * 0.6)}"/>
      ${[...Array(12)].map((_, i) => { const a = i / 12 * 6.283; return `<rect x="-6" y="-310" width="12" height="44" fill="#ffd27a" transform="rotate(${i * 30})" opacity="${f(1 - br * 0.5)}"/>`; }).join('')}
      <path d="M0 0 L0 -250" stroke="#fff" stroke-width="16" stroke-linecap="round" transform="rotate(${f(stop ? 50 : lt * 900)})"/>
      <path d="M0 0 L0 -170" stroke="#ffd27a" stroke-width="20" stroke-linecap="round" transform="rotate(${f(stop ? 140 : lt * 120)})"/><circle r="20" fill="#ffd27a"/></g>`;
    const kipG = K.renderKip({ id: 'tk', x: 960, y: 1420, scale: 1.45, expression: stop ? 'excited' : 'surprise', pose: P_CLAP, t: c.t, shadow: false, blink: 0, lookY: -0.2 });
    const glitch = lt < 0.6 ? (1 - lt / 0.6) * 16 : 0;
    const title = (dx, col) => `${txt(960 + dx, 175, 'WHAT IF YOU COULD', 78, { fill: col, ls: 10 })}${txt(960 + dx, 330, 'STOP TIME?', 176, { fill: col, ls: 4 })}`;
    const svg = `<radialGradient id="tg" cx="0.5" cy="0.5" r="0.75"><stop offset="0" stop-color="#16345a"/><stop offset="1" stop-color="#03060f"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#tg)"/>
      ${[...Array(24)].map((_, i) => `<path d="M960 690 L${f(960 + Math.cos(i / 24 * 6.283) * 1600)} ${f(690 + Math.sin(i / 24 * 6.283) * 1600)}" stroke="#7fdcff" stroke-width="30" opacity="0.04"/>`).join('')}
      ${face}${shards}${kipG}
      <g opacity="${f(easeOut(lt / 0.4))}">${glitch ? title(-glitch, '#ff8f3a') + title(glitch, '#4ff0ff') : ''}${title(0, '#ffffff')}</g>
      ${txt(960, 400, 'KIP  ·  EPISODE 5', 34, { fill: '#ffd27a', ls: 8, op: sm(1.0, 1.6, lt) })}`;
    return { svg, cam: { z: 1 + lt * 0.012 }, bars: 0, noFrost: true };
  };

  // =====================================================================================================
  // SKY-TOWER APARTMENT — floor 214, sunrise above the clouds
  // =====================================================================================================
  function aptBG(c, cam) {
    const wt = c.wt, r = rng(3);
    let towers = '';
    for (let i = 0; i < 9; i++) {
      const x = -300 + i * 300 + r() * 100, h = 300 + r() * 360, w = 50 + r() * 50;
      towers += `<rect x="${f(x)}" y="${f(700 - h)}" width="${f(w)}" height="${f(h)}" rx="${f(w / 2)}" fill="#8a6fb8" opacity="0.55"/>
        <ellipse cx="${f(x + w / 2)}" cy="${f(700 - h * 0.6)}" rx="${f(w * 1.2)}" ry="10" fill="#b49ae0" opacity="0.6"/><circle cx="${f(x + w / 2)}" cy="${f(700 - h)}" r="6" fill="#fff4d0"/>`;
    }
    const cars = [0, 1, 2].map(i => { const x = ((wt * (90 + i * 40) + i * 900) % 2800) - 400; return L.hoverCar(x, 260 + i * 90, 0.22, ['#ff8f6b', '#6fd3ff', '#ffd34d'][i], c.t, { glow: 0.5 }); }).join('');
    const clouds = [...Array(10)].map((_, i) => `<ellipse cx="${f(-200 + i * 260 + ((wt * 8) % 260))}" cy="${f(690 + (i % 3) * 18)}" rx="${f(170 + (i % 4) * 30)}" ry="48" fill="#ffd9e6" opacity="0.9"/>`).join('');
    return `${sky('apsky', [[0, '#5b6be0'], [0.45, '#ff8fa8'], [0.8, '#ffc48a'], [1, '#ffe2b0']])}
      <g transform="${par(cam, 0.5)}"><rect x="-600" y="-200" width="3120" height="1100" fill="url(#apsky)"/>
        <circle cx="1450" cy="520" r="90" fill="#fff6d8"/><circle cx="1450" cy="520" r="220" fill="#ffe2a0" opacity="0.25"/>${towers}${cars}${clouds}</g>
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${i * 320 - 12}" y="40" width="24" height="700" fill="#e9e2d6"/>`).join('')}
      <rect x="-50" y="40" width="2020" height="40" fill="#e9e2d6"/>
      ${[0, 1, 2].map(i => `<path d="M${200 + i * 640} 80 L${520 + i * 640} 80 L${120 + i * 640} 740 L${-200 + i * 640} 740Z" fill="#fff3d0" opacity="0.07"/>`).join('')}
      <rect x="-50" y="700" width="2020" height="70" fill="#f1e7d8"/>
      <rect x="-50" y="760" width="2020" height="400" fill="#c98d5f"/>
      ${[...Array(9)].map((_, i) => `<path d="M${-50} ${790 + i * 34} L1970 ${790 + i * 34}" stroke="#a87048" stroke-width="3" opacity="0.5"/>`).join('')}
      <path d="M700 760 L1500 760 L1800 1080 L400 1080Z" fill="#fff0c0" opacity="0.08"/>
      <g transform="translate(0 0)"><rect x="-40" y="600" width="460" height="310" fill="#8fd6c4"/><rect x="-50" y="590" width="480" height="24" rx="6" fill="#f6f3ee"/>
        ${[0, 1, 2].map(i => `<rect x="${-20 + i * 145}" y="630" width="130" height="250" rx="8" fill="#7cc6b3"/><rect x="${45 + i * 145}" y="700" width="6" height="40" rx="3" fill="#f6f3ee"/>`).join('')}
        <rect x="250" y="520" width="120" height="70" rx="16" fill="#d0d6e0"/><rect x="270" y="505" width="30" height="24" rx="4" fill="#e3b06a"/><rect x="310" y="505" width="30" height="24" rx="4" fill="#e3b06a"/></g>
      <path d="M120 40 L120 180" stroke="#5a4a3a" stroke-width="3"/><path d="M60 180 Q120 260 180 180Z" fill="#e07a5a"/>
      ${[...Array(7)].map((_, i) => `<ellipse cx="${f(80 + i * 14)}" cy="${f(200 + (i % 3) * 30)}" rx="16" ry="36" fill="#3aa86a" transform="rotate(${-30 + i * 10} ${80 + i * 14} 200)"/>`).join('')}
      <g transform="translate(1180 350)" opacity="0.92"><rect x="-120" y="-60" width="240" height="120" rx="20" fill="#4ff0ff" opacity="0.12" stroke="#4ff0ff" stroke-width="3"/>
        ${txt(0, 18, '7:42', 64, { fill: '#dffcff', font: "'JetBrains Mono', monospace", w: 700 })}${txt(0, 48, 'SKY-BUS IN 3 MIN', 16, { fill: '#9ff6ff', ls: 3, w: 700 })}</g>`;
  }
  const table = () => `<rect x="1165" y="712" width="30" height="190" fill="#e6e1d8"/><ellipse cx="1180" cy="902" rx="110" ry="14" fill="#e6e1d8"/>
    <ellipse cx="1180" cy="700" rx="280" ry="34" fill="#ffffff"/><ellipse cx="1180" cy="708" rx="280" ry="30" fill="none" stroke="#d8d2c8" stroke-width="4"/>`;
  S.apt = c => {
    const a = c.b.a, lt = c.lt;
    const tRush = since(c, 'rush'), tTip = since(c, 'milkTip'), tFall = since(c, 'milkFall'), tPlace = since(c, 'place'), tUn = since(c, 'unfreeze'), tBest = since(c, 'best');
    const kx = tRush < 0 ? -200 : lerp(-200, 720, easeOut(tRush / 1.6));
    const P = { kip: { x: kx }, mom: { x: 1400, h: 1.1 } };
    // --- the milk glass: tips at milkTip, falls (slow motion while Kip yells), freezes; Kip moves it under the milk; GO
    const KX = 720, HOLD = { armL: { sh: 12, el: -10 }, armR: { sh: 50, el: -10 }, legL: { hip: 5, knee: 0 }, legR: { hip: 5, knee: 0 }, lean: 0, headTilt: 0, bob: 0 };
    const hand = X.hands({ x: KX, y: 905, scale: 1, pose: HOLD, t: c.t }).R;
    const BLOB = { x: hand.x, y: hand.y - 100 };
    let gx = 960, gy = 700, grot = 0, gmilk = 0.8, blob = null;
    const fallU = tFall >= 0 ? clamp(tFall / 1.6) : 0;
    if (tTip >= 0) {
      const u = clamp(tTip / 0.9);
      gx = lerp(960, 975, u); gy = lerp(700, 690, u); grot = -80 * easeIO(u);
      gx = lerp(gx, 1000, fallU); gy = lerp(gy, 790, easeIO(fallU)); grot = lerp(grot, -130, fallU);
      gmilk = lerp(0.8, 0.15, clamp(u * 0.6 + fallU));
      blob = { x: lerp(960, BLOB.x, clamp(u * 0.7 + fallU * 0.5)), y: lerp(660, BLOB.y, easeOut(clamp(u * 0.6 + fallU * 0.6))), s: clamp(u * 2) };
    }
    let kPose;
    if (tPlace >= 0 && tUn < 0) {
      const u = easeIO(clamp(tPlace / 1.2));
      gx = lerp(1000, hand.x, u); gy = lerp(790, hand.y + 30, u); grot = lerp(-130, 0, u); gmilk = 0.15;
      kPose = K.pose({ from: 'idle', to: HOLD, t: u });
    }
    if (tUn >= 0) { gx = hand.x; gy = hand.y + 30; grot = 0; kPose = HOLD; const u = clamp(tUn / 0.3); gmilk = lerp(0.15, 0.85, u); blob = u < 1 ? { x: BLOB.x, y: lerp(BLOB.y, hand.y - 20, u), s: 1 - u } : null; }
    if (tBest >= 0) { gx = 960; gy = 700; kPose = undefined; gmilk = 0.85; blob = null; }
    const poke = since(c, 'poke');
    const wob = poke >= 0 && poke < 1.4 ? Math.sin(poke * 25) * 10 * (1 - poke / 1.4) : 0;
    const drops = blob ? [...Array(9)].map((_, i) => { const r = rng(i + 30); return `<circle cx="${f(blob.x + (r() - 0.5) * 120 * blob.s)}" cy="${f(blob.y + (r() - 0.5) * 70 * blob.s)}" r="${f((4 + r() * 8) * blob.s)}" fill="#fbfbff"/>`; }).join('') : '';
    const milk = blob ? `<g><ellipse cx="${f(blob.x)}" cy="${f(blob.y)}" rx="${f((46 + wob) * blob.s)}" ry="${f((28 - wob * 0.6) * blob.s)}" fill="#fbfbff"/>
        <path d="M${f(blob.x - 30 * blob.s)} ${f(blob.y + 10)} q-20 30 -60 40" stroke="#fbfbff" stroke-width="${f(12 * blob.s)}" fill="none" stroke-linecap="round"/>${drops}</g>` : '';
    const sipping = tTip >= 0 && tUn < 0.4;
    const momPose = sipping ? { armL: { sh: 12, el: -10 }, armR: { sh: 40, el: -140 } } : (tRush >= 0 && since(c, 'milkTip') < 0 ? { armR: { sh: 120, el: 20 } } : { armR: { sh: 30, el: -100 } });
    const toastHand = X.hands({ x: kx, y: 905, scale: 1, pose: c.kExpr('p', 'idle'), t: c.t }).L;
    let cam = dcam(c, P, { wideX: 1000 });
    if (a === 'morning') cam = { z: lerp(1.0, 1.22, easeIO(lt / 3.7)), x: lerp(1500, 1180, easeIO(lt / 3.7)), y: lerp(380, 480, easeIO(lt / 3.7)) };
    if (a === 'rush' && c.b.v === 'KIP') cam = { z: 1.25, x: lerp(500, 820, easeIO(lt / 3)), y: 520 };
    if (a === 'milkTip') cam = { z: lerp(1.4, 2.0, easeIO(lt / 0.9)), x: 960, y: 640 };
    if (a === 'milkFall') cam = { z: lerp(1.75, 1.95, lt / 1.6), x: lerp(860, 800, lt / 1.6), y: 520 };
    if (a === 'freeze') cam = { z: lerp(1.95, 1.3, easeIO(lt / 1.7)), x: lerp(820, 1000, easeIO(lt / 1.7)), y: lerp(560, 560, lt) };
    if (a === 'frozenLook') cam = { z: lerp(1.7, 1.9, lt / 3), x: lerp(BLOB.x - 40, BLOB.x + 30, easeIO(lt / 3)), y: BLOB.y + 60 };
    if (a === 'momLook') cam = { z: 1.42, x: lerp(1100, 1300, easeIO(lt / 5)), y: 430 };
    if (a === 'poke') cam = { z: 2.1, x: BLOB.x, y: BLOB.y + 30 };
    if (a === 'place') cam = { z: 1.5, x: 860, y: 520 };
    if (a === 'unfreeze') cam = { z: lerp(1.9, 1.35, easeIO(lt / 1.3)), x: hand.x, y: lerp(hand.y, 520, easeIO(lt / 1.3)) };
    if (a === 'best') cam = { z: lerp(1.25, 1.55, easeIO(lt / 3)), x: KX + 40, y: 470 };
    const world = `${aptBG(c, cam)}
      ${person('mom', c, { x: 1400, lookX: lookFrom(c, 'mom', P), pose: momPose, hold: momPose === null ? null : { side: 1, svg: L.mug(0, 10, 1.0) } })}
      ${table()}`;
    const frontWorld = `${milk}${glass(gx, gy, 1.1, grot, gmilk)}`;
    const kipG = kip(c, { x: kx, pose: kPose || (tRush >= 0 && tRush < 1.6 ? walkPose(c.t, 1, true) : undefined), lookX: a === 'frozenLook' || a === 'poke' || a === 'place' ? 0.6 : (a === 'milkTip' || a === 'milkFall' ? 0.7 : lookFrom(c, 'kip', P)), lookY: a === 'frozenLook' ? -0.3 : 0 });
    const toast = since(c, 'milkTip') < 0 ? `<g transform="translate(${f(toastHand.x)} ${f(toastHand.y)})"><rect x="-26" y="-50" width="52" height="52" rx="14" fill="#e3b06a"/><rect x="-18" y="-42" width="36" height="36" rx="10" fill="#f6dca0"/></g>` : '';
    const svg = c.F(world) + kipG + toast + c.F(frontWorld) + ripple(c, KX + 40, 600);
    return { svg, cam, overlay: zFlash(c) + motes(c, 26, 3) + (a === 'milkFall' ? `<rect width="1920" height="1080" fill="#ff8f3a" opacity="0.06"/>` : '') };
  };
  function glass(x, y, s, rot, milk) { return L.glass(x, y, s, rot, milk); }

  // =====================================================================================================
  // NEO-MARKET STREET — bright futuristic daytime street, maglev overhead
  // =====================================================================================================
  function streetBG(c, cam) {
    const wt = c.wt, r = rng(12);
    let towers = '';
    for (let i = 0; i < 12; i++) {
      const x = -500 + i * 260 + r() * 80, h = 380 + r() * 400, w = 120 + r() * 90;
      towers += `<rect x="${f(x)}" y="${f(640 - h)}" width="${f(w)}" height="${f(h + 50)}" rx="26" fill="${['#f4f8ff', '#e3eefc', '#eef6f2'][i % 3]}"/>`;
      for (let k = 0; k < 4; k++) towers += `<rect x="${f(x + 10)}" y="${f(640 - h + 50 + k * h / 4.4)}" width="${f(w - 20)}" height="18" rx="9" fill="#58c48a" opacity="0.8"/>`;
      towers += `<rect x="${f(x + w * 0.2)}" y="${f(640 - h + 20)}" width="${f(w * 0.6)}" height="${f(h - 40)}" fill="#9fd6ff" opacity="0.28"/>`;
    }
    const tx = ((wt * 520) % 4200) - 1500;
    const train = `<g transform="translate(${f(tx)} 210)"><path d="M0 0 L1100 0 Q1220 0 1260 60 L1260 90 L0 90Z" fill="#ffffff"/><rect x="0" y="22" width="1180" height="30" fill="#1fc8b8"/>
      ${[...Array(12)].map((_, i) => `<rect x="${30 + i * 92}" y="24" width="60" height="26" rx="6" fill="#d8faff"/>`).join('')}</g>`;
    const drone = (() => { const x = ((wt * 140) % 2600) - 300, y = 330 + Math.sin(wt * 2) * 20; return `<g transform="translate(${f(x)} ${f(y)})"><rect x="-40" y="-8" width="80" height="16" rx="8" fill="#333a48"/>
      <ellipse cx="-44" cy="-14" rx="${f(c.z > 0.5 ? 26 : 26 * Math.abs(Math.sin(wt * 40)))}" ry="5" fill="#9aa4b8"/><ellipse cx="44" cy="-14" rx="${f(c.z > 0.5 ? 26 : 26 * Math.abs(Math.cos(wt * 40)))}" ry="5" fill="#9aa4b8"/>
      <path d="M0 8 L0 30" stroke="#333a48" stroke-width="3"/><rect x="-24" y="30" width="48" height="40" rx="6" fill="#e0a85a"/><path d="M-24 46 L24 46" stroke="#b07e3a" stroke-width="4"/></g>`; })();
    const store = (x, w, col, label, awn) => `<rect x="${x}" y="430" width="${w}" height="340" fill="${col}"/><rect x="${x + 20}" y="560" width="${w - 40}" height="190" rx="10" fill="#c9ecff" opacity="0.8"/>
      <path d="M${x - 10} 500 L${x + w + 10} 500 L${x + w - 10} 550 L${x + 10} 550Z" fill="${awn}"/>${[...Array(Math.floor(w / 50))].map((_, i) => `<path d="M${x + i * 50 + 10} 500 L${x + i * 50 + 35} 500 L${x + i * 50 + 32} 550 L${x + i * 50 + 12} 550Z" fill="#fff" opacity="0.5"/>`).join('')}
      ${txt(x + w / 2, 478, label, 38, { fill: '#fff', ls: 2 })}`;
    return `${sky('stsky', [[0, '#4fb8f0'], [0.6, '#bfe8ff'], [1, '#f4fbff']])}
      <g transform="${par(cam, 0.6)}"><rect x="-600" y="-200" width="3120" height="1100" fill="url(#stsky)"/>
        ${[...Array(5)].map((_, i) => `<ellipse cx="${-200 + i * 520}" cy="${120 + (i % 2) * 60}" rx="160" ry="34" fill="#fff" opacity="0.8"/>`).join('')}
        <g transform="translate(1250 0)"><rect x="-30" y="80" width="60" height="560" fill="#f4f8ff"/><ellipse cx="0" cy="170" rx="150" ry="40" fill="none" stroke="#f4f8ff" stroke-width="22"/><circle cx="0" cy="80" r="16" fill="#ff8f3a"/></g>${towers}</g>
      <g transform="${par(cam, 0.35)}"><rect x="-600" y="290" width="3120" height="34" fill="#c4ccd9"/>${[...Array(9)].map((_, i) => `<rect x="${-500 + i * 400}" y="324" width="34" height="420" fill="#c4ccd9"/>`).join('')}${train}${drone}</g>
      <g transform="${par(cam, 0.15)}">
        ${store(-260, 380, '#ff6b5e', 'BAO BOTS', '#e04a3a')}${store(150, 360, '#4b6ef5', 'FIX-IT DROIDS', '#3550c8')}
        <rect x="540" y="400" width="720" height="370" fill="#272b3d"/><rect x="560" y="420" width="680" height="200" rx="14" fill="#0e1222"/>
        ${txt(900, 520, 'NEO-MARKET', 86, { fill: '#ff6bd5', stroke: '#4ff0ff', sw: 3, ls: 6, op: 0.9 + 0.1 * Math.sin(wt * 4) })}${txt(900, 585, 'EVERYTHING · ALL DAY', 26, { fill: '#9ff6ff', ls: 6 })}
        ${store(1290, 340, '#ffb23e', 'SKY NOODLES', '#e08a1a')}${store(1660, 420, '#36c48a', 'GREEN CUBE', '#22985f')}</g>
      <rect x="-300" y="770" width="2520" height="400" fill="#dfe4ec"/>
      ${[...Array(14)].map((_, i) => `<path d="M${960 + (i - 7) * 90} 770 L${960 + (i - 7) * 330} 1080" stroke="#c4cad6" stroke-width="3"/>`).join('')}
      ${[...Array(5)].map((_, i) => `<path d="M-300 ${800 + i * 60 + i * i * 6} L2220 ${800 + i * 60 + i * i * 6}" stroke="#c4cad6" stroke-width="3"/>`).join('')}
      <rect x="-300" y="764" width="2520" height="12" fill="#b6bdcb"/>`;
  }
  function busStop(x) {
    return `<g transform="translate(${x} 0)"><rect x="-6" y="520" width="12" height="385" fill="#9aa3b5"/><rect x="274" y="520" width="12" height="385" fill="#9aa3b5"/>
      <path d="M-30 510 L310 500 L310 530 L-30 540Z" fill="#1fc8b8"/><rect x="10" y="560" width="260" height="300" fill="#dff6ff" opacity="0.35" stroke="#fff" stroke-width="3"/>
      <rect x="40" y="590" width="120" height="70" rx="8" fill="#1fc8b8"/>${txt(100, 638, '42', 44, { fill: '#fff' })}${txt(140, 700, 'SKY-BUS', 26, { fill: '#2a3550', ls: 3 })}</g>`;
  }
  function hotdogCart(x, wt) {
    return `<g transform="translate(${x} 0)">
      <rect x="-190" y="660" width="380" height="200" rx="22" fill="#f4f6fa"/><rect x="-190" y="660" width="380" height="40" rx="14" fill="#e8413b"/>
      ${txt(0, 790, 'HOT DOGS', 46, { fill: '#e8413b' })}<circle cx="-120" cy="880" r="26" fill="#333"/><circle cx="120" cy="880" r="26" fill="#333"/>
      <g transform="translate(-80 650)"><rect x="-40" y="-14" width="80" height="22" rx="11" fill="#e8b46a"/><rect x="-34" y="-12" width="68" height="12" rx="6" fill="#c0503a"/></g></g>`;
  }
  S.street = c => {
    const a = c.b.a, lt = c.lt;
    const tPr = since(c, 'prank'), tC2 = since(c, 'clap2'), tStache = since(c, 'mustache');
    // Kip's zip path while time is stopped
    const stops = [[0, 600], [0.25, 1380], [1.0, 1380], [1.25, 1120], [1.9, 1120], [2.15, 1030], [2.9, 1030], [3.15, 600]];
    let kx = 600, zipping = false, zipFrom = 600;
    if (tPr >= 0 && tPr < 3.4) {
      for (let i = 0; i < stops.length - 1; i++) if (tPr >= stops[i][0] && tPr < stops[i + 1][0]) {
        const u = (tPr - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
        kx = lerp(stops[i][1], stops[i + 1][1], easeIO(u)); zipping = stops[i][1] !== stops[i + 1][1]; zipFrom = stops[i][1];
      }
      if (tPr >= 3.15) kx = 600;
    }
    const glassesOn = tPr >= 0.7 || since(c, 'prankDone') >= 0, pigeonFlip = tPr >= 1.6 || since(c, 'prankDone') >= 0, stacheOn = tPr >= 2.6 || since(c, 'prankDone') >= 0;
    const P = { kip: { x: kx }, max: { x: 860, h: 1.06 }, vend: { x: 1560, h: 1.08 } };
    let cam = dcam(c, P, { wideX: 1000 });
    if (a === 'talk' && c.bi === c.run.beats[0]) cam = { z: lerp(1.0, 1.25, easeIO(lt / 3)), x: lerp(1300, 760, easeIO(lt / 3)), y: lerp(420, 540, easeIO(lt / 3)) };
    if (a === 'pick') cam = { z: 1.2, x: lerp(900, 1350, easeIO(lt / 2)), y: 520 };
    if (a === 'clap' || a === 'clap2') cam = { z: lerp(1.6, 1.3, easeIO(lt / 1.1)), x: 650, y: 560 };
    if (a === 'prank') cam = { z: 1.22, x: lerp(900, 1150, easeIO(lt / 3.4)), y: 560 };
    if (a === 'prankDone') cam = { z: 1.3, x: 900, y: 540 };
    if (a === 'vendor') cam = { z: lerp(1.6, 1.8, lt / 3), x: 1500, y: 400 };
    if (a === 'mustache') cam = { z: lerp(1.7, 2.0, easeIO(lt / 2)), x: 860, y: 430 };
    const vendPose = since(c, 'vendor') >= 0 ? { armR: { sh: 100, el: -120 } } : { armR: { sh: 60, el: -60 } };
    const maxPose = tStache >= 0 ? { armR: { sh: 40, el: -150 } } : undefined;
    const walkers = [0, 1, 2, 3].map(i => walker(c, { i: 30 + i, y: 800, s: 0.62, x0: -200, x1: 2200, speed: (i % 2 ? -1 : 1) * (70 + i * 15), phase: i * 600 }).svg).join('');
    const vh = L.headAt(1560, 905, 1, 1.08), mh = L.headAt(860, 905, 1, 1.06);
    const world = `${streetBG(c, cam)}${walkers}${busStop(150)}
      ${person('vend', c, { x: 1560, lookX: since(c, 'vendor') >= 0 ? -0.2 : lookFrom(c, 'vend', P), lookY: since(c, 'vendor') >= 0 ? -0.4 : 0, pose: vendPose })}
      ${glassesOn ? L.sunglasses(vh.x, vh.y - 8 * 1.08, 0.95) : ''}
      ${hotdogCart(1500, c.wt)}
      ${L.pigeon(1150, 905, 1.0, c.wt, pigeonFlip, c.z < 0.5)}
      ${person('max', c, { x: 860, flip: true, lookX: c.z > 0.5 ? 0.6 : lookFrom(c, 'max', P), pose: maxPose })}
      ${stacheOn ? L.mustache(mh.x, 905 - 418 * 1.06, 0.85) : ''}`;
    const kPose = (a === 'clap' || a === 'clap2' ? clapPose(lt) : null) || (zipping ? walkPose(c.t, 1, true) : undefined);
    const fg = `${zipping ? streak(zipFrom, 640, kx, 640) : ''}
      ${kip(c, { x: kx, pose: kPose, flip: zipping && kx < zipFrom, lookX: zipping ? (kx > zipFrom ? 0.7 : -0.7) : lookFrom(c, 'kip', P) })}${ripple(c, 640, 600)}
      ${tPr >= 0 && tPr < 3.3 ? [[0.7, 1500, 330, 'POP!'], [1.6, 1180, 760, 'FLIP!'], [2.6, 900, 380, 'BOOP!']].map(([t0, x, y, w]) => tPr > t0 && tPr < t0 + 0.6 ? txt(x, y, w, 56, { fill: '#ffd34d', stroke: '#22180f', sw: 8, op: 1 - (tPr - t0) / 0.6, tr: `translate(0 ${f(-(tPr - t0) * 40)})` }) : '').join('') : ''}`;
    return { svg: c.F(world) + fg, cam, overlay: zFlash(c) + motes(c, 26, 12) };
  };

  // ---------------------------------------------------------------- (scenes 3-9 follow in scenes_b.js)
  root.SCENES = S;
})(typeof window !== 'undefined' ? window : globalThis);
