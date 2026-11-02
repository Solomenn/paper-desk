# 分区色相 + 墙阴影冷暖：python3 tools/light/zones.py 渲染.png
import sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
from check import *
r = load(REF); f = load(sys.argv[1]); Lr, Lf = lab(r), lab(f); y0, y1, x0, x1 = BOARD
for nm, (c0, c1) in {'左亮': (x0 + 20, x0 + 150), '中': (x0 + 330, x0 + 550), '右暗': (x1 - 220, x1 - 20)}.items():
    m = np.zeros((N, N), bool); m[y0 + 20:y1 - 20, c0:c1] = True; o = []
    for L in (Lr, Lf):
        a, b = np.median(L[..., 1][m]), np.median(L[..., 2][m])
        o.append('L%.1f 色相%.0f 饱和%.1f' % (np.median(L[..., 0][m]), np.degrees(np.arctan2(b, a)) % 360, np.hypot(a, b)))
    print('物体', nm, '参考', o[0], '| 渲染', o[1])
for nm, a in [('参考', r), ('渲染', f)]:
    L = lab(a); _, w = masks(); sh = w & ~litmask(a)
    print(nm, '墙阴影 a/b %.1f %.1f' % tuple(np.median(L[sh][:, 1:], 0)))
    Y = a @ [.2126, .7152, .0722]; y0, y1, x0, x1 = BOARD
    print('   右边外侧', [int(np.median(Y[(y0 + y1) // 2 - 100:(y0 + y1) // 2 + 100, x])) for x in range(x1 - 6, x1 + 12)])
    print('   下边外侧', [int(np.median(Y[y, (x0 + x1) // 2 - 150:(x0 + x1) // 2 + 150])) for y in range(y1 - 3, y1 + 9)])
