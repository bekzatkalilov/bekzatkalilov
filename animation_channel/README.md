# Animation channel

- `character/` — **Kip**, the locked main character (`kip.js`, bible, reference JSON/SVG)
- `scenes/` — reusable background sets
- `tools/` — model sheet + render scripts (Node + Playwright + ffmpeg)
- `preview/` — model sheet and animation test for approval

```
node tools/model_sheet.js && node tools/snap.js preview/kip_model_sheet.svg preview/kip_model_sheet.png 1920 1080
node tools/render_preview.js
```
