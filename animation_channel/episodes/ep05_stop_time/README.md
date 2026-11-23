# EP05 · What If You Could Stop Time?

8:30.000 · 1920×1080 16:9 · 30 fps · H.264 + AAC · English dialogue, a unique AI voice per character · burned-in + .srt subtitles

**Kip** is the locked v1.0.0 design, drawn only through `character/kip.js`. Black round head, white eyes, orange hoodie,
unchanged. **Max** comes from `character/extras.js` and **Mom** from the EP02–EP04 spec. **Wren / the Hooded Stranger**,
**Professor Tock**, the hot-dog vendor and the little girl are new. The hood is a costume prop drawn over Wren's body.
Every character stands upright in every scene, nobody is ever rotated, and the camera never rolls.

## Story
Kip knocks over his milk, yells "STOP!", and time freezes. He uses the power for fun: street pranks, every free sample
in the mall at once, walking through frozen rain. But a hooded stranger can move while time is stopped, and starts following him.
A chase through a maglev station leads to Professor Tock's Chrono Lab.
**Twist 1:** last night's Chrono Pulse gave Kip the power, and every freeze cracks time.
**Twist 2:** the stranger is Wren, the professor's missing daughter. She has lived "between the seconds" for a year and was
trying to warn Kip. Then the cracks join up and the whole city freezes for good. Kip and Wren cross a crystal city to the Chrono Core
and give up their powers to restart time.
**Final twist:** the next morning Max sneezes and freezes time, Kip included. Kip wakes up with a mustache.

## What's new vs EP01–EP04
- **All-new environments:** sky-tower apartment above the clouds, Neo-Market Street with a maglev overhead, Starlight Mall
  glass-dome atrium, a neon avenue in the rain, a maglev station and train interior, the Chrono Laboratory, a city frozen in
  crystal, the top of Tock Tower and a sky-bus stop. No background from a previous episode is reused (`scenes/backgrounds.js` isn't loaded).
- **Frozen-time look:** while time is stopped (`z` in the script), the world layers go through an icy colour-matrix grade and
  a frost vignette. Kip, plus Wren and Max when they can move, stay in full colour. Rain, crowds, trains, birds, fountains and clocks run
  on a *world clock* that stops dead and resumes seamlessly. Freeze and unfreeze have shock-rings and flashes.
- **Cinematic camera:** letterbox bars, parallax background layers, crane-downs, whip pans, tracking shots and slow lateral
  drift on every dialogue shot. The handheld drift also stops when time freezes.
- **New subtitle style** (caption box + coloured speaker tag) and new typography (Inter Display).
- **Sound:** freeze, unfreeze and clock-stop SFX. The score is muffled while time is frozen, and the stranger's voice runs through a
  chorus/echo "time voice".

## Deliverables (`final/`)
| File | What |
|---|---|
| `What_If_You_Could_Stop_Time.mp4` | finished episode |
| `subtitles.srt` | English captions |
| `thumbnail.png` / `thumbnail_1920.png` | thumbnail |
| `../YOUTUBE_PACKAGE.md` | SEO title, alternates, description with chapters, tags |
| `../SCRIPT.md` | full timecoded script with every line of dialogue |

## Voices (Kokoro)
Kip `am_puck` · Max `am_liam` · Mom `af_heart` · Professor Tock `bm_george` · Wren `bf_isabella`, filtered while hooded ·
Hot-dog vendor `am_fenrir` · Mall speaker `af_kore` · Little girl `af_sky` · Station speaker `af_nicole` · narrator `am_michael` (two lines).

## Pipeline
```bash
pip install kokoro-onnx soundfile scipy        # model files: kokoro-v1.0.onnx + voices-v1.0.bin in $KOKORO_DIR
python3 script_src.py
KOKORO_DIR=/path/to/kokoro python3 tts.py      # voices + timing (exactly 510 s) + subtitles.srt
python3 audio.py                               # score + SFX + ducking -> build/mix_raw.wav
ffmpeg -i build/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 build/mix.wav
node render.js video 4 30                      # build/video.mp4 (about 15 min on 4 cores)
ffmpeg -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest final/What_If_You_Could_Stop_Time.mp4
node thumbnail.js && python3 make_script_md.py
```
Code: `engine.js` (timeline, freeze state, world clock, grade, subtitles), `scenes_lib.js` (cast, props, crowd, freeze FX,
camera), `scenes.js` (hook/avenue, title, apartment, street) and `scenes_b.js` (mall, station, lab, frozen city, core, ending, outro).
