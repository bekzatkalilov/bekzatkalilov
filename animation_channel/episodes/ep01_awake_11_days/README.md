# EP01 — What If You Stayed Awake for 11 Days?

8:30 · 1920×1080 · 30 fps · H.264 + AAC · English AI voiceover · burned-in + .srt subtitles

## Deliverables
| File | What |
|---|---|
| `final/What_If_You_Stayed_Awake_for_11_Days.mp4` | Finished episode (upload this) |
| `final/subtitles.srt` | English captions (upload as a caption track) |
| `final/thumbnail.png` | 1280×720 thumbnail (`thumbnail_1920.png` = master) |
| `YOUTUBE_PACKAGE.md` | Title, alternates, description with chapters + sources, tags |

## Pipeline (re-runnable)
```bash
pip install kokoro-onnx soundfile scipy        # + model files in /home/user/tts (see tts.py)
python3 tts.py          # voice per sentence -> build/voice.wav, timing.json (exactly 510 s), subtitles.srt
python3 audio.py        # procedural score + SFX + ducking -> build/mix_raw.wav
ffmpeg -i build/mix_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 build/mix.wav
node render.js video 4 30   # 4 parallel Chromium workers -> build/video.mp4
node thumbnail.js
```
- `script.json` — the script: one beat per narration line, with scene, speaker, Kip expression/pose, action, SFX cues.
- `engine.js` — timeline, camera (push-ins, punches, shake, Dutch angles), transitions, HUD, subtitles.
- `scenes.js` — 16 scene sets (haunted room, title, 1963 flashback, bedroom, hour cards, brain explainers,
  car, kitchen, sleep lab, hallucinations, infographics, arcade, bed, city stats, 2:47 AM phone, outro).
- Kip is drawn only via `character/kip.js` (locked v1.0.0); supporting cast in `character/extras.js`.

Voices (Kokoro): narrator `am_michael`, Kip `am_puck`, Max `am_liam`, Doctor `bf_emma`.
