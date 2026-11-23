"""Assemble the final episode MP4 from the rendered chunks + soundtrack + burned-in subtitles.

  python finalize.py [--size-mb 92]

- concatenates out/chunks/c_*.mp4 (1920x1080, 24 fps)
- loudness-normalises the soundtrack to -14 LUFS / -1.5 dBTP (YouTube reference), two-pass
- burns in out/ep02.ass (dialogue, thoughts, title card, end card)
- two-pass H.264 sized to stay under GitHub's 100 MB limit
"""
import glob
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
FINAL = os.path.join(HERE, 'EP02_What_If_You_Could_Read_Everyones_Mind_1080p.mp4')
DUR = 510.0


def run(cmd, **kw):
    print(' '.join(cmd[:12]), '...' if len(cmd) > 12 else '', flush=True)
    return subprocess.run(cmd, check=True, **kw)


def main():
    size_mb = float(sys.argv[sys.argv.index('--size-mb') + 1]) if '--size-mb' in sys.argv else 92.0
    chunks = sorted(glob.glob(os.path.join(OUT, 'chunks', 'c_*.mp4')))
    chunks = [c for c in chunks if not c.endswith('.part.mp4')]
    expected = int(DUR * 24 / 240 + 0.999)
    assert len(chunks) == expected, f'{len(chunks)} chunks, expected {expected}'
    lst = os.path.join(OUT, 'concat.txt')
    open(lst, 'w').write(''.join(f"file '{c}'\n" for c in chunks))
    cat = os.path.join(OUT, 'video_nosubs.mp4')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', cat])
    # loudness: measure, then apply linear normalisation
    wav = os.path.join(OUT, 'soundtrack.wav')
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True)
    m = json.loads(re.findall(r'\{[^{}]*\}', p.stderr, re.S)[-1])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    norm = os.path.join(OUT, 'soundtrack_norm.wav')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', ln + ',aresample=48000', '-t', str(DUR), norm])
    abr = 128
    vbr = int(size_mb * 8e6 / DUR / 1000 - abr - 6)
    ass = os.path.join(OUT, 'ep02.ass')
    vf = f"hqdn3d=1.2:1.2:3:3,ass={ass}"
    common = ['-i', cat, '-i', norm, '-map', '0:v', '-map', '1:a', '-vf', vf, '-r', '24',
              '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
              '-b:v', f'{vbr}k', '-maxrate', '4000k', '-bufsize', '8000k', '-g', '48',
              '-passlogfile', os.path.join(OUT, 'x264_2pass'), '-t', str(DUR)]
    run(['ffmpeg', '-y', '-loglevel', 'error'] + common + ['-pass', '1', '-an', '-f', 'mp4', os.devnull])
    run(['ffmpeg', '-y', '-loglevel', 'error'] + common + ['-pass', '2', '-c:a', 'aac', '-b:a', f'{abr}k', '-ar', '48000',
                                                           '-movflags', '+faststart',
                                                           '-metadata', "title=What If You Could Read Everyone's Mind? | Tiko & Sparky EP02",
                                                           FINAL])
    pr = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_frames',
                         '-of', 'json', FINAL], capture_output=True, text=True)
    print(pr.stdout)


if __name__ == '__main__':
    main()
