# Baby Dino & the Magic Egg — 20 s YouTube Short

A cute baby dinosaur finds a glowing egg in a colourful forest. The egg shakes and cracks, a tiny dragon hops out, sneezes a little fireball, and both burst out laughing.

* `dino_dragon_short.mp4`: the finished video. 1080×1920 (9:16), 30 fps, exactly 20.0 s, H.264 + AAC stereo. No subtitles, no watermark.

## How it's made

Everything is procedural and original. There are no stock assets, samples or AI video models.

| file | what it does |
|------|--------------|
| `scene.frag` | GLSL signed-distance-field raymarcher: characters, egg, forest, soft shadows, AO, skin translucency, glow, fireball, smoke, sparkles |
| `post.frag` | depth of field, bloom, ACES tone mapping, colour grade, vignette |
| `anim.py` | the whole 20 s timeline: character motion, squash & stretch, facial expressions, egg wobble/crack, camera shots |
| `render.py` | headless OpenGL renderer (moderngl + EGL, works on CPU-only Mesa llvmpipe), pipes frames to ffmpeg |
| `audio.py` | synthesised score (ukulele/glockenspiel/bass/drums) plus cartoon SFX and formant-synth giggles, timed to the animation |

## Rebuild

```bash
pip install moderngl numpy pillow scipy      # plus system ffmpeg and Mesa EGL (libegl1 libgl1-mesa-dri)
python render.py preview 3.0 10.5 --scale 0.5   # quick stills in out/
python render.py video                          # out/video_0000_0600.mp4 (about 25 min on 4 CPU cores)
python audio.py                                 # out/soundtrack.wav
ffmpeg -i out/video_0000_0600.mp4 -i out/soundtrack.wav -c:v copy -c:a aac -b:a 192k -t 20 -shortest dino_dragon_short.mp4
```

## Story beats

| time | beat |
|------|------|
| 0–3 s | camera tilts down from the canopy, the baby dino waddles into the clearing |
| 3–6.4 s | it spots the glowing egg, "!" chime, curious head tilt |
| 6.4–10.2 s | the egg wobbles, then cracks with glowing lines |
| 10.2 s | POP! The shell top flies off and a tiny dragon jumps out |
| 11.3–13.6 s | the dragon looks around, then "ah… ah…" |
| 13.6 s | "CHOO!" A little fireball whizzes over the dino's head and puffs into smoke |
| 15–20 s | both laugh together while the camera cranes out |
