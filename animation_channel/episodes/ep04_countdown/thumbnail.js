// Builds the 16:9 YouTube thumbnail -> build/thumbnail.png (1280x720) + thumbnail_1920.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '../..');
globalThis.Kip = require(path.join(ROOT, 'character/kip.js'));
const X = require(path.join(ROOT, 'character/extras.js'));
const K = globalThis.Kip;

const face = K.renderKip({ id: 'th', x: 1000, y: 1935, scale: 2.65, t: 0.3, shadow: false, blink: 0, lookX: 0, lookY: -0.85,
  pose: { armL: { sh: 35, el: -130 }, armR: { sh: 35, el: -130 } },
  expression: { ...K.EXPRESSIONS.fear, pupil: 0.5, eyeOpen: 1.2, sweat: 1, open: 0.45, wave: 0.8, mouthW: 1.3 } });
const lily = { name: 'Lily', skin: '#f6d8c0', skinLo: '#d8b49a', ink: '#24180f', eyeLine: true, hat: 'side', hatColor: '#1e1410', glasses: true,
  top: 'sweater', topColor: '#2f4fa3', topDark: '#22397a', pants: '#3a3d4a', shoe: '#c92a4a', height: 0.98 };
const point = { armR: { sh: 95, el: 0 }, armL: { sh: 12, el: -10 } };
const T = (x, y, str, size, fill, sw = 0, ls = 0, font = "'Arial Black', Arial") => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-weight="900" font-size="${size}" fill="${fill}"${ls ? ` letter-spacing="${ls}"` : ''}${sw ? ` stroke="#000" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round"` : ''}>${str}</text>`;
const timer = `<g transform="translate(1000 300) rotate(-2)">
  <rect x="-560" y="-210" width="1120" height="390" rx="50" fill="#ff3b4a" opacity="0.32"/>
  <rect x="-530" y="-180" width="1060" height="330" rx="40" fill="#08101c" stroke="#ff3b4a" stroke-width="16"/>
  ${T(0, -110, 'LIFE CHANGES IN', 50, '#ff3b4a', 0, 10)}
  <text x="0" y="90" text-anchor="middle" font-family="'DejaVu Sans Mono', monospace" font-weight="700" font-size="190" fill="#ff3b4a" opacity="0.15">88:88:88</text>
  <text x="0" y="90" text-anchor="middle" font-family="'DejaVu Sans Mono', monospace" font-weight="700" font-size="190" fill="#fff" stroke="#ff3b4a" stroke-width="5">00:00:03</text>
  <path d="M-45 150 L0 205 L45 150Z" fill="#ff3b4a"/></g>`;
const small = (x, y, txt, col, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-150" y="-55" width="300" height="90" rx="18" fill="#08101c" stroke="${col}" stroke-width="6"/>
  <text x="0" y="12" text-anchor="middle" font-family="'DejaVu Sans Mono', monospace" font-weight="700" font-size="${txt.length > 8 ? 46 : 54}" fill="#fff">${txt}</text></g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <radialGradient id="bg" cx="0.55" cy="0.4" r="0.85"><stop offset="0" stop-color="#7a2a10"/><stop offset="1" stop-color="#12060a"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  ${[...Array(16)].map((_, i) => `<path d="M1000 300 L${(i * 140) - 100} ${i % 2 ? -50 : 1130}" stroke="#ffb020" stroke-width="4" opacity="0.14"/>`).join('')}
  ${X.renderPerson('max', { id: 'tm', x: 190, y: 1240, scale: 1.05, expression: 'surprise', pose: point, lookX: 0.6, t: 0.3, shadow: false })}
  ${small(200, 470, '00:00:03', '#ff3b4a', -6)}
  ${X.renderPerson(lily, { id: 'tl', x: 1760, y: 1250, scale: 1.0, flip: true, expression: 'surprise', pose: point, lookX: -0.6, t: 0.3, shadow: false })}
  ${small(1740, 500, '00:00:00', '#3dff8a', 6)}
  ${face}${timer}
  <text x="960" y="1045" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="168" fill="#ffd34d" stroke="#000" stroke-width="26" paint-order="stroke" stroke-linejoin="round" transform="rotate(-2 960 980)">WHAT HAPPENS AT 0?!</text>
  <g transform="translate(60 140) rotate(-6)"><rect x="-10" y="-80" width="250" height="104" rx="20" fill="#ff2a4a" stroke="#000" stroke-width="6"/>
    <text x="115" y="0" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="70" fill="#fff">EP. 4</text></g>
  <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#vg)"/>
</svg>`;
(async () => {
  const out = path.join(__dirname, 'build');
  fs.mkdirSync(out, { recursive: true });
  const tmp = path.join(os.tmpdir(), 'thumb_ep04.svg'); fs.writeFileSync(tmp, svg);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + tmp);
  await pg.screenshot({ path: path.join(out, 'thumbnail_1920.png') });
  await b.close();
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'thumbnail_1920.png'), '-vf', 'scale=1280:720:flags=lanczos', path.join(out, 'thumbnail.png')]);
  console.log('thumbnail ok');
})();
