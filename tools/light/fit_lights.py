# 光照分量离线拟合：先跑 components.sh 渲染三张线性分量，再 python3 tools/light/fit_lights.py
# 按 three 的 ACES 公式合成，逐像素对齐参考图的 Lab（a/b 权重 ×4），输出太阳、天光 RGB、反射光强度
import json
import numpy as np, sys
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__)); from check import *
import os; OUTD = os.environ.get('LIGHT_OUT', 'tools/light/out'); os.makedirs(OUTD, exist_ok=True)
def lin(p):
    c = np.asarray(Image.open(p).convert('RGB').resize((N, N), Image.BICUBIC)).astype(float) / 255
    return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4) * 4
S, K, B = lin(f'{OUTD}/c_sun.png'), lin(f'{OUTD}/c_sky.png'), lin(f'{OUTD}/c_bnc.png')
Ai = np.array([[0.59719, 0.07600, 0.02840], [0.35458, 0.90834, 0.13383], [0.04823, 0.01566, 0.83777]]).T
Ao = np.array([[1.60475, -0.10208, -0.00327], [-0.53108, 1.10813, -0.07276], [-0.07367, -0.00605, 1.07602]]).T
def aces(c, exp=1.0):
    c = c * exp / 0.6; c = c @ Ai.T
    a = c * (c + 0.0245786) - 0.000090537; b = c * (0.983729 * c + 0.4329510) + 0.238081; c = a / b
    c = np.clip(c @ Ao.T, 0, 1); return np.where(c <= .0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - .055) * 255
def comp(x): s, k, b = x; return aces(S * s + K * k + B * b)
ref = load(REF); T0 = tone(ref); F0 = np.array(falloff(ref))
def loss(x, verbose=False):
    img = comp(x); T1 = tone(img); e = 0
    for k_ in ['墙暗', '墙亮', '板暗', '板亮']: e += (T0[k_][0] - T1[k_][0]) ** 2
    e += np.sum((T0['板明度分布'] - T1['板明度分布']) ** 2)
    f = np.array(falloff(img)); e += np.nansum((F0 - f) ** 2) / 4
    return e

from scipy import optimize
sm = lambda a: ndimage.gaussian_filter(a, (4, 4, 0))
Lr = lab(sm(ref))
valid = np.ones((N, N), bool); valid[:, :40] = False
y0, y1, x0, x1 = BOARD
for (r0, r1, c0, c1) in [(y0 - 10, y0 + 10, x0 - 10, x1 + 10), (y1 - 10, y1 + 10, x0 - 10, x1 + 10), (y0 - 10, y1 + 10, x0 - 10, x0 + 10), (y0 - 10, y1 + 10, x1 - 10, x1 + 10)]: valid[r0:r1, c0:c1] = False
sub = (slice(None, None, 3), slice(None, None, 3))
Ss, Ks, Bs, Lrs, vs = [sm(X)[sub] for X in (S, K, B)] + [Lr[sub], valid[sub]]
def compx(x, s_=Ss, k_=Ks, b_=Bs): return aces(s_ * x[0] + k_ * np.array(x[1:4]) + b_ * x[4])
def loss2(x):
    if min(x) < 0: return 1e9
    d = lab(compx(x)) - Lrs; return float(np.mean((d[..., 0] ** 2 + 4 * d[..., 1] ** 2 + 4 * d[..., 2] ** 2)[vs]))
x0_ = [8.2, 2.3, 2.3, 2.3, 4.0]
r = optimize.minimize(loss2, x0_, method='Powell', options={'maxfev': 4000})
print('x', np.round(r.x, 3).tolist(), 'loss', r.fun)
img = aces(S * r.x[0] + K * np.array(r.x[1:4]) + B * r.x[4]); Image.fromarray(img.astype(np.uint8)).save(f'{OUTD}/fit.png')
json.dump(dict(zip(['sun', 'sky_r', 'sky_g', 'sky_b', 'bounce'], r.x.tolist())), open(f'{OUTD}/lights.json', 'w'), indent=1)
print('页面参数：sun=%.2f sky=%.2f tint=%.3f,%.3f,%.3f bounce=%.2f' % (r.x[0], np.mean(r.x[1:4]), *(r.x[1:4] / np.mean(r.x[1:4])), r.x[4]))
