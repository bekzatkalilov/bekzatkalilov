/* Scene library for EP01 "What If You Stayed Awake for 11 Days?" (browser). */
(function (root) {
  'use strict';
  const { clamp, lerp, sm, easeOut, easeIO, f, rng, txt } = root.Engine.H;
  const K = root.Kip, X = root.Extras, BG = root.Backgrounds;
  const S = {};

  // ---------------------------------------------------------------- helpers
  function kip(c, o = {}) {
    return K.renderKip(Object.assign({ id: 'kip', expression: c.kExpr('k'), pose: c.kExpr('p', 'idle'),
      blink: K.blinkAt(c.t), talk: c.talk('KIP'), t: c.t, x: 780, y: 905, scale: 1.05, lookX: 0.15 }, o));
  }
  function person(who, c, o = {}) {
    const spk = { max: 'MAX', doc: 'DOC' }[who];
    return X.renderPerson(who, Object.assign({ id: who, expression: 'neutral', blink: K.blinkAt(c.t, 2),
      talk: spk ? c.talk(spk) : 0, t: c.t, x: 1300, y: 905, scale: 1.0, flip: true, lookX: -0.4 }, o));
  }
  const pill = (x, y, s, col = '#ff5470', size = 34, op = 1) => {
    const w = s.length * size * 0.68 + 50;
    return `<g transform="translate(${f(x)} ${f(y)})" opacity="${f(op)}"><rect x="${f(-w / 2)}" y="${-size}" width="${f(w)}" height="${size * 1.6}" rx="${size * 0.8}" fill="${col}"/>
      ${txt(0, size * 0.28, s, size, { fill: '#fff' })}</g>`;
  };
  const popIn = (lt, at, dur = 0.35) => easeOut((lt - at) / dur);
  const bubble = (x, y, w, h, inner, op = 1) => `<g opacity="${f(op)}"><ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="#fff"/>
      <circle cx="${x - w * 0.35}" cy="${y + h * 0.55}" r="16" fill="#fff"/><circle cx="${x - w * 0.45}" cy="${y + h * 0.75}" r="9" fill="#fff"/>${inner}</g>`;

  function brainShape(id) {
    return `<path id="${id}" d="M-290 40 C-310 -80 -230 -190 -120 -205 C-60 -250 60 -250 120 -205 C230 -190 310 -90 290 30 C300 110 240 170 160 170 C120 200 40 200 0 175 C-40 200 -130 200 -170 165 C-250 170 -300 110 -290 40 Z"/>`;
  }
  function brain(c, { cx = 960, cy = 470, s = 1.25, inner = '', tint = '#f39bb5', id = 'br' } = {}) {
    const r = rng(11); let gy = '';
    for (let i = 0; i < 26; i++) {
      const x = -260 + r() * 520, y = -190 + r() * 340, a = r() * 6.28, l = 40 + r() * 70;
      gy += `<path d="M${f(x)} ${f(y)} q${f(Math.cos(a) * l * 0.5)} ${f(Math.sin(a) * l * 0.5 - 30)} ${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)} t${f(Math.cos(a + 0.6) * l * 0.8)} ${f(Math.sin(a + 0.6) * l * 0.8)}" stroke="#c8607e" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.8"/>`;
    }
    return `<g transform="translate(${cx} ${cy}) scale(${s})">
      <defs><clipPath id="${id}-c">${brainShape(id + '-p')}</clipPath>
      <radialGradient id="${id}-g" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffd0dc"/><stop offset="0.6" stop-color="${tint}"/><stop offset="1" stop-color="#b24f6f"/></radialGradient></defs>
      <path d="M40 150 L95 150 L105 300 L60 300 Z" fill="#c8607e"/>
      <ellipse cx="170" cy="170" rx="85" ry="52" fill="#d9718f"/>
      ${[...Array(5)].map((_, i) => `<path d="M${100 + i * 8} ${150 + i * 10} q70 10 140 -4" stroke="#b24f6f" stroke-width="5" fill="none"/>`).join('')}
      <use href="#${id}-p" fill="url(#${id}-g)"/>
      <g clip-path="url(#${id}-c)">${gy}<path d="M0 -240 Q-10 -40 10 190" stroke="#b24f6f" stroke-width="10" fill="none" opacity="0.7"/>${inner}</g>
      <use href="#${id}-p" fill="none" stroke="#7e2f4a" stroke-width="8"/>
    </g>`;
  }
  function darkLab(c) { // generic dark explainer background
    let g = '';
    for (let x = 0; x <= 1920; x += 80) g += `<path d="M${x} 0 V1080" stroke="#1d2540" stroke-width="2"/>`;
    for (let y = 0; y <= 1080; y += 80) g += `<path d="M0 ${y} H1920" stroke="#1d2540" stroke-width="2"/>`;
    const r = rng(5); let dots = '';
    for (let i = 0; i < 40; i++) { const x = r() * 1920, y = (r() * 1080 - c.t * (10 + r() * 20)) % 1080; dots += `<circle cx="${f(x)}" cy="${f((y + 1080) % 1080)}" r="${f(1 + r() * 2.5)}" fill="#6fe3ff" opacity="${f(0.15 + r() * 0.3)}"/>`; }
    return `<radialGradient id="dl" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="#18223f"/><stop offset="1" stop-color="#070a14"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#dl)"/>${g}${dots}`;
  }
  function kipBust(c, x, y, s, o = {}) { // Kip reacting in a corner
    return kip(c, Object.assign({ id: 'kb', x, y, scale: s, shadow: false, pose: 'idle' }, o));
  }
  function confetti(t0, t, n = 90, seed = 3) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * 1920, sp = 200 + r() * 300, y = -50 + (t - t0) * sp - r() * 400, rot = (t * 300 * (r() - 0.5)) + r() * 360;
      const col = ['#ffd34d', '#ff5470', '#34d399', '#38bdf8', '#f07a2a', '#a78bfa'][i % 6];
      if (y > -40 && y < 1100) s += `<rect x="-8" y="-4" width="16" height="8" fill="${col}" transform="translate(${f(x + Math.sin(t * 3 + i) * 30)} ${f(y)}) rotate(${f(rot)})"/>`;
    }
    return s;
  }
  function filmFx(c) {
    const r = rng(Math.floor(c.t * 24) + 1); let s = '';
    for (let i = 0; i < 3; i++) if (r() < 0.6) s += `<rect x="${f(r() * 1920)}" y="0" width="${f(1 + r() * 2)}" height="1080" fill="#fff" opacity="${f(0.08 + r() * 0.12)}"/>`;
    for (let i = 0; i < 40; i++) s += `<circle cx="${f(r() * 1920)}" cy="${f(r() * 1080)}" r="${f(r() * 2.5)}" fill="${r() < 0.5 ? '#000' : '#fff'}" opacity="0.35"/>`;
    const fl = 0.06 + 0.05 * r();
    return s + `<rect width="1920" height="1080" fill="#000" opacity="${f(fl)}"/>`;
  }
  const SEPIA = `<filter id="sepia"><feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0"/></filter>`;

  // ---------------------------------------------------------------- HAUNT (hook)
  S.haunt = c => {
    const a = c.b.a, lt = c.lt;
    let figOp = 0, tint = 0.55, cam = { z: 1.0, x: 960, y: 540 }, blink = K.blinkAt(c.t), lookX = -0.85;
    if (a === 'figure') { figOp = sm(0.3, 2.0, lt) * (0.85 + 0.15 * Math.sin(c.t * 23)); cam = { z: lerp(1.0, 1.15, easeIO(lt / 4.5)), x: lerp(960, 700, easeIO(lt / 4.5)), y: 520 }; }
    if (a === 'vanish') { const bl = lt > 0.55 && lt < 0.85; blink = bl ? 1 : 0; figOp = lt < 0.7 ? 1 : 0; cam = { z: lt < 0.7 ? 1.15 : 1.25, x: lt < 0.7 ? 700 : 1050, y: 470 }; }
    if (a === 'calm') { tint = lerp(0.55, 0.2, sm(0, 1.5, lt)); lookX = 0.2; cam = { z: lerp(1.1, 1.0, easeOut(lt / 2)), x: 960, y: 540 }; }
    const pulse = a === 'figure' ? 0.25 * Math.max(0, Math.sin(c.t * 7)) : 0;
    const svg = `${BG.darkRoom({ t: c.t, floorY: 900, id: 'hr', screen: 'NO SIGNAL' })}
      <rect width="1920" height="1080" fill="#1a1d5a" opacity="${f(tint)}" style="mix-blend-mode:multiply"/>
      <radialGradient id="hglow"><stop offset="0" stop-color="#6b5cff" stop-opacity="0.5"/><stop offset="1" stop-color="#6b5cff" stop-opacity="0"/></radialGradient><ellipse cx="250" cy="560" rx="300" ry="460" fill="url(#hglow)" opacity="${f(figOp)}"/>
      ${X.renderShadow({ x: 250, y: 925, scale: 1.2, t: c.t, opacity: figOp, id: 'hs' })}
      ${kip(c, { x: 1150, lookX, blink })}`;
    const overlay = `<rect width="1920" height="1080" fill="#ff1030" opacity="${f(pulse)}" style="mix-blend-mode:multiply"/>`;
    return { svg, cam, overlay };
  };

  // ---------------------------------------------------------------- TITLE
  S.title = c => {
    const lt = c.lt, g = lt < 0.5 ? (1 - lt / 0.5) * 14 : (Math.random() < 0.04 ? 8 : 0);
    const face = K.renderKip({ id: 'tk', x: 960, y: 1900, scale: 2.4, expression: { ...K.EXPRESSIONS.surprise, open: 0, round: 0, smile: -0.2, wave: 0.6, pupil: 0.45, sweat: 1 }, lookX: Math.sin(c.t * 9) * 0.2, t: c.t, shadow: false, blink: 0 });
    const veins = [...Array(6)].map((_, i) => { const sd = i < 3 ? -1 : 1, a = (i % 3) * 0.5 - 0.5; return `<path d="M${960 + sd * 103 * 2.4 - sd * 30} ${1900 - 478 * 2.4} q${-sd * 25} ${f(a * 30)} ${-sd * 50} ${f(a * 50)}" stroke="#ff3355" stroke-width="5" fill="none" opacity="${f(sm(0.5, 2, lt))}"/>`; }).join('');
    const title = (dx, col) => `${txt(960 + dx, 230, 'WHAT IF YOU', 70, { fill: col, ls: 6 })}${txt(960 + dx, 360, 'NEVER SLEPT?', 150, { fill: col })}`;
    const svg = `<radialGradient id="tg" cx="0.5" cy="0.7" r="0.7"><stop offset="0" stop-color="#2b1640"/><stop offset="1" stop-color="#05030a"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#tg)"/>${face}${veins}
      <ellipse cx="${960 - 43 * 2.4}" cy="${1900 - 420 * 2.4}" rx="80" ry="22" fill="#5b2a7a" opacity="0.55"/><ellipse cx="${960 + 43 * 2.4}" cy="${1900 - 420 * 2.4}" rx="80" ry="22" fill="#5b2a7a" opacity="0.55"/>
      <g opacity="${f(easeOut(lt / 0.4))}">${g ? title(-g, '#ff2e63') + title(g, '#08d9d6') : ''}${title(0, '#fff')}</g>
      ${txt(960, 440, '11 DAYS · 264 HOURS · 0 SLEEP', 36, { fill: '#ffd34d', ls: 4, op: sm(1.2, 1.8, lt) })}`;
    return { svg, cam: { z: 1 + lt * 0.015 } };
  };

  // ---------------------------------------------------------------- FLASHBACK 1963
  S.flash = c => {
    const a = c.b.a, lt = c.lt, si = c.sentIdx();
    let planks = '';
    for (let x = 0; x < 1920; x += 96) planks += `<rect x="${x}" y="0" width="94" height="900" fill="${x % 192 ? '#8a5a35' : '#7b4f2e'}"/><path d="M${x + 30} 0 q10 450 -4 900" stroke="#5e3b20" stroke-width="2" fill="none" opacity="0.5"/>`;
    const poster = `<g transform="translate(1180 470)"><rect x="-260" y="-150" width="520" height="300" fill="#f3ecd8"/><rect x="-260" y="-150" width="130" height="300" fill="#e5dcc0"/><rect x="130" y="-150" width="130" height="300" fill="#e5dcc0"/>
      ${txt(0, -95, 'HOW LONG CAN A', 26, { fill: '#2c2c2c' })}${txt(0, -60, 'HUMAN STAY AWAKE?', 26, { fill: '#b33' })}
      <circle cx="0" cy="20" r="55" fill="none" stroke="#333" stroke-width="5"/><path d="M0 20 L0 -15 M0 20 L25 30" stroke="#333" stroke-width="5"/>
      <rect x="-230" y="-80" width="90" height="60" fill="#c9bfa0"/><rect x="150" y="-80" width="90" height="60" fill="#c9bfa0"/>
      ${txt(-185, 40, 'DAY 1', 16, { fill: '#333' })}${txt(195, 40, 'DAY 11', 16, { fill: '#333' })}</g>
      <rect x="880" y="620" width="620" height="22" fill="#4a2e18"/><rect x="900" y="642" width="18" height="258" fill="#4a2e18"/><rect x="1462" y="642" width="18" height="258" fill="#4a2e18"/>`;
    let extra = '', people = '';
    const randyE = a === 'tv' ? { ...K.EXPRESSIONS.confused, question: 0, lidUp: 0.45 } : a === 'paper' ? 'happy' : 'happy';
    people += person('randy', c, { id: 'ra', x: 640, scale: 1.0, flip: false, expression: randyE, pose: a === 'intro' ? 'point' : a === 'paper' ? 'cheer' : 'idle', lookX: 0.4 });
    if (a === 'clock') {
      const days = Math.floor(clamp(lt / 6) * 11);
      const dates = ['DEC 28', 'DEC 29', 'DEC 30', 'DEC 31', 'JAN 1', 'JAN 2', 'JAN 3', 'JAN 4', 'JAN 5', 'JAN 6', 'JAN 7', 'JAN 8'];
      extra += `<g transform="translate(300 250)"><circle r="95" fill="#f3ecd8" stroke="#3a2a1a" stroke-width="10"/>
        <path d="M0 0 L0 -70" stroke="#222" stroke-width="7" transform="rotate(${f(c.t * 720)})"/><path d="M0 0 L0 -45" stroke="#222" stroke-width="9" transform="rotate(${f(c.t * 60)})"/></g>
        <g transform="translate(1650 230)"><rect x="-90" y="-80" width="180" height="170" fill="#f3ecd8"/><rect x="-90" y="-80" width="180" height="40" fill="#b33"/>
        ${txt(0, -50, days < 4 ? '1963' : '1964', 26, { fill: '#fff' })}${txt(0, 40, dates[days], 44, { fill: '#222' })}</g>`;
      const icons = ['☕', '💊'];
      if (si >= 1) extra += `<g transform="translate(1180 230)" opacity="${f(popIn(lt, c.b.sentences[1].start - c.b.start))}"><circle r="60" fill="#f3ecd8"/>${txt(0, 20, 'COFFEE', 22, { fill: '#333' })}<path d="M-50 -50 L50 50 M50 -50 L-50 50" stroke="#b33" stroke-width="12"/></g>`;
      if (si >= 2) extra += `<g transform="translate(1340 230)" opacity="${f(popIn(lt, c.b.sentences[2].start - c.b.start))}"><circle r="60" fill="#f3ecd8"/>${txt(0, 20, 'PILLS', 22, { fill: '#333' })}<path d="M-50 -50 L50 50 M50 -50 L-50 50" stroke="#b33" stroke-width="12"/></g>`;
    }
    if (a === 'friends' || a === 'tv') {
      people = person('friendA', c, { id: 'fa', x: 330, scale: 0.95, flip: false, expression: 'happy', lookX: 0.5 }) + person('friendB', c, { id: 'fb', x: 470, scale: 0.97, flip: false, expression: 'neutral', lookX: 0.5 }) + people;
    }
    if (a === 'friends') {
      const sx = lerp(2200, 1600, easeOut((lt - 2.2) / 1.0));
      people += person('scientist', c, { id: 'sci', x: sx, scale: 1.0, expression: 'neutral', pose: { armL: { sh: 20, el: -100 } }, hold: { side: -1, svg: '<rect x="-25" y="-40" width="50" height="66" rx="4" fill="#d9cfb2" stroke="#333" stroke-width="3"/>' } });
    }
    if (a === 'tv') {
      const r = rng(Math.floor(c.t * 20));
      let st = ''; for (let i = 0; i < 60; i++) st += `<rect x="${f(-110 + r() * 220)}" y="${f(-80 + r() * 160)}" width="${f(4 + r() * 20)}" height="3" fill="#fff" opacity="${f(r())}"/>`;
      extra += `<g transform="translate(1180 460)"><rect x="-170" y="-130" width="340" height="260" rx="30" fill="#3a2a1a"/><rect x="-130" y="-100" width="260" height="200" rx="24" fill="#555"/>${st}
        <path d="M-60 -130 L-100 -200 M60 -130 L100 -200" stroke="#222" stroke-width="6"/>
        <path d="M-150 -150 L150 150 M150 -150 L-150 150" stroke="#d22" stroke-width="18" opacity="${f(sm(2.5, 3, lt))}"/></g>`;
    }
    let paper = '';
    if (a === 'paper') {
      const k = easeOut(lt / 0.9), rot = (1 - k) * 720;
      paper = `<g transform="translate(960 470) rotate(${f(rot)}) scale(${f(0.1 + 0.9 * k)})">
        <rect x="-420" y="-300" width="840" height="600" fill="#f1ead2"/><rect x="-420" y="-300" width="840" height="90" fill="#e3d9b8"/>
        ${txt(0, -235, 'THE DAILY TRIBUNE', 52, { fill: '#222', font: 'Georgia, serif' })}${txt(0, -150, 'TEEN STAYS AWAKE', 76, { fill: '#111' })}${txt(0, -70, 'FOR 11 DAYS!', 76, { fill: '#111' })}
        ${[...Array(8)].map((_, i) => `<rect x="${i % 2 ? 20 : -390}" y="${-20 + Math.floor(i / 2) * 60}" width="370" height="12" fill="#999"/><rect x="${i % 2 ? 20 : -390}" y="${0 + Math.floor(i / 2) * 60}" width="300" height="12" fill="#aaa"/>`).join('')}
        <g transform="translate(250 180) rotate(-14)" opacity="${f(sm(1.6, 1.8, lt))}"><rect x="-170" y="-55" width="340" height="110" rx="10" fill="none" stroke="#c22" stroke-width="10"/>${txt(0, 18, '264 HOURS', 52, { fill: '#c22' })}</g></g>`;
    }
    let intro = '';
    if (a === 'intro') {
      const s = 'SAN DIEGO · DECEMBER 1963', n = Math.floor(clamp(lt / 1.8) * s.length);
      intro = `<rect x="560" y="120" width="800" height="90" fill="#000" opacity="0.5"/>${txt(960, 182, s.slice(0, n), 46, { fill: '#f3ecd8', font: "'Courier New', monospace", w: 700 })}`;
    }
    const svg = `${SEPIA}<g filter="url(#sepia)">${planks}<rect y="900" width="1920" height="180" fill="#5a3c25"/>
      <rect x="120" y="120" width="360" height="300" fill="#cfe3f0"/><path d="M120 330 Q220 300 300 330 T480 320 L480 420 L120 420Z" fill="#7aa36a"/><rect x="330" y="230" width="22" height="110" fill="#5a3c25"/><circle cx="341" cy="220" r="55" fill="#4f8a4a"/><rect x="160" y="270" width="110" height="80" fill="#e8dcc0"/><path d="M150 275 L215 225 L280 275Z" fill="#a0523a"/><rect x="120" y="120" width="360" height="300" fill="none" stroke="#4a2e18" stroke-width="16"/>
      ${poster}${extra}${people}${paper}</g>${intro}`;
    return { svg, overlay: filmFx(c), cam: a === 'paper' ? { z: 1 } : { z: 1 + 0.04 * c.rt / c.rdur, x: 960 } };
  };

  // ---------------------------------------------------------------- ROOM
  S.room = c => {
    const a = c.b.a, lt = c.lt, si = c.sentIdx();
    const maxScenes = ['maxIn', 'max', 'coffeeMax', 'toast', 'cry', 'mood', 'paranoid', 'paranoid2', 'maxTired', 'poke', 'party'];
    let kipO = { x: 780 }, maxO = null, extra = '', cam = null, tint = '', overlay = '';
    const H = c.hours;
    if (maxScenes.includes(a)) {
      kipO.x = 700;
      let mx = 1280; if (a === 'maxIn') mx = lerp(2200, 1280, easeOut(lt / 0.8));
      maxO = { x: mx, expression: 'neutral', pose: 'idle' };
    }
    if (a === 'maxIn') { maxO.expression = 'happy'; maxO.pose = 'shrug'; kipO.lookX = 0.6; }
    if (a === 'max') { maxO.expression = c.b.v === 'KIP' ? 'surprise' : 'happy'; kipO.lookX = 0.6; }
    if (a === 'day') cam = { z: lerp(1.0, 1.12, easeIO(lt / 2.5)), x: 860, y: 520 };
    if (a === 'night' || a === 'yawn') kipO.lookX = Math.sin(c.t * 1.5) * 0.5;
    if (a === 'yawn') {
      const k = sm(0.5, 1.4, lt) * (1 - sm(3.2, 4, lt));
      kipO.expression = { ...K.EXPRESSIONS.neutral, open: k, round: k, lidUp: 0.2 + 0.5 * k, browL: { raise: 10 * k, tilt: 8 * k, curve: 0 }, browR: { raise: 10 * k, tilt: 8 * k, curve: 0 } };
      extra += bubble(1240, 360, 420, 220, `${txt(1240, 345, "IT'S NIGHT.", 46, { fill: '#223' })}${txt(1240, 405, 'GO TO BED.', 46, { fill: '#c22' })}`, popIn(lt, 3.6));
      extra += `<g transform="translate(470 560)" opacity="${f(popIn(lt, 1))}"><rect x="-18" y="-120" width="36" height="160" rx="18" fill="#fff"/><circle cy="60" r="34" fill="#fff"/><circle cy="60" r="24" fill="#4aa3ff"/><rect x="-9" y="${f(-90 + 60 * sm(1, 3, lt))}" width="18" height="${f(150 - 60 * sm(1, 3, lt))}" fill="#4aa3ff"/>${txt(70, -60, '↓ TEMP', 32, { fill: '#9fd8ff', a: 'start' })}</g>`;
    }
    const mug = '<g><rect x="-20" y="-50" width="40" height="46" rx="6" fill="#f5f5f5"/><path d="M20 -40 q18 4 0 24" stroke="#f5f5f5" stroke-width="6" fill="none"/><rect x="-16" y="-46" width="32" height="8" fill="#5a3a22"/></g>';
    if (a === 'coffee') {
      const h = X.hands({ x: kipO.x, y: 905, scale: 1.05, pose: c.kExpr('p', 'idle'), t: c.t });
      extra += `<g transform="translate(${f(h.R.x)} ${f(h.R.y)})">${mug}${[0, 1, 2].map(i => `<path d="M${-8 + i * 8} ${-60 - ((c.t * 40 + i * 13) % 40)} q-6 -10 0 -20" stroke="#fff" stroke-width="3" fill="none" opacity="0.5"/>`).join('')}</g>`;
      extra += pill(1250, 300, 'CAFFEINE = BLOCKER', '#6b4f3a', 34, popIn(lt, c.b.sentences[1].start - c.b.start));
      if (si >= 2) extra += pill(1250, 400, 'SAND STILL THERE', '#ff5470', 34, popIn(lt, c.b.sentences[2].start - c.b.start));
    }
    if (a === 'coffeeMax') maxO = Object.assign(maxO || { x: 1280 }, { expression: 'angry', pose: 'point', hold: null });
    if (a === 'coffeeMax') { maxO.pose = { armL: { sh: 12, el: -10 }, armR: { sh: 60, el: -60 } }; maxO.hold = { side: 1, svg: mug }; }
    if (a === 'amygdala') {
      const p = 1 + 0.12 * Math.max(0, Math.sin(c.t * 8));
      extra += `<g transform="translate(1270 380)" opacity="${f(popIn(lt, 0.8))}">${brain(c, { cx: 0, cy: 0, s: 0.5, id: 'am', inner: `<circle cx="-40" cy="60" r="${f(45 * p)}" fill="#ff2050" opacity="0.85"/>` })}</g>`;
      extra += pill(1270, 600, 'FEAR CENTER +60%', '#ff2050', 40, popIn(lt, 3.5));
      tint = `<rect width="1920" height="1080" fill="#ff0030" opacity="${f(0.12 * Math.max(0, Math.sin(c.t * 8)))}"/>`;
    }
    if (a === 'toast') { maxO.expression = 'happy'; maxO.pose = { armL: { sh: 12, el: -10 }, armR: { sh: 55, el: -70 } }; maxO.hold = { side: 1, svg: '<ellipse cx="0" cy="-6" rx="46" ry="12" fill="#eee"/><rect x="-26" y="-50" width="52" height="44" rx="12" fill="#d99a4e"/><rect x="-20" y="-44" width="40" height="34" rx="9" fill="#f2c27b"/>' }; kipO.lookX = 0.6; }
    if (a === 'cry') {
      maxO.expression = { ...K.EXPRESSIONS.surprise, open: 0.2, round: 0 }; maxO.pose = 'surprise';
      kipO.expression = { ...K.EXPRESSIONS.sad, open: 0.5 + 0.3 * Math.sin(c.t * 14), wave: 0.4 };
      const s = 905 - 1.05 * 440;
      extra += [0, 1].map(i => `<path d="M${kipO.x + (i ? 1 : -1) * 70} ${f(s)} q${i ? 30 : -30} 60 ${i ? 60 : -60} ${f(120 + 30 * Math.sin(c.t * 9 + i))}" stroke="#8fd8ff" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.85"/>`).join('');
      cam = { z: 1.15, x: 760, y: 470 };
    }
    if (a === 'mood') {
      const seq = ['sad', 'happy', 'angry', 'confused'], e = seq[Math.min(3, si)];
      kipO.expression = { ...K.EXPRESSIONS[e], question: e === 'confused' ? 1 : 0, open: e === 'happy' ? 0.5 + 0.3 * Math.abs(Math.sin(c.t * 12)) : K.EXPRESSIONS[e].open };
      kipO.pose = { sad: 'sad', happy: 'cheer', angry: 'point', confused: 'shrug' }[e];
      maxO.expression = { ...K.EXPRESSIONS.fear, sweat: 1 }; maxO.pose = 'scared';
      const st = c.b.sentences[Math.min(si, c.b.sentences.length - 1)].start - c.b.start;
      cam = { z: 1.05 + 0.06 * (1 - easeOut((lt - st) / 0.3)), x: 900, y: 520 };
      extra += pill(kipO.x, 140, ['CRY', 'LAUGH', 'FURIOUS', '...WHAT?'][Math.min(3, si)], ['#4aa3ff', '#34d399', '#ff2050', '#a78bfa'][Math.min(3, si)], 46, popIn(lt, st, 0.2));
    }
    if (a === 'paranoid' || a === 'paranoid2') {
      kipO.expression = { ...K.EXPRESSIONS.angry, lidUp: 0.5, smile: -0.2, open: 0 }; kipO.lookX = 0.9;
      maxO.expression = { ...K.EXPRESSIONS.fear, sweat: 1 }; maxO.pose = a === 'paranoid2' ? 'shrug' : 'idle'; maxO.lookX = -0.8;
      cam = { z: 1.12, x: 980, y: 520, r: -4 };
      tint = `<rect width="1920" height="1080" fill="#5a0010" opacity="0.28" style="mix-blend-mode:multiply"/>`;
    }
    if (a === 'maxTired' || a === 'poke') {
      const jolt = a === 'poke' && lt > 0.5;
      maxO.expression = jolt ? { ...K.EXPRESSIONS.surprise } : { ...K.EXPRESSIONS.neutral, lidUp: 0.62 + 0.2 * Math.sin(c.t * 1.3), smile: -0.2 };
      maxO.pose = jolt ? 'surprise' : { ...K.POSES.sad, headTilt: -10 - 6 * Math.sin(c.t) };
      if (!jolt) extra += [0, 1, 2].map(i => { const p = (c.t * 0.6 + i / 3) % 1; return txt(1380 + p * 120, 300 - p * 160, 'z', 40 + p * 40, { fill: '#cfe9ff', op: 1 - p }); }).join('');
      kipO.expression = a === 'poke' ? 'angry' : { ...K.EXPRESSIONS.neutral, lidUp: 0.4, pupil: 1.3 }; kipO.lookX = 0.7;
      kipO.pose = a === 'poke' ? { ...K.POSES.point, armR: { sh: 92, el: 0 } } : 'idle';
    }
    if (a === 'party') {
      maxO.expression = 'excited'; maxO.pose = 'cheer';
      extra += confetti(c.b.start, c.t);
      extra += `<g transform="translate(960 170) scale(${f(easeOut(lt / 0.4))})">${pill(0, 0, 'RECORD TIED: 264 HOURS', '#f07a2a', 50)}</g>`;
      kipO.expression = { ...K.EXPRESSIONS.excited, lidUp: 0.35 };
    }
    const kipE = kipO.expression;
    const scene = `${BG.darkRoom({ t: c.t, floorY: 900, id: 'rm', screen: `HOURS AWAKE: ${Math.floor(H)}` })}
      ${maxO ? person('max', c, maxO) : ''}
      ${kip(c, Object.assign(kipO, kipE ? { expression: kipE } : {}))}
      ${tint}${extra}`;
    return { svg: scene, cam: cam || undefined, overlay };
  };

  // ---------------------------------------------------------------- CARD (hour counter)
  let lastCardVal = 0;
  S.card = c => {
    const lt = c.lt, b = c.b;
    const ticks = [...Array(60)].map((_, i) => `<path d="M0 -330 L0 ${i % 5 ? -315 : -295}" stroke="${i % 5 ? '#3b4a6b' : '#8fb0d8'}" stroke-width="${i % 5 ? 3 : 6}" transform="rotate(${i * 6})"/>`).join('');
    const hm = (b.card + ' ' + (b.sub || '')).match(/HOUR (\d+)/), hv = hm ? +hm[1] : 0;
    const pct = clamp(hv / 264);
    const k = easeOut(lt / 0.5);
    const beat = 1 + 0.03 * Math.max(0, Math.sin(c.t * 6));
    const ecg = [...Array(97)].map((_, i) => { const x = i * 20, ph = (i + Math.floor(c.t * 30)) % 48; const y = ph === 20 ? -70 : ph === 21 ? 50 : ph === 22 ? -20 : 0; return `${i ? 'L' : 'M'}${x} ${930 + y}`; }).join(' ');
    const svg = `<radialGradient id="cg" cx="0.5" cy="0.5" r="0.65"><stop offset="0" stop-color="${pct > 0.6 ? '#3a0f1f' : '#14213f'}"/><stop offset="1" stop-color="#04060c"/></radialGradient>
      <rect width="1920" height="1080" fill="url(#cg)"/>
      <g transform="translate(960 470)">${ticks}<path d="M0 0 L0 -280" stroke="#ff5470" stroke-width="6" transform="rotate(${f(c.t * 360 / 6)})" opacity="0.6"/>
      <circle r="345" fill="none" stroke="#ff5470" stroke-width="6" stroke-dasharray="${f(2168 * pct * k)} 3000" transform="rotate(-90)"/></g>
      <g transform="translate(960 500) scale(${f((0.6 + 0.4 * k) * beat)})" opacity="${f(k)}">
        ${txt(0, 0, b.card, b.card.length > 7 ? 170 : 210, { fill: '#fff', stroke: '#000', sw: 10 })}
        ${txt(0, 90, b.sub || '', 54, { fill: '#ffd34d', ls: 6 })}</g>
      <path d="${ecg}" stroke="#ff5470" stroke-width="4" fill="none" opacity="0.7"/>
      <g transform="translate(560 120)"><rect width="800" height="16" rx="8" fill="#1d2540"/><rect width="${f(800 * pct * k)}" height="16" rx="8" fill="#ff5470"/>
      ${txt(0, -12, '0h', 22, { a: 'start', fill: '#8fb0d8' })}${txt(800, -12, '264h', 22, { a: 'end', fill: '#8fb0d8' })}</g>`;
    return { svg, cam: { z: 1 + 0.03 * lt } };
  };

  // ---------------------------------------------------------------- BRAIN explainer
  S.brain = c => {
    const a = c.b.a, lt = c.lt, si = c.sentIdx(); let inner = '', ui = '', tint = '#f39bb5', kE = 'surprise';
    const r = rng(21);
    if (a === 'sand') {
      const lvl = 190 - 330 * sm(0.5, 5, lt);
      for (let i = 0; i < 260; i++) { const x = -300 + r() * 600, y = lvl + r() * 400; inner += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(5 + r() * 6)}" fill="${r() < 0.5 ? '#e8c27a' : '#d6a94f'}"/>`; }
      for (let i = 0; i < 20; i++) { const x = -250 + r() * 500, y = -260 + ((c.t * 200 + r() * 600) % 500); inner += `<circle cx="${f(x)}" cy="${f(y)}" r="5" fill="#e8c27a"/>`; }
      ui += pill(960, 140, 'ADENOSINE', '#d6a94f', 46, popIn(lt, 0.3));
      if (si >= 2) { ui += `<g transform="translate(1560 560)" opacity="${f(popIn(lt, c.b.sentences[2].start - c.b.start))}"><path d="M-10 -160 L10 60" stroke="#8a5a35" stroke-width="14"/><path d="M-40 60 L60 60 L80 140 L-60 140 Z" fill="#e8c27a"/><path d="M-110 -110 L110 110 M110 -110 L-110 110" stroke="#ff2050" stroke-width="20"/></g>`; kE = 'fear'; }
    }
    if (a === 'wash' || a === 'city' || a === 'inbox' || a === 'overflow' || a === 'amyloid' || a === 'amyloid2') {}
    if (a === 'wash') {
      for (let i = 0; i < 7; i++) inner += `<path d="M-320 ${-170 + i * 55} C-100 ${-200 + i * 55} 100 ${-140 + i * 55} 320 ${-170 + i * 55}" stroke="#4fc3ff" stroke-width="14" fill="none" stroke-dasharray="40 30" stroke-dashoffset="${f(-c.t * 160)}" opacity="${f(sm(0.5, 2, lt) * 0.8)}"/>`;
      for (let i = 0; i < 40; i++) { const x = -300 + ((r() * 600 + c.t * 120 * sm(1, 3, lt)) % 700), y = -180 + r() * 360; inner += `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="#9a8a40" opacity="${f(1 - sm(200, 360, x))}"/>`; }
      ui += pill(960, 140, 'SLEEP = BRAIN WASH', '#2b8fd6', 44, popIn(lt, 0.5));
    }
    if (a === 'amyloid' || a === 'amyloid2') {
      const g = a === 'amyloid2' ? 1 + sm(0, 4, lt) * 0.8 : sm(0.5, 3, lt);
      for (let i = 0; i < 22; i++) { const x = -260 + r() * 520, y = -170 + r() * 320, rr = (10 + r() * 16) * g; inner += `<path d="M${f(x - rr)} ${f(y)} q${f(rr * 0.4)} ${f(-rr * 1.3)} ${f(rr)} ${f(-rr * 0.6)} q${f(rr * 1.2)} ${f(-rr * 0.2)} ${f(rr)} ${f(rr * 0.8)} q${f(-rr * 0.2)} ${f(rr * 1.1)} ${f(-rr)} ${f(rr * 0.6)} q${f(-rr * 1.2)} ${f(rr * 0.2)} ${f(-rr)} ${f(-rr * 0.8)}Z" fill="#c4d93a" stroke="#7f8f12" stroke-width="3"/>`; }
      ui += pill(960, 140, 'BETA-AMYLOID', '#7f8f12', 46, popIn(lt, 0.4));
      if (a === 'amyloid2') { ui += txt(1560, 820, `NIGHTS SKIPPED: ${si >= 1 ? 2 : 1}`, 52, { fill: si >= 1 ? '#ff5470' : '#fff', stroke: '#000', sw: 8 }); kE = si >= 1 ? 'fear' : 'surprise'; }
    }
    if (a === 'inbox' || a === 'overflow') {
      const files = a === 'inbox' ? 6 : 40;
      inner += `<path d="M-60 40 q-40 -60 10 -90 q50 -20 50 30 q0 40 -40 50 q-30 10 -20 40" stroke="#ffd34d" stroke-width="18" fill="none" stroke-linecap="round"/>`;
      ui += `<g transform="translate(1520 520)"><path d="M-130 0 L130 0 L110 120 L-110 120 Z" fill="#2a3556" stroke="#8fb0d8" stroke-width="5"/>${txt(0, 170, 'MEMORY INBOX', 30, { fill: '#8fb0d8' })}</g>`;
      for (let i = 0; i < files; i++) {
        const p = ((c.t * 0.5 + i * 0.13) % 1), x = 1520 + (r() - 0.5) * 160, yy = a === 'inbox' ? 300 + p * 220 : 520 - Math.min(i, 30) * 8 - (i > 30 ? p * 200 : 0);
        const fall = a === 'overflow' && i > 18 ? `translate(${f((r() - 0.5) * 300 * p)} ${f(p * 260)}) rotate(${f(p * 200 * (r() - 0.5))})` : '';
        ui += `<g transform="${fall}"><rect x="${f(x - 30)}" y="${f(yy - 20)}" width="60" height="40" rx="4" fill="#f5f0e1" stroke="#c9b98a" stroke-width="2"/></g>`;
      }
      ui += pill(960, 140, a === 'inbox' ? 'HIPPOCAMPUS' : 'INBOX FULL', a === 'inbox' ? '#c99a1e' : '#ff2050', 46, popIn(lt, 0.3));
      if (a === 'overflow') { ui += `<g transform="translate(1480 860) scale(${f(easeOut((lt - 3) / 0.4))})">${txt(0, 0, '−40% NEW MEMORIES', 56, { fill: '#ff5470', stroke: '#000', sw: 8 })}</g>`; kE = 'confused'; }
    }
    if (a === 'city') {
      for (let i = 0; i < 120; i++) { const x = -280 + (i % 15) * 40, y = -190 + Math.floor(i / 15) * 48; const on = Math.sin(c.t * (0.5 + r()) + r() * 20) > -0.3 + 0.6 * sm(0, 6, lt) * r(); inner += `<rect x="${x}" y="${y}" width="22" height="26" rx="4" fill="${on ? '#ffe27a' : '#3a2340'}" opacity="${on ? 0.95 : 0.8}"/>`; }
      tint = '#5a3a6a';
      ui += pill(960, 140, 'LOCAL SLEEP', '#7c5cd6', 46, popIn(lt, 0.4));
      kE = 'neutral';
    }
    const svg = `${darkLab(c)}${brain(c, { inner, tint, id: 'bb', cy: 500 })}${ui}${kipBust(c, 230, 1320, 1.1, { expression: kE, lookX: 0.8, lookY: -0.5 })}`;
    return { svg, cam: { z: 1 + 0.05 * easeIO(c.rt / c.rdur), x: 960, y: 540 } };
  };

  // ---------------------------------------------------------------- CAR
  S.car = c => {
    const a = c.b.a, lt = c.lt;
    const speed = a === 'keys' ? 900 * (1 - sm(0, 1.5, lt)) : 900;
    const off = c.rt * speed - (a === 'keys' ? 0 : 0);
    const dawn = sm(0, 1, (c.hours - 20) / 8);
    let sky = `<linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dawn > 0.5 ? '#2b3a6b' : '#0b1026'}"/><stop offset="0.7" stop-color="#e98a6b"/><stop offset="1" stop-color="#f7c58a"/></linearGradient>
      <rect width="1920" height="700" fill="url(#cs)"/><circle cx="1500" cy="560" r="80" fill="#ffd9a0" opacity="0.8"/>`;
    const r = rng(9); let far = '', mid = '';
    for (let i = 0; i < 30; i++) { const w = 60 + r() * 120, h = 80 + r() * 260, x = ((i * 110 - off * 0.1) % 3300 + 3300) % 3300 - 300; far += `<rect x="${f(x)}" y="${f(700 - h)}" width="${f(w)}" height="${f(h)}" fill="#3b2f55"/>`; }
    for (let i = 0; i < 12; i++) { const x = ((i * 300 - off * 0.6) % 3600 + 3600) % 3600 - 300; mid += `<rect x="${f(x)}" y="380" width="10" height="320" fill="#1c1a2b"/><path d="M${f(x + 5)} 385 q40 -20 80 0" stroke="#1c1a2b" stroke-width="10" fill="none"/><ellipse cx="${f(x + 85)}" cy="392" rx="22" ry="8" fill="#ffe6a8"/><path d="M${f(x + 85)} 392 L${f(x + 40)} 700 L${f(x + 130)} 700Z" fill="#ffe6a8" opacity="0.08"/>`; }
    const dash = [...Array(14)].map((_, i) => { const x = ((i * 200 - off) % 2800 + 2800) % 2800 - 200; return `<rect x="${f(x)}" y="860" width="110" height="14" fill="#f2f2f2"/>`; }).join('');
    const sh = a === 'honk' && lt < 0.8 ? Math.sin(lt * 70) * 12 * (1 - lt / 0.8) : 0;
    const swerve = a === 'honk' ? Math.sin(clamp(lt / 1.2) * Math.PI) * -3 : 0;
    const bounce = Math.sin(c.t * 18) * 2 * (speed / 900);
    const blackout = (a === 'micro' && lt > 1.5) || a === 'micro2' ? (Math.sin(c.t * 2.6) > 0.55 ? 1 : 0) : 0;
    const kE = blackout ? { ...K.EXPRESSIONS.neutral, lidUp: 0.15, pupil: 0.6 } : c.kExpr('k');
    const kipIn = K.renderKip({ id: 'ck', x: 1040, y: 905, scale: 0.75, expression: kE, blink: K.blinkAt(c.t), talk: 0, t: c.t, shadow: false, pose: a === 'honk' ? 'surprise' : { armL: { sh: 60, el: -80 }, armR: { sh: 60, el: -80 } }, lookX: a === 'honk' ? -0.6 : 0.6 });
    const maxIn = X.renderPerson('max', { id: 'cm', x: 720, y: 915, scale: 0.72, expression: a === 'honk' ? 'angry' : a === 'keys' ? 'happy' : 'neutral', talk: c.talk('MAX'), t: c.t, shadow: false, flip: false, lookX: 0.6, blink: K.blinkAt(c.t, 3), pose: a === 'keys' ? { armR: { sh: 120, el: 20 } } : 'idle' });
    const car = `<g transform="translate(960 ${f(780 + bounce)}) rotate(${f(swerve)})">
      <defs><clipPath id="win"><path d="M-330 -150 L-280 -260 Q-250 -300 -180 -300 L170 -300 Q240 -300 290 -230 L360 -150 Z"/></clipPath></defs>
      <g clip-path="url(#win)"><rect x="-400" y="-320" width="800" height="200" fill="#1a2238"/><g transform="translate(-960 -780)">${maxIn}${kipIn}</g></g>
      <path d="M-520 40 L-520 -60 Q-500 -140 -360 -150 L-280 -270 Q-240 -320 -170 -320 L180 -320 Q260 -320 320 -240 L380 -150 Q520 -140 540 -60 L540 40 Z M-330 -150 L360 -150 L290 -230 Q240 -300 170 -300 L-180 -300 Q-250 -300 -280 -260 Z" fill="#2f6fd6" fill-rule="evenodd"/>
      <path d="M-30 -300 L-30 -150" stroke="#2559b0" stroke-width="16"/>
      <path d="M-520 -40 L540 -40" stroke="#2559b0" stroke-width="6"/>
      <rect x="500" y="-110" width="40" height="30" rx="8" fill="#ffe27a"/><rect x="-520" y="-110" width="26" height="30" rx="6" fill="#ff3b55"/>
      <path d="M540 -95 L1100 -160 L1100 -20 Z" fill="#ffe6a8" opacity="0.12"/>
      ${[-330, 330].map(x => `<g transform="translate(${x} 40) rotate(${f(off * 0.6)})"><circle r="80" fill="#15151b"/><circle r="42" fill="#9aa0ad"/><path d="M-40 0 L40 0 M0 -40 L0 40" stroke="#5a5f6b" stroke-width="10"/></g>`).join('')}
    </g>`;
    let ui = '', overlay = '';
    if (a === 'micro' || a === 'micro2') {
      overlay += `<rect width="1920" height="1080" fill="#000" opacity="${blackout * 0.96}"/>`;
      if (blackout) overlay += pill(960, 520, 'BRAIN: OFF', '#ff2050', 60);
    }
    if (a === 'micro2') {
      const p = (c.t * 0.25) % 1;
      ui += `<g transform="translate(360 120)"><rect width="1200" height="120" rx="12" fill="#2f8a3e" stroke="#fff" stroke-width="6"/>${[...Array(11)].map((_, i) => `<path d="M${i * 120} 0 V120" stroke="#fff" stroke-width="3" opacity="0.7"/>`).join('')}
        <rect x="${f(p * 1120)}" y="40" width="80" height="40" rx="10" fill="#2f6fd6"/>${txt(600, 175, '4 SECONDS ≈ 110 METERS ≈ ONE FOOTBALL FIELD', 38, { stroke: '#000', sw: 8 })}</g>`;
    }
    if (a === 'drive' && c.b.t.startsWith('Here')) ui += `<g transform="translate(1500 230)" opacity="${f(popIn(lt, 3))}"><rect x="-230" y="-70" width="460" height="140" rx="20" fill="#000" opacity="0.6"/>${txt(0, -10, '24h AWAKE ≈', 40, { fill: '#fff' })}${txt(0, 45, 'LEGALLY DRUNK', 48, { fill: '#ff5470' })}</g>`;
    if (a === 'honk') overlay += `<rect width="1920" height="1080" fill="#ff2050" opacity="${f(0.35 * clamp(1 - lt / 0.6))}"/>`;
    if (a === 'keys') ui += `<g transform="translate(960 260) rotate(${f(Math.sin(c.t * 12) * 10)}) scale(${f(easeOut((lt - 1) / 0.4))})"><circle r="30" fill="none" stroke="#ddd" stroke-width="8"/><path d="M20 20 L90 90 M60 60 L80 40 M75 75 L95 55" stroke="#e9c46a" stroke-width="14" stroke-linecap="round"/>
      <g transform="translate(40 120) rotate(-12)">${pill(0, 0, 'CONFISCATED', '#ff2050', 40)}</g></g>`;
    const svg = `${sky}${far}${mid}<rect y="700" width="1920" height="380" fill="#2a2a33"/><rect y="700" width="1920" height="12" fill="#55556a"/>${dash}${car}${ui}`;
    return { svg, cam: { z: a === 'honk' ? 1.1 : 1.02, x: 960 + sh, y: 560 + sh * 0.5 }, overlay };
  };

  // ---------------------------------------------------------------- KITCHEN
  S.kitchen = c => {
    const a = c.b.a, lt = c.lt, si = c.sentIdx();
    const lights = a === 'maxPizza' ? sm(0.1, 0.3, lt) : 0;
    let tiles = ''; for (let y = 0; y < 900; y += 60) for (let x = 0; x < 1920; x += 60) tiles += `<rect x="${x + 2}" y="${y + 2}" width="56" height="56" fill="${(x + y) % 120 ? '#2a3140' : '#262c3a'}"/>`;
    const pizza = '<g transform="rotate(-20)"><path d="M0 0 L-40 -110 Q0 -125 40 -110 Z" fill="#f2c05a"/><path d="M-40 -110 Q0 -128 40 -110 L36 -98 Q0 -112 -36 -98Z" fill="#c98a3a"/><circle cx="-8" cy="-70" r="8" fill="#c53030"/><circle cx="12" cy="-45" r="7" fill="#c53030"/><circle cx="-14" cy="-30" r="6" fill="#c53030"/></g>';
    const chew = a === 'pizza' ? Math.max(0, Math.sin(c.t * 10)) * 0.4 : 0;
    const kE = a === 'maxPizza' ? 'surprise' : { ...K.EXPRESSIONS.happy, lidUp: 0.35, lidLo: 0.1, open: chew, smile: 0.4 };
    const pose = { armL: { sh: 12, el: -10 }, armR: { sh: 40, el: -120 } };
    const h = X.hands({ x: 860, y: 905, scale: 1.05, pose, t: c.t });
    let ui = '';
    if (a === 'fridge') {
      ui += `<g transform="translate(1300 300)">${pill(0, 0, 'GHRELIN ↑', '#ff5470', 44, popIn(lt, c.b.sentences[1].start - c.b.start + 1))}</g>`;
      ui += `<g transform="translate(1300 420)">${pill(0, 0, 'LEPTIN ↓', '#4aa3ff', 44, popIn(lt, c.b.sentences[1].start - c.b.start + 3.5))}</g>`;
    }
    const svg = `${tiles}<rect y="900" width="1920" height="180" fill="#1b1e27"/>
      <rect x="0" y="560" width="1920" height="40" fill="#3b3f4c"/><rect x="0" y="600" width="1920" height="300" fill="#2b2f3b"/>${[...Array(8)].map((_, i) => `<rect x="${60 + i * 240}" y="630" width="210" height="240" rx="8" fill="#323747"/><rect x="${150 + i * 240}" y="700" width="30" height="8" rx="4" fill="#8a8fa0"/>`).join('')}
      <g transform="translate(1600 160)"><circle r="60" fill="#e9e9ef" stroke="#555" stroke-width="8"/><path d="M0 0 L0 -40 M0 0 L32 0" stroke="#222" stroke-width="6"/></g>${txt(1600, 270, '4:00 AM', 32, { fill: '#cfd6e4' })}
      <path d="M320 200 L1250 300 L1300 900 L200 900 Z" fill="#fff5c8" opacity="${f(0.16 - lights * 0.1)}"/>
      <g transform="translate(140 160)"><rect width="300" height="740" rx="18" fill="#e7ebf0"/><rect x="10" y="10" width="280" height="720" rx="12" fill="#fffbe6"/>
        ${[0, 1, 2].map(i => `<rect x="20" y="${180 + i * 180}" width="260" height="8" fill="#cfd6e4"/>`).join('')}
        <rect x="40" y="110" width="60" height="70" rx="8" fill="#4ade80"/><rect x="130" y="120" width="40" height="60" rx="6" fill="#f87171"/><rect x="60" y="300" width="120" height="60" rx="10" fill="#fbbf24"/><circle cx="220" cy="520" r="34" fill="#fb923c"/>
        <path d="M300 0 L470 60 L470 700 L300 740 Z" fill="#cfd6e4"/></g>
      ${a === 'maxPizza' ? person('max', c, { x: lerp(2100, 1450, easeOut(lt / 0.6)), expression: 'angry', pose: 'point' }) : ''}
      ${kip(c, { x: 860, expression: kE, pose, lookX: a === 'maxPizza' ? 0.8 : -0.3 })}
      <g transform="translate(${f(h.R.x)} ${f(h.R.y + 10)})">${pizza}</g>
      <rect width="1920" height="1080" fill="#0a0c16" opacity="${f(0.45 * (1 - lights))}" style="mix-blend-mode:multiply"/>${ui}`;
    return { svg, cam: a === 'pizza' ? { z: lerp(1.0, 1.15, easeIO(lt / 6)), x: 860, y: 520 } : a === 'maxPizza' ? { z: 1.0 } : undefined };
  };

  // ---------------------------------------------------------------- LAB
  S.lab = c => {
    const a = c.b.a, lt = c.lt;
    const kx = a === 'enter' ? lerp(-200, 680, easeOut(lt / 1.5)) : 680;
    const slow = a === 'eeg' ? sm(0.5, 2.5, lt) : 0.6;
    const wave = [0, 1, 2, 3].map(row => {
      const pts = [...Array(120)].map((_, i) => { const x = i * 5, fq = lerp(0.9, 0.25, slow) * (1 + row * 0.2), amp = lerp(10, 26, slow); return `${i ? 'L' : 'M'}${x} ${f(Math.sin(i * fq + c.t * 10 + row) * amp + Math.sin(i * 2.3 + c.t * 13) * 4)}`; }).join(' ');
      return `<path transform="translate(40 ${70 + row * 70})" d="${pts}" stroke="${['#34d399', '#38bdf8', '#fbbf24', '#f472b6'][row]}" stroke-width="3" fill="none"/>`;
    }).join('');
    let ui = '';
    if (a === 'eeg') ui += `<g transform="translate(1520 760)">${pill(0, 0, 'AWAKE?  HALF ASLEEP', '#7c5cd6', 34, popIn(lt, 1.5))}</g>`;
    if (a === 'math') {
      const seq = ['100', '− 7 = 93', '86', '79', '72', '65', '...'], st = c.b.sentences[2] ? c.b.sentences[2].start - c.b.start : 3;
      const n = Math.floor(clamp((lt - st) / 4.2) * seq.length);
      ui += seq.slice(0, n).map((s, i) => txt(300 + i * 150, 220 + (i % 2) * 40, s, i === 0 ? 70 : 56, { fill: i === 5 ? '#ff5470' : '#fff', stroke: '#000', sw: 8, op: 1 })).join('');
    }
    const docE = a === 'doc' && c.b.v === 'DOC' ? 'confused' : a === 'eeg' ? 'surprise' : 'neutral';
    const electrodes = [[-60, -560], [0, -590], [60, -560], [-95, -500], [95, -500]].map(([x, y], i) => `<circle cx="${f(kx + x * 1.05)}" cy="${f(905 + y * 1.05)}" r="9" fill="${['#ff5470', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa'][i]}"/><path d="M${f(kx + x * 1.05)} ${f(905 + y * 1.05)} Q${f(kx + x * 2.2 + 300)} ${f(905 + y * 0.6)} ${1100} 470" stroke="${['#ff5470', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa'][i]}" stroke-width="3" fill="none" opacity="0.7"/>`).join('');
    const svg = `<linearGradient id="lw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe2ee"/><stop offset="1" stop-color="#9fbcd0"/></linearGradient>
      <rect width="1920" height="900" fill="url(#lw)"/>${[...Array(10)].map((_, i) => `<rect x="${i * 200}" y="0" width="4" height="900" fill="#b3cddd"/>`).join('')}
      <rect y="900" width="1920" height="180" fill="#7d98ab"/><rect y="900" width="1920" height="8" fill="#5f7a8c"/>
      <rect x="480" y="60" width="560" height="60" rx="10" fill="#fff" opacity="0.7"/>${txt(760, 105, 'SLEEP RESEARCH LAB', 34, { fill: '#2b4a63' })}
      <g transform="translate(1080 150) scale(0.82)"><rect width="700" height="420" rx="18" fill="#0f1b2b" stroke="#2b4a63" stroke-width="12"/>${wave}
        ${txt(40, 380, 'EEG · LIVE', 26, { a: 'start', fill: '#6fe3ff' })}</g>
      <rect x="1360" y="494" width="20" height="406" fill="#5f7a8c"/>
      ${a !== 'enter' && a !== 'math' || a === 'math' ? person('doc', c, { x: 1610, expression: docE, pose: c.b.v === 'DOC' ? 'point' : 'idle', hold: { side: -1, svg: '<rect x="-25" y="-40" width="50" height="66" rx="4" fill="#fff" stroke="#555" stroke-width="3"/>' } }) : ''}
      ${electrodes}${kip(c, { x: kx, lookX: a === 'math' ? -0.3 : 0.6, lookY: a === 'math' ? -0.4 : 0 })}${ui}`;
    return { svg, cam: a === 'math' ? { z: 1.08, x: 760, y: 500 } : undefined };
  };

  // ---------------------------------------------------------------- HALLUCINATION
  S.halluc = c => {
    const a = c.b.a, lt = c.lt;
    const seed = Math.floor(c.t * 8);
    const warp = `<filter id="wp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f(0.004 + 0.002 * Math.sin(c.t))}" numOctaves="2" seed="${seed % 50}"/><feDisplacementMap in="SourceGraphic" scale="${f(40 + 25 * Math.sin(c.t * 2))}"/></filter>`;
    if (a === 'sign') {
      const m = sm(1.5, 3.5, lt);
      const sign = `<g opacity="${f(1 - m)}"><rect x="-8" y="-420" width="16" height="420" fill="#8a8fa0"/><circle cy="-470" r="80" fill="#e63946" stroke="#fff" stroke-width="10"/><rect x="-55" y="-485" width="110" height="30" fill="#fff"/></g>`;
      const man = `<g opacity="${f(m)}">${X.renderShadow({ x: 0, y: 0, scale: 0.85, t: c.t, id: 'sgm' })}</g>`;
      let street = `<linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090b1f"/><stop offset="1" stop-color="#2a1b44"/></linearGradient><rect width="1920" height="1080" fill="url(#hs)"/>`;
      const r = rng(4); for (let i = 0; i < 14; i++) { const w = 100 + r() * 140, h = 200 + r() * 400, x = i * 150 - 100; street += `<rect x="${f(x)}" y="${f(820 - h)}" width="${f(w)}" height="${f(h)}" fill="#161433"/>`; for (let j = 0; j < 8; j++) street += `<rect x="${f(x + 15 + r() * (w - 30))}" y="${f(840 - h + r() * h * 0.8)}" width="10" height="14" fill="#ffd27a" opacity="${f(0.4 + 0.5 * r())}"/>`; }
      street += `<rect y="820" width="1920" height="260" fill="#1d1d28"/><rect x="0" y="815" width="1920" height="10" fill="#3a3a4a"/>`;
      const svg = `${street}<g transform="translate(1350 830)">${sign}${man}</g>${kip(c, { x: 620, y: 905, lookX: 0.9 })}
        ${bubble(420, 230, 400, 230, `<g transform="translate(420 230)"><path d="M-70 20 Q-70 -70 10 -70 Q80 -70 80 0 L80 30 L-70 30Z" fill="#c53030"/><rect x="30" y="-10" width="60" height="12" fill="#ddd"/><rect x="30" y="12" width="60" height="12" fill="#ddd"/>${txt(0, 90, 'PRO PLAYER?', 32, { fill: '#223' })}</g>`, popIn(lt, c.b.sentences[1] ? c.b.sentences[1].start - c.b.start + 2.5 : 5))}`;
      return { svg, cam: { z: lerp(1, 1.1, easeIO(lt / 6)), x: 1000, y: 540 } };
    }
    // warped bedroom
    const hue = (c.t * 40) % 360;
    let crawl = '';
    for (let i = 0; i < 8; i++) { const rr = ((c.t * 60 + i * 80) % 640); crawl += `<ellipse cx="960" cy="980" rx="${f(rr * 2)}" ry="${f(rr * 0.25)}" fill="none" stroke="#8a5cff" stroke-width="6" opacity="${f(0.5 * (1 - rr / 640))}"/>`; }
    let eyes = '';
    if (a === 'shadows') {
      eyes += X.renderShadow({ x: 120 + Math.sin(c.t) * 20, y: 905, scale: 1.2, t: c.t, opacity: 0.5 + 0.4 * Math.sin(c.t * 1.7), id: 'h1' });
      eyes += X.renderShadow({ x: 1800 - Math.sin(c.t * 0.8) * 20, y: 905, scale: 1.1, t: c.t + 1, opacity: 0.4 + 0.4 * Math.sin(c.t * 1.3 + 1), id: 'h2' });
      const r = rng(13); for (let i = 0; i < 6; i++) { const x = r() * 1920, y = 100 + r() * 400, o = Math.max(0, Math.sin(c.t * 2 + i * 2)); eyes += `<g opacity="${f(o)}"><ellipse cx="${f(x - 14)}" cy="${f(y)}" rx="8" ry="${f(5 * o)}" fill="#ffe8a0"/><ellipse cx="${f(x + 14)}" cy="${f(y)}" rx="8" ry="${f(5 * o)}" fill="#ffe8a0"/></g>`; }
    }
    const breathe = 1 + 0.025 * Math.sin(c.t * 2.2);
    const svg = `${warp}<g filter="url(#wp)"><g transform="translate(960 540) scale(${f(breathe)}) translate(-960 -540)">${BG.darkRoom({ t: c.t, floorY: 900, id: 'hl', screen: 'WAKE UP WAKE UP' })}</g>${crawl}</g>
      <rect width="1920" height="1080" fill="hsl(${f(hue)},70%,40%)" opacity="0.28" style="mix-blend-mode:color"/>
      ${eyes}${kip(c, { x: 960, lookX: Math.sin(c.t * 3) * 0.9 })}`;
    return { svg, cam: { z: 1.05 + 0.03 * Math.sin(c.t * 0.9), x: 960, y: 540, r: Math.sin(c.t * 0.7) * 2.5 } };
  };

  // ---------------------------------------------------------------- INFO (infographics)
  S.info = c => {
    const a = c.b.a, lt = c.lt, si = c.sentIdx(); let ui = '';
    const st = i => (c.b.sentences[i] ? c.b.sentences[i].start - c.b.start : 99);
    if (a === 'body') {
      const panel = (x, i, title, col, icon) => `<g transform="translate(${x} 470) scale(${f(easeOut((lt - st(i)) / 0.4))})"><rect x="-240" y="-260" width="480" height="520" rx="30" fill="#141c33" stroke="${col}" stroke-width="6"/>${icon}${txt(0, 200, title, 40, { fill: col })}</g>`;
      ui += panel(420, 0, 'IMMUNE ↓', '#34d399', `<path d="M0 -180 L130 -130 Q130 30 0 110 Q-130 30 -130 -130 Z" fill="#1f6f5c" stroke="#34d399" stroke-width="8"/><path d="M-20 -150 L20 -60 L-30 0 L10 90" stroke="#ff5470" stroke-width="10" fill="none" opacity="${f(sm(st(0) + 1, st(0) + 2, lt))}"/>`);
      ui += panel(960, 1, 'BLOOD SUGAR ↑', '#ff5470', `<path d="M0 -190 Q110 -40 110 30 A110 110 0 0 1 -110 30 Q-110 -40 0 -190Z" fill="#c53030"/>${[0, 1, 2].map(i => `<rect x="${-50 + i * 34}" y="${f(20 - 20 * Math.sin(c.t * 3 + i))}" width="24" height="24" rx="4" fill="#fff" opacity="0.9"/>`).join('')}`);
      ui += panel(1500, 2, 'ALWAYS COLD', '#4aa3ff', `<rect x="-24" y="-190" width="48" height="220" rx="24" fill="#fff"/><circle cy="60" r="50" fill="#fff"/><circle cy="60" r="36" fill="#4aa3ff"/><rect x="-12" y="${f(-150 + 100 * sm(st(2), st(2) + 2, lt))}" width="24" height="${f(210 - 100 * sm(st(2), st(2) + 2, lt))}" fill="#4aa3ff"/>${[...Array(5)].map((_, i) => `<path transform="translate(${-130 + i * 65} -170) rotate(${f(c.t * 50 + i * 30)})" d="M0 -14 L0 14 M-12 -7 L12 7 M-12 7 L12 -7" stroke="#cfe9ff" stroke-width="4"/>`).join('')}`);
    }
    if (a === 'rats') {
      const days = Math.floor(clamp((lt - 2) / 5) * 21) + 1, fade = sm(st(2) + 0.3, st(2) + 1.5, lt);
      ui += `<g transform="translate(960 520)"><rect x="-420" y="-220" width="840" height="440" rx="20" fill="#141c33" stroke="#8fb0d8" stroke-width="6"/>${[...Array(15)].map((_, i) => `<path d="M${-420 + i * 60} -220 V220" stroke="#8fb0d8" stroke-width="4" opacity="0.6"/>`).join('')}`;
      for (let i = 0; i < 3; i++) {
        const x = -250 + i * 250, y = 120 + Math.sin(c.t * 6 + i) * 3 * (1 - fade);
        ui += `<g transform="translate(${x} ${y})" opacity="${f(1 - 0.6 * fade)}"><ellipse rx="80" ry="45" fill="#b9b2c4"/><circle cx="70" cy="-30" r="38" fill="#c9c2d4"/><circle cx="60" cy="-68" r="18" fill="#e7a9b9"/><circle cx="96" cy="-60" r="16" fill="#e7a9b9"/>
          ${fade > 0.5 ? `<path d="M74 -38 l12 12 m0 -12 l-12 12" stroke="#222" stroke-width="4"/>` : `<circle cx="82" cy="-32" r="6" fill="#222"/>`}<path d="M-80 10 q-80 20 -110 -30" stroke="#e7a9b9" stroke-width="7" fill="none"/></g>`;
      }
      ui += `</g>${txt(960, 210, `1980s EXPERIMENT · DAY ${days}`, 52, { fill: '#fff', stroke: '#000', sw: 8 })}`;
      if (fade > 0.3) ui += txt(960, 880, 'NO SURVIVORS', 74, { fill: '#ff5470', stroke: '#000', sw: 8, op: fade });
    }
    if (a === 'limit') {
      const g = Math.random() < 0.15 ? 10 : 0;
      ui += `<g transform="translate(760 0)">${K.renderKip({ id: 'lk', x: 0, y: 900, scale: 1.0, expression: 'sad', t: c.t, blink: K.blinkAt(c.t), shadow: false })}</g>`;
      ui += `<g transform="translate(1250 200)"><rect width="80" height="660" rx="40" fill="#1d2540" stroke="#8fb0d8" stroke-width="5"/><rect y="${f(660 - 600 * sm(0, 3, lt))}" width="80" height="${f(600 * sm(0, 3, lt))}" rx="40" fill="#ff5470"/></g>
        ${txt(1290 + g, 170, 'HUMAN LIMIT', 46, { fill: '#fff' })}${txt(1560 - g, 560, '???', 140, { fill: '#ffd34d', stroke: '#000', sw: 10 })}`;
    }
    if (a === 'ffi') {
      let dna = '';
      for (let i = 0; i < 26; i++) { const y = 140 + i * 30, ph = i * 0.45 + c.t * 2, x1 = Math.sin(ph) * 150, x2 = Math.sin(ph + Math.PI) * 150, z = Math.cos(ph); dna += `<path d="M${f(x1)} ${y} L${f(x2)} ${y}" stroke="#4a5a85" stroke-width="6"/><circle cx="${f(x1)}" cy="${y}" r="${f(12 + 4 * z)}" fill="#38bdf8"/><circle cx="${f(x2)}" cy="${y}" r="${f(12 - 4 * z)}" fill="#f472b6"/>`; }
      ui += `<g transform="translate(560 0)">${dna}</g>${txt(1280, 420, 'FATAL FAMILIAL', 66, { fill: '#fff' })}${txt(1280, 500, 'INSOMNIA', 92, { fill: '#ff5470' })}
        <g transform="translate(1280 610)">${pill(0, 0, 'EXTREMELY RARE · GENETIC', '#3b4a6b', 32, popIn(lt, 2))}</g>`;
    }
    const kb = a === 'body' ? kipBust(c, 1700, 1330, 0.9, { expression: { ...K.EXPRESSIONS.sad, wave: 0.6 }, lookX: -0.6 }) : '';
    return { svg: `${darkLab(c)}${ui}${kb}`, cam: { z: 1 + 0.04 * easeIO(c.lt / 8) } };
  };

  // ---------------------------------------------------------------- ARCADE (pinball)
  S.arcade = c => {
    const lt = c.lt;
    const score = Math.min(9, Math.floor(Math.max(0, lt - 4) / 0.9));
    const neon = (x, y, s, col) => txt(x, y, s, 70, { fill: col, stroke: col, sw: 2, op: 0.85 + 0.15 * Math.sin(c.t * 20 + x) });
    const machine = x => `<g transform="translate(${x} 0)"><rect x="-150" y="250" width="300" height="230" rx="16" fill="#2a1450" stroke="#ff4fd8" stroke-width="6"/>
      ${[...Array(6)].map((_, i) => `<circle cx="${-90 + i * 36}" cy="${300 + (i % 2) * 40}" r="14" fill="${['#ffd34d', '#38bdf8', '#ff5470', '#34d399', '#a78bfa', '#f07a2a'][i]}" opacity="${f(0.5 + 0.5 * Math.sin(c.t * 9 + i))}"/>`).join('')}
      ${txt(0, 450, 'GALAXY', 40, { fill: '#ffd34d' })}<path d="M-170 560 L170 560 L210 900 L-210 900 Z" fill="#1d1238" stroke="#ff4fd8" stroke-width="5"/><rect x="-170" y="480" width="340" height="90" fill="#140c28"/></g>`;
    const kipTired = { ...K.EXPRESSIONS.happy, lidUp: 0.45, lidLo: 0.1, smile: 0.6, open: 0.1 };
    const pose = { armL: { sh: 40, el: -100 }, armR: { sh: 40, el: -100 } };
    const svg = `<rect width="1920" height="1080" fill="#0b0618"/>${[...Array(12)].map((_, i) => `<rect x="${i * 160}" y="0" width="150" height="900" fill="#120a26"/>`).join('')}
      <rect y="900" width="1920" height="180" fill="#160d2e"/>${[...Array(20)].map((_, i) => `<rect x="${i * 100}" y="900" width="50" height="180" fill="#1d1238" opacity="0.6" transform="skewX(-20)"/>`).join('')}
      ${neon(560, 130, 'ARCADE', '#38bdf8')}${neon(1420, 130, 'OPEN 24H', '#ff4fd8')}
      ${machine(480)}${machine(1440)}
      ${kip(c, { x: 760, expression: kipTired, pose, lookX: -0.8, lookY: -0.3 })}
      ${person('scientist', c, { x: 1160, flip: false, lookX: 0.8, expression: score > 3 ? { ...K.EXPRESSIONS.sad, question: 0 } : 'neutral', pose, lookY: -0.3 })}
      <g transform="translate(960 270)"><rect x="-230" y="-70" width="460" height="130" rx="20" fill="#000" stroke="#ffd34d" stroke-width="5"/>
      ${txt(-110, -18, 'YOU', 26, { fill: '#f07a2a' })}${txt(110, -18, 'SCIENTIST', 26, { fill: '#b38bff' })}${txt(-110, 42, String(score), 60, { fill: '#fff' })}${txt(0, 38, ':', 60, { fill: '#fff' })}${txt(110, 42, '0', 60, { fill: '#fff' })}</g>`;
    return { svg, cam: { z: lerp(1.0, 1.08, easeIO(lt / 9)), x: 960, y: 560 } };
  };

  // ---------------------------------------------------------------- BED
  S.bed = c => {
    const a = c.b.a, lt = c.lt, rt = c.rt;
    const night = { fall: 0, sleep: 0.15, sleep2: 0.45, dream: 0.75, wake: 1, twist: 1 }[a] ?? 0;
    const prog = clamp(night + (a === 'wake' || a === 'twist' ? 0 : lt / 40));
    const skyTop = prog < 0.8 ? '#0b1026' : '#6aa8ff', skyBot = prog < 0.6 ? '#2a2050' : '#ffc98a';
    const sunY = lerp(700, 260, sm(0.7, 1, prog)), moonX = lerp(260, 640, prog);
    const lying = a === 'fall' ? easeIO(clamp((lt - 0.6) / 0.6)) : a === 'wake' || a === 'twist' ? 0 : 1;
    const dark = a === 'twist' ? sm(0.2, 0.6, lt) * 0.55 : 0;
    const bedX = 1100, bedY = 760;
    let kipG;
    if (lying > 0.001) {
      const ang = -90 * lying;
      kipG = `<g transform="translate(${f(lerp(1000, bedX + 230, lying))} ${f(lerp(905, bedY - 40, lying))}) rotate(${f(ang)})">
        ${K.renderKip({ id: 'bk', x: 0, y: 0, scale: 0.9, expression: lying > 0.9 ? { ...K.EXPRESSIONS.happy, lidUp: 1, lidLo: 0, smile: 0.5, open: 0, blush: 0.3 } : 'surprise', pose: 'idle', t: c.t, blink: lying > 0.9 ? 1 : 0, shadow: false })}</g>`;
    } else {
      kipG = kip(c, { x: 820, pose: a === 'wake' ? 'cheer' : 'shrug', expression: a === 'twist' ? 'confused' : 'happy' });
    }
    const blanket = lying > 0.9 ? `<path d="M${bedX - 150} ${bedY - 50} Q${bedX + 60} ${bedY - 130 - Math.sin(c.t * 1.2) * 6} ${bedX + 330} ${bedY - 60} L${bedX + 330} ${bedY + 40} L${bedX - 170} ${bedY + 40} Z" fill="#3b5bdb"/><path d="M${bedX - 150} ${bedY - 50} Q${bedX - 130} ${bedY - 90} ${bedX - 90} ${bedY - 84}" stroke="#4c6ef5" stroke-width="16" fill="none"/>` : '';
    let ui = '';
    if (lying > 0.9) ui += [0, 1, 2].map(i => { const p = (c.t * 0.4 + i / 3) % 1; return txt(bedX - 520 + p * 160, 380 - p * 220, 'Z', 50 + p * 60, { fill: '#cfe9ff', op: 1 - p, stroke: '#1b2a4a', sw: 6 }); }).join('');
    if (a === 'sleep' || a === 'sleep2') ui += `<g transform="translate(1600 220)"><circle r="80" fill="#f2f2f7" stroke="#333" stroke-width="10"/><path d="M0 0 L0 -55" stroke="#222" stroke-width="7" transform="rotate(${f(c.t * 600)})"/><path d="M0 0 L0 -38" stroke="#222" stroke-width="9" transform="rotate(${f(c.t * 50)})"/></g>${txt(1600, 350, a === 'sleep' ? '14 HOURS' : 'NO LASTING DAMAGE', 40, { fill: '#fff', stroke: '#000', sw: 7 })}`;
    if (a === 'dream') ui += bubble(700, 260, 520, 300, `<g transform="translate(700 260)">${brain(c, { cx: 0, cy: 0, s: 0.35, id: 'db', inner: `<rect x="-300" y="${f(-250 + 500 * ((c.t * 0.3) % 1))}" width="600" height="40" fill="#fff" opacity="0.5"/>` })}
      <g transform="rotate(${f(Math.sin(c.t * 5) * 20)}) translate(150 -40)"><path d="M0 0 L60 60" stroke="#9aa0ad" stroke-width="16" stroke-linecap="round"/><circle cx="-6" cy="-6" r="22" fill="none" stroke="#9aa0ad" stroke-width="12"/></g></g>${txt(700, 370, 'DEEP SLEEP REPAIR', 30, { fill: '#223' })}`, 1);
    if (a === 'twist') ui += txt(960, 250, '...OR IS IT?', 90, { fill: '#ff5470', stroke: '#000', sw: 10, op: sm(0.4, 0.8, lt) });
    const svg = `<linearGradient id="bs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient>
      <rect width="1920" height="1080" fill="${prog > 0.85 ? '#5b5f7a' : '#232842'}"/>
      <clipPath id="bwin"><rect x="200" y="140" width="520" height="420"/></clipPath><g><rect x="200" y="140" width="520" height="420" fill="url(#bs)"/><g clip-path="url(#bwin)">${prog < 0.75 ? `<circle cx="${f(moonX)}" cy="230" r="40" fill="#f1eeff"/>` : `<circle cx="460" cy="${f(sunY)}" r="70" fill="#ffd27a"/>`}</g>
      <rect x="200" y="140" width="520" height="420" fill="none" stroke="#151826" stroke-width="18"/><path d="M460 140 V560 M200 350 H720" stroke="#151826" stroke-width="10"/></g>
      ${prog > 0.8 ? `<path d="M200 140 L720 140 L1300 900 L500 900Z" fill="#ffd9a0" opacity="0.12"/>` : ''}
      <rect y="900" width="1920" height="180" fill="#1a1d2c"/>
      <g><rect x="${bedX - 360}" y="${bedY - 10}" width="740" height="90" rx="20" fill="#e9ecf5"/><rect x="${bedX - 380}" y="${bedY - 160}" width="40" height="300" rx="14" fill="#6b4f3a"/><rect x="${bedX + 360}" y="${bedY - 80}" width="40" height="220" rx="14" fill="#6b4f3a"/>
        <rect x="${bedX - 360}" y="${bedY + 80}" width="760" height="40" fill="#5a4030"/><ellipse cx="${bedX - 260}" cy="${bedY - 30}" rx="90" ry="40" fill="#fff"/></g>
      ${kipG}${blanket}
      <rect width="1920" height="1080" fill="#0a0c20" opacity="${f(0.35 * (1 - prog) + dark)}"/>${ui}`;
    return { svg, cam: { z: 1 + 0.06 * easeIO(rt / c.rdur), x: 1000, y: 540 } };
  };

  // ---------------------------------------------------------------- CITY (stats)
  S.city = c => {
    const a = c.b.a, lt = c.lt; let win = '';
    const r = rng(17);
    for (let row = 0; row < 6; row++) for (let col = 0; col < 9; col++) {
      const x = 330 + col * 140, y = 140 + row * 120, bad = (row * 9 + col) % 3 === 1, hi = a === 'windows' && bad && lt > 3.5;
      win += `<rect x="${x}" y="${y}" width="100" height="80" rx="4" fill="${hi ? '#3a0f1f' : r() < 0.6 ? '#ffd27a' : '#1d2240'}" opacity="${hi ? 1 : 0.85}"/>`;
      if (hi) win += `<rect x="${x}" y="${y}" width="100" height="80" rx="4" fill="none" stroke="#ff5470" stroke-width="5"/><rect x="${x + 40}" y="${y + 35}" width="20" height="30" rx="4" fill="#6fe3ff" opacity="${f(0.6 + 0.4 * Math.sin(c.t * 5 + x))}"/>`;
    }
    let ui = '';
    if (a === 'windows') ui += `<g transform="translate(960 960) scale(${f(easeOut((lt - 3.5) / 0.4))})">${pill(0, 0, '1 IN 3 ADULTS: < 7 HOURS', '#ff5470', 48)}</g>`;
    if (a === 'chart') {
      const g = sm(0.5, 3, lt);
      ui += `<rect width="1920" height="1080" fill="#070a14" opacity="0.8"/>
        <g transform="translate(560 880)"><rect x="0" y="${f(-520 * g)}" width="260" height="${f(520 * g)}" rx="16" fill="#f07a2a"/>${txt(130, 60, '6h × 14 NIGHTS', 34, { fill: '#fff' })}</g>
        <g transform="translate(1100 880)"><rect x="0" y="${f(-520 * g)}" width="260" height="${f(520 * g)}" rx="16" fill="#ff5470"/>${txt(130, 60, '2 NIGHTS, NO SLEEP', 34, { fill: '#fff' })}</g>
        ${txt(960, 230, 'SAME DROP IN FOCUS', 64, { fill: '#fff', op: sm(3, 3.5, lt) })}
        ${(() => { const s3 = c.b.sentences[2] ? c.b.sentences[2].start - c.b.start : 99, s4 = c.b.sentences[3] ? c.b.sentences[3].start - c.b.start : 99; return `<g opacity="${f(sm(s4, s4 + 0.3, lt))}"><rect x="610" y="440" width="700" height="150" rx="24" fill="#000" stroke="#ffd34d" stroke-width="5"/>${txt(960, 505, 'HOW SLEEPY THEY FELT:', 36, { fill: '#ffd34d' })}${txt(960, 565, '"A LITTLE."', 48, { fill: '#fff' })}</g>`; })()}`;
    }
    const svg = `<linearGradient id="ny" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05081a"/><stop offset="1" stop-color="#1c1840"/></linearGradient><rect width="1920" height="1080" fill="url(#ny)"/>
      ${[...Array(60)].map(() => `<circle cx="${f(r() * 1920)}" cy="${f(r() * 300)}" r="${f(r() * 2)}" fill="#fff" opacity="${f(0.3 + 0.5 * r())}"/>`).join('')}
      <rect x="290" y="90" width="1340" height="900" fill="#141733"/><rect x="290" y="80" width="1340" height="20" fill="#0c0e22"/>${win}<rect y="990" width="1920" height="90" fill="#0a0b18"/>${ui}`;
    return { svg, cam: { z: a === 'windows' ? lerp(1.0, 1.1, easeIO(lt / 8)) : 1, x: 960, y: 540 } };
  };

  // ---------------------------------------------------------------- PHONE (2:47 AM)
  S.phone = c => {
    const a = c.b.a, lt = c.lt;
    const look = a === 'look';
    const glow = 0.8 + 0.2 * Math.sin(c.t * 7) * (Math.random() < 0.1 ? 1 : 0.2);
    const pose = { armL: { sh: 40, el: -110 }, armR: { sh: 40, el: -110 } };
    const h = X.hands({ x: 960, y: 905, scale: 1.05, pose, t: c.t });
    const svg = `<rect width="1920" height="1080" fill="#070912"/>
      <rect x="1380" y="180" width="360" height="300" fill="#0b1026"/><rect x="1380" y="180" width="360" height="300" fill="none" stroke="#151826" stroke-width="14"/><circle cx="1650" cy="250" r="28" fill="#e9e4ff" opacity="0.7"/>
      <rect x="300" y="200" width="200" height="90" rx="12" fill="#000"/>${txt(400, 265, '2:47', 56, { fill: '#ff3b3b', font: "'Courier New', monospace", w: 700 })}
      <rect x="400" y="760" width="1200" height="200" rx="30" fill="#2a2f55"/>
      ${kip(c, { x: 960, pose, lookX: look ? 0 : 0, lookY: look ? 0 : 0.6, expression: look ? { ...K.EXPRESSIONS.neutral, lidUp: 0.25, smile: 0 } : { ...K.EXPRESSIONS.neutral, lidUp: 0.3, smile: 0.1 }, rim: 0.3 })}
      <path d="M440 800 Q960 700 1560 800 L1600 960 L400 960Z" fill="#3b5bdb"/>
      <g transform="translate(${f((h.L.x + h.R.x) / 2)} ${f((h.L.y + h.R.y) / 2 - 20)})"><rect x="-40" y="-70" width="80" height="130" rx="12" fill="#111"/><rect x="-34" y="-62" width="68" height="112" rx="8" fill="#6fe3ff" opacity="${f(glow)}"/></g>
      <path d="M${f((h.L.x + h.R.x) / 2)} ${f((h.L.y + h.R.y) / 2 - 60)} L700 200 L1220 200Z" fill="#6fe3ff" opacity="${f(0.07 * glow)}"/>`;
    return { svg, cam: look ? { z: lerp(1.15, 1.6, easeIO(lt / 3)), x: 960, y: 420 } : { z: lerp(1.0, 1.15, easeIO(lt / 6)), x: 960, y: 500 } };
  };

  // ---------------------------------------------------------------- OUTRO
  S.outro = c => {
    const lt = c.lt;
    const click = lt > 5.5 && lt < 6.2, subbed = lt > 6;
    const cx = lerp(1700, 1150, easeOut((lt - 4) / 1.2)), cy = lerp(1000, 760, easeOut((lt - 4) / 1.2));
    const svg = `<linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1036"/><stop offset="1" stop-color="#0a1830"/></linearGradient><rect width="1920" height="1080" fill="url(#og)"/>
      ${confetti(c.b.start + 6, c.t, 50, 8)}
      ${kip(c, { x: 450, y: 960, scale: 1.1, pose: 'wave', expression: 'happy', lookX: 0.5 })}
      ${[0, 1].map(i => `<g transform="translate(${1030 + i * 470} 330)"><rect x="-210" y="-125" width="420" height="250" rx="20" fill="#0d0f1c" stroke="#3b4a6b" stroke-width="5"/>${txt(0, 20, '?', 110, { fill: '#2c3550' })}${txt(0, 165, i ? 'NEXT EPISODE' : 'YOUR IDEA HERE', 28, { fill: '#9fb3c8' })}</g>`).join('')}
      <g transform="translate(1150 700) scale(${f(click ? 0.94 : 1)})"><rect x="-230" y="-55" width="460" height="110" rx="55" fill="${subbed ? '#3b4a6b' : '#e62e3d'}"/>${txt(0, 18, subbed ? 'SUBSCRIBED ✓' : 'SUBSCRIBE', 48, { fill: '#fff' })}</g>
      <g transform="translate(1440 700) rotate(${f(subbed ? Math.sin(c.t * 25) * 15 * Math.max(0, 1 - (lt - 6)) : 0)})"><path d="M-30 20 Q-30 -40 0 -45 Q30 -40 30 20 L40 30 L-40 30Z" fill="#ffd34d"/><circle cy="40" r="10" fill="#ffd34d"/></g>
      <path transform="translate(${f(cx)} ${f(cy)})" d="M0 0 L0 60 L16 46 L28 72 L40 66 L28 40 L48 40 Z" fill="#fff" stroke="#000" stroke-width="4"/>
      <g transform="translate(1260 900)" opacity="${f(sm(1.5, 2.5, lt))}"><rect x="-380" y="-50" width="760" height="100" rx="24" fill="#fff"/><path d="M-300 50 L-320 85 L-260 50Z" fill="#fff"/>${txt(0, 15, 'What should Kip try next? 💬', 40, { fill: '#223' })}</g>`;
    return { svg, cam: { z: 1 } };
  };

  root.SCENES = S;
})(typeof window !== 'undefined' ? window : globalThis);
