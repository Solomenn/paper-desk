"""纸桌 · turn the ride stills into pixel art (400×250, one shared 40-colour palette).
   Clean edges: each part of the carriage (from tools/cabin-id.png, a flat-colour id render of the same camera)
   is smoothed only within itself, specks are merged away, and outlines are drawn only where one part meets another.
   py tools/pixelate.py      → assets/cabin-day-px.png, assets/cabin-day-shade-px.png, assets/snow-forest-px.png"""
import os, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(R, "assets")
W, H = 400, 250
lo = lambda f: Image.open(f).convert("RGBA").resize((W, H), Image.BOX)
sun, sh = lo(f"{A}/cabin-day.webp"), lo(f"{A}/cabin-day-shade.webp")
wood = Image.open(f"{A}/3d/snow_forest.jpg").convert("RGB"); wood = wood.resize((int(wood.width * 190 / wood.height), 190), Image.BOX)
code = np.asarray(Image.open(os.path.join(R, "tools", "cabin-id.png")).convert("RGB")).astype(np.int32) @ [65536, 256, 1]
glass = code == 0
# how much each part is smoothed (in pixels): props and table flat and clean, the panelling keeps its grain
WALL, TABLE = 0x111180, 0x110080
LAPTOP, PAD, CUP, PAPER, PEN = 0x881180, 0x991180, 0x2280, 0x112280, 0x222280
SEATS = (0x1180, 0xaa0080, 0x770080, 0xdd0080)
sig = {TABLE: 1.6, LAPTOP: 2.0, PAD: 2.0, CUP: 1.4, PAPER: 2.0, PEN: .8, WALL: 0.0}
DEFAULT = 1.1                                                    # curtains, seats, ceiling

def grade(a):
    a = np.where(a > .72, .72 + (a - .72) * .45, a)              # tame the blown-out sun on the table
    l = a.mean(-1, keepdims=True); a = np.clip(l + (a - l) * 1.3, 0, 1)
    return np.clip((a - .5) * 1.1 + .5, 0, 1)

def smooth(a):
    """blur each part only with itself, so colours never bleed across an edge"""
    out = a.copy()
    for v in np.unique(code):
        if v == 0: continue
        s = sig.get(v, DEFAULT)
        if s == 0: continue
        m = (code == v).astype(np.float32)
        num = np.stack([ndimage.gaussian_filter(a[..., c] * m, s) for c in range(3)], -1)
        den = ndimage.gaussian_filter(m, s)[..., None]
        out[code == v] = (num / np.maximum(den, 1e-4))[code == v]
    return out

def despeck(q, mask, n=5):
    """runs of one colour smaller than n pixels inside a part take the colour around them"""
    c = q.astype(np.int32) @ [65536, 256, 1]
    for part in np.unique(code[mask]):
        pm = (code == part) & mask
        for v in np.unique(c[pm]):
            lb, k = ndimage.label((c == v) & pm)
            if not k: continue
            sz = ndimage.sum(np.ones_like(lb), lb, range(1, k + 1))
            for i in np.where(sz < n)[0] + 1:
                m = lb == i; ring = ndimage.binary_dilation(m) & ~m & pm; vals = c[ring]
                if len(vals): u, cnt = np.unique(vals, return_counts=True); c[m] = u[cnt.argmax()]
    return np.stack([(c >> 16) & 255, (c >> 8) & 255, c & 255], -1).astype(np.uint8)

f32 = lambda im: np.asarray(im.convert("RGB")).astype(np.float32) / 255

def parts(a):
    """the sun patch on the table stays warm wood, not white; the laptop is slate in a few tones; the cup keeps a rim"""
    l = a @ [.3, .59, .11]
    t = code == TABLE; k = np.clip((l[t] - .45) / .55, 0, 1)[:, None]
    a[t] = a[t] * (1 - k * .55) + np.array([.98, .80, .55]) * k * .55 * np.clip(l[t] / .9, .6, 1)[:, None]
    lp = (code == LAPTOP) | (code == PAD)
    ll = np.clip(.12 + l[lp] * .62, 0, 1)[:, None]; a[lp] = ll * np.array([.92, .96, 1.12])
    c = code == CUP; a[c] = np.clip(a[c] * .9, 0, 1)
    for v in SEATS:   # leather: the 3D sheen pressed down so the seats read as soft, not glossy
        m = code == v; lm = l[m][:, None]; a[m] = a[m] * np.where(lm > .42, (.42 + (lm - .42) * .3) / np.maximum(lm, 1e-3), 1)
    p = code == PEN; a[p] = a[p] * .45 + np.array([.10, .08, .07])
    return a
g_sun, g_sh = grade(parts(smooth(f32(sun)))), grade(parts(smooth(f32(sh))))
g_wood = grade(f32(wood))
mos = np.zeros((max(H, 190), W * 2 + wood.width, 3), np.float32)
mos[:H, :W] = g_sun; mos[:H, W:2 * W] = g_sh; mos[:190, 2 * W:] = g_wood
pal = Image.fromarray((mos * 255).astype(np.uint8)).quantize(colors=40, method=Image.Quantize.MEDIANCUT, kmeans=4)
quant = lambda a: np.asarray(Image.fromarray((a * 255).astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))

edge = np.zeros((H, W), bool)                                      # where one part meets another
edge[1:] |= code[1:] != code[:-1]; edge[:, 1:] |= code[:, 1:] != code[:, :-1]
edge &= ~glass
rim = ndimage.binary_dilation(glass) & ~glass                       # the frame's inner lip around the glass

def px(g):
    q = despeck(quant(g), ~glass).astype(np.float32)
    q[edge] *= .66
    q[rim] *= .55
    return q.astype(np.uint8)

yy, xx = np.mgrid[0:H, 0:W]
inner = ndimage.binary_erosion(glass, iterations=2)
frost = np.zeros_like(glass)
alpha = np.where(glass, np.where(frost, 170, 0), 255).astype(np.uint8)
for g, name in [(g_sun, "cabin-day-px.png"), (g_sh, "cabin-day-shade-px.png")]:
    Image.fromarray(np.dstack([px(g), alpha]), "RGBA").save(f"{A}/{name}", optimize=True)
qw = np.asarray(Image.fromarray((g_wood * 255).astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
Image.fromarray(qw).save(f"{A}/snow-forest-px.png", optimize=True)
