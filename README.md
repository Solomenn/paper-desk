# 纸桌 · Paper Desk

个人效率网页：项目板（LINTEX Silk Wall 浅蓝玻璃板）上的项目卡、便签板（LINTEX Textile Noticeboard 织物板）上的便签、今日台历、雪国线专注计时、卡册、手账和小票。
当前只开白天模式（夜间模式的代码还在，切换按钮已关）。

在线：<https://solomenn.github.io/paper-desk/>　推到 `main` 后 GitHub Pages 自动发布。

## 页面

| 页面 | 内容 |
|---|---|
| [`index.html`](index.html) | 桌面。项目板：项目卡（在做 / 待做 / 做完）；便签板：便签；顶部今日台历；左下角打开工具栏（计时器、卡册、手账、小票） |
| [`focus.html`](focus.html) | 雪国线计时器：上车前选项目、拖行程刻度尺；行驶中是车厢和窗外雪原。下车把分钟数记到项目上 |
| [`album.html`](album.html) | 卡册：项目、便签、车票、小票，按月；车票有时间轴视图 |
| [`journal.html`](journal.html) | 手账书架：入口页的米白实体书架（3D）；卡册待做成实体放进去，暂时空着 |
| [`receipt.html`](receipt.html) | 今日小票机 |
| [`radio.html`](radio.html) | 白噪音收音机：Braun T3 实体模型，转调谐盘换台；从桌面和雪国线以浮层打开 |

## 下一阶段物件参考（已确认）

本节记录用户已确认的产品外观参考。它们是**设计方向与选型依据**，不表示对应 3D 模型已经下载、导入或替换现有页面。

### 项目板：LINTEX Silk Wall

用户确认参考图一的方向：**浅蓝色、哑光玻璃、无厚重边框、隐藏安装、薄而完整的矩形板体**。

- 官方产品：<https://lintex.com/products/silk-wall/>
- 表面：4 mm Silk Glass® 哑光磁性玻璃；低铁玻璃使颜色呈现更干净；降低反光。
- 结构：隐藏式安装，板面离墙 12 mm；钢化夹层玻璃。
- 颜色：24 种 Silk Glass 颜色。优先继续比较浅蓝、雾蓝和低饱和蓝，不把当前色号提前锁死。
- 3D：官方提供 7 种尺寸的 DWG / RFA / OBJ / FBX；配置器可导出 OBJ / GLB / STL。
- 目标：以用户确认的浅蓝色产品图为准，不沿用原来 CSS 绿黑板与厚木框的外观。

### 便签板：LINTEX Textile Noticeboard

用户确认的是截图中间那张**横向宽幅、米灰色织物表面、四边包布、无外露边框**的方案。它对应 **Textile Noticeboard**，不是 Air Noticeboard。

- 官方产品：<https://lintex.com/products/textile-noticeboard/>
- 结构：木质基板，织物覆盖正面并折包边缘；隐藏式固定件，无可见外框；离墙 20 mm。
- 材料：织物、木材；边缘为折叠织物。
- 官方尺寸（宽 × 高）：1005 × 1205、1505 × 1205、2005 × 1205、2505 × 1205、3005 × 1205 mm。最终建模尺寸以后续配置器选择为准，不预先替用户选尺寸。
- 面料：官方配置器列出 Linen、Blazer Lite、Cara、Fiji、Cura 等系列；当前只确认了截图中的米灰织物视觉方向，**尚未锁定具体面料系列和色号**。
- 3D：官方提供 DWG / RFA / OBJ / FBX；配置器可导出 OBJ / GLB / STL。
- 建模目标：保留宽幅矩形比例、织物包边和极薄的墙面悬浮感；不要加木框、金属外框或底部柜体。
- **Air Noticeboard 不再是当前选型**；它的 Forbo 亚麻油毡色卡仍保留作独立配色研究参考，不能把那些色号直接套用到 Textile Noticeboard。

### LINTEX 色卡研究

用户希望把 LINTEX 作为后续材质与配色研究的重要参考。注意两套色卡不能混为一谈：

**A. Forbo Bulletin Board 亚麻油毡色卡（15 色；保留作 LINTEX 配色研究参考，原为 Air Noticeboard 的可选表面，不属于当前定稿的 Textile Noticeboard）**

