"""雪国线窗外：把 Poly Haven「Passendorf Snow」（CC0）拆成三层，供 carview.js 使用。

    python3 tools/view_snowfield.py /path/to/passendorf_snow.jpg
    原图：https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/passendorf_snow.jpg （8192×4096）

输出到 assets/view/：
    skyp.webp   天空（太阳原样），静止
    land.webp   地平线上的林线和山（带透明度），慢速平移
    snow.webp   地平线以下的雪地，一行比一行快

grade()：车窗参考照片（同一博主的六张窗景）的“滤镜”。逐亮度段统计过参考照片：
暗部和中间调偏青绿（红 −12、绿 +6、蓝 +6 左右），高光接近中性、不爆，整体饱和度低。
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O = os.path.join(ROOT, "assets", "view") + os.sep
SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/sf/pj.jpg"

# the band of the panorama the window looks at (8K rows 1232..2542); the sun and the snow line in it
Y0, H = 1232, 1310
HZ = 834; SX, SY = 4916, 400; R = 360


def grade(im):
    """the reference look: muted colour, a teal cast in the shadows and mids, highlights rolled off"""
    x = im / 255.0
    L = x @ np.array([.299, .587, .114])
    # tone: a little darker, the blacks lifted, a soft shoulder so the snow and the sky never clip
    t = np.clip(L, 0, 1)
    Lt = .04 + .88 * t
    Lt = np.where(Lt > .62, .62 + (Lt - .62) / (1 + (Lt - .62) / .30), Lt)   # shoulder: 1.0 -> ~.82
    Lt *= .97
    # colour: keep a part of the chroma, then add the cast (strongest in the mids, nearly gone in the highlights)
    c = x - L[..., None]
    c *= .5
    w = np.clip(1.15 - Lt, 0, 1)[..., None] ** 1.2
    cast = np.array([-12, 9, -1]) / 255.0
    out = Lt[..., None] + c + cast * w
    return np.clip(out * 255, 0, 255)


def main():
    big = Image.open(SRC).convert("RGB")
    im = np.asarray(big.crop((0, Y0, big.width, Y0 + H))).astype(np.float32)
    H_, W, _ = im.shape
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = im.mean(2)
    yy, xx = np.mgrid[0:H_, 0:W]
    m1 = ndimage.uniform_filter(lum, 9); var = ndimage.uniform_filter(lum * lum, 9) - m1 * m1
    sky = ((b - r > 40) | ((var < 6) & (lum > 150))) & (yy < HZ - 6)
    sunzone = (xx - SX) ** 2 + (yy - SY) ** 2 < (R + 80) ** 2
    sky |= sunzone & (yy < HZ - 80)
    sky = np.pad(sky, 8, mode="edge")
    sky = ndimage.binary_closing(ndimage.binary_opening(sky, iterations=4), iterations=4)[8:-8, 8:-8]
    lb, _ = ndimage.label(sky); top = np.unique(lb[:3]); sky = np.isin(lb, top[top > 0])
    skyrow = np.zeros((HZ + 12, 3))
    for y in range(HZ + 12):
        m = sky[y] & ~sunzone[y]
        if m.sum() > 100: skyrow[y] = np.median(im[y][m], 0)
    ok = skyrow.sum(1) > 0; idx = np.where(ok)[0]
    for y in range(HZ + 12):
        if not ok[y]: skyrow[y] = skyrow[idx[np.argmin(abs(idx - y))]]

    gim = grade(im); gsky = grade(skyrow[:, None, :])[:, 0]
    alpha = ndimage.gaussian_filter((~sky).astype(np.float32), 1.4)[:HZ + 12]
    land = np.dstack([gim[:HZ + 12], alpha * 255]); land[HZ - 4:, :, 3] = 255
    Image.fromarray(land.astype(np.uint8)).save(O + "land.webp", "WEBP", quality=86)
    Image.fromarray(gim[HZ - 4:].astype(np.uint8)).save(O + "snow.webp", "WEBP", quality=82)
    # the sky exactly as photographed (the sun where it is) for the part the window starts on; behind the tree line the
    # sky row's own colour, so the line can slide away without leaving a hole
    X0, VW = SX - 528, 1760
    skyp = gim[:HZ + 12, X0:X0 + VW].copy(); bad = ~sky[:HZ + 12, X0:X0 + VW]
    for y in range(HZ + 12):
        if bad[y].any(): skyp[y, bad[y]] = gsky[y]
    skyp = ndimage.gaussian_filter(skyp, (2, 2, 0)) * bad[..., None] + skyp * (~bad[..., None])
    Image.fromarray(skyp.astype(np.uint8)).save(O + "skyp.webp", "WEBP", quality=88)


if __name__ == "__main__":
    main()
