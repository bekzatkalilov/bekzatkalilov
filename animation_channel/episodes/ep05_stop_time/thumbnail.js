// Builds the 16:9 YouTube thumbnail -> build/thumbnail.png (1280x720) + build/thumbnail_1920.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '../..');
globalThis.Kip = require(path.join(ROOT, 'character/kip.js'));
const X = require(path.join(ROOT, 'character/extras.js'));
const K = globalThis.Kip;
const FONT = "'Inter Display', 'Inter', sans-serif";

const kip = K.renderKip({ id: 'th', x: 760, y: 1700, scale: 2.35, t: 0.3, shadow: false, blink: 0, lookX: 0.75, lookY: 0,
  pose: { armL: { sh: 24, el: -112 }, armR: { sh: 24, el: -112 } },
  expression: { ...K.EXPRESSIONS.fear, pupil: 0.5, eyeOpen: 1.2, sweat: 1, open: 0.55, round: 0.6, wave: 0.3, mouthW: 1.2 } });
// the hooded stranger (Wren's coat + hood prop), upright, glowing clock-eyes
const wren = { name: 'Wren', skin: '#f3d6c2', skinLo: '#d4b39c', ink: '#1d1a24', eyeLine: true, hat: 'side', hatColor: '#e6ebf6',
  top: 'coat', topColor: '#262b38', topDark: '#171b25', shirt: '#2fc6e0', pants: '#151821', shoe: '#1a1d26', height: 0.98 };
const hx = 1520, hy = 1180, hs = 1.25, sc = hs * 0.98;
const body = X.renderPerson(wren, { id: 'hb', x: hx, y: hy, scale: hs, flip: true, pose: { armR: { sh: 88, el: -8 } }, t: 0.3, shadow: false });
const eye = ex => `<g transform="translate(${ex} -468)"><ellipse rx="70" ry="50" fill="#ffb347" opacity="0.35"/><ellipse rx="40" ry="30" fill="#ffd27a" opacity="0.5"/><circle r="22" fill="#ffd27a"/><circle r="22" fill="none" stroke="#fff3d6" stroke-width="4"/><path d="M0 0 L0 -11 M0 0 L8 4" stroke="#5a2a00" stroke-width="3" stroke-linecap="round"/></g>`;
const hood = `<g transform="translate(${hx} ${hy}) scale(${-sc} ${sc})">
  <path d="M-150 -300 Q-178 -470 -128 -585 Q-60 -675 0 -672 Q60 -675 128 -585 Q178 -470 150 -300 Q80 -268 0 -270 Q-80 -268 -150 -300Z" fill="#20242f"/>
  <ellipse cx="0" cy="-458" rx="98" ry="104" fill="#06070b"/>${eye(-36)}${eye(36)}
  <path d="M-150 -300 Q-120 -230 -70 -200 L70 -200 Q120 -230 150 -300 Q80 -268 0 -270 Q-80 -268 -150 -300Z" fill="#191c25"/></g>`;
// frozen world: icy city, hanging raindrops, a frozen splash of milk, golden time-cracks
const r = (() => { let s = 7; return () => (s = s * 16807 % 2147483647) / 2147483647; })();
let towers = '', drops = '';
for (let i = 0; i < 16; i++) { const x = -60 + i * 130 + r() * 40, h = 260 + r() * 420, w = 90 + r() * 60; towers += `<rect x="${x}" y="${900 - h}" width="${w}" height="${h + 200}" rx="10" fill="${i % 2 ? '#2b5f8f' : '#22507c'}"/>`; for (let k = 0; k < 6; k++) towers += `<rect x="${x + 12}" y="${900 - h + 30 + k * 60}" width="${w - 24}" height="12" fill="#9fe0ff" opacity="0.35"/>`; }
for (let i = 0; i < 140; i++) { const x = r() * 1920, y = r() * 1080; drops += `<ellipse cx="${x}" cy="${y}" rx="4" ry="8" fill="#eaffff" opacity="${0.4 + r() * 0.5}"/>`; }
const crack = (x, y, seed) => { let s = seed, px = x, py = y, a = 0, d = `M${x} ${y}`; const rr = () => (s = s * 16807 % 2147483647) / 2147483647; for (let i = 0; i < 9; i++) { a += (rr() - 0.5) * 1.6; px += Math.cos(a) * 60; py += Math.sin(a) * 60; d += ` L${px} ${py}`; }
  return `<path d="${d}" stroke="#ffd27a" stroke-width="22" opacity="0.3" fill="none"/><path d="${d}" stroke="#fff6dc" stroke-width="7" fill="none" stroke-linejoin="round"/>`; };
const T = (x, y, s, size, fill, sw, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${size}" fill="${fill}" stroke="#04070d" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round" ${extra}>${s}</text>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1d3a"/><stop offset="1" stop-color="#3b8cc4"/></linearGradient>
  <rect width="1920" height="1080" fill="url(#bg)"/>${towers}
  <rect y="900" width="1920" height="180" fill="#9fd4f0"/>
  ${crack(1180, 120, 11)}${crack(260, 80, 23)}${crack(1700, 600, 37)}
  ${drops}
  <radialGradient id="glow" cx="0.79" cy="0.45" r="0.35"><stop offset="0" stop-color="#ffb347" stop-opacity="0.45"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#glow)"/>
  ${body}${hood}
  <g transform="translate(1110 520)"><ellipse rx="70" ry="44" fill="#fbfbff"/>${[...Array(10)].map((_, i) => `<circle cx="${(r() - 0.5) * 220}" cy="${(r() - 0.5) * 140}" r="${6 + r() * 12}" fill="#fbfbff"/>`).join('')}</g>
  ${kip}
  ${T(960, 1035, 'WHO ELSE CAN MOVE?!', 150, '#ffd34d', 26, 'transform="rotate(-2 960 990)"')}
  <g transform="translate(70 150) rotate(-5)"><rect x="-10" y="-90" width="440" height="120" rx="22" fill="#e9fbff" stroke="#04070d" stroke-width="7"/>
    <text x="210" y="-8" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="64" fill="#0b1d3a">⏸ TIME STOP</text></g>
  <g transform="translate(1610 130) rotate(5)"><rect x="-10" y="-80" width="250" height="104" rx="20" fill="#ff8f3a" stroke="#04070d" stroke-width="6"/>
    <text x="115" y="0" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="68" fill="#fff">EP. 5</text></g>
  <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#vg)"/>
</svg>`;
(async () => {
  const out = path.join(__dirname, 'build');
  fs.mkdirSync(out, { recursive: true });
  const tmp = path.join(os.tmpdir(), 'thumb_ep05.svg'); fs.writeFileSync(tmp, svg);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + tmp);
  await pg.screenshot({ path: path.join(out, 'thumbnail_1920.png') });
  await b.close();
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'thumbnail_1920.png'), '-vf', 'scale=1280:720:flags=lanczos', path.join(out, 'thumbnail.png')]);
  console.log('thumbnail ok');
})();
