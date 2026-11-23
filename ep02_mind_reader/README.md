# Tiko & Sparky · EP02: "What If You Could Read Everyone's Mind?"

When Sparky sneezes a fireball into the sky, a Thinking Star crashes into Fernwood Valley and lets Tiko,
the baby dinosaur from EP01, hear everyone's thoughts. It's funny until he overhears a secret that seems to
mean everyone wants him gone. The twist is a surprise Hatch Day party… and then the star lands on Coco, the valley gossip.

## Deliverables

| file | what |
|---|---|
| `EP02_What_If_You_Could_Read_Everyones_Mind_1080p.mp4` | the episode: **8:30.000**, 1920×1080 16:9, 24 fps, H.264 + AAC stereo, English subtitles burned in |
| `EP02_subtitles_en.srt` | English captions to upload to YouTube as a CC track |
| `EP02_thumbnail.jpg` / `EP02_thumbnail_1920.png` | thumbnail (1280×720 YouTube spec + 1920×1080 master) |
| `EP02_YouTube_metadata.md` | SEO title, description with chapters, tags, upload checklist |
| `SCRIPT.md` | the complete timecoded screenplay with every character's dialogue |

## Cast & voices

Every character has its own neural voice from [Kokoro-82M](https://github.com/thewh1teagle/kokoro-onnx)
(Apache-2.0), with a per-character speed and pitch. See the table at the top of `SCRIPT.md`.
Tiko and Sparky reuse the exact EP01 3D models (same proportions, colours, spikes, wings and eyes), extended with
eyebrows and mouth-shape controls for dialogue. Mama is a variant of the dino model. Professor Shellby (tortoise) and
Coco (parrot) are new, built in the same SDF style.

## How it's made

Everything except the voices is procedural and original: no stock assets, samples or AI video models.

| file | role |
|---|---|
| `script.py` | **single source of truth**: cast/voices, every scene, line, emotion, camera directive, action event |
| `voices.py` | synthesises each line with the character's Kokoro voice, pitch-shifts it (rubberband) and extracts lip-sync curves (mouth open + width at 100 Hz) |
| `timeline.py` | lays all beats out with the real clip durations and solves the pause stretch so the episode is exactly 510.000 s |
| `anim.py` | uniforms for any time t: blocking and walk cycles, emotion→face mapping (eyes, brows, smile), lip-sync, look-at, blinks, scripted events, occlusion-aware shot library |
| `scene.frag` | GLSL SDF raymarcher: 5 characters, Thinking Star, 3 locations (clearing / pond / nest), 7 times of day, night party with lanterns, cake, treehouse, fireworks, thought ripples |
| `post.frag` | depth of field, bloom, ACES, grade, mind-reading cyan vignette + chromatic split, fades and flashes |
| `render.py` | headless OpenGL (moderngl + EGL on Mesa llvmpipe), resumable 10 s chunks |
| `audio.py` | dialogue mix with on-screen panning, echo/reverb "thought" voice, 12-style procedural score with ducking, SFX and ambience |
| `subs.py` | styled ASS (burned in) + SRT |
| `thumbnail.py` | hi-res render plus typography |
| `finalize.py` | concat, two-pass loudness normalisation (-14 LUFS), subtitle burn-in, size-targeted two-pass H.264 |

## Rebuild

```bash
pip install moderngl numpy pillow scipy soundfile kokoro-onnx     # + ffmpeg (with libass, rubberband), Mesa EGL
# Kokoro model files (kokoro-v1.0.onnx, voices-v1.0.bin) from the kokoro-onnx GitHub releases, into ../models
python voices.py --models ../models
python timeline.py && python make_script_md.py && python subs.py
python render.py preview 60 300 450 --scale 0.5        # quick stills in out/prev/
python render.py chunks --scale 0.6667                 # full episode, ~4.5 h on 4 CPU cores (CPU-only)
python audio.py
python thumbnail.py
python finalize.py
```

Rendering note: the machine has no GPU, so frames are raymarched at 1280×720 on the CPU and Lanczos-upscaled to the
1920×1080 delivery size. On a machine with a GPU, `python render.py chunks --scale 1.0` renders native 1080p.
