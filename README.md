# 纸桌 · Paper Desk

个人效率网页：黑板上的项目卡、软木板上的便签、今日台历、雪国线专注计时、卡册、手账和小票。
当前只开白天模式（夜间模式的代码还在，切换按钮已关）。

在线：<https://solomenn.github.io/paper-desk/>　推到 `main` 后 GitHub Pages 自动发布。

## 页面

| 页面 | 内容 |
|---|---|
| [`index.html`](index.html) | 桌面。黑板：项目卡（在做 / 待做 / 做完）；软木板：便签；顶部今日台历；左下角打开工具栏（计时器、卡册、手账、小票） |
| [`focus.html`](focus.html) | 雪国线计时器：上车前选项目、拖行程刻度尺；行驶中是车厢和窗外雪原。下车把分钟数记到项目上 |
| [`album.html`](album.html) | 卡册：项目、便签、车票、小票，按月；车票有时间轴视图 |
| [`journal.html`](journal.html) | 手账书架：每月一本 |
| [`receipt.html`](receipt.html) | 今日小票机 |
| [`radio.html`](radio.html) | 白噪音收音机：Braun T3 实体模型，转调谐盘换台；从桌面和雪国线以浮层打开 |

## 下一阶段物件参考（已确认）

本节记录用户已确认的产品外观参考。它们是**设计方向与选型依据**，不表示对应 3D 模型已经下载、导入或替换现有页面。

### 项目黑板：LINTEX Silk Wall

用户确认参考图一的方向：**浅蓝色、哑光玻璃、无厚重边框、隐藏安装、薄而完整的矩形板体**。

- 官方产品：<https://lintex.com/products/silk-wall/>
- 表面：4 mm Silk Glass® 哑光磁性玻璃；低铁玻璃使颜色呈现更干净；降低反光。
- 结构：隐藏式安装，板面离墙 12 mm；钢化夹层玻璃。
- 颜色：24 种 Silk Glass 颜色。优先继续比较浅蓝、雾蓝和低饱和蓝，不把当前色号提前锁死。
- 3D：官方提供 7 种尺寸的 DWG / RFA / OBJ / FBX；配置器可导出 OBJ / GLB / STL。
- 目标：以用户确认的浅蓝色产品图为准，不沿用原来 CSS 绿黑板与厚木框的外观。

### 便签板：LINTEX Air Noticeboard

用户确认参考图二的**整体造型**：无框矩形、薄边、倒角、隐藏固定件，像轻轻浮在墙面上；不喜欢之前推荐的圆形或异形便签板。

- 官方产品：<https://lintex.com/products/air-noticeboard/>
- 结构：无框；倒角边缘；隐藏式安装；离墙 22 mm。
- 表面：天然软木，或 Forbo Bulletin Board 亚麻油毡。
- Forbo Bulletin Board 有 15 种颜色；用户特别喜欢色卡中的 **Duck Egg 2162** 和 **Blue Berry 2214**。
- 3D：官方提供 8 种尺寸的 DWG / OBJ / FBX；配置器可导出 OBJ / GLB / STL。
- 颜色 HEX 如需用于网页材质，必须从官方色卡/实物校准；截图中出现的 `#9EB8BE` 仅是视觉近似值，不是厂家公布的精确色值。

### LINTEX 色卡研究

用户希望把 LINTEX 作为后续材质与配色研究的重要参考。注意两套色卡不能混为一谈：

**A. Air Noticeboard 使用的 Forbo Bulletin Board 亚麻油毡色卡（15 色）**

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

**B. Silk Wall 使用的 Silk Glass® 色卡（24 色）**

Blossom 690、Peaceful 360、Frank 540、Shy 120、Lonely 170、Cozy 450、Lively 460、Loving 760、Calm 320、Gentle 560、Soft 150、Warm 160、Blush 680、Casual 480、Mellow 730、Brave 750、Crisp 350、Fair 550、Pure 130、Pale 230、Lazy 140、Naive 640、Mild 250、Sunny 740。

官方资料：<https://lintex.com/products/silk-wall/>；色卡目录：<https://www.vogels-halterung.de/pdf/catalogs/en/lintex/lintex-catalog.pdf>。

后续研究重点：把两套色卡的真实色样、不同日光下的偏色、哑光/织物/木材/金属之间的搭配整理成纸桌自己的材质板；不要直接把屏幕截图取色当成实物标准。

### 手账书架：图书馆多排书架方向

用户明确想要的是 **Public Library Interior** 那种图书馆书库：多排、连续、双面可取书的开放式书架形成过道；不是家用独立书柜，也不是底部带厚重柜体的储物柜。

- 形态参考：<https://www.cgtrader.com/3d-models/interior/other/public-library-interior>（用户喜欢其书架排列方式；该模型售价约 US$14.99，不作为免费方案）。
- 外观目标：白色或暖白色金属/喷涂结构；开放式多层书格；视觉上轻、直、连续；不加笨重底柜。
- 免费候选仍在筛选中，不能仅凭三角面数量认定质量：
  - <https://www.innerscene.com/tools/library/3d-parts/double-sided-library-shelving-education-furniture-c2b67492>：CC0、GLB、约 1.8 MB，单个双面书架单元，标称尺寸 1.1 × 0.7 × 1.8 m；可研究重复排列成多排的可能，但几何精度和细节尚待实际检查。
  - <https://www.cgtrader.com/free-3d-models/interior/house-interior/3d-book-shelves-a2154731-e59c-4e2c-8e91-e754db770d55>：免费，页面标注约 521,303 polygons，提供 C4D / FBX / OBJ 等格式；不是 GLB，PBR/UV 情况未明确，需检查模型内容和授权细节。
- 不采用低多边形卡通图书馆、传统木质古典书架或家用装饰书柜来凑数。先比较模型的实际预览、结构、材质和文件大小，再决定是否能作为白色图书馆书库的基础。


共用：`room.css` / `room.js`（房间、白天光照、字体），`sound.js`（音效），`ticket.js`（车票），`preload.js`（预加载）。

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
| `paper-desk.memos.v1` / `paper-desk.notes-archive.v1` | 软木板上的便签 / 归档的便签 |
| `paper-desk.trip.v1` / `paper-desk.tickets.v1` | 当前行程 / 坐过的车票 |
| `paper-desk.trip.min` · `.trip.wheels` · `.trip.lamp` | 雪国线：上次选的时长、车轮声开关、灯光设置 |
| `paper-desk.receipts.v1` | 每天的小票 |
| `paper-desk.timer.v1` | 桌面上的计时器 |
| `paper-desk.page.v1` · `.tray.v2` · `.cal.v1` · `.bar.v1` | 桌面状态：当前页（项目 / 便签）、工具栏开合、台历是否钉住、收起的卡片 |
| `paper-desk.seal.v1` | 印章上的字 |
| `paper-desk.sound.v1` · `.ambient.v1` · `.theme.v1` | 音效、环境音、日夜模式 |
