// Builds the 16:9 YouTube thumbnail -> build/thumbnail.png (1280x720) + thumbnail_1920.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '../..');
globalThis.Kip = require(path.join(ROOT, 'character/kip.js'));
const X = require(path.join(ROOT, 'character/extras.js'));
const K = globalThis.Kip;

const face = K.renderKip({ id: 'th', x: 1180, y: 1560, scale: 2.0, t: 0.3, shadow: false, blink: 0, lookX: -0.55, lookY: -0.15,
  pose: 'surprise', expression: { ...K.EXPRESSIONS.surprise, pupil: 0.5, eyeOpen: 1.2, open: 0.9 } });
const hx = 1180, hy = 1560 - 470 * 2.0;

function star(x, y, r) {
  let pts = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts += `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)} `; }
  const rays = [...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<path d="M${Math.cos(a) * r * 1.15} ${Math.sin(a) * r * 1.15} L${Math.cos(a) * r * 1.9} ${Math.sin(a) * r * 1.9}" stroke="#7ff3ff" stroke-width="10" stroke-linecap="round" opacity="0.8"/>`; }).join('');
  return `<g transform="translate(${x} ${y})"><radialGradient id="sg"><stop offset="0" stop-color="#7ff3ff" stop-opacity="0.9"/><stop offset="1" stop-color="#7ff3ff" stop-opacity="0"/></radialGradient>
    <circle r="${r * 3.4}" fill="url(#sg)"/>${rays}<polygon points="${pts}" fill="#7ff3ff" stroke="#fff" stroke-width="${r * 0.12}" stroke-linejoin="round"/><polygon points="${pts}" fill="#fff" opacity="0.6" transform="scale(0.55)"/></g>`;
}
function bubble(x, y, w, h, text, size, tx, ty) {
  let l = '';
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; l += `<circle cx="${x + Math.cos(a) * w * 0.42}" cy="${y + Math.sin(a) * h * 0.36}" r="${h * 0.32}" fill="#fff"/>`; }
  const tail = [0.4, 0.65, 0.85].map((q, i) => `<circle cx="${x + (tx - x) * q}" cy="${y + h * 0.4 + (ty - y - h * 0.4) * q}" r="${h * (0.12 - i * 0.03)}" fill="#fff"/>`).join('');
  return `<g><g stroke="#7ff3ff" stroke-width="14" opacity="0.5">${l}</g>${l}<ellipse cx="${x}" cy="${y}" rx="${w * 0.46}" ry="${h * 0.42}" fill="#fff"/>${tail}
    <text x="${x}" y="${y + size * 0.36}" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="${size}" fill="#1b2a4a">${text}</text></g>`;
}
const rings = [0, 1, 2].map(i => `<circle cx="${hx}" cy="${hy}" r="${300 + i * 90}" fill="none" stroke="#7ff3ff" stroke-width="${12 - i * 3}" opacity="${0.5 - i * 0.13}"/>`).join('');
const coco = { name: 'Coco', skin: '#c88b62', skinLo: '#a06a45', ink: '#20150e', eyeLine: true, hat: 'curly', hatColor: '#e04f8c', top: 'shirt', topColor: '#9b5de5', topDark: '#7240b8', pants: '#2f3240', shoe: '#ff6fa8', height: 0.97 };
const mom = { name: 'Mom', skin: '#f2d3b3', skinLo: '#cfae8c', ink: '#2b1e14', eyeLine: true, hat: 'bun', hatColor: '#5a3522', top: 'sweater', topColor: '#d9487a', topDark: '#a8335c', pants: '#3b4f7a', shoe: '#f0f0f0', height: 1.1 };

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <radialGradient id="bg" cx="0.62" cy="0.55" r="0.75"><stop offset="0" stop-color="#11506e"/><stop offset="1" stop-color="#050b1c"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  ${[...Array(60)].map((_, i) => `<circle cx="${(i * 337) % 1920}" cy="${(i * 211) % 700}" r="${1 + (i % 3)}" fill="#fff" opacity="0.5"/>`).join('')}
  ${rings}
  ${X.renderPerson('max', { id: 'tm', x: 260, y: 1180, scale: 1.05, expression: 'fear', lookX: 0.6, t: 0.3, shadow: false })}
  ${X.renderPerson(mom, { id: 'tmo', x: 1760, y: 1200, scale: 1.0, flip: true, expression: 'happy', lookX: -0.5, t: 0.3, shadow: false })}
  ${face}${star(hx + 20, 1560 - 655 * 2.0, 64)}
  ${bubble(380, 330, 520, 190, 'BANANAS!!', 66, 300, 620)}
  ${bubble(1690, 300, 460, 170, 'SECRET...', 60, 1740, 600)}
  <text x="60" y="1010" font-family="'Arial Black', Arial" font-weight="900" font-size="132" fill="#ffd34d" stroke="#000" stroke-width="18" paint-order="stroke" stroke-linejoin="round">I HEAR YOUR</text>
  <text x="60" y="860" font-family="'Arial Black', Arial" font-weight="900" font-size="0" fill="#fff"> </text>
  <g transform="translate(1160 1000) rotate(-4)"><rect x="-10" y="-120" width="700" height="150" rx="22" fill="#ff2a4a"/>
    <text x="340" y="5" text-anchor="middle" font-family="'Arial Black', Arial" font-weight="900" font-size="118" fill="#fff">THOUGHTS</text></g>
  <radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
  <rect width="1920" height="1080" fill="url(#vg)"/>
</svg>`;

(async () => {
  const out = path.join(__dirname, 'build');
  fs.mkdirSync(out, { recursive: true });
  const tmp = path.join(os.tmpdir(), 'thumb_ep02.svg'); fs.writeFileSync(tmp, svg);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto('file://' + tmp);
  await pg.screenshot({ path: path.join(out, 'thumbnail_1920.png') });
  await b.close();
  require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'thumbnail_1920.png'), '-vf', 'scale=1280:720:flags=lanczos', path.join(out, 'thumbnail.png')]);
  console.log('thumbnail ok');
})();
