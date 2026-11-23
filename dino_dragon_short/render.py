"""Render the short with OpenGL (works headless on Mesa llvmpipe via EGL).

usage:
  python render.py preview T1 T2 ...  [--scale 0.5]   -> PNG stills in out/
  python render.py video [--start F] [--end F]        -> raw frames piped to ffmpeg
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
os.makedirs(OUT, exist_ok=True)

W, H = 1080, 1920
FPS = 30
DURATION = 20.0

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
        prog[name].value = tuple(val) if isinstance(val, (tuple, list)) else val

    def frame(self, t):
        u, focus, ap = anim.uniforms(t)
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
        self.pvao.render(moderngl.TRIANGLE_STRIP)
        data = self.pfbo.read(components=3)
        img = np.frombuffer(data, dtype=np.uint8).reshape(self.h, self.w, 3)[::-1]
        return img


def main():
    args = sys.argv[1:]
    mode = args[0]
    scale = 1.0
    if '--scale' in args:
        scale = float(args[args.index('--scale') + 1])
    w, h = int(W * scale) // 2 * 2, int(H * scale) // 2 * 2
    r = Renderer(w, h)
    if mode == 'preview':
        times = [float(a) for a in args[1:] if not a.startswith('--') and a != str(scale)]
        for t in times:
            t0 = time.time()
            img = r.frame(t)
            fn = os.path.join(OUT, f'prev_{t:05.2f}.png')
            Image.fromarray(img).save(fn)
            print(f'{fn}  {time.time()-t0:.1f}s', flush=True)
    elif mode == 'video':
        start = int(args[args.index('--start') + 1]) if '--start' in args else 0
        end = int(args[args.index('--end') + 1]) if '--end' in args else int(DURATION * FPS)
        outfn = os.path.join(OUT, f'video_{start:04d}_{end:04d}.mp4')
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
               '-s', f'{w}x{h}', '-r', str(FPS), '-i', '-',
               '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', outfn]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        t0 = time.time()
        for f in range(start, end):
            img = r.frame(f / FPS)
            ff.stdin.write(img.tobytes())
            if f % 10 == 0:
                el = time.time() - t0
                print(f'frame {f}/{end}  {el/(f-start+1):.2f}s/frame', flush=True)
        ff.stdin.close()
        ff.wait()
        print('done', outfn, time.time() - t0)


if __name__ == '__main__':
    main()
