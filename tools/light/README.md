# 照片光影复现工具

用来把一张参考照片的光影复现到 three.js 场景里，并逐项验收。第一次用在 `lab/window-light.html`（LINTEX Silk Wall 窗光，21 项过 20 项）。

## 准备

```bash
python3 -m http.server 8765          # 在仓库根目录起本地服务
export LIGHT_REF=参考照片.png          # 参考图
export LIGHT_OUT=tools/light/out      # 中间文件（不进仓库）
```

## 顺序

1. **验收表先行**：`python3 tools/light/check.py 渲染.png`。换参考图时，先在参考图上逐像素量出物体边框，改 `check.py` 顶上的 `BOARD`；再按已知尺寸算出画面宽度，替换 2.536。
2. **受光比例**：`python3 tools/light/fref.py`，得到 `fref.npy`（0 = 阴影，1 = 全晒）。
3. **窗户几何**：`python3 tools/light/pfit.py 2000 3.0`。几扇半圆拱窗加一道横档、太阳大小，一起拟合，输出 `gobo.json`，页面用 `?g=` 加载。只用真几何，不要逐像素反推，那样会出锯齿。
4. **光照分量**：`bash tools/light/components.sh "ang=0.5"` 渲染太阳、天光、反射光三张线性图；再跑 `python3 tools/light/fit_lights.py`，打印页面参数（sun、sky、tint、bounce）。
5. **物体颜色和边**：`python3 tools/light/zones.py 渲染.png` 打印三样东西：物体分区色相、墙阴影的冷暖、物体边外侧的亮度剖面。按它调物体底色、`tint`，以及接触阴影的强度和宽度。
6. **交付前**：用 `node tools/light/render.js "" out.png 1140 1140` 按参考分辨率渲染。方屏和宽屏、冷调和暖调都要跑一遍 `check.py`。推送后再渲染一次线上地址，和本地图比对。

## 页面参数（lab/window-light.html）

`sun` `sky` `bounce` `bsig` `ang` `n` `tint` `board` `gap` `ao` `g` `raw=1`（线性输出，供拟合用）`tone=warm`

## 坑

- 设了 `shadowMap.autoUpdate=false`，就要设 `renderer.shadowMap.needsUpdate`。只设 `light.shadow.needsUpdate` 不会刷新阴影贴图。
- 一次只开一盏投影灯，多了会超出纹理单元，画面黑屏。
- Shape 外轮廓必须包住所有窗洞，越界会让三角化失败。
- 边缘类指标要先做 4 px 模糊，否则墙面纹理会被当成阴影边。
- 渲染分辨率低于参考图时，毫米级的接触阴影会被缩放糊掉。
