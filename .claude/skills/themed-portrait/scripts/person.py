"""Make the front layer of a themed portrait: the person cut out, the tie
recoloured, and the light pulled toward the world's.

    python person.py --src image-originals/evan_portrait_base.png \
        --out public/images/portraits [--world reef,pond] [--check-tie]

Writes person-<world>.webp (960x960, transparent) per world in WORLDS.
--check-tie writes tie-check.png instead: the tie mask in magenta over the
framed photo, for fitting TIE_POLY to a new photo.

Needs: pip install "rembg[cpu]" pillow numpy (the first run downloads the
~1 GB birefnet-portrait model to ~/.rembg). The cutout is cached next to
--src as <name>.cut.png; delete it to redo the cut.
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Per world: tie (dark ground, stripe), tint and amount for the grade, rim
# light colour and side (-1 lit from the left, 1 from the right), how much of
# the indoor yellow cast to cool away, and an optional gamma (>1 darkens, for
# night worlds). Keep these in step with the backdrops in lib/portraitScenes.ts.
WORLDS = {
    'reef':   dict(tie=('#12384b', '#ff7a5a'), tint='#7fd0e0', amt=0.22, rim='#9ff0ff', side=-1, cool=1.0),
    'pond':   dict(tie=('#24452e', '#ff8a6a'), tint='#bfe0a0', amt=0.15, rim='#e8ffd0', side=1, cool=0.6),
    'shrine': dict(tie=('#1c1830', '#e8452e'), tint='#b0a6c4', amt=0.30, rim='#ffb060', side=1, cool=0.4, gamma=1.12),
    'space':  dict(tie=('#241446', '#ff7a21'), tint='#a08ce8', amt=0.25, rim='#ff60e0', side=-1, cool=0.8),
    'sky':    dict(tie=('#1e3a6e', '#e0a42c'), tint='#d0def6', amt=0.18, rim='#fff6d8', side=1, cool=1.0),
    'hotpot': dict(tie=('#2a0604', '#ffcc6a'), tint='#ffa070', amt=0.20, rim='#ffcc6a', side=-1, cool=0.0),
}

# Framing, in the source photo's pixels: the x to centre on (between the face
# and the shoulders) and the zoom. The bottom edge stays on the frame's bottom.
CENTRE_X = 505
ZOOM = 1.12
# The tie, in the source photo's pixels (knot to the bottom edge). Generous is
# fine: only dark and pink pixels inside it are recoloured, not the white shirt.
TIE_POLY = [(458, 790), (552, 790), (566, 860), (606, 1138), (455, 1138), (470, 865)]
OUT_SIZE = 960


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def cutout(src):
    cache = os.path.splitext(src)[0] + '.cut.png'
    if os.path.exists(cache):
        return Image.open(cache).convert('RGBA')
    from rembg import remove, new_session
    cut = remove(Image.open(src).convert('RGB'), session=new_session('birefnet-portrait'))
    cut.save(cache)
    return cut.convert('RGBA')


def frame(cut):
    """Square canvas the photo's width, person centred and zoomed, bottom kept."""
    W, H = cut.size
    ox, oy = W / 2 - CENTRE_X * ZOOM, W - H * ZOOM
    big = cut.resize((round(W * ZOOM), round(H * ZOOM)), Image.LANCZOS)
    out = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    out.alpha_composite(big, (round(ox), round(oy)))
    poly = [(x * ZOOM + ox, y * ZOOM + oy) for x, y in TIE_POLY]
    return out, poly


def tie_mask(size, poly):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255


def recolour_tie(img, poly, dark, stripe):
    a = np.asarray(img).astype(np.float32) / 255
    m = tie_mask(img.size, poly)
    rgb = a[..., :3]
    r, g = rgb[..., 0], rgb[..., 1]
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    # This photo's tie is navy with pink and white stripes: pink -> stripe colour,
    # navy -> dark colour, white left alone. Adjust the two weights for another tie.
    pink = np.clip((r - g - 0.08) / 0.15, 0, 1) * np.clip((lum - 0.35) / 0.2, 0, 1)
    darkw = np.clip((0.52 - lum) / 0.2, 0, 1) * (1 - pink)
    d = np.array(dark, np.float32) / 255
    s = np.array(stripe, np.float32) / 255
    dk = d * np.clip(lum / 0.22, 0.2, 1.8)[..., None]   # keep the weave's shading
    pk = s * np.clip(lum / 0.72, 0.4, 1.3)[..., None]
    new = np.clip(rgb * (1 - darkw - pink)[..., None] + dk * darkw[..., None] + pk * pink[..., None], 0, 1)
    a[..., :3] = rgb * (1 - m[..., None]) + new * m[..., None]
    return Image.fromarray((a * 255).astype(np.uint8), 'RGBA')


def grade(img, tint, amount, gamma=1.0, cool=0.0):
    """Cool the indoor yellow cast and tint toward the world's light."""
    a = np.asarray(img).astype(np.float32) / 255
    rgb = a[..., :3] * np.array([1 - 0.04 * cool, 1.0, 1 + 0.06 * cool])
    t = np.array(tint, np.float32) / 255
    tinted = rgb * (0.55 + 0.45 * t) / max(0.55 + 0.45 * t.max(), 1e-3)
    rgb = np.clip(rgb * (1 - amount) + tinted * amount, 0, 1) ** gamma
    a[..., :3] = np.clip(rgb, 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8), 'RGBA')


def rim(img, colour, side, strength=0.55, width=10):
    """Soft light of the world's colour catching one edge of the person."""
    alpha = img.split()[3]
    shifted = alpha.transform(img.size, Image.AFFINE, (1, 0, -side * width, 0, 1, 0))
    edge = np.clip(np.asarray(alpha, np.float32) - np.asarray(shifted, np.float32), 0, 255)
    edge = np.asarray(Image.fromarray(edge.astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)), np.float32) / 255
    a = np.asarray(img).astype(np.float32) / 255
    c = np.array(colour, np.float32) / 255
    k = (edge * strength)[..., None]
    a[..., :3] = a[..., :3] * (1 - k) + (1 - (1 - a[..., :3]) * (1 - c)) * k
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGBA')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--world', default=','.join(WORLDS))
    ap.add_argument('--check-tie', action='store_true')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    person, poly = frame(cutout(args.src))
    if args.check_tie:
        bg = Image.new('RGBA', person.size, (40, 40, 40, 255))
        bg.alpha_composite(person)
        over = Image.new('RGBA', person.size, (255, 0, 255, 0))
        ImageDraw.Draw(over).polygon(poly, fill=(255, 0, 255, 110))
        bg.alpha_composite(over)
        path = os.path.join(args.out, 'tie-check.png')
        bg.convert('RGB').save(path)
        print(path)
        return

    for name in args.world.split(','):
        o = WORLDS[name]
        p = recolour_tie(person, poly, hexc(o['tie'][0]), hexc(o['tie'][1]))
        p = grade(p, hexc(o['tint']), o['amt'], o.get('gamma', 1.0), o['cool'])
        p = rim(p, hexc(o['rim']), o['side'])
        path = os.path.join(args.out, f'person-{name}.webp')
        p.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS).save(path, quality=90, alpha_quality=100, method=6)
        print(path)


if __name__ == '__main__':
    main()
