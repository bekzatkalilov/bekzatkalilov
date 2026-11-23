// Renders a ~11 s animation test of KIP -> preview/kip_animation_test.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const W = 1280, H = 720, FPS = 30, DUR = 11;
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'preview/kip_animation_test.mp4');

const page = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000;overflow:hidden}</style>
<script src="file://${root}/character/kip.js"></script>
<script src="file://${root}/scenes/backgrounds.js"></script></head><body><div id="s"></div>
<script>
const SHOTS = [ // [start, expression, pose, subtitle, highlight]
  [0.0, 'neutral', 'idle', 'Meet Kip.', 'Kip.'],
  [2.0, 'happy', 'wave', 'Hi! Nice to meet you.', 'Hi!'],
  [3.8, 'surprise', 'surprise', 'Wait... what was that?', 'what'],
  [5.4, 'fear', 'scared', 'Oh no. Too fast.', 'fast.'],
  [7.0, 'confused', 'shrug', 'Hmm... how?', 'how?'],
  [8.6, 'excited', 'cheer', "Let's lock in!", 'lock in!'],
];
const TR = 0.35;
function shotAt(t){ let i=0; for(let k=0;k<SHOTS.length;k++) if(t>=SHOTS[k][0]) i=k; return i; }
function frame(t){
  const W=${W}, H=${H};
  const i=shotAt(t), sh=SHOTS[i], prev=SHOTS[Math.max(0,i-1)];
  const k=Math.min(1,(t-sh[0])/TR);
  const expression = i? {from:prev[1], to:sh[1], t:k} : sh[1];
  const pose = i? {from:prev[2], to:sh[2], t:k} : sh[2];
  const since=t-sh[0];
  const talk = since<1.1 ? Math.max(0,Math.sin(since*19))*0.55 : 0;
  const lookX = i===0 ? Math.sin(t*1.6)*0.6 : (sh[1]==='confused'? 0.5 : 0.1*Math.sin(t*2));
  const lookY = sh[1]==='confused' ? -0.4 : 0;
  // camera: slow push-in + punch on surprise
  let zoom = 1 + t*0.012, cx = 0, cy = 0;
  if (sh[1]==='surprise' && since<0.5){ zoom += 0.08*Math.sin(since/0.5*Math.PI); cx += Math.sin(since*90)*4; cy += Math.cos(since*80)*3; }
  if (sh[1]==='excited') zoom += 0.05*Math.min(1,since/0.6);
  const s = H/1080;
  const room = Backgrounds.darkRoom({w:1920,h:1080,t,floorY:900,id:'rm'});
  const hop = sh[1]==='excited' ? -Math.abs(Math.sin(since*7))*40 : 0;
  const kip = Kip.renderKip({id:'k', x:760, y:905+hop, scale:1.05, expression, pose, lookX, lookY,
               blink: Kip.blinkAt(t), talk, t});
  // subtitle with highlighted word
  const sub = sh[3].replace(sh[4], '<tspan fill="#ffd34d">'+sh[4]+'</tspan>');
  const pop = 0.85 + 0.15*Math.min(1, since/0.15);
  document.getElementById('s').innerHTML =
   '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 1920 1080">'+
   '<g transform="translate('+(960+cx)+' '+(560+cy)+') scale('+zoom+') translate(-960 -560)">'+room+kip+'</g>'+
   Backgrounds.vignette({w:1920,h:1080,id:'v'})+
   '<g transform="translate(960 990) scale('+pop+')"><text text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="58" fill="#fff" stroke="#000" stroke-width="10" paint-order="stroke" stroke-linejoin="round">'+sub+'</text></g>'+
   '</svg>';
}
</script></body></html>`;

(async () => {
  const fs = require('fs');
  const tmp = path.join(require('os').tmpdir(), 'kip_preview.html');
  fs.writeFileSync(tmp, page);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: W, height: H } });
  await pg.goto('file://' + tmp);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const N = FPS * DUR;
  for (let f = 0; f < N; f++) {
    await pg.evaluate(t => frame(t), f / FPS);
    const buf = await pg.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${N}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
  console.log('wrote', out);
})();
