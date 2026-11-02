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

官方配置器当前列出 Linen、Blazer Lite、Cara、Fiji、Cura 等面料系列。截图只确认米灰色织物外观，尚未确定具体系列、色号或织物纹理。后续应以官方配置器的真实面料样本为准；不要把 Forbo Bulletin Board 的 Duck Egg 2162、Blue Berry 2214 等色号当成 Textile Noticeboard 的面料色号。

**C. Silk Wall 使用的 Silk Glass® 色卡（24 色）**

Blossom 690、Peaceful 360、Frank 540、Shy 120、Lonely 170、Cozy 450、Lively 460、Loving 760、Calm 320、Gentle 560、Soft 150、Warm 160、Blush 680、Casual 480、Mellow 730、Brave 750、Crisp 350、Fair 550、Pure 130、Pale 230、Lazy 140、Naive 640、Mild 250、Sunny 740。

官方资料：<https://lintex.com/products/silk-wall/>；色卡目录：<https://www.vogels-halterung.de/pdf/catalogs/en/lintex/lintex-catalog.pdf>。

后续研究重点：把两套色卡的真实色样、不同日光下的偏色、哑光/织物/木材/金属之间的搭配整理成纸桌自己的材质板；不要直接把屏幕截图取色当成实物标准。

### 手账书架：图书馆多排书架方向

用户明确想要的是 **Public Library Interior** 那种公共图书馆书库：多排、连续、双面可取书的开放式书架形成过道；不是家用独立书柜，也不是底部带厚重柜体的储物柜。

- 形态参考：<https://www.cgtrader.com/3d-models/interior/other/public-library-interior>。用户喜欢它的书库排列方式；目前售价 **US$14.99**，不作为免费方案。
- 外观目标：暖白色 / 象牙白金属或哑光喷涂结构；开放式多层书格；视觉轻、直、连续；不加笨重底柜。书脊保留低饱和的米白、灰蓝、浅绿等颜色，不把书和书架全部刷成纯白。
- 主场景需要的是**双面书架单元 + 端部 / 转角模块**，能拼成多条平行过道；单面靠墙书柜只作次要参考。

#### 免费候选（第一轮）

1. **优先检查：<https://3dassets.dev/assets/public-library-and-reading-garden-public-library-and-r-9af56b98> — Library Stack Straight**
   - CC0 1.0；GLB 约 1.3 MB；77,484 triangles、58,662 vertices、5 种材质。
   - 尺寸 1.4 × 2.145 × 0.6 m；双面书架、四层搁板、中间隔板，书脊独立建模。
   - 同一套还有 Library Stack End 和 Library Stack Corner，可拼接连续书库过道；整套 51 个 GLB，合计 9.1 MB。
   - **风险：** 页面标明这套 51/51 模型由 AI 工具生成；当前缩略图是浅橡木端板和低饱和书脊，并非白色成品。必须先检查原始 GLB 的近景几何、法线、UV、书脊和材质，再决定是否将端板 / 框架改为暖白色。它目前是结构上最接近目标的免费候选，不等于已经通过美术验收。

2. **第二候选：<https://www.innerscene.com/tools/library/3d-parts/double-sided-library-shelving-education-furniture-c2b67492> — Double sided library shelving**
   - CC0；GLB 约 1.8 MB；标称尺寸 1.1 × 0.7 × 1.8 m。
   - 单个双面教育 / 图书馆书架，可复制排列成多排。
   - 页面没有公布三角面数量和详细贴图规格；需要打开 3D 预览确认结构、书籍细节和材质，不凭文件大小推断精度。

3. **第三候选：<https://3dwarehouse.sketchup.com/model/9f4c624e-e285-42eb-9b16-dfb7255c6f6a/Library-Book-Shelf> — Library Book Shelf（Archie M.）**
   - 双面书架，带书；11,586 polygons、22 种材质、627 KB。
   - 标称尺寸 1.2 × 0.625 × 2.0 m；原生 SketchUp，需要转换为 GLB。
   - **授权尚待核实**，确认授权前不进入项目。

4. **墙面书架参考：<https://3dwarehouse.sketchup.com/model/0ce33b92-6188-4ce8-87ff-49e45135404a/Library-Book-Shelves-with-Rolling-Ladder> — Library Book Shelves with Rolling Ladder（Thomas F.）**
   - 四段连续书架并带滚动梯；7,971 polygons、4 种材质、473 KB。
   - 单段标称约 115 英寸高、32.5 英寸宽；更接近靠墙连续书架，不是我们优先要的双面过道书架。
   - 原生 SketchUp；授权尚待核实。

#### 付费对照基准（不购买）

- **Public Library Interior：** <https://www.cgtrader.com/3d-models/interior/other/public-library-interior>
- 当前售价 US$14.99；约 619,657 polygons / 948,328 triangles；136 objects、75 unique meshes、50 materials、65 张 PBR 贴图（最高 4K），GLTF 约 77 MB。
- 包含约 35,133 本书、双层环形书库、书梯、阅读桌和完整公共空间。只作为书库排列、书籍密度和细节表现的对照基准。

#### 已排除 / 不作为主候选

- Grab3D 的 Library Room / Bookstore Interior：虽然免费 CC0、可下载 GLB，但属于等距视角的轻量化卡通房间套件，不符合纸桌的实体模型质感。
- 1DesignTool 的 Bookshelf walls：2,644 triangles、207 KB，明确为 low-poly，且是深桃花心木墙面书架；不符合精度和配色方向。
- FurniMesh 的 AI 白色家用书架：多数是单体家用储物架，不是公共图书馆双面多排书库；不因面数高就列为优先候选。

**当前状态：书架尚未定稿。** 下一步先对前两款免费双面书架做真实 GLB 检查和 360° 预览，再做暖白材质测试；确认近景质量、书籍细节和拼接效果后再选，不直接把 AI 生成或低多边形模型当成最终资产。

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
