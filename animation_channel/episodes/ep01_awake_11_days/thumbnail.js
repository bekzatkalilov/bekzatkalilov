// Builds the 16:9 YouTube thumbnail -> build/thumbnail.png (1280x720) + thumbnail_1920.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '../..');
globalThis.Kip = require(path.join(ROOT, 'character/kip.js'));
const X = require(path.join(ROOT, 'character/extras.js'));
const BG = require(path.join(ROOT, 'scenes/backgrounds.js'));
const K = globalThis.Kip;

const face = K.renderKip({ id: 'th', x: 1240, y: 1580, scale: 2.05, t: 0.3, shadow: false, blink: 0, lookX: -0.75, lookY: 0.05,
  pose: { armL: { sh: 35, el: -130 }, armR: { sh: 35, el: -130 } },
  expression: { ...K.EXPRESSIONS.fear, pupil: 0.5, eyeOpen: 1.18, sweat: 1, open: 0.35, wave: 0.7, mouthW: 1.3 } });
const ex = 1240, ey = 1580 - 478 * 2.05;
const veins = [-1, 1].map(sd => [0, 1, 2].map(i => `<path d="M${ex + sd * 43 * 2.05 + sd * 64} ${ey + (i - 1) * 26} q${-sd * 18} ${(i - 1) * 8} ${-sd * 36} ${(i - 1) * 18}" stroke="#ff2a4a" stroke-width="5" fill="none"/>`).join('')).join('');
const bags = [-1, 1].map(sd => `<path d="M${ex + sd * 43 * 2.05 - 60} ${ey + 122} q60 26 120 0" stroke="#6b2a8a" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.8"/>`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  ${BG.darkRoom({ t: 2, floorY: 980, id: 'tr', screen: 'HOUR 264' })}
  <rect width="1920" height="1080" fill="#14104a" opacity="0.55"/>
  <radialGradient id="g1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7a5cff" stop-opacity="0.55"/><stop offset="1" stop-color="#7a5cff" stop-opacity="0"/></radialGradient>
  <ellipse cx="300" cy="560" rx="330" ry="560" fill="url(#g1)"/>
  ${X.renderShadow({ x: 300, y: 1080, scale: 1.45, t: 0.5, id: 'ts' })}
  <radialGradient id="g2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff7a2a" stop-opacity="0.35"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient>
  <ellipse cx="1240" cy="600" rx="700" ry="520" fill="url(#g2)"/>
  ${face}${veins}${bags}
  <g transform="translate(560 110) rotate(-4)">
    <rect x="-20" y="-80" width="600" height="120" rx="18" fill="#ff2a4a"/>
    <text x="280" y="12" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="92" fill="#fff">11 DAYS</text>
  </g>
  <text x="60" y="1000" font-family="'Arial Black', Arial" font-weight="900" font-size="150" fill="#ffd34d" stroke="#000" stroke-width="18" paint-order="stroke" stroke-linejoin="round">NO SLEEP</text>
  <g transform="translate(1720 160)"><circle r="120" fill="#000" opacity="0.65"/><circle r="105" fill="none" stroke="#fff" stroke-width="10"/>
    <path d="M0 0 L0 -70 M0 0 L50 22" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <text x="0" y="175" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="54" fill="#fff" stroke="#000" stroke-width="10" paint-order="stroke">264h</text></g>
  <path d="M640 470 L470 330" stroke="#ffd34d" stroke-width="18" stroke-linecap="round"/><path d="M470 330 L490 410 M470 330 L550 345" stroke="#ffd34d" stroke-width="16" stroke-linecap="round"/>
  <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#vg)"/>
</svg>`;

(async () => {
  const out = path.join(__dirname, 'build');
  const tmp = path.join(os.tmpdir(), 'thumb.svg'); fs.writeFileSync(tmp, svg);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + tmp);
  await pg.screenshot({ path: path.join(out, 'thumbnail_1920.png') });
  await b.close();
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'thumbnail_1920.png'), '-vf', 'scale=1280:720:flags=lanczos', path.join(out, 'thumbnail.png')]);
  console.log('thumbnail ok');
})();
