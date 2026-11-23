# EP03 · What If Everyone Could See Your Biggest Secret?

8:30.000 · 1920×1080 16:9 · 30 fps · H.264 + AAC · English dialogue, a unique AI voice per character · burned-in + .srt subtitles

**Kip** (locked v1.0.0, drawn only through `character/kip.js`) is the main character and looks identical in every
scene. The secret signs float *above* heads as separate props, so his design is never altered. Max and Mom return;
Lily, Mr. Grumbold, Officer Dan, Rosa and the bus driver are new supporting characters (specs in `scenes.js`).

## Story
One morning everyone's biggest secret floats above their heads. Kip has no sign, so he laughs at everyone and
posts Max's secret ("I still sleep with a teddy bear named Mr. Fluffles") to the class chat. Then his own sign
loads in front of the whole class: *"We're moving away on Friday... and I haven't told Max."* Max walks out.
**Twist 1:** Mom's sign: she turned down the job, so they're not moving. **Twist 2:** Max's sign changes: he's
leaving for the whole summer at 6 pm with no goodbyes. **Climax:** a race across town (Rosa's bike, Officer Dan
facing a flock of pigeons, Mr. Grumbold's victory opera) to the bus station, where Kip's sign changes to his new
biggest secret: *"Max is my best friend and I'm sorry I laughed."* **Ending:** the signs are gone... except one,
above Mr. Fluffles: *"I CAN TALK."* The bear winks.

## Deliverables (`final/`)
| File | What |
|---|---|
| `What_If_Everyone_Could_See_Your_Biggest_Secret.mp4` | finished episode |
| `subtitles.srt` | English captions |
| `thumbnail.png` / `thumbnail_1920.png` | thumbnail |
| `../YOUTUBE_PACKAGE.md` | SEO title, alternates, description with chapters, tags |
| `../SCRIPT.md` | full timecoded script with every line of dialogue |

## Voices (Kokoro)
Kip `am_puck` · Max `am_liam` · Mom `af_heart` · Lily `af_nova` · Mr. Grumbold `bm_daniel` · Officer Dan `am_onyx` ·
Rosa `bf_emma` · bus driver `am_adam` · narrator `am_michael` (two lines only).

## Pipeline (same as EP02)
```bash
python3 script_src.py
KOKORO_DIR=/path/to/kokoro python3 tts.py      # voice + timing (exactly 510 s) + subtitles.srt
KOKORO_DIR=/path/to/kokoro python3 audio.py    # score + SFX + ducking -> build/mix_raw.wav
ffmpeg -i build/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 build/mix.wav
node render.js video 4 30
node thumbnail.js && python3 make_script_md.py
```
