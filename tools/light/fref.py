# 参考图的受光比例 f（0 = 阴影，1 = 全晒）：python3 tools/light/fref.py → $LIGHT_OUT/fref.npy
# 阴影基线用大窗口低百分位滤波（不能用最小值滤波，会把纹理当成光）
import numpy as np, json, cv2, sys
from scipy import ndimage
sys.path.insert(0, __import__('os').path.dirname(__file__)); from check import *
AZ, EL, W = 35.0, 32.0, 3.0; d = np.pi / 180
ce, se, ca, sa = np.cos(EL * d), np.sin(EL * d), np.cos(AZ * d), np.sin(AZ * d)
S = 2.597 / N; PAD = 160; M = N + 2 * PAD
ref = load(REF); Y = ref / 255; Y = np.where(Y <= .04045, Y / 12.92, ((Y + .055) / 1.055) ** 2.4) @ [.2126, .7152, .0722]
y0, y1, x0, x1 = BOARD
bm = np.zeros((N, N), bool); bm[y0:y1, x0:x1] = True
f = np.zeros((N, N))
for m in [bm, ~bm]:
    Yr = np.where(m, Y, np.nan)
    q = np.where(m, Y, np.nan)[::4, ::4]
    lo4 = ndimage.generic_filter(q, lambda v: np.nanpercentile(v, 8) if np.isfinite(v).any() else np.nan, size=41, mode='nearest')
    lo4 = np.where(np.isfinite(lo4), lo4, np.nanmedian(lo4))
    lo = ndimage.gaussian_filter(np.kron(lo4, np.ones((4, 4)))[:N, :N], 12)
    hi = np.nanpercentile(Yr, 98)
    f[m] = np.clip((Y - lo) / (hi - lo), 0, 1)[m]
f = np.clip((ndimage.gaussian_filter(f, 1.5) - 0.06) / 0.9, 0, 1)
f[:, :40] = f[:, 40:41]
import os
OUTD = os.environ.get('LIGHT_OUT', 'tools/light/out'); os.makedirs(OUTD, exist_ok=True)
np.save(os.path.join(OUTD, 'fref.npy'), f); print('saved fref.npy')
