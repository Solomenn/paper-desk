# 用法：python3 tools/light/pfit.py [最多评估次数] [侧墙距离W] [输出json]
# 参数化窗户：每扇窗 = 竖直边 + 圆弧顶（在左墙上），A 窗带一道横档；投到后墙后用有大小的太阳模糊，和原图受光比例对齐
import numpy as np, json, cv2, sys
from scipy import ndimage, optimize
sys.path.insert(0, __import__('os').path.dirname(__file__)); from check import *
import os; OUTD = os.environ.get('LIGHT_OUT', 'tools/light/out'); os.makedirs(OUTD, exist_ok=True)
AZ, EL = 35.0, 32.0; W = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0; d = np.pi / 180
ce, se, ca, sa = np.cos(EL * d), np.sin(EL * d), np.cos(AZ * d), np.sin(AZ * d)
f = np.load(os.path.join(OUTD, 'fref.npy'))                                  # 原图受光比例（gobo_fit.py 算的）
YC = 1.5 - 3 * 2.536 / 1140   # 画面中心的世界高度：板子中心 1.5 m 在画面中心上方 3 px
R = 2; n = N // R; S = 2.536 / n; PAD = 90; M = n + 2 * PAD
fs = cv2.resize(f.astype(np.float32), (n, n), interpolation=cv2.INTER_AREA)
y0, y1, x0, x1 = [v // R for v in BOARD]
valid = np.ones((n, n), bool); valid[:, :22] = False
for (r0, r1, c0, c1) in [(y0 - 7, y0 + 7, x0 - 7, x1 + 7), (y1 - 7, y1 + 7, x0 - 7, x1 + 7), (y0 - 7, y1 + 7, x0 - 7, x0 + 7), (y0 - 7, y1 + 7, x1 - 7, x1 + 7)]: valid[r0:r1, c0:c1] = False
def img2side(px, py, s=S, nn=n):
    xw = (px - nn / 2) * s; yw = YC + (nn / 2 - py) * s; t = (xw + W) / (ce * ca); return t * ce * sa, yw + t * se
def side2img(z, y, s=S, nn=n, pad=PAD):
    t = z / (ce * sa); xw = -W + t * ce * ca; yw = y - t * se; return (xw / s + nn / 2 + pad, (YC - yw) / s + nn / 2 + pad)
def window(zl, zr, ys, zc, r, sill=-3.0, k=48):
    zz = np.linspace(zl, zr, k); top = ys + np.sqrt(np.clip(r * r - (zz - zc) ** 2, 0, None))
    return [(zl, sill)] + list(zip(zz, top)) + [(zr, sill)]
def shapes(p):
    def full(zl, zr, ys): return (zl, zr, ys, (zl + zr) / 2, (zr - zl) / 2)
    A = full(*p[0:3]); B = full(*p[3:6]); C = full(*p[6:9]); yt, ht = p[9:11]
    holes = [window(*A), window(*B), window(*C)]
    bars = [[(A[0] - .05, yt), (A[1] + .05, yt), (A[1] + .05, yt + ht), (A[0] - .05, yt + ht)]]
    return holes, bars
xs = (np.arange(M) - PAD - n / 2) * S; tcol = (xs + W) / (ce * ca); inc = ce * sa
dv = np.array([ce * ca, -se]); dv /= np.linalg.norm(dv)
def kern(tv, ang):
    a = max(tv * np.tan(ang * d) / S, .5); b = a / inc; Rr = int(np.ceil(b)) + 1
    yy, xx = np.mgrid[-Rr:Rr + 1, -Rr:Rr + 1].astype(float)
    u = xx * dv[0] - yy * dv[1]; v = xx * dv[1] + yy * dv[0]
    k = ((u / b) ** 2 + (v / a) ** 2 <= 1).astype(np.float32); return k / k.sum()
def raster(p):
    holes, bars = shapes(p); m = np.zeros((M, M), np.uint8)
    for h in holes: cv2.fillPoly(m, [np.round(np.array([side2img(z, y) for z, y in h]) * 16).astype(np.int32)], 255, cv2.LINE_AA, 4)
    for h in bars: cv2.fillPoly(m, [np.round(np.array([side2img(z, y) for z, y in h]) * 16).astype(np.int32)], 0, cv2.LINE_AA, 4)
    return m.astype(np.float32) / 255
def sim(p, ang):
    m = raster(p); TS = np.linspace(tcol.min(), tcol.max(), 6)
    outs = [cv2.filter2D(m, -1, kern(v, ang)) for v in TS]; idx = np.interp(tcol, TS, np.arange(len(TS))); o = np.zeros_like(m)
    for j in range(len(TS)): o += outs[j] * np.clip(1 - np.abs(idx - j), 0, 1)[None, :]
    return o[PAD:-PAD, PAD:-PAD]
def loss(q):
    p, ang = q[:-1], q[-1]
    if ang < 0.1: return 9
    e = (sim(p, ang) - fs)[valid]; return float(np.mean(e * e))
# 初值：从原图的特征点换算（1140 坐标 /2）
def zx(px): return img2side(px / R, 0)[0]
def yat(px, py): return img2side(px / R, py / R)[1]
A = [zx(20), zx(300), yat(170, 104) - 0.0, zx(170), (zx(300) - zx(20)) / 2]
B = [zx(490), zx(705), yat(597, 677), zx(597), (zx(705) - zx(490)) / 2]
C = [zx(750), zx(985), yat(867, 825), zx(867), (zx(985) - zx(750)) / 2]
for X in (A, B, C): X[2] -= X[4]
yt = yat(160, 821); q0 = np.array(A[:3] + B[:3] + C[:3] + [yt, 0.19, 0.6])
# 横档先单独扫一遍（别的参数不动），免得优化器把它推出画面
best_l, best_q = 9, None
for dy in np.linspace(-0.3, 0.3, 13):
    for hh in [0.12, 0.16, 0.2, 0.24]:
        q = q0.copy(); q[9] = yt + dy; q[10] = hh; l = loss(q)
        if l < best_l: best_l, best_q = l, q
q0 = best_q; print('transom scan', best_l, q0[9:11], flush=True)
print('init loss', loss(q0))
import time; t0=time.time(); loss(q0); print('t/eval', round(time.time()-t0,2), flush=True)
best = optimize.minimize(loss, q0, method='Powell', options={'maxfev': int(sys.argv[1]) if len(sys.argv) > 1 else 1500, 'xtol': 1e-3, 'ftol': 1e-6})
q = best.x; print('final loss', best.fun, 'ang', q[-1]); print(np.round(q, 3).tolist())
OUTJ = sys.argv[3] if len(sys.argv) > 3 else os.path.join(OUTD, 'gobo.json')
s = sim(q[:-1], q[-1]); cv2.imwrite(OUTJ + '.png', (np.hstack([fs, s, np.abs(fs - s) * valid]) * 255).clip(0, 255).astype(np.uint8))
holes, bars = shapes(q[:-1])
json.dump({"az": AZ, "el": EL, "W": W, "Z1": 12.0, "Y1": 14.0, "ang": float(q[-1]), "holes": [[[round(a, 4), round(b, 4)] for a, b in h] for h in holes],
           "islands": [[[round(a, 4), round(b, 4)] for a, b in h] for h in bars]}, open(OUTJ, 'w'))
