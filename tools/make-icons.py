#!/usr/bin/env python3
"""Generate the PWA / APK icon set for Trill Tuner.

Draws the app's pick-and-wave logo at the sizes a PWA manifest and an
Android launcher need. Pure Pillow, supersampled 4x for smooth edges.

Usage:  python tools/make-icons.py            (writes public/icons/*)
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'icons')
SS = 4  # supersampling factor

BG = (13, 16, 24)        # app background #0d1018
BG_SOFT = (19, 24, 36)
AMBER = (246, 176, 75)   # #f6b04b
AMBER_DEEP = (217, 119, 6)  # #d97706
HOLE = (26, 20, 8)       # pick sound hole


def pick_path(cx, cy, size):
    """Rounded-triangle guitar pick pointing down, centred on (cx, cy)."""
    w = size
    h = size * 1.28
    top = cy - h * 0.42
    bot = cy + h * 0.46
    # triangle with a rounded top, approximated by a polygon with many points
    import math
    pts = []
    left = (cx - w * 0.5, top + h * 0.18)
    right = (cx + w * 0.5, top + h * 0.18)
    # rounded top edge: arc from left to right over the top
    n = 24
    for i in range(n + 1):
        t = i / n
        ang = math.pi * (1 - t)  # pi -> 0 over the top
        x = cx + math.cos(ang) * w * 0.5
        y = top + math.sin(ang) * h * 0.18 - h * 0.0
        pts.append((x, y + h * 0.02))
    pts.append((right[0], right[1] + h * 0.45))
    pts.append((cx, bot))
    pts.append((left[0], left[1] + h * 0.45))
    return pts


def draw_logo(size, full_bleed=False):
    W = H = size * SS
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if full_bleed:
        d.rectangle([0, 0, W, H], fill=BG)
        # subtle radial-ish glow behind the pick
        for r in range(W // 2, 0, -8):
            a = int(26 * (r / (W / 2)))
            d.ellipse([W / 2 - r, H / 2 - r, W / 2 + r, H / 2 + r], fill=(30, 24, 12, 40))
    else:
        m = int(W * 0.06)
        d.rounded_rectangle([m, m, W - m, H - m], radius=int(W * 0.22), fill=BG)
        d.rounded_rectangle([m, m, W - m, H - m], radius=int(W * 0.22), outline=BG_SOFT, width=max(2, W // 128))
    cx, cy = W / 2, H * 0.46
    ps = min(W, H) * (0.52 if full_bleed else 0.56)
    # pick with amber gradient (two-tone: top lighter)
    pts = pick_path(cx, cy, ps)
    d.polygon(pts, fill=AMBER)
    # gradient sheen: darker lower half
    clip = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(clip)
    cd.polygon(pts, fill=AMBER_DEEP)
    lower = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lower)
    ld.rectangle([0, cy, W, H], fill=(255, 255, 255, 255))
    clip = Image.composite(clip, Image.new('RGBA', (W, H), (0, 0, 0, 0)), lower)
    img = Image.alpha_composite(img, clip)
    d = ImageDraw.Draw(img)
    # sound hole
    hr = ps * 0.11
    d.ellipse([cx - hr, cy - hr * 0.9, cx + hr, cy + hr * 0.9], fill=HOLE)
    # sound wave under the pick
    wy = cy + ps * 0.78
    x = cx - ps * 0.62
    step = ps * 0.155
    while x < cx + ps * 0.62:
        d.line([x, wy, x + step * 0.5, wy - ps * 0.14, x + step, wy], fill=AMBER, width=max(2, int(ps * 0.035)))
        x += step
    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-maskable-512.png', 512, True),
        ('apple-touch-icon.png', 180, True),
    ]
    for name, size, fb in jobs:
        draw_logo(size, full_bleed=fb).save(os.path.join(OUT, name))
        print('wrote', os.path.join('public/icons', name))
    # APK launcher icons (mipmap buckets)
    for bucket, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
        d = os.path.join(ROOT, 'apk-src', 'res', 'mipmap-' + bucket)
        os.makedirs(d, exist_ok=True)
        draw_logo(size, full_bleed=True).save(os.path.join(d, 'ic_launcher.png'))
        print('wrote', os.path.join('apk-src/res', 'mipmap-' + bucket, 'ic_launcher.png'))


if __name__ == '__main__':
    main()
