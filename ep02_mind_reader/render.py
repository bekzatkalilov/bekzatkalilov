"""Render EP02 with OpenGL (headless Mesa llvmpipe via EGL).

usage:
  python render.py preview T1 T2 ... [--scale 0.5]       -> PNG stills in out/prev/
  python render.py chunks [--scale S] [--chunk N]         -> out/chunks/c_XXXXX.mp4 (resumable)
  python render.py still T OUTFILE [--w W --h H]          -> single PNG (thumbnail)
"""
import os
import sys
import time
import subprocess
import numpy as np
import moderngl
from PIL import Image

import anim

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
W, H = 1920, 1080
FPS = anim.TL['fps']
DURATION = anim.TL['duration']

VS = """#version 330
in vec2 pos; void main(){ gl_Position = vec4(pos, 0.0, 1.0); }"""


class Renderer:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.ctx = moderngl.create_standalone_context(backend='egl')
        src = open(os.path.join(HERE, 'scene.frag')).read()
        psrc = open(os.path.join(HERE, 'post.frag')).read()
        self.prog = self.ctx.program(vertex_shader=VS, fragment_shader=src)
        self.post = self.ctx.program(vertex_shader=VS, fragment_shader=psrc)
        quad = np.array([-1, -1, 1, -1, -1, 1, 1, 1], dtype='f4')
        vbo = self.ctx.buffer(quad.tobytes())
        self.vao = self.ctx.vertex_array(self.prog, [(vbo, '2f', 'pos')])
        self.pvao = self.ctx.vertex_array(self.post, [(vbo, '2f', 'pos')])
        self.hdr = self.ctx.texture((w, h), 4, dtype='f4')
        self.hdr.filter = (moderngl.LINEAR_MIPMAP_LINEAR, moderngl.LINEAR)
        self.hdr.repeat_x = self.hdr.repeat_y = False
        self.fbo = self.ctx.framebuffer(color_attachments=[self.hdr])
        self.ldr = self.ctx.texture((w, h), 4)
        self.pfbo = self.ctx.framebuffer(color_attachments=[self.ldr])

    def set(self, prog, name, val):
        if name not in prog:
            return
        if isinstance(val, list):
            un = prog[name]
            n = un.array_length
            prog[name].value = [tuple(v) if isinstance(v, (tuple, list)) else v for v in val[:n]]
            return
        prog[name].value = tuple(val) if isinstance(val, (tuple, list)) else val

    def frame(self, t):
        u, post, focus, ap = anim.uniforms(t)
        self.set(self.prog, 'uRes', (self.w, self.h))
        for k, v in u.items():
            self.set(self.prog, k, v)
        self.fbo.use()
        self.vao.render(moderngl.TRIANGLE_STRIP)
        self.hdr.build_mipmaps()
        self.pfbo.use()
        self.hdr.use(0)
        self.set(self.post, 'uTex', 0)
        self.set(self.post, 'uRes', (self.w, self.h))
        self.set(self.post, 'uFocus', focus)
        self.set(self.post, 'uAperture', ap * self.h / 1920.0)
        self.set(self.post, 'uTime', t)
        for k, v in post.items():
            self.set(self.post, k, v)
        self.pvao.render(moderngl.TRIANGLE_STRIP)
        data = self.pfbo.read(components=3)
        return np.frombuffer(data, dtype=np.uint8).reshape(self.h, self.w, 3)[::-1]


def arg(args, name, default, typ=float):
    return typ(args[args.index(name) + 1]) if name in args else default


def main():
    args = sys.argv[1:]
    mode = args[0]
    scale = arg(args, '--scale', 1.0)
    w, h = int(W * scale) // 2 * 2, int(H * scale) // 2 * 2
    if mode == 'preview':
        os.makedirs(os.path.join(OUT, 'prev'), exist_ok=True)
        r = Renderer(w, h)
        times = []
        skip = False
        for a in args[1:]:
            if skip:
                skip = False
                continue
            if a.startswith('--'):
                skip = True
                continue
            times.append(float(a))
        for t in times:
            t0 = time.time()
            img = r.frame(t)
            fn = os.path.join(OUT, 'prev', f'prev_{t:07.2f}.png')
            Image.fromarray(img).save(fn)
            print(f'{fn}  {anim.scene_at(t)["id"]}  {time.time()-t0:.1f}s', flush=True)
    elif mode == 'still':
        t = float(args[1])
        w, h = arg(args, '--w', W, int), arg(args, '--h', H, int)
        r = Renderer(w, h)
        Image.fromarray(r.frame(t)).save(args[2])
    elif mode == 'chunks':
        chunk = arg(args, '--chunk', 240, int)
        cdir = os.path.join(OUT, 'chunks')
        os.makedirs(cdir, exist_ok=True)
        total = int(round(DURATION * FPS))
        r = Renderer(w, h)
        t_start = time.time()
        done_frames = 0
        start_f = arg(args, '--start', 0, int)
        end_f = arg(args, '--end', total, int)
        for c0 in range(start_f, end_f, chunk):
            c1 = min(c0 + chunk, end_f)
            fn = os.path.join(cdir, f'c_{c0:05d}.mp4')
            if os.path.exists(fn):
                continue
            tmp = fn + '.part.mp4'
            cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                   '-s', f'{w}x{h}', '-r', str(FPS), '-i', '-',
                   '-vf', f'scale={W}:{H}:flags=lanczos' if (w, h) != (W, H) else 'null',
                   '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', tmp]
            ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            for f in range(c0, c1):
                ff.stdin.write(r.frame(f / FPS).tobytes())
                done_frames += 1
            ff.stdin.close()
            ff.wait()
            os.rename(tmp, fn)
            el = time.time() - t_start
            print(f'chunk {c0}-{c1} done; {el/done_frames:.2f}s/frame; elapsed {el/60:.1f} min', flush=True)


if __name__ == '__main__':
    main()
