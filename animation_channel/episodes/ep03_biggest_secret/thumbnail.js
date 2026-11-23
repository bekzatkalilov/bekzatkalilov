// Builds the 16:9 YouTube thumbnail -> build/thumbnail.png (1280x720) + thumbnail_1920.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '../..');
globalThis.Kip = require(path.join(ROOT, 'character/kip.js'));
const X = require(path.join(ROOT, 'character/extras.js'));
const K = globalThis.Kip;

const KS = 2.65, KX = 1000, KY = 1935;   // Kip larger: face fills the centre of the frame
const face = K.renderKip({ id: 'th', x: KX, y: KY, scale: KS, t: 0.3, shadow: false, blink: 0, lookX: 0, lookY: -0.85,
  pose: { armL: { sh: 35, el: -130 }, armR: { sh: 35, el: -130 } },
  expression: { ...K.EXPRESSIONS.fear, pupil: 0.5, eyeOpen: 1.2, sweat: 1, open: 0.45, wave: 0.8, mouthW: 1.3 } });
const lily = { name: 'Lily', skin: '#f6d8c0', skinLo: '#d8b49a', ink: '#24180f', eyeLine: true, hat: 'side', hatColor: '#1e1410', glasses: true,
  top: 'sweater', topColor: '#2f4fa3', topDark: '#22397a', pants: '#3a3d4a', shoe: '#c92a4a', height: 0.98 };
const point = { armR: { sh: 95, el: 0 }, armL: { sh: 12, el: -10 } };

const T = (x, y, str, size, fill, sw = 0, ls = 0) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="${size}" fill="${fill}"${ls ? ` letter-spacing="${ls}"` : ''}${sw ? ` stroke="#000" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round"` : ''}>${str}</text>`;
const sign = `<g transform="translate(1000 262) rotate(-2) scale(0.9)">
  <rect x="-560" y="-235" width="1120" height="430" rx="46" fill="#ff4fd8" opacity="0.3"/>
  <rect x="-540" y="-215" width="1080" height="390" rx="38" fill="#14061f" stroke="#ff4fd8" stroke-width="14"/>
  <rect x="-250" y="-200" width="500" height="58" rx="29" fill="#ff4fd8"/>
  ${T(0, -157, "KIP'S SECRET", 42, '#fff', 0, 6)}
  ${T(0, -40, "WE'RE MOVING", 112, '#fff', 10)}
  ${T(0, 85, 'AWAY...', 112, '#ffd34d', 10)}
  <rect x="300" y="20" width="160" height="16" fill="#08d9d6" opacity="0.9"/><rect x="330" y="48" width="120" height="10" fill="#ff2e63" opacity="0.9"/>
  <path d="M-40 175 L0 225 L40 175Z" fill="#ff4fd8"/></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <radialGradient id="bg" cx="0.55" cy="0.45" r="0.8"><stop offset="0" stop-color="#4a1660"/><stop offset="1" stop-color="#0a0518"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  ${[...Array(14)].map((_, i) => `<path d="M1000 262 L${(i * 160) - 100} ${i % 2 ? -50 : 1130}" stroke="#ff4fd8" stroke-width="3" opacity="0.15"/>`).join('')}
  ${X.renderPerson('max', { id: 'tm', x: 190, y: 1240, scale: 1.05, expression: 'surprise', pose: point, lookX: 0.6, t: 0.3, shadow: false })}
  ${X.renderPerson(lily, { id: 'tl', x: 1760, y: 1250, scale: 1.0, flip: true, expression: 'surprise', pose: point, lookX: -0.6, t: 0.3, shadow: false })}
  ${face}${sign}
  <text x="960" y="1045" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="190" fill="#ffd34d" stroke="#000" stroke-width="26" paint-order="stroke" stroke-linejoin="round" transform="rotate(-2 960 980)">DON'T LOAD!</text>
  <g transform="translate(1640 600) rotate(8)"><rect x="-10" y="-80" width="250" height="104" rx="20" fill="#ff2a4a" stroke="#000" stroke-width="6"/>
    <text x="115" y="0" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="70" fill="#fff">EP. 3</text></g>
  <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#vg)"/>
</svg>`;

(async () => {
  const out = path.join(__dirname, 'build');
  fs.mkdirSync(out, { recursive: true });
  const tmp = path.join(os.tmpdir(), 'thumb_ep03.svg'); fs.writeFileSync(tmp, svg);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + tmp);
  await pg.screenshot({ path: path.join(out, 'thumbnail_1920.png') });
  await b.close();
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'thumbnail_1920.png'), '-vf', 'scale=1280:720:flags=lanczos', path.join(out, 'thumbnail.png')]);
  console.log('thumbnail ok');
})();
