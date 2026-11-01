"""纸桌 · turn the ride stills into pixel art (400×250, one shared 40-colour palette, dark outlines).
   py tools/pixelate.py      → assets/cabin-day-px.png, assets/cabin-day-shade-px.png, assets/snow-forest-px.png"""
import os, numpy as np
from PIL import Image, ImageFilter
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(R, "assets")
W, H = 400, 250
lo = lambda f: Image.open(f).convert("RGBA").resize((W, H), Image.BOX)
sun, sh = lo(f"{A}/cabin-day.webp"), lo(f"{A}/cabin-day-shade.webp")
wood = Image.open(f"{A}/3d/snow_forest.jpg").convert("RGB"); wood = wood.resize((int(wood.width * 190 / wood.height), 190), Image.BOX)

def grade(rgb):
    a = np.asarray(rgb).astype(np.float32) / 255
    a = np.where(a > .72, .72 + (a - .72) * .45, a)              # tame the blown-out sun on the table
    l = a.mean(-1, keepdims=True); a = np.clip(l + (a - l) * 1.3, 0, 1)   # pixel art pushes colour
    a = np.clip((a - .5) * 1.1 + .5, 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8))

mos = Image.new("RGB", (W * 2 + wood.width, max(H, 190)))
mos.paste(grade(sun.convert("RGB")), (0, 0)); mos.paste(grade(sh.convert("RGB")), (W, 0)); mos.paste(grade(wood), (W * 2, 0))
pal = mos.quantize(colors=40, method=Image.Quantize.MEDIANCUT, kmeans=4)

def px(im):
    g = grade(im.convert("RGB")); out = np.asarray(g.quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")).astype(np.float32)
    e = np.asarray(g.convert("L").filter(ImageFilter.FIND_EDGES)).astype(np.float32)
    return np.where((e > 70)[..., None], out * .7, out).astype(np.uint8)   # dark outlines on the edges

a = np.asarray(sun)[..., 3]; yy, xx = np.mgrid[0:H, 0:W]
frost = (a > 70) & (a <= 110) & (xx % 3 == 0) & (yy % 3 == 1)          # a sparse pixel frost on the glass
alpha = np.where(a > 110, 255, np.where(frost, 200, 0)).astype(np.uint8)
for im, name in [(sun, "cabin-day-px.png"), (sh, "cabin-day-shade-px.png")]:
    Image.fromarray(np.dstack([px(im), alpha]), "RGBA").save(f"{A}/{name}", optimize=True)
Image.fromarray(px(wood.convert("RGBA"))).save(f"{A}/snow-forest-px.png", optimize=True)
