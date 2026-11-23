/* EP05 scenes, part 2: Starlight Mall, maglev station + train, Chrono Lab, the frozen city, the Core, sky-bus ending, outro. */
(function (root) {
  'use strict';
  const { clamp, lerp, sm, easeOut, easeIO, f, rng, txt, FONT } = root.Engine.H;
  const K = root.Kip, X = root.Extras, L = root.L5;
  const { since, sinceLast, beatOf, after, kip, person, lookFrom, hooded, walker, stander, ripple, zFlash, motes, crack, streak, par, dcam,
    clapPose, walkPose, P_CLAP, P_REACH, P_DRAG, CAST } = L;
  const S = root.SCENES;
  const sky = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const HUG = { armL: { sh: 70, el: -60 }, armR: { sh: 70, el: -60 } };
  const glitchWrap = (svg, amt, t) => {
    if (amt <= 0) return svg;
    const r = rng(Math.floor(t * 30) + 3), dx = (r() - 0.5) * 40 * amt;
    return `<g opacity="${f(0.6 * (1 - amt))}" transform="translate(${f(-dx)} 0)">${svg}</g><g opacity="${f(1 - amt)}" transform="translate(${f(dx)} 0)">${svg}</g>`;
  };

  // =====================================================================================================
  // STARLIGHT MALL — glass dome atrium, three tiers of shops, escalators, fountain
  // =====================================================================================================
  function mallBG(c, cam) {
    const wt = c.wt;
    const shop = (x, y, w, h, col, label) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff7ec"/><rect x="${x + 14}" y="${y + 40}" width="${w - 28}" height="${h - 50}" fill="#bfe6ff" opacity="0.55"/>
      <rect x="${x}" y="${y}" width="${w}" height="34" fill="${col}"/>${txt(x + w / 2, y + 26, label, 24, { fill: '#fff', ls: 3 })}`;
    const tier = (y, h, items) => `<rect x="-300" y="${y}" width="2520" height="${h}" fill="#efe4d2"/>${items}
      <rect x="-300" y="${y + h}" width="2520" height="16" fill="#d9c7a8"/><rect x="-300" y="${y + h + 16}" width="2520" height="44" fill="#cfe9f4" opacity="0.45"/><rect x="-300" y="${y + h + 12}" width="2520" height="6" fill="#e3b44a"/>`;
    const beams = [0, 1, 2, 3].map(i => `<path d="M${300 + i * 420} -60 L${460 + i * 420} -60 L${360 + i * 420 + 300} 1080 L${200 + i * 420 + 300} 1080Z" fill="#fffbe6" opacity="0.07"/>`).join('');
    // fountain (world clock): jets as droplet strings along parabolas
    let water = '';
    for (let j = 0; j < 5; j++) {
      const ang = -0.9 + j * 0.45;
      for (let k = 0; k < 16; k++) {
        const u = ((k / 16) + wt * 0.6) % 1, x = 1110 + Math.sin(ang) * 380 * u, y = 760 - 330 * (1 - (2 * u - 1) * (2 * u - 1)) * (1 - Math.abs(ang) * 0.25);
        water += `<circle cx="${f(x)}" cy="${f(y)}" r="${c.z > 0.5 ? 7 : 6}" fill="#e9fbff" opacity="0.9"/>`;
      }
    }
    return `${sky('mlsky', [[0, '#9ad8ff'], [1, '#e7f7ff']])}
      <g transform="${par(cam, 0.45)}"><rect x="-600" y="-300" width="3120" height="700" fill="url(#mlsky)"/>
        ${[...Array(13)].map((_, i) => `<path d="M960 -420 L${-700 + i * 280} 240" stroke="#ffffff" stroke-width="10" opacity="0.8"/>`).join('')}
        ${[0, 1, 2].map(i => `<ellipse cx="960" cy="-420" rx="${900 + i * 400}" ry="${380 + i * 210}" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.8"/>`).join('')}</g>
      <g transform="${par(cam, 0.2)}">
        ${tier(110, 150, shop(-200, 120, 380, 130, '#8a5cf0', 'SPACE TOYS') + shop(240, 120, 380, 130, '#22b8d8', 'GLOW SHOES') + shop(1300, 120, 380, 130, '#ff7a59', 'ROBO BAKERY') + shop(1740, 120, 380, 130, '#3ccf8e', 'PIXEL BOOKS'))}
        ${tier(330, 160, shop(-200, 340, 420, 140, '#ff5fa8', 'SMOOTHIE ORBIT') + shop(1500, 340, 420, 140, '#ffb23e', 'HOVER BOARDS'))}
        <rect x="-300" y="550" width="2520" height="230" fill="#f3eadb"/>
        ${shop(-220, 560, 420, 210, '#4b6ef5', 'GADGET HUB')}${shop(1720, 560, 420, 210, '#e8413b', 'SNACK STAR')}
        <g transform="translate(260 0)"><path d="M0 780 L480 330 L560 330 L80 780Z" fill="#c9d3e0"/><path d="M14 772 L486 340" stroke="#5a6a80" stroke-width="10"/>
          ${[...Array(14)].map((_, i) => `<path d="M${20 + i * 34} ${f(764 - i * 31.5)} L${60 + i * 34} ${f(764 - i * 31.5)}" stroke="#8a97aa" stroke-width="3"/>`).join('')}
          <path d="M-10 740 L470 290" stroke="#1d2433" stroke-width="12" stroke-linecap="round"/><path d="M90 790 L570 340" stroke="#1d2433" stroke-width="12" stroke-linecap="round"/></g>
        ${txt(1110, 640, '★ STARLIGHT MALL ★', 40, { fill: '#e3b44a', ls: 6 })}
        <ellipse cx="1110" cy="760" rx="300" ry="40" fill="#bfe6f4"/><path d="M810 760 L810 790 Q1110 840 1410 790 L1410 760" fill="#e8dcc6"/>${water}
        <rect x="1100" y="560" width="20" height="200" fill="#e8dcc6"/></g>
      ${beams}
      <rect x="-300" y="780" width="2520" height="400" fill="#f7f2ea"/>
      ${[...Array(12)].map((_, i) => `<path d="M${960 + (i - 6) * 120} 780 L${960 + (i - 6) * 420} 1080" stroke="#e4d9c6" stroke-width="3"/>`).join('')}
      <path d="M960 830 l26 52 l58 8 l-42 40 l10 58 l-52 -28 l-52 28 l10 -58 l-42 -40 l58 -8z" fill="#e3b44a" opacity="0.35"/>
      <rect x="-300" y="776" width="2520" height="8" fill="#e3b44a" opacity="0.6"/>`;
  }
  function robot(x, y, s, t) {
    const b = Math.sin(t * 3) * 6;
    return `<g transform="translate(${f(x)} ${f(y + b)}) scale(${f(s)})"><ellipse cx="0" cy="${f(10 - b)}" rx="80" ry="12" fill="rgba(0,0,0,0.2)"/>
      <rect x="-70" y="-260" width="140" height="200" rx="60" fill="#f4f6fa"/><rect x="-50" y="-235" width="100" height="70" rx="30" fill="#1d2433"/>
      <circle cx="-20" cy="-200" r="10" fill="#4ff0ff"/><circle cx="20" cy="-200" r="10" fill="#4ff0ff"/><path d="M-14 -180 Q0 -170 14 -180" stroke="#4ff0ff" stroke-width="4" fill="none"/>
      <path d="M0 -260 L0 -290" stroke="#9aa4b8" stroke-width="5"/><circle cy="-296" r="9" fill="#ff7a59"/>
      <path d="M-70 -150 L-130 -150" stroke="#c9cfdb" stroke-width="14" stroke-linecap="round"/><path d="M70 -150 L130 -150" stroke="#c9cfdb" stroke-width="14" stroke-linecap="round"/>
      <rect x="-160" y="-170" width="320" height="16" rx="8" fill="#e3b44a"/>${[-110, -50, 10, 70].map(cx => L.cookie(cx + 20, -184, 0.8)).join('')}
      <ellipse cx="0" cy="-40" rx="50" ry="20" fill="#9aa4b8"/></g>`;
  }
  S.mall = c => {
    const a = c.b.a, lt = c.lt;
    const tClap = since(c, 'clap'), tFL = since(c, 'fountainLook'), tSam = since(c, 'samples'), tBS = since(c, 'balloonSee'), tBal = since(c, 'balloon'),
      tEsc = since(c, 'escalator'), tVan = since(c, 'vanish'), tNope = since(c, 'nope'), tC2 = since(c, 'clap2');
    // Kip's route through the frozen mall
    let kx = 640, zipFrom = null;
    if (tFL >= 0) kx = lerp(640, 900, easeIO(tFL / 1.6));
    if (tSam >= 0) { const u = clamp(tSam / 0.5); kx = lerp(900, 1500, easeIO(u)); if (u < 1) zipFrom = 900; }
    if (tBS >= 0) kx = 1500;
    if (tBal >= 0) { const u = clamp(tBal / 0.6); kx = lerp(1500, 1230, easeIO(u)); if (u < 1) zipFrom = 1500; }
    if (tNope >= 0) { const u = clamp((tNope - 1.0) / 0.5); kx = lerp(1230, 640, easeIO(u)); if (u > 0 && u < 1) zipFrom = 1230; }
    const P = { kip: { x: kx }, max: { x: 880, h: 1.06 }, girl: { x: 1360, h: 0.74 } };
    const balLost = since(c, 'ready') >= 0;
    const tieU = tBal >= 0 ? easeIO(clamp((tBal - 0.8) / 2.2)) : 0;
    const gh = X.hands({ x: 1360, y: 905, scale: 0.74, flip: true, pose: { armR: { sh: 30, el: -20 } }, t: c.wt }).R;
    const freeY = balLost ? lerp(560, 380, easeOut(clamp((c.wt - (beatOf(c, 'ready') || { start: 0 }).start) / 2))) : 0;
    const bx = tieU > 0 ? lerp(1330, gh.x, tieU) : (balLost ? 1330 : gh.x), by = tieU > 0 ? lerp(380, gh.y - 230, tieU) : (balLost ? freeY : gh.y - 230);
    const tied = tieU >= 1 || !balLost;
    // the stranger on the escalator
    const escU = tEsc >= 0 ? clamp(tEsc / 6) : 0, ex = 260 + lerp(470, 120, escU), ey = lerp(330, 660, escU);
    const hoodOn = tEsc >= 0 && (tVan < 0 || tVan < 0.8);
    const vanAmt = tVan >= 0 ? clamp(tVan / 0.8) : 0;
    let cam = dcam(c, P, { wideX: 1000 });
    if (a === 'mallOpen') cam = { z: lerp(1.35, 1.0, easeIO(lt / 1.8)), x: 1000, y: lerp(260, 540, easeIO(lt / 1.8)) };
    if (a === 'announce') cam = { z: lerp(1.05, 1.15, lt / 4), x: lerp(1200, 1400, easeIO(lt / 4)), y: 500 };
    if (a === 'ready') cam = { z: 1.35, x: 760, y: 480 };
    if (a === 'clap') cam = { z: lerp(1.7, 1.25, easeIO(lt / 1.3)), x: 700, y: 560 };
    if (a === 'maxFrozen') cam = { z: 1.5, x: 780, y: 450 };
    if (a === 'fountainLook') cam = { z: lerp(1.3, 1.5, easeIO(lt / 1.8)), x: lerp(900, 1110, easeIO(lt / 1.8)), y: lerp(560, 560, lt) };
    if (a === 'fountain') cam = { z: lerp(1.35, 1.2, lt / 3), x: 1000, y: 540 };
    if (a === 'samples') cam = { z: 1.3, x: lerp(1100, 1450, easeIO(lt / 1.2)), y: 520 };
    if (a === 'balloonSee') cam = { z: 1.45, x: 1360, y: 400 };
    if (a === 'balloon') cam = { z: 1.3, x: 1290, y: 470 };
    if (a === 'escalator') cam = { z: lerp(1.0, 1.25, easeIO(lt / 2.6)), x: lerp(1100, 700, easeIO(lt / 0.6)), y: 520 };
    if (a === 'escSee') cam = { z: lerp(1.25, 1.4, lt / 4), x: c.b.t.startsWith('Wait') ? 760 : 900, y: 500 };
    if (a === 'vanish') cam = { z: 1.8, x: ex, y: ey - 200 };
    if (a === 'nope') cam = { z: lerp(1.3, 1.1, lt / 2), x: lerp(1100, 800, easeIO(lt / 2)), y: 520 };
    if (a === 'girl') cam = { z: 1.6, x: 1360, y: 520 };
    const maxPose = c.z > 0.5 || tC2 < 0 ? 'cheer' : { armL: { sh: 50, el: -70 }, armR: { sh: 50, el: -70 } };
    const cookies = tC2 >= 0 ? { side: 1, svg: L.cookie(0, -8, 1) + L.cookie(10, -40, 1) } : null;
    const walkers = [0, 1, 2].map(i => walker(c, { i: 50 + i, y: 788, s: 0.5, x0: -200, x1: 2200, speed: (i % 2 ? -1 : 1) * (60 + i * 18), phase: i * 700 }).svg).join('');
    const world = `${mallBG(c, cam)}${walkers}
      ${robot(1690, 905, 0.95, c.wt)}
      ${person('girl', c, { x: 1360, scale: 1, lookX: tied && tBal >= 0 ? -0.1 : -0.3, lookY: balLost && !tied ? -0.8 : 0, pose: balLost && !tied ? { armL: { sh: 12, el: -10 }, armR: { sh: 140, el: 10 } } : { armR: { sh: 30, el: -20 } } })}
      ${person('max', c, { x: 880, lookX: lookFrom(c, 'max', P), pose: maxPose, hold: cookies })}`;
    const bal = L.balloon(bx, by, 0.95, c.wt, tied ? gh.x : null, tied ? gh.y : null);
    const kPose = (a === 'clap' || a === 'clap2' ? clapPose(lt) : null) || (zipFrom !== null ? walkPose(c.t, 1, true) : (tBal >= 0 && tBal < 3 ? 'cheer' : (a === 'maxFrozen' ? 'wave' : undefined)));
    const kh = X.hands({ x: kx, y: 905, scale: 1, pose: kPose || c.kExpr('p', 'idle'), t: c.t });
    const treats = tSam >= 0.6 && tBS < 0 ? L.cookie(kh.L.x, kh.L.y - 10, 1) + L.smoothie(kh.R.x, kh.R.y + 10, 0.9) : '';
    const coin = tSam >= 1.2 && tSam < 3.2 ? `<g transform="translate(1600 ${f(640 - (tSam - 1.2) * 30)})" opacity="${f(1 - (tSam - 1.2) / 2)}"><circle r="20" fill="#ffd34d" stroke="#c9961a" stroke-width="4"/>${txt(0, 8, '1', 22, { fill: '#9a6a0a' })}</g>` : '';
    const fg = `${hoodOn ? glitchWrap(hooded(c, { x: ex, y: ey, scale: 0.55, pose: tEsc < 6 && tVan < 0 ? walkPose(c.t, 0.6) : 'idle', shadow: false }), vanAmt, c.t) : ''}
      ${zipFrom !== null ? streak(zipFrom, 640, kx, 640) : ''}
      ${kip(c, { x: kx, pose: kPose, lookX: hoodOn ? -0.75 : (a === 'balloonSee' || a === 'fountainLook' ? 0.5 : lookFrom(c, 'kip', P)), lookY: a === 'balloonSee' || a === 'fountainLook' ? -0.6 : 0 })}
      ${treats}${coin}${ripple(c, 680, 600)}`;
    return { svg: c.F(world) + fg + c.F(bal), cam, overlay: zFlash(c) + motes(c, 30, 21) };
  };

  // =====================================================================================================
  // MAGLEV STATION — teal tiles, Line 9, the chase (exterior) + TRAIN INTERIOR
  // =====================================================================================================
  function stationBG(c, cam, doorU) {
    const rows = [...Array(8)].map((_, i) => `<path d="M-300 ${120 + i * 30} L2220 ${120 + i * 30}" stroke="#1d6e78" stroke-width="2"/>`).join('');
    const train = `<rect x="-400" y="340" width="2720" height="470" rx="40" fill="#f6f8fb"/><rect x="-400" y="420" width="2720" height="160" fill="#1b2a44"/>
      <rect x="-400" y="590" width="2720" height="14" fill="#2fd4c0"/><rect x="-400" y="770" width="2720" height="40" fill="#cfd6e2"/>
      ${[...Array(12)].map((_, i) => { const x = -360 + i * 230; return `<rect x="${x}" y="440" width="170" height="120" rx="18" fill="#2c4566"/>${i % 2 ? `<circle cx="${x + 60}" cy="520" r="26" fill="#4a6a90"/><rect x="${x + 36}" y="540" width="48" height="30" fill="#4a6a90"/>` : ''}`; }).join('')}
      ${[960, 260, 1660].map(dx => `<rect x="${dx - 110}" y="390" width="220" height="420" fill="#0d1626"/>
        <rect x="${f(dx - 110 + 0)}" y="390" width="${f(110 * doorU)}" height="420" fill="#e9edf3" stroke="#9aa6b8" stroke-width="3"/><rect x="${f(dx + 110 - 110 * doorU)}" y="390" width="${f(110 * doorU)}" height="420" fill="#e9edf3" stroke="#9aa6b8" stroke-width="3"/>
        ${doorU > 0.3 ? `<rect x="${f(dx - 110 * doorU + 20)}" y="420" width="${f(Math.max(0, 110 * doorU - 40))}" height="160" rx="10" fill="#9fd8ff" opacity="0.5"/><rect x="${f(dx + 20)}" y="420" width="${f(Math.max(0, 110 * doorU - 40))}" height="160" rx="10" fill="#9fd8ff" opacity="0.5"/>` : ''}
        <rect x="${dx - 120}" y="380" width="240" height="14" fill="${doorU > 0.01 && doorU < 0.99 ? '#ff4a5a' : '#2fd4c0'}"/>`).join('')}`;
    return `<g transform="${par(cam, 0.3)}"><rect x="-600" y="-100" width="3120" height="600" fill="#0f4c55"/>${rows}
        ${[...Array(14)].map((_, i) => `<path d="M${-300 + i * 180} 60 L${-300 + i * 180} 360" stroke="#1d6e78" stroke-width="2"/>`).join('')}
        <rect x="560" y="110" width="800" height="120" rx="16" fill="#071a1e" stroke="#2fd4c0" stroke-width="4"/>
        ${txt(960, 165, 'LINE 9  ▸  CHRONO DISTRICT', 46, { fill: '#9ef0c4', ls: 4 })}${txt(960, 210, c.z > 0.5 ? 'NEXT TRAIN: — —' : 'NOW BOARDING', 26, { fill: '#2fd4c0', ls: 6, font: "'JetBrains Mono', monospace", w: 700 })}
        ${[...Array(10)].map((_, i) => `<rect x="${-300 + i * 260}" y="70" width="160" height="14" rx="7" fill="#e9fffb" opacity="0.9"/>`).join('')}</g>
      <g transform="${par(cam, 0.1)}">${train}</g>
      <rect x="-300" y="800" width="2520" height="400" fill="#8c96a6"/><rect x="-300" y="812" width="2520" height="26" fill="#ffd34d"/>
      ${[...Array(60)].map((_, i) => `<circle cx="${-280 + i * 42}" cy="825" r="4" fill="#d9a21e"/>`).join('')}
      ${[...Array(10)].map((_, i) => `<path d="M${960 + (i - 5) * 140} 838 L${960 + (i - 5) * 480} 1080" stroke="#7a8494" stroke-width="3"/>`).join('')}`;
  }
  function trainInterior(c, cam, outU, phase) {
    // outside the windows: platform (with the stranger) sliding away, then tunnel, then city lights
    const off = -outU * 3600;
    const outside = phase === 'city'
      ? `<rect x="-300" y="200" width="2520" height="360" fill="#0a0f24"/>${[...Array(40)].map((_, i) => { const r = rng(i * 7919 + 3); r(); const x = ((r() * 2600 - c.t * 900) % 2600 + 2600) % 2600 - 300; return `<rect x="${f(x)}" y="${f(260 + r() * 260)}" width="${f(120 + r() * 260)}" height="${f(8 + r() * 8)}" rx="6" fill="${['#ff4fd8', '#4ff0ff', '#ffd34d'][i % 3]}" opacity="0.85"/>`; }).join('')}`
      : `<g transform="translate(${f(off)} 0)"><rect x="-300" y="200" width="2600" height="360" fill="#0f4c55"/><rect x="-300" y="470" width="2600" height="90" fill="#8c96a6"/><rect x="-300" y="470" width="2600" height="10" fill="#ffd34d"/>
          ${hooded(c, { x: 1240, y: 545, scale: 0.42, pose: since(c, 'watchRaise') >= 0 ? { armR: { sh: 90, el: -10 } } : 'idle', watch: since(c, 'watchRaise') >= 0, shadow: false })}
          <rect x="2300" y="200" width="2600" height="360" fill="#050608"/></g>`;
    const wins = [0, 1, 2, 3].map(i => `<rect x="${-120 + i * 560}" y="220" width="460" height="320" rx="40" fill="none" stroke="#dfe6f0" stroke-width="34"/>`).join('');
    return `<rect x="-300" y="60" width="2520" height="1100" fill="#e9eef5"/>
      <clipPath id="tw">${[0, 1, 2, 3].map(i => `<rect x="${-120 + i * 560}" y="220" width="460" height="320" rx="40"/>`).join('')}</clipPath>
      <g clip-path="url(#tw)">${outside}</g>${wins}
      <rect x="-300" y="90" width="2520" height="40" fill="#cfd8e4"/>${[...Array(9)].map((_, i) => `<rect x="${-200 + i * 280}" y="96" width="180" height="20" rx="10" fill="#fffef5"/>`).join('')}
      <rect x="-300" y="580" width="2520" height="20" fill="#2fd4c0"/>
      ${[0, 1, 2, 3].map(i => `<g transform="translate(${-80 + i * 560} 0)"><rect x="0" y="640" width="380" height="110" rx="26" fill="#2c4f9a"/><rect x="0" y="740" width="380" height="60" rx="16" fill="#233f7c"/></g>`).join('')}
      ${[420, 980, 1540].map(x => `<rect x="${x}" y="120" width="16" height="800" fill="#c0c8d4"/>`).join('')}
      <rect x="-300" y="860" width="2520" height="300" fill="#7b8698"/>${[...Array(10)].map((_, i) => `<path d="M${960 + (i - 5) * 160} 860 L${960 + (i - 5) * 460} 1080" stroke="#6b7588" stroke-width="3"/>`).join('')}`;
  }
  S.station = c => {
    const a = c.b.a, lt = c.lt;
    const tRun = since(c, 'runIn'), tDrag = since(c, 'dragRun'), tFollow = since(c, 'hoodFollow'), tGo = since(c, 'clapGo'), tUn = since(c, 'unfreeze'), tIn = since(c, 'inTrain');
    const interior = tIn >= 0;
    if (!interior) {
      // Kip drags the frozen (upright, sliding) Max across the platform to the train door at x=960
      let kx;
      if (tRun < 0) kx = -300;
      else if (tDrag < 0) kx = lerp(-260, 420, easeOut(Math.min(tRun, 6) / 6));
      else kx = lerp(420, 1000, easeIO(clamp(tDrag / 6.2)));
      const mx = kx - 210;
      const inDoor = tGo >= 0;
      const kxx = inDoor ? 1010 : kx, mxx = inDoor ? 900 : mx;
      const doorU = tUn >= 0 ? easeIO(clamp((tUn - 0.4) / 0.9)) : 0;
      const hx = tFollow >= 0 ? lerp(-200, 380, easeOut(clamp(tFollow / 2.2))) : -400;
      const moving = !inDoor && tRun >= 0;
      const P = { kip: { x: kxx }, max: { x: mxx, h: 1.06 } };
      let cam = { z: 1.15, x: lerp(kxx, mxx, 0.4) + 120, y: 540 };
      if (a === 'runIn') cam = { z: 1.25, x: Math.max(500, kx), y: 560 };
      if (a === 'drag') cam = { z: 1.5, x: kx - 60, y: 470 };
      if (a === 'dragRun2') cam = { z: 1.35, x: kx - 40, y: 500 };
      if (a === 'hoodFollow') cam = { z: lerp(1.2, 1.05, lt / 1.8), x: lerp(700, 640, lt / 1.8), y: 540 };
      if (a === 'clapGo') cam = { z: 1.6, x: 980, y: 520 };
      if (a === 'unfreeze' || a === 'doors') cam = { z: lerp(1.25, 1.05, easeIO((c.t - (beatOf(c, 'unfreeze') || c.b).start) / 4)), x: 760, y: 540 };
      const pass = [[1300, 61, true, 'idle'], [1560, 62, true, 'think'], [1820, 63, false, 'point'], [640, 64, false, 'idle'], [200, 65, true, 'shrug']].map(([x, i, fl, p]) => stander(c, { i, x, y: 905, s: 0.95, flip: fl, pose: p, lookX: fl ? -0.4 : 0.4 })).join('');
      const maxG = person('max', c, { x: mxx, flip: false, lookX: 0.3, pose: { armR: { sh: 70, el: -30 } }, live: false,
        expression: tUn >= 0 ? c.eExpr('max') : 'fear' });
      const world = `${stationBG(c, cam, inDoor ? doorU : 0)}${pass}`;
      const doorFront = inDoor && doorU > 0 ? `<g>${[960].map(dx => `<rect x="${f(dx - 110)}" y="390" width="${f(110 * doorU)}" height="420" fill="#e9edf3" stroke="#9aa6b8" stroke-width="3" opacity="0.45"/><rect x="${f(dx + 110 - 110 * doorU)}" y="390" width="${f(110 * doorU)}" height="420" fill="#e9edf3" stroke="#9aa6b8" stroke-width="3" opacity="0.45"/>
          <rect x="${f(dx - 110 * doorU + 16)}" y="420" width="${f(Math.max(0, 110 * doorU - 32))}" height="170" rx="10" fill="#bfe6ff" opacity="0.35"/><rect x="${f(dx + 16)}" y="420" width="${f(Math.max(0, 110 * doorU - 32))}" height="170" rx="10" fill="#bfe6ff" opacity="0.35"/>`).join('')}</g>` : '';
      const kPose = a === 'clapGo' ? clapPose(lt) : (moving ? Object.assign(walkPose(c.t, 1, true), { armL: { sh: 70, el: 10 } }) : undefined);
      const scale = inDoor ? 0.8 : 1, yy = inDoor ? 812 : 905;
      const fg = `${tFollow >= 0 && tUn < 0 ? hooded(c, { x: hx, pose: tFollow < 2.2 ? walkPose(c.t, 0.7) : P_REACH }) : ''}
        ${inDoor ? '' : ''}
        ${kip(c, { x: kxx, y: yy, scale, flip: moving, pose: kPose, lookX: moving ? -0.6 : (tFollow >= 0 ? -0.7 : 0.3) })}
        ${moving ? `<path d="M${f(kx - 90)} ${f(735)} L${f(mx + 70)} ${f(735)}" stroke="#16161c" stroke-width="10" stroke-linecap="round"/>` : ''}`;
      // when Max is in the doorway he is drawn small & behind the doors; otherwise he is dragged on the platform
      const maxLayer = inDoor ? X.renderPerson(CAST.max, { id: 'mx2', x: mxx, y: yy, scale, flip: false, expression: tUn >= 0 ? c.eExpr('max') : 'fear', pose: { armR: { sh: 70, el: -30 } }, t: c.wt, blink: 0, talk: c.talk('MAX') }) : maxG;
      const hoodPlat = tUn >= 0 ? hooded(c, { x: 380, pose: 'idle' }) : '';
      const svg = c.F(world) + (inDoor ? c.F(maxLayer) + fg + c.F(doorFront) : c.F(maxLayer) + fg) + hoodPlat + ripple(c, 1000, 560);
      return { svg, cam, overlay: zFlash(c) + motes(c, 26, 31) + (moving ? `<g opacity="0.25">${[...Array(8)].map((_, i) => `<path d="M${(i * 300 + c.t * 2400) % 2200 - 140} ${200 + i * 90} l-160 0" stroke="#fff" stroke-width="4"/>`).join('')}</g>` : '') };
    }
    // ---------- interior
    const tW = since(c, 'window'), tIdea = since(c, 'idea');
    const outU = tW >= 0 ? clamp(Math.pow(Math.max(0, tW - 1.2) / 6.5, 2)) : 0;
    const phase = tIdea >= 0 ? 'city' : 'platform';
    const P = { kip: { x: 700 }, max: { x: 1030, h: 1.06 } };
    let cam = dcam(c, P, { wideX: 880 });
    if (a === 'window') cam = { z: lerp(1.1, 1.3, easeIO(lt / 3)), x: lerp(860, 1180, easeIO(lt / 3)), y: 470 };
    if (a === 'watchRaise') cam = { z: lerp(1.5, 2.1, easeIO(lt / 2)), x: lerp(1180, 1240 - outU * 300, lt / 2), y: 400 };
    const world = trainInterior(c, cam, outU, phase);
    const svg = world + person('max', c, { x: 1030, lookX: tW >= 0 && tIdea < 0 ? 0.5 : lookFrom(c, 'max', P), lookY: tW >= 0 && tIdea < 0 ? -0.2 : 0, pose: tW >= 0 && tIdea < 0 ? 'point' : undefined }) +
      kip(c, { x: 700, lookX: tW >= 0 && tIdea < 0 ? 0.7 : lookFrom(c, 'kip', P) });
    return { svg, cam };
  };

  // =====================================================================================================
  // CHRONO LABORATORY — violet night lab with the Chrono Pulse ring (also the "after" scene, lights on)
  // =====================================================================================================
  function labBG(c, cam, o = {}) {
    const wt = c.wt, lit = o.lit, alarm = o.alarm || 0;
    const ring = (r, w, col, rot, dash) => `<circle r="${r}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} transform="rotate(${f(rot)})"/>`;
    const pulse = o.pulse || 0;
    const clock = (x, y, r, sp, k) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#f4eee0" stroke="#b08a3a" stroke-width="6"/>
      <path d="M0 0 L0 ${-r * 0.7}" stroke="#222" stroke-width="5" stroke-linecap="round" transform="rotate(${f(wt * sp * 6 + k * 40)})"/><path d="M0 0 L0 ${-r * 0.45}" stroke="#222" stroke-width="7" stroke-linecap="round" transform="rotate(${f(wt * sp * 0.5 + k * 70)})"/><circle r="5" fill="#222"/></g>`;
    const holoCr = o.cracks || 0;
    const holo = `<g transform="translate(330 330)"><rect x="-230" y="-150" width="460" height="300" rx="16" fill="${alarm > 0 ? '#ff3b4a' : '#4ff0ff'}" opacity="0.1" stroke="${alarm > 0 ? '#ff6b7a' : '#4ff0ff'}" stroke-width="3"/>
      ${[...Array(9)].map((_, i) => `<rect x="${-200 + (i % 3) * 140}" y="${-110 + Math.floor(i / 3) * 80}" width="110" height="60" fill="${alarm > 0 ? '#ff6b7a' : '#4ff0ff'}" opacity="0.15"/>`).join('')}
      ${holoCr > 0 ? crack(-60, 0, 260, 4, holoCr, 3) + crack(80, -40, 200, 8, holoCr, 3) + crack(0, 60, 200, 15, holoCr, 3) : ''}
      ${txt(-210, -120, 'TIME CRACK MONITOR', 18, { fill: alarm > 0 ? '#ffb3bb' : '#9ff6ff', a: 'start', ls: 3, w: 700 })}
      ${txt(210, 135, alarm > 0 ? 'CRITICAL' : (holoCr > 0 ? 'CRACKS: 11' : 'STABLE'), 22, { fill: alarm > 0 ? '#ff6b7a' : '#ffd27a', a: 'end', font: "'JetBrains Mono', monospace", w: 700 })}</g>`;
    return `<g transform="${par(cam, 0.35)}"><rect x="-600" y="-100" width="3120" height="1000" fill="${lit ? '#3a2f63' : '#160b2c'}"/>
        ${[...Array(18)].map((_, i) => [...Array(7)].map((_, j) => `<path transform="translate(${-500 + i * 160 + (j % 2) * 80} ${40 + j * 120})" d="M0 -46 L40 -23 L40 23 L0 46 L-40 23 L-40 -23Z" fill="none" stroke="${lit ? '#5a4c8a' : '#2a1850'}" stroke-width="3"/>`).join('')).join('')}
        ${clock(110, 160, 54, 1, 0)}${clock(1560, 150, 46, -3, 1)}${clock(1760, 290, 38, 7, 2)}${clock(1350, 260, 30, 12, 3)}
        <g transform="translate(1850 120)"><rect x="-50" y="0" width="100" height="320" rx="12" fill="#5a3a20"/><circle cy="70" r="36" fill="#f4eee0"/>
          <g transform="rotate(${f(Math.sin(wt * 2.4) * 22)} 0 120)"><path d="M0 120 L0 280" stroke="#d9a441" stroke-width="5"/><circle cy="290" r="22" fill="#d9a441"/></g></g></g>
      <g transform="${par(cam, 0.15)}">
        <path d="M-300 120 L2220 120" stroke="#3a2a5a" stroke-width="30"/><path d="M-300 170 L2220 170" stroke="#2a1d44" stroke-width="18"/>
        <g transform="translate(960 470)">
          <circle r="${f(330 + pulse * 60)}" fill="#c06bff" opacity="${f(0.08 + pulse * 0.25)}"/>
          ${ring(300, 46, lit ? '#6a5a9a' : '#3a2a64', 0)}${ring(300, 10, '#c06bff', wt * 20, '40 30')}${ring(250, 6, '#ff6bd5', -wt * 35, '10 22')}${ring(200, 4, '#4ff0ff', wt * 50, '60 40')}
          <circle r="140" fill="url(#core5)"/><radialGradient id="core5"><stop offset="0" stop-color="#fff"/><stop offset="0.3" stop-color="${lit ? '#d8c8ff' : '#e0a8ff'}"/><stop offset="1" stop-color="#7a2ad6" stop-opacity="${lit ? 0.2 : 0.6}"/></radialGradient>
          <rect x="-200" y="290" width="400" height="60" rx="12" fill="#2a1d44"/><rect x="-260" y="340" width="520" height="40" rx="10" fill="#3a2a5a"/></g>
        ${holo}
        <g transform="translate(1560 0)"><rect x="-200" y="660" width="400" height="30" rx="8" fill="#4a3a6a"/><rect x="-180" y="690" width="20" height="120" fill="#3a2a5a"/><rect x="160" y="690" width="20" height="120" fill="#3a2a5a"/>
          ${[[-120, '#4ff0ff'], [-40, '#ff6bd5'], [40, '#7dff9a']].map(([x, col]) => `<path d="M${x - 20} 590 L${x + 20} 590 L${x + 30} 660 L${x - 30} 660Z" fill="${col}" opacity="0.6"/><rect x="${x - 8}" y="560" width="16" height="30" fill="#ccc" opacity="0.6"/>`).join('')}
          <rect x="80" y="610" width="90" height="50" rx="8" fill="#1d1430"/><rect x="90" y="620" width="70" height="30" fill="#4ff0ff" opacity="0.5"/></g>
        <g transform="translate(1840 0)"><rect x="-120" y="300" width="240" height="510" fill="#0b0618"/>
          <rect x="-120" y="300" width="${f(120 * (1 - (o.door || 0)))}" height="510" fill="#3a2a5a" stroke="#5a4a8a" stroke-width="4"/><rect x="${f(120 - 120 * (1 - (o.door || 0)))}" y="300" width="${f(120 * (1 - (o.door || 0)))}" height="510" fill="#3a2a5a" stroke="#5a4a8a" stroke-width="4"/>
          ${o.door > 0 ? `<rect x="${f(-120 * o.door)}" y="300" width="${f(240 * o.door)}" height="510" fill="#e8e0ff" opacity="${f(0.85 * o.door)}"/>` : ''}
          <rect x="-130" y="285" width="260" height="18" fill="${o.door > 0 ? '#7dff9a' : '#ff6bd5'}"/></g></g>
      <rect x="-300" y="810" width="2520" height="400" fill="${lit ? '#2a2248' : '#0e0820'}"/>
      ${[...Array(12)].map((_, i) => `<path d="M${960 + (i - 6) * 130} 810 L${960 + (i - 6) * 440} 1080" stroke="${lit ? '#3a3266' : '#24164a'}" stroke-width="3"/>`).join('')}
      <ellipse cx="960" cy="860" rx="420" ry="50" fill="#c06bff" opacity="${f(0.15 + pulse * 0.3)}"/>
      <path d="M760 820 Q600 900 300 880 M1160 820 Q1300 900 1600 890" stroke="#2a1d44" stroke-width="14" fill="none"/>
      ${alarm > 0 ? `<rect x="-300" y="-100" width="2520" height="1300" fill="#ff1a3a" opacity="${f(alarm * (0.12 + 0.12 * Math.sin(c.t * 10)))}"/>` : ''}`;
  }
  function labScene(c, afterMode) {
    const a = c.b.a, lt = c.lt;
    const tPulse = since(c, 'pulse'), tHolo = since(c, 'holo'), tDoor = since(c, 'doorHiss'), tOff = since(c, 'hoodOff'), tAl = since(c, 'alarm'), tBig = since(c, 'bigFreeze');
    const wx = afterMode ? 1580 : (tDoor >= 0 ? lerp(1840, 1600, easeOut(clamp((tDoor - 0.6) / 1.4))) : 2300);
    const wrenOn = afterMode || tDoor >= 0.3;
    const hoodU = afterMode ? 1 : (tOff >= 0 ? easeIO(clamp(tOff / 1.6)) : 0);
    const P = { kip: { x: 700 }, max: { x: 440, h: 1.06 }, prof: { x: afterMode ? 1330 : 1250, h: 1.1 } };
    if (wrenOn) P.wren = { x: wx, h: 0.98 };
    let cam = dcam(c, P, { wideX: 1000 });
    if (a === 'labOpen') cam = { z: lerp(1.6, 1.0, easeIO(lt / 1.8)), x: lerp(960, 1000, lt), y: lerp(400, 540, easeIO(lt / 1.8)) };
    if (a === 'pulse') cam = { z: lerp(1.2, 1.35, easeIO(lt / 4)), x: lerp(1100, 960, easeIO(lt / 4)), y: 480 };
    if (a === 'holo' && c.b.v === 'PROF') cam = { z: lerp(1.35, 1.6, easeIO(lt / 5)), x: lerp(560, 420, easeIO(lt / 5)), y: 400 };
    if (a === 'eleven') cam = { z: 1.9, x: 1250, y: 390 + Math.sin(c.t * 50) * 5 };
    if (a === 'doorHiss') cam = { z: lerp(1.2, 1.55, easeIO(lt / 1.3)), x: 1700, y: 520 };
    if (a === 'enter' && c.b.v === 'HOOD') cam = { z: 1.6, x: wx - 40, y: 420 };
    if (a === 'hoodOff') cam = { z: lerp(1.5, 1.75, easeIO(lt / 2.4)), x: wx, y: 400 };
    if (a === 'alarm') cam = { z: lerp(1.0, 1.1, lt), x: 960, y: 540 + Math.sin(c.t * 40) * 4 };
    if (a === 'bigFreeze') cam = { z: lerp(1.1, 1.3, easeIO(lt / 2.4)), x: lerp(960, 900, lt / 2.4), y: 520 };
    if (a === 'clapFail') cam = { z: lerp(1.5, 1.7, lt / 3), x: 700, y: 470 };
    if (a === 'broken') cam = { z: 1.45, x: (700 + wx) / 2 + 200, y: 450 };
    if (a === 'wake' && c.bi === c.run.beats[0]) cam = { z: lerp(1.05, 1.3, easeIO(lt / 3)), x: lerp(1000, 1250, easeIO(lt / 3)), y: 480 };
    if (a === 'hug') cam = { z: 1.35, x: 1450, y: 470 };
    if (a === 'testClap') cam = { z: lerp(1.5, 1.7, easeIO(lt / 1.6)), x: 700, y: 500 };
    const crk = tHolo >= 0 ? clamp(tHolo / 6) : 0;
    const world = labBG(c, cam, { lit: afterMode, pulse: tPulse >= 0 && tPulse < 3 ? Math.sin(Math.PI * clamp(tPulse / 3)) : (tBig >= 0 && tBig < 1 ? 1 - tBig : 0),
      cracks: afterMode ? 0 : (tAl >= 0 ? 1 : crk), alarm: !afterMode && tAl >= 0 && tBig < 0 ? 1 : 0, door: !afterMode && tDoor >= 0 ? clamp(tDoor / 0.6) * (1 - sm(2, 3, tDoor)) : 0 });
    const profPose = afterMode && after(c, 'hug') ? HUG : (a === 'pulse' || a === 'eleven' ? 'surprise' : (a === 'holo' ? 'point' : (a === 'alarm2' || a === 'bigFreeze' ? 'scared' : undefined)));
    const frozenPeople = `${person('prof', c, { x: P.prof.x, lookX: lookFrom(c, 'prof', P), pose: profPose, flip: !(a === 'holo') })}
      ${person('max', c, { x: 440, flip: false, lookX: lookFrom(c, 'max', P), pose: a === 'alarm2' || a === 'bigFreeze' ? 'scared' : undefined })}`;
    const wrenG = !wrenOn ? '' : (hoodU < 1 ? `<g>${person('wren', c, { x: wx, live: true, lookX: -0.6, pose: 'idle' })}<g opacity="${f(1 - hoodU)}" transform="translate(0 ${f(-hoodU * 60)})">${hooded(c, { x: wx, pose: 'idle', shadow: false })}</g></g>`
      : person('wren', c, { x: wx, live: true, lookX: lookFrom(c, 'wren', P), pose: afterMode && after(c, 'hug') ? HUG : (a === 'broken' ? { armR: { sh: 80, el: -10 } } : undefined) }));
    const kPose = a === 'clapFail' ? clapPose(lt % 1.0) : (a === 'testClap' ? clapPose(lt) : undefined);
    const fg = `${wrenG}${kip(c, { x: 700, pose: kPose, lookX: a === 'doorHiss' || a === 'enter' || a === 'hoodOff' ? 0.75 : lookFrom(c, 'kip', P) })}`;
    const bigCracks = !afterMode && tBig >= 0 ? [[300, 300, 3], [1600, 260, 5], [960, 150, 7], [200, 800, 9], [1700, 820, 11], [1200, 640, 13]].map(([x, y, s]) => crack(x, y, 420, s, clamp((tBig - 0.2) / 1.5), 6)).join('') : '';
    const flash = !afterMode && tBig >= 0 && tBig < 0.6 ? `<rect width="1920" height="1080" fill="#ffffff" opacity="${f(0.85 * (1 - tBig / 0.6))}"/>` : '';
    const tPulseFlash = tPulse >= 0 && tPulse < 0.5 ? `<rect width="1920" height="1080" fill="#c06bff" opacity="${f(0.35 * (1 - tPulse / 0.5))}"/>` : '';
    const nope = afterMode && a === 'testClap2' ? '' : '';
    return { svg: c.F(world + frozenPeople) + fg + bigCracks + nope + (afterMode ? '' : ripple(c, 960, 470)), cam, overlay: flash + tPulseFlash + motes(c, 30, 41) };
  }
  S.lab = c => labScene(c, false);
  S.after = c => labScene(c, true);

  // =====================================================================================================
  // THE FROZEN CITY — everything crystallised, golden cracks, hover-cars hanging in the air
  // =====================================================================================================
  const CARS = [[620, 860, '#ff6b5e'], [960, 760, '#4b6ef5'], [1300, 660, '#ffd34d'], [1640, 560, '#3ccf8e']];
  function frozenBG(c, cam, quake) {
    const r = rng(77);
    let towers = '';
    for (let i = 0; i < 14; i++) {
      const x = -500 + i * 220 + r() * 60, h = 340 + r() * 420, w = 110 + r() * 90, top = 760 - h;
      towers += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h + 40)}" rx="12" fill="${['#cfe6f7', '#bcdcf2', '#e3f2fb'][i % 3]}"/>
        <path d="M${f(x)} ${f(top)} ${[...Array(6)].map((_, k) => `L${f(x + (k + 0.5) * w / 6)} ${f(top + 26 + r() * 30)} L${f(x + (k + 1) * w / 6)} ${f(top)}`).join(' ')}Z" fill="#ffffff"/>
        ${[...Array(5)].map((_, k) => `<rect x="${f(x + 14)}" y="${f(top + 60 + k * h / 6)}" width="${f(w - 28)}" height="14" fill="#9cc8e6" opacity="0.6"/>`).join('')}`;
    }
    const fall = quake > 0 ? quake : 0;
    const ground = [...Array(8)].map((_, i) => { const x0 = -300 + i * 320, dy = fall > 0 ? Math.pow(Math.max(0, fall - i * 0.12), 2) * 900 : 0;
      return `<path transform="translate(0 ${f(dy)})" d="M${x0} 860 L${x0 + 320} 860 L${x0 + 300} 1180 L${x0 + 20} 1180Z" fill="${i % 2 ? '#d6ebf7' : '#c9e3f3'}" stroke="#ffffff" stroke-width="4"/>`; }).join('');
    return `${sky('fzsky', [[0, '#f2fbff'], [0.6, '#cfe9f8'], [1, '#a9d4ef']])}
      <g transform="${par(cam, 0.6)}"><rect x="-700" y="-300" width="3320" height="1300" fill="url(#fzsky)"/>
        <g transform="translate(1260 0)"><path d="M-60 760 L-30 120 L30 120 L60 760Z" fill="#b7d8ef"/><path d="M-90 140 L90 140 L60 100 L-60 100Z" fill="#dff1fb"/><rect x="-8" y="20" width="16" height="80" fill="#b7d8ef"/></g></g>
      <g transform="${par(cam, 0.3)}">${towers}</g>
      ${ground}
      ${[[300, 860, 66], [1880, 860, 67], [1120, 860, 68]].map(([x, y, i]) => stander(c, { i, x, y, s: 0.9, pose: walkPose(i, 0.8), flip: i % 2 === 0 })).join('')}`;
  }
  function jumpPath(t, pts, dur) {   // hop along platform tops; returns {x,y,air}
    const n = pts.length - 1, seg = dur / n, i = Math.min(n - 1, Math.floor(t / seg)), u = clamp((t - i * seg) / seg);
    if (t <= 0) return { x: pts[0][0], y: pts[0][1], air: 0 };
    if (t >= dur) return { x: pts[n][0], y: pts[n][1], air: 0 };
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    return { x: lerp(x0, x1, u), y: lerp(y0, y1, u) - Math.sin(Math.PI * u) * 150, air: Math.sin(Math.PI * u) };
  }
  S.frozen = c => {
    const a = c.b.a, lt = c.lt;
    const tQ = since(c, 'quake'), tJ = since(c, 'carJump'), tLand = since(c, 'landed');
    const kPts = [[700, 905], ...CARS.slice(0, 3).map(([x, y]) => [x, y - 28])], wPts = [[1000, 905], [CARS[0][0] + 40, CARS[0][1] - 28], [CARS[1][0] + 60, CARS[1][1] - 28], [CARS[2][0] + 110, CARS[2][1] - 28]];
    const kj = jumpPath(tJ, kPts, 3.0), wj = jumpPath(tJ - 0.25, wPts, 3.0);
    const kx = kj.x, ky = kj.y, wx = wj.x, wy = wj.y;
    const P = { kip: { x: kx, y: ky }, wren: { x: wx, y: wy, h: 0.98 } };
    let cam = dcam(c, P, { wideX: 900 });
    if (a === 'frozenOpen') cam = { z: lerp(1.0, 1.25, easeIO(lt / 2.4)), x: lerp(1260, 900, easeIO(lt / 2.4)), y: lerp(330, 540, easeIO(lt / 2.4)) };
    if (a === 'quake' || a === 'quake2') cam = { z: 1.1, x: 900, y: 560 + Math.sin(c.t * 45) * 7 };
    if (a === 'carJump') cam = { z: lerp(1.15, 1.3, lt / 3.4), x: lerp(800, kx + 80, 0.85), y: Math.min(540, ky - 240) };
    if (a === 'landed') cam = { z: c.b.v === 'KIP' ? 1.55 : 1.3, x: c.b.v === 'KIP' ? kx : (kx + wx) / 2 + 60, y: ky - 330 };
    const quake = tQ >= 0 ? clamp((tQ - 0.4) / 2.5) : 0;
    const world = frozenBG(c, cam, quake) + CARS.map(([x, y, col], i) => L.hoverCar(x, y + 30, 0.95, col, c.t, { glow: 0.3, flip: i % 2 === 1 })).join('') + L.pigeon(CARS[2][0] - 60, CARS[2][1] - 30, 0.8, 0, false, false);
    const kPose = kj.air > 0.05 ? { armL: { sh: 120, el: 10 }, armR: { sh: 120, el: 10 }, legL: { hip: 20, knee: -40 }, legR: { hip: 10, knee: -30 } } : undefined;
    const wPose = wj.air > 0.05 ? { armL: { sh: 120, el: 10 }, armR: { sh: 120, el: 10 }, legL: { hip: 20, knee: -40 }, legR: { hip: 10, knee: -30 } } : (a === 'quake2' && c.b.v === 'WREN' ? 'point' : undefined);
    const groundCracks = tQ >= 0 ? [[300, 880, 21], [800, 900, 22], [1300, 880, 23], [1700, 900, 24]].map(([x, y, s]) => crack(x, y, 380, s, clamp(tQ / 1.2), 5)).join('') : '';
    const skyCracks = `<g transform="${par(cam, 0.6)}">${crack(700, 120, 600, 31, 1, 6)}${crack(1500, 60, 500, 32, 1, 6)}${crack(200, 300, 400, 33, 1, 5)}
      <circle cx="1260" cy="80" r="${f(46 + Math.sin(c.t * 3) * 6)}" fill="#ffd27a"/><circle cx="1260" cy="80" r="110" fill="#ffd27a" opacity="0.25"/></g>`;
    const fg = skyCracks + groundCracks +
      person('wren', c, { x: wx, y: wy, live: true, flip: true, lookX: lookFrom(c, 'wren', P), pose: wPose, shadow: wj.air < 0.05 }) +
      kip(c, { x: kx, y: ky, pose: kPose, lookX: lookFrom(c, 'kip', P), shadow: kj.air < 0.05 });
    const shards = [...Array(26)].map((_, i) => { const r = rng(i * 7919 + 90); r(); const x = r() * 1920, y = r() * 1080, s = 6 + r() * 16; return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(r() * 360 + c.t * 4)})" d="M0 ${-s} L${f(s * 0.6)} 0 L0 ${s} L${f(-s * 0.6)} 0Z" fill="#ffffff" opacity="0.7"/>`; }).join('');
    return { svg: c.F(world) + fg, cam, overlay: shards };
  };

  // =====================================================================================================
  // THE CORE — top of Tock Tower, sky shattered like glass
  // =====================================================================================================
  S.core = c => {
    const a = c.b.a, lt = c.lt;
    const tH = since(c, 'hands'), tT = since(c, 'touch'), tR = since(c, 'restore');
    const kx = tH >= 0 ? lerp(700, 780, easeIO(clamp(tH / 1.2))) : 700, wx = tH >= 0 ? lerp(1220, 1140, easeIO(clamp(tH / 1.2))) : 1220;
    const P = { kip: { x: kx }, wren: { x: wx, h: 0.98 } };
    let cam = dcam(c, P, { wideX: 960, y: 520 });
    if (a === 'coreOpen') cam = { z: lerp(1.0, 1.2, easeIO(lt / 2.2)), x: 960, y: lerp(300, 500, easeIO(lt / 2.2)) };
    if (a === 'touch') cam = { z: lerp(1.25, 1.6, easeIO(lt / 2)), x: 960, y: 460 };
    if (a === 'restore') cam = { z: lerp(1.6, 1.0, easeIO(lt / 3.8)), x: 960, y: lerp(460, 540, easeIO(lt / 3.8)) };
    const heal = tR >= 0 ? clamp(tR / 2.4) : 0;
    const charge = tT >= 0 ? clamp(tT / 1.5) : 0;
    const rot = c.t * 30;
    const city = [...Array(30)].map((_, i) => { const r = rng(i * 7919 + 7); r(); const x = -300 + i * 90, h = 40 + r() * 120; return `<rect x="${f(x)}" y="${f(780 - h)}" width="${f(50 + r() * 30)}" height="${f(h)}" fill="#bcdcf2"/>`; }).join('');
    const world = `${sky('crsky', [[0, '#e6f6ff'], [1, '#9ccbe8']])}<g transform="${par(cam, 0.6)}"><rect x="-700" y="-300" width="3320" height="1400" fill="url(#crsky)"/>${city}</g>
      <path d="M200 905 L1720 905 L1900 1080 L20 1080Z" fill="#d6ebf7"/><ellipse cx="960" cy="905" rx="760" ry="70" fill="#e9f6fc" stroke="#ffffff" stroke-width="6"/>
      <ellipse cx="960" cy="905" rx="520" ry="46" fill="none" stroke="#9cc8e6" stroke-width="4"/>`;
    const core = `<g transform="translate(960 ${f(470 + Math.sin(c.t * 1.6) * 10)})">
      <circle r="${f(240 + charge * 160 + heal * 600)}" fill="#ffd27a" opacity="${f(0.15 + charge * 0.3)}"/>
      <ellipse rx="210" ry="60" fill="none" stroke="#ffd27a" stroke-width="8" transform="rotate(${f(rot)})"/><ellipse rx="210" ry="60" fill="none" stroke="#4ff0ff" stroke-width="6" transform="rotate(${f(-rot * 1.3 + 60)})"/>
      <path d="M-90 -150 L90 -150 L18 0 L90 150 L-90 150 L-18 0Z" fill="#fff6dc" stroke="#ffd27a" stroke-width="8"/>
      <path d="M-60 -130 L60 -130 L10 -20 L-10 -20Z" fill="#ffd27a" opacity="0.8"/><path d="M-10 20 L10 20 L60 130 L-60 130Z" fill="#ffd27a" opacity="${f(0.4 + charge * 0.6)}"/></g>`;
    const cracks = heal < 1 ? [[300, 160, 41], [1600, 140, 42], [960, 80, 43], [150, 520, 44], [1780, 480, 45], [600, 300, 46], [1350, 300, 47]].map(([x, y, s]) => crack(x, y, 520, s, 1 - heal, 7)).join('') : '';
    const reach = side => ({ armL: { sh: 12, el: -10 }, armR: { sh: 70 + charge * 10, el: -10 }, legL: { hip: 6, knee: 0 }, legR: { hip: 6, knee: 0 }, lean: -3, headTilt: 0, bob: 0 });
    const fg = cracks + core + person('wren', c, { x: wx, live: true, flip: true, lookX: tH >= 0 ? -0.4 : lookFrom(c, 'wren', P), lookY: tT >= 0 ? -0.3 : 0, pose: tH >= 0 && c.b.v !== 'WREN' || tT >= 0 ? reach(-1) : undefined }) +
      kip(c, { x: kx, pose: tT >= 0 || (tH >= 0 && c.b.v !== 'KIP') ? reach(1) : undefined, lookX: tT >= 0 ? 0.4 : lookFrom(c, 'kip', P), lookY: tT >= 0 ? -0.3 : 0 });
    const flash = tR >= 0 ? `<rect width="1920" height="1080" fill="#fffaf0" opacity="${f(tR < 0.4 ? tR / 0.4 : clamp(1 - (tR - 0.4) / 1.6))}"/>` : (charge > 0 ? `<rect width="1920" height="1080" fill="#ffd27a" opacity="${f(charge * 0.18)}"/>` : '');
    return { svg: c.F(world) + fg, cam, overlay: flash + motes(c, 40, 51, '#fff6dc') };
  };

  // =====================================================================================================
  // SKY-BUS PLATFORM — next morning, above the clouds (final twist)
  // =====================================================================================================
  function skyBG(c, cam) {
    const wt = c.wt;
    const birds = [...Array(7)].map((_, i) => { const x = ((wt * (70 + i * 9) + i * 330) % 2600) - 300, y = 200 + (i % 3) * 70 + Math.sin(wt * 2 + i) * 14, fl = c.z > 0.5 ? 0.5 : Math.sin(wt * 12 + i);
      return `<path transform="translate(${f(x)} ${f(y)})" d="M-26 0 Q-12 ${f(-16 * fl)} 0 0 Q12 ${f(-16 * fl)} 26 0" stroke="#3a4a66" stroke-width="5" fill="none" stroke-linecap="round"/>`; }).join('');
    return `${sky('sbsky', [[0, '#8fd0ff'], [0.55, '#d6efff'], [1, '#ffe9d6']])}
      <g transform="${par(cam, 0.6)}"><rect x="-700" y="-300" width="3320" height="1400" fill="url(#sbsky)"/>
        <circle cx="380" cy="230" r="80" fill="#fff8e0"/><circle cx="380" cy="230" r="180" fill="#fff2c0" opacity="0.3"/>
        ${[[1400, 420, 1.0], [1750, 500, 0.7], [200, 520, 0.6]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-160 0 L160 0 L60 120 L-60 120Z" fill="#9aa8c0"/><ellipse rx="170" ry="26" fill="#7fcf8a"/>
          <rect x="-40" y="-200" width="80" height="200" rx="30" fill="#f4f8ff"/><rect x="-26" y="-180" width="52" height="150" rx="20" fill="#9fd6ff" opacity="0.5"/></g>`).join('')}</g>
      <g transform="${par(cam, 0.4)}">${birds}${[...Array(12)].map((_, i) => `<ellipse cx="${f(-300 + i * 230 + ((wt * 10) % 230))}" cy="${f(760 + (i % 3) * 20)}" rx="200" ry="60" fill="#ffffff" opacity="0.95"/>`).join('')}</g>
      <rect x="-300" y="905" width="2520" height="300" fill="#5a6a86"/><rect x="-300" y="895" width="2520" height="22" fill="#8a9ab6"/>
      <g opacity="0.95">${[...Array(28)].map((_, i) => `<rect x="${-300 + i * 92}" y="700" width="10" height="200" fill="#c4cedd"/>`).join('')}<rect x="-300" y="690" width="2520" height="16" rx="8" fill="#e3e9f2"/><rect x="-300" y="790" width="2520" height="8" fill="#c4cedd"/></g>
      <g transform="translate(260 0)"><rect x="-8" y="420" width="16" height="485" fill="#9aa3b5"/><rect x="-110" y="400" width="220" height="110" rx="16" fill="#1fc8b8"/>${txt(0, 450, 'SKY-BUS', 34, { fill: '#fff', ls: 3 })}${txt(0, 492, 'STOP 214', 30, { fill: '#dffcff', ls: 3 })}</g>
      <g transform="translate(1680 0)"><rect x="-160" y="780" width="320" height="24" rx="10" fill="#e8a25a"/><rect x="-150" y="804" width="14" height="100" fill="#7a5a3a"/><rect x="136" y="804" width="14" height="100" fill="#7a5a3a"/><rect x="-160" y="700" width="320" height="20" rx="10" fill="#e8a25a"/></g>`;
  }
  S.ending = c => {
    const a = c.b.a, lt = c.lt;
    const tSn = since(c, 'sneeze'), tSt = since(c, 'stopped'), tMP = since(c, 'maxPower'), tMC = since(c, 'maxClap');
    const kipFrozen = c.z > 0.5;
    const mxLive = tSt >= 0 && tMC < 0;
    const mx = tMP >= 0 && tMC < 0 ? lerp(1080, 930, easeIO(clamp((tMP - 0.5) / 1.2))) : 1080;
    const P = { kip: { x: 760 }, max: { x: mx, h: 1.06 } };
    let cam = dcam(c, P, { wideX: 940 });
    if (a === 'morning' && c.bi === c.run.beats[0]) cam = { z: lerp(1.0, 1.2, easeIO(lt / 4)), x: lerp(400, 900, easeIO(lt / 4)), y: lerp(380, 520, easeIO(lt / 4)) };
    if (a === 'sneeze') cam = { z: 1.7, x: 1080, y: 430 };
    if (a === 'stopped') cam = { z: lerp(1.7, 1.15, easeIO(lt / 1.6)), x: lerp(1080, 920, easeIO(lt / 1.6)), y: lerp(430, 520, easeIO(lt / 1.6)) };
    if (a === 'maxPower') cam = { z: lerp(1.3, 1.5, lt / 4), x: (760 + mx) / 2, y: 470 };
    if (a === 'maxClap') cam = { z: 1.4, x: 900, y: 480 };
    if (a === 'kipStache') cam = { z: 2.0, x: 760, y: 430 };
    if (a === 'camera') cam = { z: lerp(1.5, 1.8, easeIO(lt / 4)), x: 760, y: 440 };
    const stacheOn = tMP >= 3.0 || tMC >= 0;
    const world = skyBG(c, cam);
    const maxPose = a === 'sneeze' ? { armL: { sh: 40, el: -140 }, armR: { sh: 40, el: -140 }, lean: 6 } : (a === 'maxClap' ? clapPose(lt) : (tMP >= 1.6 && tMC < 0 ? { armR: { sh: 70, el: -60 } } : undefined));
    const maxG = person('max', c, { x: mx, live: mxLive || !kipFrozen, lookX: mxLive ? -0.7 : lookFrom(c, 'max', P), pose: maxPose, hold: tMP >= 1.6 && tMC < 0 ? { side: 1, svg: `<rect x="-6" y="-60" width="12" height="60" rx="5" fill="#222"/><rect x="-6" y="-70" width="12" height="14" fill="#f4f4f4"/>` } : null });
    const kipG = kip(c, { x: 760, frozen: kipFrozen, lookX: a === 'camera' ? 0 : lookFrom(c, 'kip', P), lookY: 0 });
    const stache = stacheOn ? L.mustache(760, 905 - 424, 0.8, '#f4f4f6') : '';
    const sneezeTxt = tSn >= 0.3 && tSn < 1.2 ? txt(1250, 300, 'AH-CHOO!', 88, { fill: '#ffd34d', stroke: '#22180f', sw: 10, op: 1 - sm(0.9, 1.2, tSn) }) : '';
    const svg = kipFrozen ? c.F(world + kipG + stache) + maxG + sneezeTxt + ripple(c, mx, 520) : c.F(world) + kipG + stache + maxG + sneezeTxt + ripple(c, mx, 520);
    return { svg, cam, overlay: zFlash(c) + motes(c, 26, 61) };
  };

  // =====================================================================================================
  // OUTRO — end card
  // =====================================================================================================
  S.outro = c => {
    const lt = c.lt;
    const click = lt > 4.5 && lt < 5.2, subbed = lt > 5;
    const cx = lerp(1700, 1150, easeOut((lt - 3) / 1.2)), cy = lerp(1000, 760, easeOut((lt - 3) / 1.2));
    const svg = `<radialGradient id="og5" cx="0.3" cy="0.6" r="0.9"><stop offset="0" stop-color="#173a5a"/><stop offset="1" stop-color="#05080f"/></radialGradient><rect width="1920" height="1080" fill="url(#og5)"/>
      ${[...Array(3)].map((_, i) => `<circle cx="420" cy="560" r="${300 + i * 120}" fill="none" stroke="#7fdcff" stroke-width="3" opacity="${0.18 - i * 0.05}" stroke-dasharray="20 18" transform="rotate(${f(c.t * (10 + i * 6))} 420 560)"/>`).join('')}
      ${person('max', c, { x: 220, y: 960, scale: 0.85, flip: false, expression: 'happy', pose: 'cheer', lookX: 0.4 })}
      ${person('wren', c, { x: 640, y: 960, scale: 0.85, flip: true, expression: 'happy', pose: 'wave', lookX: -0.4, live: true })}
      ${kip(c, { x: 430, y: 975, scale: 1.0, pose: 'wave', expression: 'happy', lookX: 0.2 })}
      <g transform="translate(1030 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d1424" stroke="#3b4a6b" stroke-width="5"/>${txt(0, 20, 'EP 4', 80, { fill: '#2c3a58' })}${txt(0, 165, 'WATCH EP 4', 28, { fill: '#9fb3c8' })}</g>
      <g transform="translate(1500 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d1424" stroke="#ffd27a" stroke-width="5"/>
        ${[...Array(5)].map((_, i) => [...Array(4)].map((_, j) => (i + j) % 2 ? `<rect x="${-80 + i * 32}" y="${-70 + j * 32}" width="32" height="32" fill="#2c3a58"/>` : '').join('')).join('')}
        ${txt(0, 165, 'NEXT: INSIDE A VIDEO GAME', 22, { fill: '#ffd27a', ls: 2 })}</g>
      <g transform="translate(1150 700) scale(${f(click ? 0.94 : 1)})"><rect x="-230" y="-55" width="460" height="110" rx="55" fill="${subbed ? '#3b4a6b' : '#e62e3d'}"/>${txt(0, 18, subbed ? 'SUBSCRIBED ✓' : 'SUBSCRIBE', 48, { fill: '#fff' })}</g>
      <path transform="translate(${f(cx)} ${f(cy)})" d="M0 0 L0 60 L16 46 L28 72 L40 66 L28 40 L48 40 Z" fill="#fff" stroke="#000" stroke-width="4"/>
      <g transform="translate(1260 880)" opacity="${f(sm(1.5, 2.5, lt))}"><rect x="-480" y="-50" width="960" height="100" rx="24" fill="#fff"/>${txt(0, 15, 'What would YOU do with a time freeze?', 40, { fill: '#223' })}</g>`;
    return { svg, cam: { z: 1 }, bars: 0, noFrost: true };
  };
})(typeof window !== 'undefined' ? window : globalThis);
