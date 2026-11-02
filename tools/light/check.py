# 全项检查：LIGHT_REF=参考.png python3 tools/light/check.py 渲染.png
# 每项都和参考图比，打印两边数值和是否达标。BOARD 是参考图里物体的边框（y0,y1,x0,x1，N×N 坐标，逐像素实测），换参考图要重测。
# 画面宽度 2.536 m 用于把像素换成厘米（暗部衰减那项），换参考图要按已知尺寸重算。
# 每一项都和 LINTEX 原图比，打印数值和是否达标
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage

REF = os.environ.get('LIGHT_REF', '')                       # 参考照片（环境变量 LIGHT_REF）
N = 1140
BOARD = (343, 791, 122, 1021)   # 实测原图板边                       # y0,y1,x0,x1 in the 1140 frame

def load(p):
    return np.asarray(Image.open(p).convert('RGB').resize((N, N), Image.BICUBIC)).astype(float)

def lab(rgb):
    c = rgb / 255.; c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]); xyz = c @ M.T / np.array([.95047, 1., 1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def masks():
    b = np.zeros((N, N), bool); y0, y1, x0, x1 = BOARD; b[y0 + 12:y1 - 12, x0 + 12:x1 - 12] = True
    w = np.ones((N, N), bool); w[y0 - 25:y1 + 25, x0 - 25:x1 + 25] = False; w[:, :40] = False
    return b, w

def tone(a):
    L = lab(a); b, w = masks(); out = {}
    for nm, m in [('墙', w), ('板', b)]:
        x = L[m]; Lv = x[:, 0]; lo, hi = np.percentile(Lv, [25, 90])
        for part, sel in [('暗', Lv <= lo), ('亮', Lv >= hi)]:
            y = x[sel]; out[nm + part] = np.median(y, 0)
    x = L[b]; C = np.hypot(x[:, 1], x[:, 2])
    out['板明度分布'] = np.percentile(x[:, 0], [10, 50, 90]); out['板饱和度分布'] = np.percentile(C, [10, 50, 90]); out['冲白面积'] = (C < 3).mean() * 100
    return out

def litmask(a):
    g = ndimage.gaussian_filter(a @ [.2126, .7152, .0722], 2); b = np.zeros((N, N), bool); y0, y1, x0, x1 = BOARD; b[y0:y1, x0:x1] = True
    out = np.zeros((N, N), bool)
    for m in [b, ~b]:
        lo, hi = np.percentile(g[m], 20), np.percentile(g[m], 98); out[m] = ((g - lo) / max(hi - lo, 1))[m] > 0.5
    out[:, :40] = False
    return out

def edges(a):
    g = ndimage.gaussian_filter(a @ [.2126, .7152, .0722], 4); e = np.hypot(ndimage.sobel(g, 1), ndimage.sobel(g, 0))
    y0, y1, x0, x1 = BOARD; k = 14
    for (r0, r1, c0, c1) in [(y0 - k, y0 + k, x0 - k, x1 + k), (y1 - k, y1 + k, x0 - k, x1 + k), (y0 - k, y1 + k, x0 - k, x0 + k), (y0 - k, y1 + k, x1 - k, x1 + k)]: e[r0:r1, c0:c1] = 0
    e[:, :40] = 0
    return e

def falloff(a):
    # 墙上阴影的亮度 vs 离最近亮斑的距离（暗部漫反射）
    L = ndimage.gaussian_filter(a @ [.2126, .7152, .0722], 2); lm = litmask(a); _, w = masks()
    d = ndimage.distance_transform_edt(~lm) * 2.536 / N * 100
    sh = w & ~lm
    return [np.median(L[sh & (d >= lo) & (d < hi)]) if (sh & (d >= lo) & (d < hi)).sum() > 300 else np.nan for lo, hi in [(5, 15), (15, 35), (35, 70), (70, 140)]]

def board_edge(a):
    # 板子下沿往下 0~12 px 的亮度剖面（亮边 + 接触阴影），取板子中段的中位
    L = a @ [.2126, .7152, .0722]; y1 = BOARD[1]
    return [int(np.median(L[y1 - 4 + i, 400:700])) for i in range(0, 16, 2)]

def noise(a):
    # 平坦区域（右上墙面）的细噪声：减去 8px 模糊后的标准差
    L = a @ [.2126, .7152, .0722]; patch = L[60:300, 650:1100]
    return float(np.std(patch - ndimage.gaussian_filter(patch, 8)))

def main():
    img = load(sys.argv[1]); ref = load(REF)
    rows = []
    def row(name, rv, iv, ok, fmt='{:.1f}'):
        f = lambda v: ' '.join(fmt.format(x) for x in np.atleast_1d(v))
        rows.append((name, f(rv), f(iv), '✅' if ok else '❌'))
    T0, T1 = tone(ref), tone(img)
    for k in ['墙暗', '墙亮', '板暗', '板亮']:
        r, i = T0[k], T1[k]
        row(k + ' 明度', r[0], i[0], abs(r[0] - i[0]) <= 2.5)
        row(k + ' 色偏 a/b', r[1:], i[1:], np.all(np.abs(r[1:] - i[1:]) <= 1.5))
        row(k + ' 饱和度', np.hypot(*r[1:]), np.hypot(*i[1:]), abs(np.hypot(*r[1:]) - np.hypot(*i[1:])) <= 1.5)
    row('板明度 p10/50/90', T0['板明度分布'], T1['板明度分布'], np.all(np.abs(T0['板明度分布'] - T1['板明度分布']) <= 3))
    row('板饱和度 p10/50/90', T0['板饱和度分布'], T1['板饱和度分布'], np.all(np.abs(T0['板饱和度分布'] - T1['板饱和度分布']) <= 1.2))
    row('冲白面积 %', T0['冲白面积'], T1['冲白面积'], abs(T0['冲白面积'] - T1['冲白面积']) <= 5, '{:.0f}')
    lr, li = litmask(ref), litmask(img); iou = (lr & li).sum() / max(1, (lr | li).sum())
    row('形状重合 IoU', 1.0, iou, iou >= 0.80, '{:.2f}')
    er, ei = edges(ref), edges(img); k = int(er.size * .03)
    sr = np.mean(np.sort(er.ravel())[-k:]); si = np.mean(np.sort(ei.ravel())[-k:])
    row('边缘锐度（原图=1）', 1.0, si / sr, 0.85 <= si / sr <= 1.15, '{:.2f}')
    ec = np.corrcoef(ndimage.gaussian_filter(er, 3).ravel(), ndimage.gaussian_filter(ei, 3).ravel())[0, 1]
    row('边缘位置相关', 1.0, ec, ec >= 0.75, '{:.2f}')
    fr, fi = np.array(falloff(ref)), np.array(falloff(img))
    row('暗部漫反射衰减 5/15/35/70cm', fr, fi, np.nanmax(np.abs(fr - fi)) <= 4, '{:.0f}')
    br, bi = np.array(board_edge(ref)), np.array(board_edge(img))
    row('板下沿剖面', br, bi, (bi.max() - bi.min()) >= 0.6 * (br.max() - br.min()), '{:.0f}')
    nr, ni = noise(ref), noise(img)
    row('噪点（平坦处）', nr, ni, ni <= nr * 1.5 + 0.3, '{:.2f}')
    w = max(len(r[0]) for r in rows)
    for n, r, i, ok in rows: print(f'{ok} {n:<18} 原图 {r:<22} 渲染 {i}')
    print('达标', sum(r[3] == '✅' for r in rows), '/', len(rows))

if __name__ == '__main__': main()
