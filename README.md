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
