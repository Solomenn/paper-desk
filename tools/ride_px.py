"""纸桌 · the pixel ride from the compartment illustration (tools/src/cabin-illustration.png, 1586×992).
   py tools/ride_px.py  →  assets/ride/cabin.png    480×300 pixel art (48 colours, no dither), the picture at rest
                           assets/ride/shade.png    the sunlit pixels only, dimmed (shown through the tree shadows)
                           assets/ride/glass.png    white where the window glass is
                           assets/ride/wood.png     the wood behind the glass as one strip that tiles sideways"""
import os, numpy as np
from PIL import Image, ImageFilter, ImageDraw
import xml.etree.ElementTree as ET
from scipy import ndimage
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); O = os.path.join(R, "assets", "ride"); os.makedirs(O, exist_ok=True)
src = Image.open(os.path.join(R, "tools", "src", "cabin-illustration.png")).convert("RGB")
W, H = 480, 300
pal = src.filter(ImageFilter.MedianFilter(3)).resize((W, H), Image.BOX).quantize(48, method=Image.Quantize.MEDIANCUT, kmeans=8, dither=Image.Dither.NONE)
q = lambda im: np.asarray(im.quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
cab = np.asarray(pal.convert("RGB")).astype(np.int32)

# Use the same traced geometry as ride.js. Colour cannot distinguish the blue
# laptop screen from snow, and filling colour-selection holes erases foreground.
mask = Image.new("L", (W, H)); draw = ImageDraw.Draw(mask)
root = ET.parse(os.path.join(O, "glass.svg")).getroot()
for polygon in root.iter("{http://www.w3.org/2000/svg}polygon"):
    points = [tuple(map(int, p.split(","))) for p in polygon.attrib["points"].split()]
    draw.polygon(points, fill=255)
glass = np.asarray(mask) > 0
r, g, b = cab[..., 0], cab[..., 1], cab[..., 2]
Image.fromarray((glass * 255).astype(np.uint8)).save(f"{O}/glass.png", optimize=True)
Image.fromarray(cab.astype(np.uint8)).save(f"{O}/cabin.png", optimize=True)

# where the sun lands inside (table, paper, seat tops): those pixels get a cool shaded twin
l = .3 * r + .59 * g + .11 * b; yy, xx = np.mgrid[0:H, 0:W]
screen = (xx > 235) & (xx < 300) & (yy > 175) & (yy < 255) & (b > r)          # the laptop's own glow isn't sun
sun = ~glass & (l > 150) & (yy > 196) & (r - b < 22) & ~screen                   # below the sill: table, paper, seat tops
sun = ndimage.binary_opening(sun, iterations=1)
sh = cab.astype(np.float32); sh[sun] *= np.array([.70, .75, .88])
shq = q(Image.fromarray(sh.astype(np.uint8)))
Image.fromarray(np.dstack([shq, (sun * 255).astype(np.uint8)]), "RGBA").save(f"{O}/shade.png", optimize=True)   # only the sunlit pixels

# the wood: both panes' views, side by side, then mirrored, so it tiles; seams cross-faded
S = src.width / W
Y0 = 69                                                          # the strip covers rows Y0 .. Y0+140 of the picture
def pane(x0, x1):   # clear of the frame above and the laptop lid below; the sky and the snow carried to the edges
    a = np.asarray(src.crop((x0, 240, x1, 598)).resize((round((x1 - x0) / S), round(358 / S)), Image.BOX)).astype(np.float32)
    top = round(240 / S) - Y0; a = a[3:]; top += 3; k = 140 - top - len(a); snow = np.concatenate([a[-10:], a[-10:][::-1]] * (k // 20 + 1), 0)[:k]
    return np.concatenate([np.repeat(a[:1], top, 0), a, snow], 0)
A, B = pane(330, 715), pane(880, 1215)
def join(p, q_, f=8):
    t = np.linspace(0, 1, f)[None, :, None]; mid = p[:, -f:] * (1 - t) + q_[:, :f] * t
    return np.concatenate([p[:, :-f], mid, q_[:, f:]], 1)
strip = join(join(join(A, B), A[:, ::-1]), B[:, ::-1]); strip = join(strip, strip[:, :8])[:, :-8]
Image.fromarray(q(Image.fromarray(strip.clip(0, 255).astype(np.uint8)))).save(f"{O}/wood.png", optimize=True)
ys, xs = np.where(glass); print("glass rows", ys.min(), ys.max(), "wood", strip.shape[1], "x", strip.shape[0])
