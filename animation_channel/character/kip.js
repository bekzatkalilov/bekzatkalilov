/*
 * KIP — main character of the channel.  PERMANENT CHARACTER REFERENCE.
 *
 * Every frame of every episode must be drawn through renderKip().
 * The constants in DESIGN are the locked design: proportions, colours,
 * face layout and clothing.  Do NOT edit them between episodes — only
 * pass pose / expression parameters.  (Version-bump + re-approval needed
 * for any design change.)
 *
 * Works in Node (require) and the browser (window.Kip).
 */
(function (root) {
  'use strict';

  const DESIGN = Object.freeze({
    version: '1.0.0',
    // ---- proportions (local units, ground = y 0, x 0 = centre) ----
    headR: 120,          // head radius  (head ≈ 40 % of total height)
    headCY: -470,        // head centre
    neckY: -352,
    shoulderY: -332,
    shoulderX: 50,
    hipY: -190,
    hipX: 20,
    upperArm: 82, foreArm: 78, handR: 12,
    thigh: 96, shin: 92,
    limbW: 15,
    eyeX: 43, eyeY: -478, eyeRX: 33, eyeRY: 42,
    pupilR: 15,
    browY: -540, browLen: 52, browW: 13,
    mouthY: -408, mouthW: 46,
    // ---- signature details ----
    cowlick: true,       // single curled tuft on top of the head
    // ---- palette ----
    color: Object.freeze({
      headHi: '#3a3a46', head: '#16161c', headLo: '#060608',
      rim: '#6fe3ff',            // cool rim light
      eye: '#ffffff', pupil: '#0b0b0f',
      brow: '#f4f4f6', mouthLine: '#f4f4f6', mouthIn: '#3b0f1a', tongue: '#e0586b',
      hoodie: '#f07a2a', hoodieDark: '#c45a17', hoodieLight: '#ffa25a',
      string: '#fff3e6',
      hand: '#16161c',
      pants: '#2a2c38', pantsDark: '#1c1d26',
      shoe: '#f5f5f5', shoeSole: '#9aa0ad',
      sweat: '#8fd8ff', tear: '#8fd8ff', blush: '#ff6b81',
      shadow: 'rgba(0,0,0,0.45)'
    })
  });

  /* ------------------------------------------------------------------
   * Expression presets. Every value is numeric so presets can be tweened.
   * brow:  raise (px up), tilt (+ = inner end up / worried, - = angry),
   *        curve (+ = arched)
   * lids:  up = upper lid cover 0..1, lo = lower lid cover 0..1,
   *        ang = upper lid angle (+ = droops toward outer corner)
   * eye:   open = vertical scale, pupil = pupil scale
   * mouth: smile -1..1, open 0..1, round 0..1, wave 0..1, width scale
   * fx:    sweat, tear, blush, sparkle, question 0..1
   * ------------------------------------------------------------------ */
  const EXPRESSIONS = {
    neutral:  { browL:{raise:0,tilt:0,curve:3},  browR:{raise:0,tilt:0,curve:3},
                lidUp:0.08, lidLo:0, lidAng:0, eyeOpen:1, pupil:1,
                smile:0.15, open:0, round:0, wave:0, mouthW:1,
                sweat:0, tear:0, blush:0, sparkle:0, question:0 },
    happy:    { browL:{raise:10,tilt:-2,curve:8}, browR:{raise:10,tilt:-2,curve:8},
                lidUp:0, lidLo:0.32, lidAng:0, eyeOpen:1, pupil:1.05,
                smile:1, open:0.55, round:0, wave:0, mouthW:1.25,
                sweat:0, tear:0, blush:0.7, sparkle:0, question:0 },
    fear:     { browL:{raise:16,tilt:16,curve:-2}, browR:{raise:16,tilt:16,curve:-2},
                lidUp:0, lidLo:0, lidAng:0, eyeOpen:1.12, pupil:0.55,
                smile:-0.3, open:0.12, round:0, wave:1, mouthW:1.1,
                sweat:1, tear:0, blush:0, sparkle:0, question:0 },
    surprise: { browL:{raise:26,tilt:2,curve:10}, browR:{raise:26,tilt:2,curve:10},
                lidUp:0, lidLo:0, lidAng:0, eyeOpen:1.15, pupil:0.6,
                smile:0, open:1, round:1, wave:0, mouthW:0.9,
                sweat:0, tear:0, blush:0, sparkle:0, question:0 },
    sad:      { browL:{raise:6,tilt:14,curve:-3}, browR:{raise:6,tilt:14,curve:-3},
                lidUp:0.38, lidLo:0.05, lidAng:16, eyeOpen:0.95, pupil:1.1,
                smile:-0.9, open:0, round:0, wave:0.15, mouthW:0.9,
                sweat:0, tear:1, blush:0, sparkle:0, question:0 },
    excited:  { browL:{raise:22,tilt:0,curve:12}, browR:{raise:22,tilt:0,curve:12},
                lidUp:0, lidLo:0.12, lidAng:0, eyeOpen:1.1, pupil:1.2,
                smile:1, open:1, round:0.1, wave:0, mouthW:1.35,
                sweat:0, tear:0, blush:0.8, sparkle:1, question:0 },
    confused: { browL:{raise:22,tilt:-4,curve:10}, browR:{raise:-4,tilt:-8,curve:0},
                lidUp:0.12, lidLo:0.05, lidAng:-4, eyeOpen:1, pupil:0.9,
                smile:-0.15, open:0, round:0, wave:0.8, mouthW:0.8,
                sweat:0, tear:0, blush:0, sparkle:0, question:1 },
    angry:    { browL:{raise:-8,tilt:-18,curve:0}, browR:{raise:-8,tilt:-18,curve:0},
                lidUp:0.3, lidLo:0.1, lidAng:-22, eyeOpen:1, pupil:0.85,
                smile:-0.6, open:0.25, round:0, wave:0, mouthW:1.1,
                sweat:0, tear:0, blush:0, sparkle:0, question:0 }
  };

  /* Body pose presets (angles in degrees from straight down, + = outward). */
  const POSES = {
    idle:     { armL:{sh:12,el:-10}, armR:{sh:12,el:-10}, legL:{hip:4,knee:0}, legR:{hip:4,knee:0}, lean:0, headTilt:0, bob:0 },
    cheer:    { armL:{sh:112,el:28},  armR:{sh:112,el:28}, legL:{hip:10,knee:0}, legR:{hip:10,knee:0}, lean:0, headTilt:0, bob:-18 },
    shrug:    { armL:{sh:60,el:-110}, armR:{sh:60,el:-110}, legL:{hip:5,knee:0}, legR:{hip:5,knee:0}, lean:0, headTilt:8, bob:0 },
    scared:   { armL:{sh:35,el:-130}, armR:{sh:35,el:-130}, legL:{hip:12,knee:-8}, legR:{hip:12,knee:-8}, lean:-4, headTilt:-4, bob:10 },
    sad:      { armL:{sh:4,el:-4},    armR:{sh:4,el:-4},   legL:{hip:2,knee:0}, legR:{hip:2,knee:0}, lean:6, headTilt:6, bob:6 },
    think:    { armL:{sh:10,el:-8},   armR:{sh:35,el:-145}, legL:{hip:4,knee:0}, legR:{hip:4,knee:0}, lean:0, headTilt:-8, bob:0 },
    wave:     { armL:{sh:12,el:-10},  armR:{sh:130,el:30},  legL:{hip:4,knee:0}, legR:{hip:4,knee:0}, lean:-2, headTilt:-5, bob:0 },
    point:    { armL:{sh:12,el:-10},  armR:{sh:95,el:0},    legL:{hip:6,knee:0}, legR:{hip:6,knee:0}, lean:-3, headTilt:-4, bob:0 },
    surprise: { armL:{sh:70,el:60},   armR:{sh:70,el:60},   legL:{hip:8,knee:0}, legR:{hip:8,knee:0}, lean:-6, headTilt:0, bob:-6 }
  };

  // ---------------------------------------------------------------- utils
  const rad = d => d * Math.PI / 180;
  const f = n => (Math.round(n * 100) / 100).toString();
  const lerp = (a, b, t) => a + (b - a) * t;
  function lerpObj(a, b, t) {
    if (typeof a === 'number') return lerp(a, b, t);
    const o = {};
    for (const k of Object.keys(a)) o[k] = (b && k in b) ? lerpObj(a[k], b[k], t) : a[k];
    return o;
  }
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const deepMerge = (base, over) => {
    if (!over) return JSON.parse(JSON.stringify(base));
    const o = JSON.parse(JSON.stringify(base));
    for (const k of Object.keys(over)) {
      o[k] = (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && o[k])
        ? deepMerge(o[k], over[k]) : over[k];
    }
    return o;
  };

  /** Resolve an expression: name, object, or {from,to,t} blend. */
  function expr(e) {
    if (!e) return EXPRESSIONS.neutral;
    if (typeof e === 'string') return EXPRESSIONS[e] || EXPRESSIONS.neutral;
    if (e.from) return lerpObj(expr(e.from), expr(e.to), ease(e.t));
    return deepMerge(EXPRESSIONS.neutral, e);
  }
  function pose(p) {
    if (!p) return POSES.idle;
    if (typeof p === 'string') return POSES[p] || POSES.idle;
    if (p.from) return lerpObj(pose(p.from), pose(p.to), ease(p.t));
    return deepMerge(POSES.idle, p);
  }

  // ------------------------------------------------------------ geometry
  // Two-segment limb. side = -1 (character's right, screen left) / +1.
  function limb(x0, y0, a1, a2, l1, l2, side) {
    const A1 = rad(a1) * side;
    const x1 = x0 + Math.sin(A1) * l1, y1 = y0 + Math.cos(A1) * l1;
    const A2 = A1 + rad(a2) * side;
    const x2 = x1 + Math.sin(A2) * l2, y2 = y1 + Math.cos(A2) * l2;
    return { x1, y1, x2, y2, A2 };
  }

  function browPath(side, b) {
    const D = DESIGN;
    const outer = side * (D.eyeX + D.browLen / 2 + 4);
    const inner = side * (D.eyeX - D.browLen / 2 + 4);
    const yOuter = D.browY - b.raise + b.tilt * 0.5;
    const yInner = D.browY - b.raise - b.tilt * 0.5;
    const cx = (outer + inner) / 2, cy = (yOuter + yInner) / 2 - b.curve;
    return `M${f(inner)} ${f(yInner)} Q${f(cx)} ${f(cy)} ${f(outer)} ${f(yOuter)}`;
  }

  function mouthSVG(e, c) {
    const D = DESIGN;
    const w = D.mouthW * e.mouthW * (1 - 0.22 * e.round) / 2;
    const N = 24, up = [], lo = [];
    const H = 34 * e.open * (1 + 0.3 * e.round);
    for (let i = 0; i <= N; i++) {
      const u = -1 + 2 * i / N;
      const base = D.mouthY - e.smile * 13 * u * u + e.smile * 4
                 + e.wave * 4.5 * Math.sin(u * Math.PI * 3);
      const bulge = Math.pow(Math.max(0, 1 - u * u), 0.75);
      const r = e.round > 0 ? Math.sqrt(Math.max(0, 1 - u * u)) : 0;
      const prof = lerp(bulge, r, e.round);
      up.push([u * w, base - H * 0.28 * prof * (e.smile > 0.5 ? 0.2 : 1)]);
      lo.push([u * w, base + H * prof]);
    }
    const pts = a => a.map(p => `${f(p[0])} ${f(p[1])}`).join(' L');
    if (e.open < 0.04) {
      return `<path d="M${pts(up)}" fill="none" stroke="${c.mouthLine}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const shape = `M${pts(up)} L${pts(lo.slice().reverse())} Z`;
    const tongueY = D.mouthY + H * 0.65 + (-e.smile * 13 * 0 + e.smile * 4);
    return `<g>
      <clipPath id="__ID__-mouth"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="${c.mouthIn}"/>
      <ellipse clip-path="url(#__ID__-mouth)" cx="0" cy="${f(tongueY + H * 0.35)}" rx="${f(w * 0.7)}" ry="${f(H * 0.5)}" fill="${c.tongue}"/>
      <path d="${shape}" fill="none" stroke="${c.mouthLine}" stroke-width="6" stroke-linejoin="round"/>
    </g>`;
  }

  function eyeSVG(side, e, o, c) {
    const D = DESIGN;
    const cx = side * D.eyeX, cy = D.eyeY;
    const rx = D.eyeRX, ry = D.eyeRY * e.eyeOpen * (1 - (o.blink || 0));
    const id = `__ID__-eye${side > 0 ? 'R' : 'L'}`;
    const lx = (o.lookX || 0) * (rx - D.pupilR * e.pupil - 4);
    const ly = (o.lookY || 0) * (Math.max(1, ry - D.pupilR * e.pupil - 4));
    const pr = D.pupilR * e.pupil;
    if (ry < 3) { // fully closed: a lash line
      return `<path d="M${f(cx - rx)} ${f(cy)} Q${f(cx)} ${f(cy + 8)} ${f(cx + rx)} ${f(cy)}" stroke="${c.eye}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    }
    const lidH = 2 * ry * e.lidUp, loH = 2 * ry * e.lidLo;
    const ang = e.lidAng * side;
    let sparkle = '';
    if (e.sparkle > 0) {
      const s = 7 * e.sparkle, sx = cx + lx + pr * 0.35, sy = cy + ly - pr * 0.4;
      sparkle = `<path d="M${f(sx)} ${f(sy - s)} L${f(sx + s * 0.3)} ${f(sy - s * 0.3)} L${f(sx + s)} ${f(sy)} L${f(sx + s * 0.3)} ${f(sy + s * 0.3)} L${f(sx)} ${f(sy + s)} L${f(sx - s * 0.3)} ${f(sy + s * 0.3)} L${f(sx - s)} ${f(sy)} L${f(sx - s * 0.3)} ${f(sy - s * 0.3)} Z" fill="#fff"/>`;
    }
    // Lids are cut out with a mask (no seams against the head gradient).
    // Lower lid is an ellipse so "smiling eyes" curve upward.
    return `<g>
      <mask id="${id}" maskUnits="userSpaceOnUse" x="${f(cx - rx * 3)}" y="${f(cy - ry * 3)}" width="${f(rx * 6)}" height="${f(ry * 6)}">
        <ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#fff"/>
        <rect x="${f(cx - rx * 2)}" y="${f(cy - ry * 2.5)}" width="${f(rx * 4)}" height="${f(ry * 1.5 + lidH)}"
              fill="#000" transform="rotate(${f(ang)} ${f(cx)} ${f(cy)})"/>
        <ellipse cx="${f(cx)}" cy="${f(cy + ry * 2.2 - loH)}" rx="${f(rx * 1.5)}" ry="${f(ry * 1.2)}" fill="#000"/>
      </mask>
      <g mask="url(#${id})">
        <ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${c.eye}"/>
        <path d="M${f(cx - rx * 0.9)} ${f(cy + ry * 0.55)} Q${f(cx)} ${f(cy + ry * 1.05)} ${f(cx + rx * 0.9)} ${f(cy + ry * 0.55)}" stroke="#c9d3e6" stroke-width="5" fill="none" opacity="0.55"/>
        <circle cx="${f(cx + lx)}" cy="${f(cy + ly)}" r="${f(pr)}" fill="${c.pupil}"/>
        <circle cx="${f(cx + lx + pr * 0.38)}" cy="${f(cy + ly - pr * 0.38)}" r="${f(pr * 0.3)}" fill="#fff"/>
        ${sparkle}
      </g>
    </g>`;
  }

  /**
   * renderKip(options) -> SVG <g> string (no outer <svg>).
   *   id          unique id prefix (required when several Kips share a page)
   *   x, y, scale position of the feet centre / size  (1 = 590 units tall)
   *   flip        true = facing the other way (mirror)
   *   expression  preset name | partial object | {from,to,t}
   *   pose        preset name | partial object | {from,to,t}
   *   lookX/lookY pupil direction -1..1
   *   blink       0..1
   *   talk        0..1 extra mouth opening (lip-sync)
   *   t           time (s) for idle breathing / fx motion
   *   shadow      draw ground shadow (default true)
   *   rim         rim-light strength 0..1 (default 0.8)
   */
  function renderKip(opts) {
    const o = Object.assign({ id: 'kip', x: 0, y: 0, scale: 1, flip: false, t: 0, shadow: true, rim: 0.8 }, opts || {});
    const D = DESIGN, c = D.color;
    const e = Object.assign({}, expr(o.expression));
    const p = pose(o.pose);
    if (o.talk) { e.open = Math.min(1, e.open + o.talk * 0.6); }

    const breath = Math.sin(o.t * 2.2) * 2.5;
    const bob = (p.bob || 0) + breath * 0.4;

    // ---------- legs
    const leg = (side, L) => {
      const hx = side * D.hipX, hy = D.hipY + bob;
      const k = limb(hx, hy, L.hip, L.knee, D.thigh, D.shin, side);
      // feet stay planted near ground
      const footY = Math.min(k.y2, 0);
      const sx = k.x2, sy = footY;
      return `<path d="M${f(hx)} ${f(hy)} L${f(k.x1)} ${f(k.y1)} L${f(sx)} ${f(sy - 10)}"
          stroke="${c.pants}" stroke-width="${D.limbW + 3}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <g transform="translate(${f(sx)} ${f(sy)}) scale(${side} 1)">
          <path d="M-16 -2 C-18 -20 -6 -26 6 -24 C18 -22 22 -16 32 -12 C40 -9 40 -2 36 0 L-14 0 Z" fill="${c.shoe}"/>
          <path d="M-16 -3 L37 -3" stroke="${c.shoeSole}" stroke-width="5" stroke-linecap="round"/>
          <path d="M2 -21 L12 -14 M8 -23 L17 -16" stroke="${c.shoeSole}" stroke-width="2.5" stroke-linecap="round"/>
        </g>`;
    };

    // ---------- torso (hoodie)
    const sy = D.shoulderY + bob, hy = D.hipY + bob;
    const torso = `
      <path d="M${-D.shoulderX - 8} ${f(sy + 10)}
               Q${-D.shoulderX - 6} ${f(sy - 16)} ${-D.shoulderX + 18} ${f(sy - 18)}
               L${D.shoulderX - 18} ${f(sy - 18)}
               Q${D.shoulderX + 6} ${f(sy - 16)} ${D.shoulderX + 8} ${f(sy + 10)}
               L${D.shoulderX + 14} ${f(hy - 4)}
               Q${D.shoulderX + 14} ${f(hy + 14)} ${D.shoulderX - 4} ${f(hy + 14)}
               L${-D.shoulderX + 4} ${f(hy + 14)}
               Q${-D.shoulderX - 14} ${f(hy + 14)} ${-D.shoulderX - 14} ${f(hy - 4)} Z"
            fill="url(#__ID__-hoodie)"/>
      <rect x="${-D.shoulderX - 14}" y="${f(hy - 6)}" width="${2 * D.shoulderX + 28}" height="20" rx="9" fill="${c.hoodieDark}"/>
      <path d="M-36 ${f(hy - 62)} L36 ${f(hy - 62)} L44 ${f(hy - 14)} L-44 ${f(hy - 14)} Z" fill="${c.hoodieDark}" opacity="0.75"/>
      <path d="M-36 ${f(hy - 62)} L36 ${f(hy - 62)}" stroke="${c.hoodieLight}" stroke-width="3" opacity="0.6"/>
      <path d="M-14 ${f(sy - 12)} Q-17 ${f(sy + 20)} -13 ${f(sy + 44)}" stroke="${c.string}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M14 ${f(sy - 12)} Q17 ${f(sy + 20)} 13 ${f(sy + 40)}" stroke="${c.string}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <rect x="-17" y="${f(sy + 42)}" width="8" height="12" rx="3" fill="${c.string}"/>
      <rect x="9" y="${f(sy + 38)}" width="8" height="12" rx="3" fill="${c.string}"/>
      <path d="M${-D.shoulderX + 6} ${f(sy - 6)} Q${-D.shoulderX + 2} ${f(hy - 60)} ${-D.shoulderX - 4} ${f(hy - 10)}" stroke="${c.hoodieLight}" stroke-width="4" fill="none" opacity="0.35"/>`;

    // hood bunched behind the neck
    const hood = `<ellipse cx="0" cy="${f(D.neckY + bob + 2)}" rx="80" ry="34" fill="${c.hoodieDark}"/>
                  <ellipse cx="0" cy="${f(D.neckY + bob - 2)}" rx="62" ry="22" fill="#8f3f0e"/>`;

    // ---------- arms
    const arm = (side, A) => {
      const x0 = side * D.shoulderX, y0 = sy;
      const k = limb(x0, y0, A.sh, A.el, D.upperArm, D.foreArm, side);
      const cuffX = k.x2 - Math.sin(k.A2) * 8, cuffY = k.y2 - Math.cos(k.A2) * 8;
      return `<path d="M${f(x0)} ${f(y0)} L${f(k.x1)} ${f(k.y1)} L${f(cuffX)} ${f(cuffY)}"
          stroke="${c.hoodie}" stroke-width="${D.limbW + 4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${f(cuffX)}" cy="${f(cuffY)}" r="${f((D.limbW + 6) / 2)}" fill="${c.hoodieDark}"/>
        <circle cx="${f(k.x2)}" cy="${f(k.y2)}" r="${D.handR}" fill="${c.hand}"/>
        <circle cx="${f(k.x2 - 3)}" cy="${f(k.y2 - 4)}" r="3" fill="${c.headHi}" opacity="0.8"/>`;
    };

    // ---------- head
    const R = D.headR, hcY = D.headCY;
    const cow = D.cowlick
      ? `<path d="M-8 ${hcY - R + 6} C-14 ${hcY - R - 34} 20 ${hcY - R - 52} 30 ${hcY - R - 26} C36 ${hcY - R - 10} 18 ${hcY - R - 6} 14 ${hcY - R - 20} C12 ${hcY - R - 28} 20 ${hcY - R - 32} 22 ${hcY - R - 24} C14 ${hcY - R - 36} -2 ${hcY - R - 24} 10 ${hcY - R + 6} Z" fill="${c.head}"/>`
      : '';
    const rimOp = o.rim;
    const fx = [];
    if (e.blush > 0) {
      fx.push(`<ellipse cx="-72" cy="-430" rx="20" ry="9" fill="${c.blush}" opacity="${f(0.45 * e.blush)}"/>
               <ellipse cx="72" cy="-430" rx="20" ry="9" fill="${c.blush}" opacity="${f(0.45 * e.blush)}"/>`);
    }
    if (e.sweat > 0) {
      const dy = (o.t * 40) % 30;
      fx.push(`<path d="M104 ${f(-540 + dy)} Q90 ${f(-512 + dy)} 104 ${f(-504 + dy)} Q118 ${f(-512 + dy)} 104 ${f(-540 + dy)} Z"
                 fill="${c.sweat}" opacity="${f(e.sweat)}" transform="scale(1.4) translate(-30 155)"/>`);
    }
    if (e.tear > 0) {
      const dy = (o.t * 30) % 50;
      fx.push(`<path d="M${-D.eyeX - 20} ${f(-440 + dy)} q-7 12 0 16 q7 -4 0 -16 Z" fill="${c.tear}" opacity="${f(e.tear * (1 - dy / 60))}" transform="scale(1)"/>
               <path d="M${D.eyeX + 20} ${f(-440 + ((dy + 25) % 50))} q-7 12 0 16 q7 -4 0 -16 Z" fill="${c.tear}" opacity="${f(e.tear * 0.8)}"/>`);
    }
    const head = `<g transform="rotate(${f(p.headTilt || 0)} 0 ${D.neckY + bob}) translate(0 ${f(bob)})">
      ${cow}
      <circle cx="0" cy="${hcY}" r="${R}" fill="url(#__ID__-head)"/>
      <path d="M${f(R * Math.cos(rad(-60)))} ${f(hcY + R * Math.sin(rad(-60)))} A${R} ${R} 0 0 1 ${f(R * Math.cos(rad(55)))} ${f(hcY + R * Math.sin(rad(55)))}"
            stroke="${c.rim}" stroke-width="5" fill="none" opacity="${f(rimOp * 0.9)}" stroke-linecap="round" filter="url(#__ID__-glow)"/>
      <ellipse cx="-48" cy="${hcY - 72}" rx="34" ry="16" fill="#ffffff" opacity="0.07" transform="rotate(-25 -48 ${hcY - 72})"/>
      ${eyeSVG(-1, e, o, c)}
      ${eyeSVG(1, e, o, c)}
      <path d="${browPath(-1, e.browL)}" stroke="${c.brow}" stroke-width="${D.browW}" fill="none" stroke-linecap="round"/>
      <path d="${browPath(1, e.browR)}" stroke="${c.brow}" stroke-width="${D.browW}" fill="none" stroke-linecap="round"/>
      ${mouthSVG(e, c)}
      ${fx.join('\n')}
    </g>`;

    // floating fx (outside head rotation)
    const extras = [];
    if (e.question > 0) {
      const wob = Math.sin(o.t * 3) * 6;
      extras.push(`<text x="118" y="${f(-610 + wob)}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="90"
        fill="#ffd34d" stroke="#1a1a1a" stroke-width="6" paint-order="stroke" opacity="${f(e.question)}" transform="rotate(14 118 -610)">?</text>`);
    }
    if (e.sparkle > 0) {
      const tw = 0.6 + 0.4 * Math.sin(o.t * 6);
      const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${f(s * tw)})" d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" fill="#ffe27a"/>`;
      extras.push(star(-170, -600, 1.2 * e.sparkle), star(165, -540, 0.9 * e.sparkle), star(-140, -380, 0.7 * e.sparkle));
    }

    const defs = `<defs>
      <radialGradient id="__ID__-head" cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stop-color="${c.headHi}"/><stop offset="0.45" stop-color="${c.head}"/><stop offset="1" stop-color="${c.headLo}"/>
      </radialGradient>
      <linearGradient id="__ID__-hoodie" x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stop-color="${c.hoodieLight}"/><stop offset="0.45" stop-color="${c.hoodie}"/><stop offset="1" stop-color="${c.hoodieDark}"/>
      </linearGradient>
      <filter id="__ID__-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;

    const sh = o.shadow ? `<ellipse cx="0" cy="2" rx="${f(95 - bob * 0.5)}" ry="16" fill="${c.shadow}"/>` : '';
    const lean = p.lean || 0;
    const sx = o.flip ? -o.scale : o.scale;
    const g = `<g transform="translate(${f(o.x)} ${f(o.y)}) scale(${f(sx)} ${f(o.scale)})">
      ${defs}
      ${sh}
      ${leg(-1, p.legL)}${leg(1, p.legR)}
      <g transform="rotate(${f(lean)} 0 ${f(D.hipY + bob)})">
        ${hood}
        ${torso}
        ${arm(-1, p.armL)}${arm(1, p.armR)}
        ${head}
      </g>
      ${extras.join('\n')}
    </g>`;
    return g.split('__ID__').join(o.id);
  }

  /** Convenience: a full standalone <svg> document. */
  function kipSVG(opts, w = 600, h = 760) {
    const o = Object.assign({ x: w / 2, y: h - 40, scale: (h - 80) / 700 }, opts);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${renderKip(o)}</svg>`;
  }

  /** Natural blink curve: returns 0..1 for time t (s); blinks every ~3.5 s. */
  function blinkAt(t, seed = 0) {
    const period = 3.4 + (seed % 3) * 0.4;
    const ph = (t + seed * 0.77) % period;
    return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0;
  }

  const api = { DESIGN, EXPRESSIONS, POSES, renderKip, kipSVG, blinkAt, expr, pose, lerp, ease };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Kip = api;
})(typeof window !== 'undefined' ? window : globalThis);
