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
_lap = code == 0x881180; code[ndimage.binary_fill_holes(_lap) & ~_lap] = 0x991180   # the touchpad shows as a hole in the id render
glass = code == 0
# how much each part is smoothed (in pixels): props and table flat and clean, the panelling keeps its grain
WALL, TABLE = 0x111180, 0x110080
LAPTOP, PAD, CUP, PAPER, PEN = 0x881180, 0x991180, 0x2280, 0x112280, 0x222280
SEATS = (0x1180, 0xaa0080, 0x770080, 0xdd0080)
sig = {TABLE: .7, LAPTOP: 0, PAD: 0, CUP: 0, PAPER: .6, PEN: 0, WALL: 0.0}
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
    ls = SHADE_L[lp] * (1.2 if a is not None and lit else 1.0)        # keys come from the unlit still: the sun washes them out
    ll = np.clip(.10 + ls * .8, 0, 1)[:, None]; a[lp] = ll * np.array([.90, .95, 1.10])
    c = code == CUP; lc = a @ [.3, .59, .11]; lc2 = crisp(lc, (CUP,), 2.5)
    a[c] = np.clip(a[c] * (lc2[c] / np.maximum(lc[c], 1e-3))[:, None] * .92, 0, 1)
    for v in SEATS:   # leather: the 3D sheen pressed down so the seats read as soft, not glossy
        m = code == v; lm = l[m][:, None]; a[m] = a[m] * np.where(lm > .42, (.42 + (lm - .42) * .3) / np.maximum(lm, 1e-3), 1)
    p = code == PEN; a[p] = a[p] * .45 + np.array([.10, .08, .07])
    return a
SHADE_L = f32(sh) @ [.3, .59, .11]
def crisp(l, part, amt):
    m = np.isin(code, part).astype(np.float32)                   # unsharp mask inside the part only: keys and pattern stand out
    b = ndimage.gaussian_filter(l * m, 1.0) / np.maximum(ndimage.gaussian_filter(m, 1.0), 1e-3)
    return np.where(m > 0, np.clip(l + (l - b) * amt, 0, 1), l)
SHADE_L = crisp(SHADE_L, (LAPTOP, PAD), 3.0)
lit = True;  g_sun = grade(parts(smooth(f32(sun))))
lit = False; g_sh = grade(parts(smooth(f32(sh))))
g_wood = grade(f32(wood))
mos = np.zeros((max(H, 190), W * 2 + wood.width, 3), np.float32)
mos[:H, :W] = g_sun; mos[:H, W:2 * W] = g_sh; mos[:190, 2 * W:] = g_wood
pal = Image.fromarray((mos * 255).astype(np.uint8)).quantize(colors=40, method=Image.Quantize.MEDIANCUT, kmeans=4)
quant = lambda a: np.asarray(Image.fromarray((a * 255).astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))

edge = np.zeros((H, W), bool)                                      # where one part meets another
edge[1:] |= code[1:] != code[:-1]; edge[:, 1:] |= code[:, 1:] != code[:, :-1]
edge &= ~glass
rim = ndimage.binary_dilation(glass) & ~glass                       # the frame's inner lip around the glass

PROPS = (LAPTOP, PAD, CUP, PEN)
def poster(g, q):
    """laptop and cup get their own few colours (k-means inside the part): keys and the cup's pattern survive, cleanly"""
    q = q.copy()
    for parts_, k in (((LAPTOP, PAD), 5), ((CUP,), 5)):
        m = np.isin(code, parts_); X = g[m].reshape(-1, 3)
        C = X[np.linspace(0, len(X) - 1, k).astype(int)][np.argsort(X[np.linspace(0, len(X) - 1, k).astype(int)] @ [.3, .59, .11])]
        C = np.array(sorted(X[np.random.RandomState(1).choice(len(X), k, replace=False)].tolist(), key=sum))
        for _ in range(20):
            lab = ((X[:, None] - C[None]) ** 2).sum(-1).argmin(1); C = np.array([X[lab == i].mean(0) if (lab == i).any() else C[i] for i in range(k)])
        q[m] = (C[lab] * 255).astype(np.uint8)
    return q
# the keyboard, drawn on the base in its own perspective: hinge H0→H1, depth H0→L (measured on the id render)
H0, H1, Lc = np.array([193.8, 191.3]), np.array([225.0, 216.3]), np.array([160.0, 196.3])
U, D = H1 - H0, Lc - H0; M = np.linalg.inv(np.array([U, D]).T)
yy_, xx_ = np.mgrid[0:H, 0:W]; st = (np.stack([xx_ + .5 - H0[0], yy_ + .5 - H0[1]], -1) @ M.T)
s_, t_ = st[..., 0], st[..., 1]
kb = (code == LAPTOP) & (s_ > .07) & (s_ < .93) & (t_ > .12) & (t_ < .58)
key = kb & ((s_ * 15) % 1 < .62) & (((t_ - .12) / .46 * 6) % 1 < .66)
def px(g):
    q = poster(g, quant(g))
    q[kb] = (104, 110, 128); q[key] = (196, 202, 218); q[code == PAD] = (170, 176, 192)
    q = despeck(q, ~glass & ~np.isin(code, PROPS)).astype(np.float32)
    q = despeck(q.astype(np.uint8), np.isin(code, PROPS), n=2).astype(np.float32)
    q[edge] *= .66
    q[rim] *= .55
    return q.astype(np.uint8)

yy, xx = np.mgrid[0:H, 0:W]
a = np.asarray(sun)[..., 3]                                          # the snow on the glass is kept from the render
frost = (a > 70) & (a <= 110) & (xx % 3 == 0) & (yy % 3 == 1)
alpha = np.where(glass, np.where(a > 110, 255, np.where(frost, 200, 0)), 255).astype(np.uint8)
for g, name in [(g_sun, "cabin-day-px.png"), (g_sh, "cabin-day-shade-px.png")]:
    Image.fromarray(np.dstack([px(g), alpha]), "RGBA").save(f"{A}/{name}", optimize=True)
qw = np.asarray(Image.fromarray((g_wood * 255).astype(np.uint8)).quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
Image.fromarray(qw).save(f"{A}/snow-forest-px.png", optimize=True)