| 色名 | 色号 |
|---|---:|
| Mushroom Medley | 2208 |
| Brown Rice | 2187 |
| Blanched Almond | 2186 |
| Nutmeg Spice | 2166 |
| Cinnamon Bark | 2207 |
| Oyster Shell | 2206 |
| Potato Skin | 2182 |
| **Duck Egg** | **2162** |
| Poppy Seed | 2204 |
| Black Olive | 2209 |
| Hot Salsa | 2210 |
| Tangerine Zest | 2211 |
| Fresh Pineapple | 2212 |
| Baby Lettuce | 2213 |
| **Blue Berry** | **2214** |

官方资料：<https://lintex.com/products/air-noticeboard/>；色卡资料：<https://www.vogels-halterung.de/pdf/catalogs/en/lintex/lintex-catalog.pdf>。

**B. Textile Noticeboard 当前面料系列**

官方配置器当前列出 Linen、Blazer Lite、Cara、Fiji、Cura 等面料系列。**2026-11-03 定为 Blazer Lite LTH39**：用的是 LINTEX 下载页带材质的官方模型（27829OMV，`assets/objects/textile-noticeboard-2500x1200-lth39.glb`），织纹来自官方的颜色图和凹凸图。后续应以官方配置器的真实面料样本为准；不要把 Forbo Bulletin Board 的 Duck Egg 2162、Blue Berry 2214 等色号当成 Textile Noticeboard 的面料色号。

**C. Silk Wall 使用的 Silk Glass® 色卡（24 色）**

Blossom 690、Peaceful 360、Frank 540、Shy 120、Lonely 170、Cozy 450、Lively 460、Loving 760、Calm 320、Gentle 560、Soft 150、Warm 160、Blush 680、Casual 480、Mellow 730、Brave 750、Crisp 350、Fair 550、Pure 130、Pale 230、Lazy 140、Naive 640、Mild 250、Sunny 740。

官方资料：<https://lintex.com/products/silk-wall/>；色卡目录：<https://www.vogels-halterung.de/pdf/catalogs/en/lintex/lintex-catalog.pdf>。

后续研究重点：把两套色卡的真实色样、不同日光下的偏色、哑光/织物/木材/金属之间的搭配整理成纸桌自己的材质板；不要直接把屏幕截图取色当成实物标准。

### 手账书架：Bookshelf Short LOWPOLY（米白版本）

用户已选定并上传 Sketchfab 的 **Bookshelf Short LOWPOLY**。保留书籍贴图和原材质设计，只将书架结构改为米白色；不再使用此前的公共图书馆 AI 书架候选。

- **模型来源：** <https://sketchfab.com/3d-models/bookshelf-short-lowpoly-e2eb14aedca24c22a80220e8d72c379c>
- **作者：** EFX（<https://sketchfab.com/evan4129>）；许可：**CC BY 4.0**。
- **上传原件：** `bookshelf_short_lowpoly.glb`，约 47.7 MB；GLB 内为单 mesh / 单 PBR 材质，书架结构与书籍使用同一张 4K Base Color 图集，另有 Metallic-Roughness 和 Normal 贴图。
- **改色方法：** 根据 UV 区域只调整书架结构贴图，不漂白书脊和书籍封面；结构目标色 `#E9E2D6`（暖米白）。保留原始书籍图案、法线细节和粗糙度变化。
- **优化后的模型：** `bookshelf_short_offwhite.glb`，约 24.7 MB；Base Color 保持 4K，Normal / Metallic-Roughness 为 2K，并降低原木纹法线强度以适配哑光涂装。几何拓扑保持不变：1 mesh、842 triangles；书籍细节来自原始 4K 贴图。
- **本地预览包：** `paper-desk-object-preview.zip` 仍保留，包含优化后的米白 GLB、静态预览图和 Windows 启动脚本。
- **状态：** 米白模型已制作并完成 GLB 结构重读验证；在线浏览馆 `models.html` 已撤下（2026-11-02，用户决定）。没有采用：2026-11-03 `journal.html` 改用入口页那个米白书架（`wooden-shelf.glb`）。

### 其他物件的交互预览入口

