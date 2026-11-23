/*
 * Supporting characters. Same visual language as Kip (round head, big eyes,
 * thin limbs) but each has its own colours/props so they never get confused
 * with the main character. These MAY change between episodes.
 * Requires kip.js (uses its expression/pose presets for consistency).
 */
(function (root) {
  'use strict';
  const K = root.Kip || (typeof require !== 'undefined' ? require('./kip.js') : null);
  const rad = d => d * Math.PI / 180;
  const f = n => (Math.round(n * 100) / 100).toString();

  const CAST = {
    max: { name: 'Max', skin: '#efe6d8', skinLo: '#cdbfa9', ink: '#2b2622', eyeLine: true, hat: 'beanie', hatColor: '#d6334a',
           top: 'hoodie', topColor: '#22a99a', topDark: '#16786d', pants: '#38557f', shoe: '#2b2b2b', height: 1.06 },
    doc: { name: 'Doctor', skin: '#8a5a3c', skinLo: '#5e3b26', ink: '#1e1410', eyeLine: false, hat: 'bun', hatColor: '#2b2b33',
           glasses: true, top: 'coat', topColor: '#f2f4f7', topDark: '#c9ced8', shirt: '#7a4fd6', pants: '#3a3d4a', shoe: '#222', height: 1.0 },
    randy: { name: 'Randy', skin: '#e2b48a', skinLo: '#b98a62', ink: '#2a1d14', eyeLine: true, hat: 'flattop', hatColor: '#4a3220',
           top: 'shirt', topColor: '#6f8fb8', topDark: '#4d6a90', pants: '#3c3a36', shoe: '#2a2018', height: 1.0 },
    friendA: { name: 'Friend', skin: '#c58b5e', skinLo: '#9a6842', ink: '#20150e', eyeLine: false, hat: 'curly', hatColor: '#1d1612',
           top: 'shirt', topColor: '#c9a13b', topDark: '#9a7a26', pants: '#2f3240', shoe: '#ddd', height: 0.97 },
    friendB: { name: 'Friend', skin: '#f0cfae', skinLo: '#c9a582', ink: '#2b1e14', eyeLine: true, hat: 'side', hatColor: '#8a5a2b',
           top: 'shirt', topColor: '#a64545', topDark: '#7d3030', pants: '#3a3a3a', shoe: '#ddd', height: 1.02 },
    scientist: { name: 'Scientist', skin: '#f1d2b4', skinLo: '#cfae8c', ink: '#2b2018', eyeLine: true, hat: 'bald', hatColor: '#9a9aa0',
           glasses: true, top: 'sweater', topColor: '#7a5a3e', topDark: '#5a412b', pants: '#4a4a52', shoe: '#2a2a2a', height: 1.03 }
  };

  function limb(x0, y0, a1, a2, l1, l2, side) {
    const A1 = rad(a1) * side;
    const x1 = x0 + Math.sin(A1) * l1, y1 = y0 + Math.cos(A1) * l1;
    const A2 = A1 + rad(a2) * side;
    return { x1, y1, x2: x1 + Math.sin(A2) * l2, y2: y1 + Math.cos(A2) * l2, A2 };
  }

  function face(c, e, o, id) {
    const eyeX = 40, eyeY = -478, rx = 30, ryB = 37;
    let s = '';
    for (const side of [-1, 1]) {
      const cx = side * eyeX, ry = ryB * e.eyeOpen * (1 - (o.blink || 0));
      if (ry < 3) { s += `<path d="M${cx - rx} ${eyeY} Q${cx} ${eyeY + 8} ${cx + rx} ${eyeY}" stroke="${c.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>`; continue; }
      const pr = 14 * e.pupil, lx = (o.lookX || 0) * (rx - pr - 4), ly = (o.lookY || 0) * Math.max(1, ry - pr - 4);
      const lidH = 2 * ry * e.lidUp, loH = 2 * ry * e.lidLo, ang = e.lidAng * side, mid = `${id}-m${side}`;
      s += `<mask id="${mid}" maskUnits="userSpaceOnUse" x="${cx - 100}" y="${eyeY - 120}" width="200" height="240">
          <ellipse cx="${cx}" cy="${eyeY}" rx="${rx}" ry="${f(ry)}" fill="#fff"/>
          <rect x="${cx - 2 * rx}" y="${f(eyeY - ry * 2.5)}" width="${4 * rx}" height="${f(ry * 1.5 + lidH)}" fill="#000" transform="rotate(${ang} ${cx} ${eyeY})"/>
          <ellipse cx="${cx}" cy="${f(eyeY + ry * 2.2 - loH)}" rx="${rx * 1.5}" ry="${f(ry * 1.2)}" fill="#000"/></mask>
        <g mask="url(#${mid})"><ellipse cx="${cx}" cy="${eyeY}" rx="${rx}" ry="${f(ry)}" fill="#fff"/>
          <circle cx="${f(cx + lx)}" cy="${f(eyeY + ly)}" r="${f(pr)}" fill="#111"/>
          <circle cx="${f(cx + lx + pr * 0.38)}" cy="${f(eyeY + ly - pr * 0.38)}" r="${f(pr * 0.3)}" fill="#fff"/></g>
        ${c.eyeLine ? `<ellipse cx="${cx}" cy="${eyeY}" rx="${rx}" ry="${f(ry)}" fill="none" stroke="${c.ink}" stroke-width="3" opacity="0.5"/>` : ''}`;
      const b = side < 0 ? e.browL : e.browR;
      const outer = side * (eyeX + 30), inner = side * (eyeX - 22);
      const yO = -536 - b.raise + b.tilt * 0.5, yI = -536 - b.raise - b.tilt * 0.5;
      s += `<path d="M${inner} ${f(yI)} Q${(outer + inner) / 2} ${f((yO + yI) / 2 - b.curve)} ${outer} ${f(yO)}" stroke="${c.ink}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
    }
    if (c.glasses) s += `<g fill="none" stroke="#222" stroke-width="5"><circle cx="-40" cy="-478" r="40"/><circle cx="40" cy="-478" r="40"/><path d="M-2 -480 Q0 -488 2 -480"/></g>
       <g opacity="0.25" fill="#fff"><path d="M-62 -500 l14 -12 l6 6 l-14 12z"/><path d="M18 -500 l14 -12 l6 6 l-14 12z"/></g>`;
    // mouth
    const w = 22 * e.mouthW * (1 - 0.22 * e.round), my = -405, H = 30 * e.open * (1 + 0.3 * e.round);
    const up = [], lo = [];
    for (let i = 0; i <= 20; i++) {
      const u = -1 + i / 10, base = my - e.smile * 12 * u * u + e.smile * 4 + e.wave * 4 * Math.sin(u * Math.PI * 3);
      const prof = Math.pow(Math.max(0, 1 - u * u), 0.75);
      up.push(`${f(u * w)} ${f(base - H * 0.25 * prof * (e.smile > 0.5 ? 0.2 : 1))}`); lo.push(`${f(u * w)} ${f(base + H * prof)}`);
    }
    if (e.open < 0.04) s += `<path d="M${up.join(' L')}" fill="none" stroke="${c.ink}" stroke-width="6" stroke-linecap="round"/>`;
    else s += `<path d="M${up.join(' L')} L${lo.reverse().join(' L')}Z" fill="#3b0f1a" stroke="${c.ink}" stroke-width="5" stroke-linejoin="round"/>`;
    if (e.blush > 0) s += `<ellipse cx="-70" cy="-430" rx="18" ry="8" fill="#ff6b81" opacity="${f(0.4 * e.blush)}"/><ellipse cx="70" cy="-430" rx="18" ry="8" fill="#ff6b81" opacity="${f(0.4 * e.blush)}"/>`;
    if (e.sweat > 0) s += `<path d="M112 -520 q-12 20 0 26 q12 -6 0 -26z" fill="#8fd8ff" opacity="${e.sweat}"/>`;
    if (e.tear > 0) { const dy = ((o.t || 0) * 30) % 50; s += `<path d="M-62 ${f(-440 + dy)} q-7 12 0 16 q7 -4 0 -16Z" fill="#8fd8ff"/>`; }
    return s;
  }

  function hair(c) {
    const R = 115, cy = -470;
    switch (c.hat) {
      case 'beanie': return `<path d="M-118 -500 Q-120 -610 0 -618 Q120 -610 118 -500 Z" fill="${c.hatColor}"/>
        <rect x="-124" y="-526" width="248" height="34" rx="14" fill="#b02639"/>
        <path d="M-80 -600 L-80 -530 M-40 -612 L-40 -530 M0 -616 L0 -530 M40 -612 L40 -530 M80 -600 L80 -530" stroke="#b02639" stroke-width="5" opacity="0.6"/>
        <circle cx="0" cy="-622" r="20" fill="#f3f3f3"/>`;
      case 'bun': return `<circle cx="0" cy="-602" r="38" fill="${c.hatColor}"/><path d="M-116 -470 Q-124 -600 0 -592 Q124 -600 116 -470 Q100 -540 0 -548 Q-100 -540 -116 -470Z" fill="${c.hatColor}"/>
        <path d="M-90 -540 Q-20 -560 40 -548" stroke="#55556a" stroke-width="5" fill="none"/>`;
      case 'flattop': return `<path d="M-108 -520 L-104 -600 L104 -600 L108 -520 Q60 -560 0 -556 Q-60 -560 -108 -520Z" fill="${c.hatColor}"/>`;
      case 'curly': return [...Array(9)].map((_, i) => { const a = Math.PI * (1.05 + i * 0.1); return `<circle cx="${f(Math.cos(a) * 100)}" cy="${f(cy + Math.sin(a) * 100)}" r="34" fill="${c.hatColor}"/>`; }).join('');
      case 'side': return `<path d="M-118 -470 Q-130 -610 10 -598 Q120 -590 116 -480 Q90 -560 -30 -540 Q-90 -530 -118 -470Z" fill="${c.hatColor}"/>`;
      case 'bald': return `<path d="M-116 -470 Q-126 -520 -100 -540 Q-110 -480 -116 -470Z M116 -470 Q126 -520 100 -540 Q110 -480 116 -470Z" fill="${c.hatColor}"/>`;
      default: return '';
    }
  }

  function top(c, sy, hy) {
    const col = c.topColor, dk = c.topDark;
    let s = `<path d="M-58 ${sy + 10} Q-56 ${sy - 16} -32 ${sy - 18} L32 ${sy - 18} Q56 ${sy - 16} 58 ${sy + 10} L64 ${hy - 4} Q64 ${hy + 14} 46 ${hy + 14} L-46 ${hy + 14} Q-64 ${hy + 14} -64 ${hy - 4} Z" fill="${col}"/>
      <path d="M-58 ${sy + 10} L-64 ${hy - 4} Q-64 ${hy + 14} -46 ${hy + 14} L-30 ${hy + 14} Q-50 ${hy - 60} -40 ${sy}Z" fill="#fff" opacity="0.08"/>`;
    if (c.top === 'hoodie') s += `<path d="M-14 ${sy - 12} L-13 ${sy + 40} M14 ${sy - 12} L13 ${sy + 36}" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M-36 ${hy - 60} L36 ${hy - 60} L44 ${hy - 14} L-44 ${hy - 14} Z" fill="${dk}" opacity="0.8"/>`;
    if (c.top === 'coat') s = `<path d="M-30 ${sy - 18} L30 ${sy - 18} L28 ${hy} L-28 ${hy}Z" fill="${c.shirt}"/>` + `
      <path d="M-58 ${sy + 10} Q-56 ${sy - 16} -32 ${sy - 18} L-6 ${hy + 40} L-58 ${hy + 40} Z" fill="${col}"/>
      <path d="M58 ${sy + 10} Q56 ${sy - 16} 32 ${sy - 18} L6 ${hy + 40} L58 ${hy + 40} Z" fill="${col}"/>
      <path d="M-32 ${sy - 18} L-14 ${sy + 40} M32 ${sy - 18} L14 ${sy + 40}" stroke="${dk}" stroke-width="4"/>
      <rect x="28" y="${sy + 30}" width="22" height="26" rx="3" fill="${dk}"/><path d="M34 ${sy + 26} L34 ${sy + 40}" stroke="#2d6cdf" stroke-width="4"/>`;
    if (c.top === 'shirt') s += `<path d="M-24 ${sy - 18} L0 ${sy + 8} L24 ${sy - 18}" fill="#fff" opacity="0.85"/>
      <circle cx="0" cy="${sy + 30}" r="3" fill="${dk}"/><circle cx="0" cy="${sy + 60}" r="3" fill="${dk}"/><circle cx="0" cy="${sy + 90}" r="3" fill="${dk}"/>`;
    if (c.top === 'sweater') s += `<path d="M-24 ${sy - 18} L0 ${sy + 20} L24 ${sy - 18}" fill="#fff" opacity="0.9"/><path d="M-20 ${sy - 18} L0 ${sy + 20} L20 ${sy - 18}" fill="#3b4a6b"/>
      <rect x="-64" y="${hy - 6}" width="128" height="20" rx="9" fill="${dk}"/>`;
    return s;
  }

  /** renderPerson(castKeyOrSpec, opts) — opts like renderKip (x,y,scale,flip,expression,pose,lookX,lookY,blink,talk,t,id,hold) */
  function renderPerson(spec, opts) {
    const c = typeof spec === 'string' ? CAST[spec] : spec;
    const o = Object.assign({ id: 'p', x: 0, y: 0, scale: 1, flip: false, t: 0, shadow: true }, opts || {});
    const e = Object.assign({}, K.expr(o.expression));
    const p = K.pose(o.pose);
    if (o.talk) e.open = Math.min(1, e.open + o.talk * 0.6);
    const bob = (p.bob || 0) + Math.sin(o.t * 2.2 + 1) * 1;
    const sy = -332 + bob, hy = -190 + bob;
    const legs = [-1, 1].map(side => {
      const L = side < 0 ? p.legL : p.legR, hx = side * 20;
      const k = limb(hx, hy, L.hip, L.knee, 96, 92, side), fy = Math.min(k.y2, 0);
      return `<path d="M${hx} ${f(hy)} L${f(k.x1)} ${f(k.y1)} L${f(k.x2)} ${f(fy - 10)}" stroke="${c.pants}" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path transform="translate(${f(k.x2)} ${f(fy)}) scale(${side} 1)" d="M-16 -2 C-18 -20 -6 -26 6 -24 C18 -22 22 -16 32 -12 C40 -9 40 -2 36 0 L-14 0 Z" fill="${c.shoe}"/>`;
    }).join('');
    const arms = [-1, 1].map(side => {
      const A = side < 0 ? p.armL : p.armR, x0 = side * 52;
      const k = limb(x0, sy, A.sh, A.el, 82, 78, side);
      let prop = '';
      if (o.hold && o.hold.side === side) prop = `<g transform="translate(${f(k.x2)} ${f(k.y2)})">${o.hold.svg}</g>`;
      return `<path d="M${x0} ${f(sy)} L${f(k.x1)} ${f(k.y1)} L${f(k.x2)} ${f(k.y2)}" stroke="${c.topColor}" stroke-width="19" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${f(k.x2)}" cy="${f(k.y2)}" r="12" fill="${c.skin}"/>${prop}`;
    }).join('');
    const id = o.id;
    const head = `<g transform="rotate(${p.headTilt || 0} 0 ${-352 + bob}) translate(0 ${f(bob)})">
      <radialGradient id="${id}-hg" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="0.5" stop-color="${c.skin}" stop-opacity="0"/><stop offset="1" stop-color="${c.skinLo}"/></radialGradient>
      ${c.hat === 'bun' ? hair(c) : ''}
      <circle cx="0" cy="-470" r="115" fill="${c.skin}"/><circle cx="0" cy="-470" r="115" fill="url(#${id}-hg)"/>
      ${c.hat !== 'bun' ? hair(c) : ''}
      ${face(c, e, o, id)}
    </g>`;
    const sx = o.flip ? -o.scale : o.scale, sc = o.scale * c.height;
    return `<g transform="translate(${f(o.x)} ${f(o.y)}) scale(${f(o.flip ? -sc : sc)} ${f(sc)})">
      ${o.shadow ? '<ellipse cx="0" cy="2" rx="90" ry="15" fill="rgba(0,0,0,0.4)"/>' : ''}
      ${legs}<g transform="rotate(${p.lean || 0} 0 ${f(hy)})">${top(c, sy, hy)}${arms}${head}</g></g>`;
  }

  /** The hallucination: a tall thin shadow with glowing eyes. */
  function renderShadow({ x = 0, y = 0, scale = 1, t = 0, opacity = 1, id = 'sh' } = {}) {
    const w = Math.sin(t * 2) * 6;
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
      <defs><radialGradient id="${id}-g" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#000" stop-opacity="0.95"/><stop offset="0.8" stop-color="#05040a" stop-opacity="0.85"/><stop offset="1" stop-color="#05040a" stop-opacity="0"/></radialGradient>
      <filter id="${id}-b"><feGaussianBlur stdDeviation="6"/></filter></defs>
      <path filter="url(#${id}-b)" d="M-60 0 Q-70 -300 ${-50 + w} -560 Q-80 -640 0 -700 Q80 -640 ${50 + w} -560 Q70 -300 60 0 Z" fill="url(#${id}-g)"/>
      <path filter="url(#${id}-b)" d="M-45 -520 Q-140 -380 ${-120 + w * 2} -200 M45 -520 Q140 -380 ${120 - w * 2} -200" stroke="#05040a" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.8"/>
      <ellipse cx="-22" cy="-610" rx="11" ry="6" fill="#e8f6ff"/><ellipse cx="22" cy="-610" rx="11" ry="6" fill="#e8f6ff"/>
      <ellipse cx="-22" cy="-610" rx="26" ry="16" fill="#9fd8ff" opacity="0.25"/><ellipse cx="22" cy="-610" rx="26" ry="16" fill="#9fd8ff" opacity="0.25"/>
    </g>`;
  }

  /** World-space hand positions for props (works for Kip or cast). */
  function hands(opts) {
    const o = Object.assign({ x: 0, y: 0, scale: 1, flip: false, t: 0 }, opts);
    const p = K.pose(o.pose);
    const bob = (p.bob || 0) + Math.sin(o.t * 2.2) * 1;
    const sy = -332 + bob, hy = -190 + bob, L = rad(p.lean || 0);
    const res = {};
    for (const side of [-1, 1]) {
      const A = side < 0 ? p.armL : p.armR;
      const k = limb(side * 50, sy, A.sh, A.el, 82, 78, side);
      // rotate around hip by lean
      const dx = k.x2, dy = k.y2 - hy;
      const rx = dx * Math.cos(L) - dy * Math.sin(L), ry = dx * Math.sin(L) + dy * Math.cos(L) + hy;
      const s = o.scale * (o.flip ? -1 : 1);
      res[side < 0 ? 'L' : 'R'] = { x: o.x + rx * s, y: o.y + ry * o.scale };
    }
    return res;
  }

  const api = { CAST, renderPerson, renderShadow, hands };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Extras = api;
})(typeof window !== 'undefined' ? window : globalThis);
