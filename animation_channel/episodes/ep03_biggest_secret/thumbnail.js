// Builds the 16:9 YouTube thumbnail -> build/thumbnail.png (1280x720) + thumbnail_1920.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '../..');
globalThis.Kip = require(path.join(ROOT, 'character/kip.js'));
const X = require(path.join(ROOT, 'character/extras.js'));
const K = globalThis.Kip;

const face = K.renderKip({ id: 'th', x: 1060, y: 1640, scale: 2.0, t: 0.3, shadow: false, blink: 0, lookX: 0, lookY: -0.85,
  pose: { armL: { sh: 35, el: -130 }, armR: { sh: 35, el: -130 } },
  expression: { ...K.EXPRESSIONS.fear, pupil: 0.5, eyeOpen: 1.2, sweat: 1, open: 0.45, wave: 0.8, mouthW: 1.3 } });
const lily = { name: 'Lily', skin: '#f6d8c0', skinLo: '#d8b49a', ink: '#24180f', eyeLine: true, hat: 'side', hatColor: '#1e1410', glasses: true,
  top: 'sweater', topColor: '#2f4fa3', topDark: '#22397a', pants: '#3a3d4a', shoe: '#c92a4a', height: 0.98 };
const point = { armR: { sh: 95, el: 0 }, armL: { sh: 12, el: -10 } };

const sign = `<g transform="translate(1060 360) rotate(-3)">
  <rect x="-470" y="-190" width="940" height="330" rx="40" fill="#ff4fd8" opacity="0.25"/>
  <rect x="-450" y="-170" width="900" height="290" rx="32" fill="#1a0a2a" stroke="#ff4fd8" stroke-width="10"/>
  <text x="0" y="-105" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="38" letter-spacing="8" fill="#ff4fd8">KIP'S BIGGEST SECRET</text>
  <text x="0" y="5" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="78" fill="#fff">I'M MOVING AW</text>
  <rect x="190" y="-50" width="250" height="80" fill="#1a0a2a"/><rect x="200" y="-40" width="40" height="60" fill="#ff4fd8" opacity="0.8"/><rect x="250" y="-30" width="160" height="12" fill="#08d9d6"/><rect x="230" y="0" width="190" height="10" fill="#ff2e63"/>
  <text x="0" y="90" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="40" fill="#ffd34d">LOADING... 99%</text>
  <path d="M-30 120 L0 160 L30 120Z" fill="#ff4fd8"/></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <radialGradient id="bg" cx="0.55" cy="0.45" r="0.8"><stop offset="0" stop-color="#4a1660"/><stop offset="1" stop-color="#0a0518"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  ${[...Array(14)].map((_, i) => `<path d="M1060 360 L${(i * 160) - 100} ${i % 2 ? -50 : 1130}" stroke="#ff4fd8" stroke-width="3" opacity="0.15"/>`).join('')}
  ${X.renderPerson('max', { id: 'tm', x: 230, y: 1200, scale: 1.05, expression: 'surprise', pose: point, lookX: 0.6, t: 0.3, shadow: false })}
  ${X.renderPerson(lily, { id: 'tl', x: 1720, y: 1210, scale: 1.0, flip: true, expression: 'surprise', pose: point, lookX: -0.6, t: 0.3, shadow: false })}
  ${face}${sign}
  <text x="40" y="1030" font-family="'Arial Black', Arial" font-weight="900" font-size="150" fill="#ffd34d" stroke="#000" stroke-width="18" paint-order="stroke" stroke-linejoin="round">DON'T LOAD!</text>
  <g transform="translate(1540 130) rotate(6)"><rect x="-10" y="-90" width="380" height="120" rx="20" fill="#ff2a4a"/>
    <text x="180" y="2" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="80" fill="#fff">EP. 3</text></g>
  <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
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