下列链接打开各物件原站的交互预览。

- **小票机：HQ3DMOD POS Receipt Printer** — [Sketchfab 3D 预览](https://sketchfab.com/3d-models/pos-receipt-printer-4daf4e22d9d34b949d0ae7cbf3902983)；[CGTrader 产品页](https://www.cgtrader.com/3d-models/industrial/other/pos-receipt-printer)。售价 US$19，29,078 polygons、29,525 vertices、22 parts、3 materials，4K PBR 贴图；提供 Blender / FBX / OBJ，**尚未购买或下载**，目前只有在线 3D 预览。
- **项目板：LINTEX Silk Wall** — [官方产品页与 3D 配置器](https://lintex.com/products/silk-wall/)。配置器支持 24 种 Silk Glass 颜色；页面说明可导出 OBJ / GLB / STL。
- **便签板：LINTEX Textile Noticeboard** — [官方产品页与 3D 配置器](https://lintex.com/products/textile-noticeboard/)。配置器可切换尺寸与面料；页面说明可导出 OBJ / GLB / STL。
- 以上两个 LINTEX 产品页均带官方交互式 3D 配置器；浏览器中可用方向键旋转。当前已确认产品型号，但项目仓库尚未保存各自独立 GLB。

共用：`room.css` / `room.js`（房间、字体、没有 WebGL 时的平面墙），`room3d.js`（3D 墙和百叶光，入口页和各页共用），`board3d.js`（首页两块板、项目卡、便签的 3D），`wall3d.js`（卡册、手账、小票的 3D 墙），`paint-dom.js`（把网页按排好的样子画成 3D 贴图），`sound.js`（音效），`ticket.js`（车票），`preload.js`（预加载）。

## 文档

| 文件 | 写什么 | 什么时候看 |
|---|---|---|
| [`HANDOFF.md`](HANDOFF.md) | 合作规则、各页面现状、试过但失败的路、待办、技术备忘、窗外滤镜的做法 | **新对话先读这份** |
| [`NOTICE.md`](NOTICE.md) | 所有借用素材的来源和授权 | 加入或替换素材时 |
| [`tools/`](tools) | 素材处理脚本。`view_snowfield.py`：雪国线窗外的分层和调色；`fetch_fonts.py`：把字体下载到本地 | 重做素材时 |

## 本地预览

```sh
python3 serve.py          # http://localhost:8000（换端口：python3 serve.py 8080）
```

`serve.py` 把 `.js` 的类型固定成 `text/javascript`（Windows 上 `python -m http.server` 可能把它报成 `text/plain`），并且不发缓存头，改完刷新就行。

字体：`fonts.css` 先读本地 `vendor/fonts/`，没有就从 jsDelivr 取。本地目录不进 git，需要时运行 `tools/fetch_fonts.py` 下载。

改了脚本或样式，记得给页面里的 `?v=N` 加一，避免服务工作线程（`sw.js`）和浏览器缓存旧文件。

## 存档（localStorage）

| key | 内容 |
|---|---|
| `paper-desk.today.v1` | 今日的事项 |
| `paper-desk.todaymemo.v1` | 每天的碎碎念 |
| `paper-desk.desk-tasks.v1` | 项目卡（含累计专注分钟数）和做完的项目 |
| `paper-desk.memos.v1` / `paper-desk.notes-archive.v1` | 便签板上的便签 / 归档的便签 |
| `paper-desk.trip.v1` / `paper-desk.tickets.v1` | 当前行程 / 坐过的车票 |
| `paper-desk.trip.min` · `.trip.wheels` · `.trip.lamp` | 雪国线：上次选的时长、车轮声开关、灯光设置 |
| `paper-desk.receipts.v1` | 每天的小票 |
| `paper-desk.timer.v1` | 桌面上的计时器 |
| `paper-desk.page.v1` · `.tray.v2` · `.cal.v1` · `.bar.v1` | 桌面状态：当前页（项目 / 便签）、工具栏开合、台历是否钉住、收起的卡片 |
| `paper-desk.seal.v1` | 印章上的字 |
| `paper-desk.sound.v1` · `.ambient.v1` · `.theme.v1` | 音效、环境音、日夜模式 |
