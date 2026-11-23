// Usage:
//   node render.js stills <outdir> t1 t2 ...         -> PNG stills for review
//   node render.js video [workers] [fps]             -> build/video.mp4 (silent)
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const HERE = __dirname, ROOT = path.resolve(HERE, '../..');
const B = path.join(HERE, 'build');
const timing = JSON.parse(fs.readFileSync(path.join(B, 'timing.json'), 'utf8'));

function pageHTML() {
  const inc = p => `<script>${fs.readFileSync(p, 'utf8')}</script>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000;overflow:hidden}</style>
  ${inc(path.join(ROOT, 'character/kip.js'))}${inc(path.join(ROOT, 'character/extras.js'))}${inc(path.join(ROOT, 'scenes/backgrounds.js'))}
  ${inc(path.join(HERE, 'engine.js'))}${inc(path.join(HERE, 'scenes.js'))}
  <script>Engine.load(${JSON.stringify(timing)});
  window.draw = t => { document.getElementById('s').innerHTML = Engine.frame(t); };</script></head>
  <body><div id="s"></div></body></html>`;
}

async function openPage(browser) {
  const tmp = path.join(os.tmpdir(), `ep01_page_${process.pid}.html`);
  fs.writeFileSync(tmp, pageHTML());
  const pg = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); });
  await pg.goto('file://' + tmp);
  await pg.waitForFunction(() => typeof window.draw === 'function');
  return pg;
}

async function stills(outdir, ts) {
  fs.mkdirSync(outdir, { recursive: true });
  const b = await chromium.launch(); const pg = await openPage(b);
  for (const t of ts) {
    const t0 = Date.now();
    await pg.evaluate(t => draw(t), +t);
    await pg.screenshot({ path: path.join(outdir, `s_${(+t).toFixed(2)}.png`) });
    console.log(t, Date.now() - t0, 'ms');
  }
  await b.close();
}

async function worker(idx, f0, f1, fps, out) {
  const b = await chromium.launch(); const pg = await openPage(b);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await pg.evaluate(t => draw(t), f / fps);
    const buf = await pg.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 300 === 0) {
      const el = (Date.now() - t0) / 1000, done = f - f0;
      console.log(`[w${idx}] ${done}/${f1 - f0} frames  ${(done / Math.max(el, 1)).toFixed(2)} fps`);
    }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
}

(async () => {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'stills') return stills(args[0], args.slice(1));
  if (mode === 'segment') { // internal: one worker process
    const [idx, f0, f1, fps, out] = args; return worker(+idx, +f0, +f1, +fps, out);
  }
  if (mode === 'video') {
    const W = +(args[0] || 4), fps = +(args[1] || 30);
    const N = Math.round(timing.duration * fps), per = Math.ceil(N / W);
    const segs = [];
    const procs = [];
    for (let i = 0; i < W; i++) {
      const f0 = i * per, f1 = Math.min(N, f0 + per), out = path.join(B, `seg_${i}.mp4`);
      segs.push(out);
      procs.push(new Promise((res, rej) => {
        const p = spawn(process.execPath, [__filename, 'segment', i, f0, f1, fps, out], { stdio: 'inherit' });
        p.on('close', code => code === 0 ? res() : rej(new Error('worker ' + i + ' failed')));
      }));
    }
    await Promise.all(procs);
    fs.writeFileSync(path.join(B, 'segs.txt'), segs.map(s => `file '${s}'`).join('\n'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(B, 'segs.txt'), '-c', 'copy', path.join(B, 'video.mp4')]);
    console.log('video done');
  }
})();
