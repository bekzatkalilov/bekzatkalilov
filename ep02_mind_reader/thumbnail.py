"""YouTube thumbnail: hi-res render of Tiko's "I can hear your thoughts?!" moment + bold text and thought bubbles.

Writes EP02_thumbnail.jpg (1280x720, YouTube spec) and EP02_thumbnail_1920.png.
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

import anim
import render

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_BLACK = '/usr/share/fonts/opentype/inter/InterDisplay-Black.otf'
FONT_BOLD = '/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf'

T = 7.05   # Tiko shouting "...THINKING?!" in the cold open

orig = anim.uniforms


def thumb_uniforms(t):
    u, post, focus, ap = orig(t)
    # reframe: Tiko on the right third, a touch lower and wider, strong mind glow
    cam, tar = u['uCamPos'], u['uCamTar']
    fwd = anim.norm(anim.sub(tar, cam))
    right = anim.norm((fwd[2], 0.0, -fwd[0]))
    u['uCamPos'] = anim.add(anim.add(cam, anim.mul(fwd, -0.25)), anim.mul(right, -0.30))
    u['uCamTar'] = anim.add(anim.add(tar, anim.mul(right, -0.40)), (0, 0.03, 0))
    u['uFov'] = 38.0
    f = list(u['uDFace'][0])
    f[2] = 0.85            # mouth wide open
    f[3] = 1.32            # big eyes
    u['uDFace'] = [tuple(f), u['uDFace'][1]]
    f2 = list(u['uDFace2'][0])
    f2[1], f2[2] = 1.0, 0.45
    u['uDFace2'] = [tuple(f2), u['uDFace2'][1]]
    lk = list(u['uDLook'][0])
    lk[0], lk[1], lk[2] = 0.3, 0.02, 1.0
    u['uDLook'] = [tuple(lk), u['uDLook'][1]]
    post['uMindFx'] = 0.35
    post['uFlash'] = 0.0
    return u, post, focus + 0.25, ap * 0.08


def bubble(draw, cx, cy, w, h, text, font, tail_to, fill=(255, 255, 255), txt=(20, 30, 60)):
    # cloud made of overlapping circles
    for k in range(10):
        a = k / 10 * 2 * math.pi
        rx, ry = w * 0.42, h * 0.38
        r = h * 0.33
        x, y = cx + math.cos(a) * rx, cy + math.sin(a) * ry
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=None)
    draw.ellipse([cx - w * 0.48, cy - h * 0.45, cx + w * 0.48, cy + h * 0.45], fill=fill)
    tx, ty = tail_to
    for i, s in enumerate((0.55, 0.75, 0.9)):
        px = cx + (tx - cx) * s
        py = cy + h * 0.4 + (ty - cy - h * 0.4) * s
        r = h * (0.13 - i * 0.035)
        draw.ellipse([px - r, py - r, px + r, py + r], fill=fill)
    bb = draw.textbbox((0, 0), text, font=font)
    draw.text((cx - (bb[2] - bb[0]) / 2, cy - (bb[3] - bb[1]) / 2 - bb[1]), text, font=font, fill=txt)


def outlined(draw, xy, text, font, fill, stroke, sw):
    draw.text(xy, text, font=font, fill=fill, stroke_width=sw, stroke_fill=stroke)


def main():
    anim.uniforms = thumb_uniforms
    W, H = 1920, 1080
    r = render.Renderer(W, H)
    img = Image.fromarray(r.frame(T).copy())
    img = ImageEnhance.Color(img).enhance(1.25)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    # cyan glow from the right, darker on the left for text contrast
    grad = np.linspace(0.55, 1.0, W)[None, :, None] ** 1.2
    arr = np.asarray(img).astype(np.float32) * grad
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([1050, 120, 1900, 1000], fill=(60, 230, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img.convert('RGBA'), glow)
    d = ImageDraw.Draw(img)
    # big title text
    f1 = ImageFont.truetype(FONT_BLACK, 150)
    f2 = ImageFont.truetype(FONT_BLACK, 190)
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for (txt, f, y) in (('I CAN READ', f1, 470), ('MINDS?!', f2, 640)):
        sd.text((78, y + 14), txt, font=f, fill=(0, 0, 0, 200), stroke_width=14, stroke_fill=(0, 0, 0, 200))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    img = Image.alpha_composite(img, shadow)
    d = ImageDraw.Draw(img)
    outlined(d, (70, 470), 'I CAN READ', f1, (255, 255, 255), (15, 20, 45), 12)
    outlined(d, (70, 640), 'MINDS?!', f2, (255, 214, 50), (15, 20, 45), 14)
    # thought bubbles from the other characters
    fb = ImageFont.truetype(FONT_BLACK, 64)
    fs = ImageFont.truetype(FONT_BOLD, 50)
    bubble(d, 360, 170, 560, 200, 'BANANAS!!', fb, (700, 420))
    bubble(d, 900, 110, 470, 160, 'TURNIPS...', fs, (1080, 330))
    # episode badge
    fbadge = ImageFont.truetype(FONT_BLACK, 46)
    d.rounded_rectangle([1560, 40, 1880, 120], radius=18, fill=(230, 40, 60))
    d.text((1585, 50), 'EP. 2', font=fbadge, fill=(255, 255, 255))
    img = img.convert('RGB')
    img.save(os.path.join(HERE, 'EP02_thumbnail_1920.png'))
    img.resize((1280, 720), Image.LANCZOS).save(os.path.join(HERE, 'EP02_thumbnail.jpg'), quality=92)
    print('thumbnail written')


if __name__ == '__main__':
    main()
