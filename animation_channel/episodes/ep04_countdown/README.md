# EP04 · What If Everyone Had a Countdown Above Their Head?

8:30.000 · 1920×1080 16:9 · 30 fps · H.264 + AAC · English dialogue, a unique AI voice per character · burned-in + .srt subtitles

**Kip** (locked v1.0.0, drawn only through `character/kip.js`), **Max** (`character/extras.js`) and **Lily** (same spec
as EP03) are the main cast. The countdowns float *above* heads as separate props, so no character design is
altered. Mom, Mr. Grumbold and Rosa return from EP03; the TV news anchor, Zero the puppy and Mr. Whiskers the cat are new.
Every countdown on screen ticks in real time toward 4:00 PM, using the in-story clock for each scene (`clocks` in `script_src.py`).

## Story
Everyone wakes up with a countdown above their head. The news says zero is the moment your life changes forever.
Max has 61 years. Kip has 8 hours. Rosa's zero brings a 10,000-cookie order and Mr. Grumbold's brings back his lost
cat, but Kip panics anyway, races through a bucket list and pushes Max away. **Twist 1:** Max's countdown changes to
match Kip's, because he decided not to leave him alone. **Twist 2:** Mom finally takes off her towel. Her countdown
also ends at 4:00 PM. **Climax:** 3, 2, 1... nothing. Then a bark: Mom adopted a puppy, and Max will walk her with Kip
every day. They name her Zero. **Ending:** the next morning Mr. Grumbold gets a new 3-second countdown, and Mr. Whiskers
walks in with six kittens.

## Deliverables (`final/`)
| File | What |
|---|---|
| `What_If_Everyone_Had_a_Countdown_Above_Their_Head.mp4` | finished episode |
| `subtitles.srt` | English captions |
| `thumbnail.png` / `thumbnail_1920.png` | thumbnail |
| `../YOUTUBE_PACKAGE.md` | SEO title, alternates, description with chapters, tags |
| `../SCRIPT.md` | full timecoded script with every line of dialogue |

## Voices (Kokoro)
Kip `am_puck` · Max `am_liam` · Lily `af_nova` · Mom `af_heart` · Mr. Grumbold `bm_daniel` · Rosa `bf_emma` ·
News anchor `af_sarah` · narrator `am_michael` (two lines only).

## Pipeline (same as EP03)
```bash
pip install kokoro-onnx soundfile scipy        # model files: kokoro-v1.0.onnx + voices-v1.0.bin in $KOKORO_DIR
python3 script_src.py
KOKORO_DIR=/path/to/kokoro python3 tts.py      # voice + timing (exactly 510 s) + subtitles.srt
python3 audio.py                               # score + SFX + ducking -> build/mix_raw.wav
ffmpeg -i build/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 build/mix.wav
node render.js video 4 30                      # build/video.mp4 (about 16 min on 4 cores)
ffmpeg -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest final/What_If_Everyone_Had_a_Countdown_Above_Their_Head.mp4
node thumbnail.js && python3 make_script_md.py
```
