// usage: node tools/snap.js in.svg|in.html out.png [w h]
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const [inp, out, w = 1280, h = 720, dpr = 1] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
  await pg.goto('file://' + path.resolve(inp)); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out }); await b.close();
})();
