# EP02 · What If You Could Read Everyone's Mind?

8:30.000 · 1920×1080 16:9 · 30 fps · H.264 + AAC · English dialogue with a different AI voice per character · burned-in + .srt subtitles

**Kip** (locked v1.0.0, `character/kip.js`) is the main character. The Thinking Star floats *above* his head as a
separate prop, so his design is never altered. Max returns from EP01; Mom, Grandpa Shelby and Coco are new
supporting characters for this episode (defined in `scenes.js`).

## Story
Max's "best throw ever" knocks a glowing star out of the sky. When Kip touches it he hears everyone's thoughts:
Max is starving ("with the box"), Grandpa Shelby has lost the glasses that are on his head, and Coco is hiding
something behind a hedge. Then the thoughts turn worrying: *"After tonight, nothing will ever be the same"*,
*"Tonight he leaves his little room forever"*, *"I wish he would go away for a while."* Kip runs off, the star cracks,
and Grandpa Shelby explains that a thought is only one small piece of the sky. Twist: it's a surprise birthday,
the "little room" line was about his new treehouse, and Max needed time to practise fireworks. Final twist: the star
lands on Coco, the town gossip.

## Deliverables (`final/`)
| File | What |
|---|---|
| `What_If_You_Could_Read_Everyones_Mind.mp4` | finished episode |
| `subtitles.srt` | English captions |
| `thumbnail.png` / `thumbnail_1920.png` | thumbnail |
| `../YOUTUBE_PACKAGE.md` | SEO title, alternates, description with chapters, tags |
| `../SCRIPT.md` | full timecoded script with every character's dialogue |

## Voices (Kokoro)
Kip `am_puck` · Max `am_liam` (same as EP01) · Mom `af_heart` · Grandpa Shelby `bm_george` · Coco `bf_lily` ·
narrator `am_michael` (two lines only) · townsfolk heard as thoughts: `am_fenrir`, `af_jessica`, `bm_lewis`, `af_river`, `am_echo`.

## Pipeline (same structure as EP01)
```bash
python3 script_src.py   # writes script.json (beats: scene, speaker, line, thought flag, expressions, actions, sfx, music mood)
KOKORO_DIR=/path/to/kokoro python3 tts.py     # voice.wav + thoughts.wav + timing.json (exactly 510 s) + subtitles.srt
KOKORO_DIR=/path/to/kokoro python3 audio.py   # score + SFX + echo "inner voice" + ducking -> build/mix_raw.wav
ffmpeg -i build/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 build/mix.wav
node render.js video 4 30                     # 4 Chromium workers -> build/video.mp4
node thumbnail.js
python3 make_script_md.py
```
- `engine.js`: EP01 engine plus multi-speaker lip-sync (incl. chorus lines), thought detection, supporting-cast expressions and per-character subtitle labels.
- `scenes.js`: 13 sets (street, title, backyard day/afternoon/night, park, porch, home, kitchen, sunset hill, outro), dialogue camera (wide / two-shot / medium / close-up), Thinking Star, thought bubbles, mind ripples, confetti, fireworks.
