# KIP — Character Bible (v1.0.0, LOCKED)

Kip is the channel's one permanent main character. He must look **identical in every episode**.

## Locked design
| Part | Spec |
|---|---|
| Head | Perfect black circle, radius 120 (≈40 % of total height 590). Soft top-left sheen + **cyan rim light** on the right edge. |
| Signature | A single **curled tuft** on top of the head — the key silhouette feature. |
| Eyes | Large white ovals (33×42), black pupils r 15 with a white catch-light. |
| Brows | Thick **white** rounded strokes — do most of the acting. |
| Mouth | Small **white** line; opens into a dark-red mouth with pink tongue. |
| Clothing | **Orange hoodie** (`#f07a2a`) with bunched hood behind the neck, white drawstrings, kangaroo pocket, darker cuffs/hem. |
| Limbs | Thin orange sleeves, round black hands, thin charcoal legs (`#2a2c38`), white sneakers. |

All exact numbers and colours live in `kip.js → DESIGN` (also exported to `kip.reference.json`).

## Rules
1. Every frame of Kip is drawn by `renderKip()` from `character/kip.js`. Never redraw him by hand.
2. Only pass **parameters** (expression, pose, lookX/Y, blink, talk, flip, scale). Never edit `DESIGN`.
3. Any design change = version bump + a new approved model sheet.
4. Supporting characters live in their own files and may change per story.

## Expressions (`EXPRESSIONS`)
neutral · happy · fear · surprise · sad · excited · confused · angry — all numeric, so they tween:
`expression: { from: 'happy', to: 'fear', t: 0.4 }`. Custom: `expression: { ...EXPRESSIONS.sad, tear: 0 }`.

## Poses (`POSES`)
idle · wave · point · think · shrug · scared · cheer · sad · surprise — tween the same way.

## Animation helpers
- `blinkAt(t)` natural blink curve
- `talk` 0..1 for lip-flap (drive from narration audio amplitude)
- `t` drives breathing, sweat/tear drips, sparkles, question-mark wobble

## Episode workflow
1. `const Kip = require('../character/kip.js')` — always load the locked asset first.
2. Build scenes with `scenes/backgrounds.js` (+ new sets as needed).
3. Render with Playwright → ffmpeg (see `tools/render_preview.js`).
