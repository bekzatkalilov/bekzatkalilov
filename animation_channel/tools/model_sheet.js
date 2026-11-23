// Builds the official KIP model sheet (SVG) -> preview/kip_model_sheet.svg
const fs = require('fs'), path = require('path');
const K = require('../character/kip.js');
const BG = require('../scenes/backgrounds.js');

const W = 1920, H = 1080;
const out = [];
const txt = (x, y, s, size, opts = {}) =>
  `<text x="${x}" y="${y}" font-family="'Arial Black', Arial, sans-serif" font-weight="${opts.w || 900}" font-size="${size}" fill="${opts.fill || '#fff'}" text-anchor="${opts.a || 'start'}" letter-spacing="${opts.ls || 0}">${s}</text>`;

out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
out.push(`<rect width="${W}" height="${H}" fill="#0f1016"/>`);

// ---- hero panel: Kip in the dark room
const hx = 30, hy = 110, hw = 700, hh = 940;
out.push(`<clipPath id="heroClip"><rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="22"/></clipPath>`);
out.push(`<g clip-path="url(#heroClip)"><g transform="translate(${hx - 736} ${hy}) scale(${hh / 1080})">
  ${BG.darkRoom({ w: 1920, h: 1080, floorY: 900, t: 1.2, id: 'hero' })}
  ${K.renderKip({ id: 'hero', x: 1064, y: 905, scale: 1.18, expression: 'neutral', pose: 'idle', lookX: 0.25, lookY: -0.05, t: 0.4 })}
  ${BG.vignette({ w: 1920, h: 1080, id: 'heroV' })}
</g></g>`);
out.push(`<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="22" fill="none" stroke="#2a2d3d" stroke-width="2"/>`);

// title
out.push(txt(34, 70, 'KIP', 58, { fill: '#f07a2a' }));
out.push(txt(160, 70, 'MAIN CHARACTER · MODEL SHEET', 34));
out.push(txt(W - 34, 70, `v${K.DESIGN.version} · LOCKED REFERENCE`, 22, { a: 'end', fill: '#6fe3ff', w: 700 }));

// ---- expressions grid (busts)
const exprs = ['neutral', 'happy', 'fear', 'surprise', 'sad', 'excited', 'confused', 'angry'];
const looks = { neutral: [0, 0], happy: [0, 0], fear: [-0.4, 0], surprise: [0, -0.2], sad: [-0.2, 0.5], excited: [0, -0.1], confused: [0.5, -0.4], angry: [0, 0.1] };
const gx = 760, gy = 110, cw = 280, ch = 300, gap = 10;
out.push(txt(gx, gy - 12, 'EXPRESSIONS', 20, { fill: '#9aa3b8', ls: 3 }));
exprs.forEach((e, i) => {
  const c = i % 4, r = Math.floor(i / 4);
  const x = gx + c * (cw + gap), y = gy + r * (ch + gap);
  out.push(`<clipPath id="ec${i}"><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16"/></clipPath>`);
  out.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="#1a1c27"/>`);
  out.push(`<g clip-path="url(#ec${i})">
    <circle cx="${x + cw / 2}" cy="${y + ch * 0.45}" r="${cw * 0.5}" fill="#232638"/>
    ${K.renderKip({ id: 'e' + i, x: x + cw / 2, y: y + 502, scale: 0.75, expression: e, lookX: looks[e][0], lookY: looks[e][1], t: 0.35, shadow: false })}
  </g>`);
  out.push(`<rect x="${x}" y="${y + ch - 44}" width="${cw}" height="44" fill="#000" opacity="0.45" clip-path="url(#ec${i})"/>`);
  out.push(txt(x + cw / 2, y + ch - 14, e.toUpperCase(), 20, { a: 'middle', ls: 2 }));
});

// ---- poses row
const py = gy + 2 * (ch + gap) + 40;
out.push(txt(gx, py - 12, 'POSES / BODY LANGUAGE', 20, { fill: '#9aa3b8', ls: 3 }));
const poses = [['idle', 'neutral'], ['wave', 'happy'], ['point', 'excited'], ['think', 'confused'], ['shrug', 'confused'], ['scared', 'fear'], ['cheer', 'excited'], ['sad', 'sad']];
const pw = (4 * cw + 3 * gap) / poses.length;
out.push(`<rect x="${gx}" y="${py}" width="${4 * cw + 3 * gap}" height="300" rx="16" fill="#1a1c27"/>`);
out.push(`<rect x="${gx}" y="${py + 250}" width="${4 * cw + 3 * gap}" height="2" fill="#2c3044"/>`);
poses.forEach(([p, e], i) => {
  const x = gx + pw * i + pw / 2;
  out.push(K.renderKip({ id: 'p' + i, x, y: py + 252, scale: 0.33, pose: p, expression: { ...K.EXPRESSIONS[e], question: 0, sparkle: 0 }, t: 0.3 }));
  out.push(txt(x, py + 285, p.toUpperCase(), 14, { a: 'middle', fill: '#c9cfdd', w: 700, ls: 2 }));
});

// ---- palette + specs under poses
const sy2 = py + 330;
const C = K.DESIGN.color;
const sw = [['HEAD', C.head], ['RIM', C.rim], ['EYES', C.eye], ['HOODIE', C.hoodie], ['HOODIE SH.', C.hoodieDark], ['PANTS', C.pants], ['SHOES', C.shoe]];
sw.forEach(([n, col], i) => {
  const x = gx + i * 92;
  out.push(`<rect x="${x}" y="${sy2}" width="76" height="40" rx="8" fill="${col}" stroke="#3a3f55" stroke-width="2"/>`);
  out.push(txt(x + 38, sy2 + 60, n, 11, { a: 'middle', fill: '#9aa3b8', w: 700 }));
  out.push(txt(x + 38, sy2 + 76, col.toUpperCase(), 11, { a: 'middle', fill: '#6b7389', w: 700 }));
});
const specs = ['Head = 40% of height · eyes 2/3 up the head', 'Signature curl on top · orange hoodie w/ drawstrings', 'White brows + white mouth line on black head', 'Cool cyan rim light on the head, always'];
specs.forEach((s, i) => out.push(txt(gx + 670, sy2 + 14 + i * 22, '• ' + s, 15, { fill: '#c9cfdd', w: 700 })));

out.push('</svg>');
fs.mkdirSync(path.join(__dirname, '../preview'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../preview/kip_model_sheet.svg'), out.join('\n'));
console.log('ok');
