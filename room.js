/* 雪国驿舍: the room behind every page (room.css), the day / night theme, the seal, the running title.
   Shared by index.html, album.html, journal.html, receipt.html. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  /* ───────── the theme: night (lamp and stove) or day (snow light); remembered, switched with the knob or D ───────── */
  const TKEY = "paper-desk.theme.v1", root = document.documentElement;
  const saved = (() => { try { return JSON.parse(localStorage.getItem(TKEY)); } catch { return null; } })();
  root.dataset.theme = "day";   // day only for now: the night and its switch are put away
  const ICON = { night: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    day: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' };
  function setTheme(t) {
    root.classList.add("theming"); root.dataset.theme = t;
    try { localStorage.setItem(TKEY, JSON.stringify(t)); } catch {}
    const b = $(".themeBtn"); if (b) { b.innerHTML = ICON[t]; b.title = t === "night" ? "夜里 · 点一下天亮（D）" : "白天 · 点一下入夜（D）"; }
    dispatchEvent(new CustomEvent("deskTheme", { detail: t }));
    clearTimeout(setTheme.t); setTheme.t = setTimeout(() => root.classList.remove("theming"), 1300);
  }
  window.Theme = { get: () => root.dataset.theme, set: setTheme, toggle: () => setTheme(root.dataset.theme === "night" ? "day" : "night") };

  const start = () => {
    if (!$("#room")) document.body.insertAdjacentHTML("afterbegin", '<div class="desk" id="room" aria-hidden="true"><i class="boards"></i><i class="grain"></i><i class="win"></i><i class="lamp"></i><i class="stove"></i><i class="tooth"></i></div>');
    document.body.insertAdjacentHTML("beforeend", '<i class="cast shade" aria-hidden="true"></i><i class="cast glow" aria-hidden="true"></i>');
    setTheme(root.dataset.theme); root.classList.remove("theming");
    /* 首页两块板的阳光：和入口页（lab/entry.html）同一束百叶窗光，而且是同一块光（用户 2026-11-03）。
       ① "把两个板子的光照都统一——改成主页的光照"；② "照在缩略图是什么样的，放大就是什么样的"。
       做法：入口页里，板停在画面正中时被百叶光照成什么样，首页这块板就把它原样放大铺满：
       条纹的斜度、几道、落在哪、边缘多虚，都跟入口页那块小板一样，只是放大了。
       · 板在哪：入口页把"停在正中时板面在墙上占的长方形"（米）存进 paper-desk.boards-at-center.v1；没去过入口页就用 RECT_DEFAULT。
         为什么取"停在正中"：首页按返回，入口页就停在这块板正中，进出两头看到的是同一块光。
       · 光（入口页的算法照搬）：先在"窗上"画——窗上的点 (u, v)，u 沿百叶片方向、v 是高度（米）：
         亮的窗洞 u 从 U0 到 U1、v 从 0 到 V1（U0、U1、V1 按 area、topY 反推，同入口页 buildWindow）；
         第 k 片百叶的影子：v = (k + 0.5)·pitch − PHASE 两边、共 dark·pitch 宽的暗带；拉绳：u = 亮区宽 1/3 处，6 mm。
         再顺着阳光把窗上的点投到板面上：板停在正中时绕竖轴转了 YAW = 15° × 0.25 = 3.75°（入口页 BASE × TURN.silk），
         所以投到的是转过的板面，不是墙（转过的板上条纹更斜：斜率 0.45，墙上是 0.40，入口页截图量过）。
         投影是"平面到平面的平行投影"，就是一个仿射变换，直接写成 SVG 的 matrix。
       · 实测入口页蓝板（1440×900，默认参数）：条纹边缘过渡（10%–90%）约 0.088 × pitch，暗带约占 49%，
         暗带中心比百叶中心的投影低约 0.082 × pitch（百叶片斜着，影子偏下）；这三个数就是 EDGE、DARK、PHASE。
       · 放大：按宽度对齐（板宽 = 那块长方形的宽），上下按中心对齐，长宽同一个比例。
         例：1440×900 下蓝板在入口页约 290 px 宽，首页约 1400 px 宽 → 放大约 4.8 倍，板上约两道半暗带。
       · 参数：入口页面板"保存"的值（paper-desk.light.v1），没有就用入口页的默认值（LIGHT_DEFAULT，改那边时这里一起改）。
       · 光画在板自己里面（板的最后一个子元素），翻页时跟着板一起滑（用户 2026-11-03：左右切换时光影浮动——
         原来光固定在屏幕上、每半秒追一次板的位置，滑动时光先不动、再跳过去）。
       亮度和混合方式仍是首页原来的（.sunlit：soft-light、白天 0.7），不改色调。 */
    const LIGHT_DEFAULT = { area: 0.68, topY: 1.94, az: 18, el: 32, turn: 63, pitch: 0.15, tilt: 20 };
    const RECT_DEFAULT = { silk: [-0.2553, 0.2553, 1.3595, 1.6153], textile: [-0.2552, 0.2552, 1.3595, 1.6669] };   // 1440×900 下量的
    const VIEW_W = 2.536, WIN = 3, YAW = 15 * 0.25, FRONT = 0.012, EDGE = 0.088, DARK = 0.49, PHASE = 0.082;
    const read = (k, d) => { const o = { ...d }; try { const s = JSON.parse(localStorage.getItem(k) || "{}"); for (const i in o) if (s[i] !== undefined) o[i] = s[i]; } catch {} return o; };
    let n = 0;
    function paintBoard(el) {
      const w = el.clientWidth, h = el.clientHeight, L = read("paper-desk.light.v1", LIGHT_DEFAULT);
      const R = read("paper-desk.boards-at-center.v1", RECT_DEFAULT)[el.dataset.sunlit] || RECT_DEFAULT.silk;
      const key = [w, h, JSON.stringify(L), R.join()].join("|");
      if (el._sunKey === key) return; el._sunKey = key;
      if (el._sun) { el._sun.remove(); el._sun = null; }
      if (w < 40 || h < 40) return;
      const d = Math.PI / 180, tr = L.turn * d, ce = Math.cos(L.el * d), se = Math.sin(L.el * d), ca = Math.cos(L.az * d), sa = Math.sin(L.az * d);
      // 窗（同入口页 buildWindow）
      const KX = Math.sin(tr) + Math.cos(tr) * ca / sa, KY = Math.cos(tr) * se / (ce * sa);
      const X0 = -VIEW_W / 2 - 0.2, X1 = -VIEW_W / 2 + L.area * VIEW_W;
      const U0 = (X0 + WIN) / KX, U1 = Math.max(U0 + 0.05, (X1 + WIN) / KX), V1 = L.topY + KY * U1, CORD = U0 + (U1 - U0) / 3;
      // 窗上的点 → 顺着阳光 → 转了 YAW 的板面（画面上的 X、Y，米）
      const D = [ce * ca, -se, -ce * sa], N = [Math.sin(YAW * d), 0, Math.cos(YAW * d)], C = [(R[0] + R[1]) / 2, 0, FRONT];
      const onBoard = (u, v) => { const P = [-WIN + u * Math.sin(tr), v, u * Math.cos(tr)];
        const t = (N[0] * (C[0] - P[0]) + N[2] * (C[2] - P[2])) / (N[0] * D[0] + N[2] * D[2]); return [P[0] + t * D[0], P[1] + t * D[1]]; };
      // 画面上的米 → 板上的像素：s = 每像素多少米；那块长方形的中心对着板的中心
      const s = (R[1] - R[0]) / w, Xc = (R[0] + R[1]) / 2, Yc = (R[2] + R[3]) / 2;
      const toPx = ([X, Y]) => [w / 2 + (X - Xc) / s, h / 2 - (Y - Yc) / s];
      const o = toPx(onBoard(0, 0)), pu = toPx(onBoard(1, 0)), pv = toPx(onBoard(0, 1));
      const M = [pu[0] - o[0], pu[1] - o[1], pv[0] - o[0], pv[1] - o[1], o[0], o[1]].map(x => +x.toFixed(4)).join(" ");
      const dark = Math.max(0.05, Math.min(0.95, DARK + (20 - L.tilt) * 0.015)), f = x => +x.toFixed(5);
      let bands = "";
      for (let k = 0; (k + 0.5 - dark / 2 - PHASE) * L.pitch < V1; k++) {   // 每片百叶的影子（窗上横的一条，投到板上是斜的）
        const v1 = (k + 0.5 - dark / 2 - PHASE) * L.pitch;
        bands += `<rect x="${f(U0 - 0.5)}" y="${f(v1)}" width="${f(U1 - U0 + 1)}" height="${f(dark * L.pitch)}" fill="#000"/>`;
      }
      const blur = Math.max(1, EDGE * L.pitch / 2.56 / s);             // 高斯：10%–90% 过渡 = 2.56 σ
      const id = "sun" + (++n);
      el.insertAdjacentHTML("beforeend", `<svg class="sunlit" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs>
        <filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter>
        <mask id="${id}m" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${w + 200}" height="${h + 200}"><g transform="matrix(${M})">
          <rect x="${f(U0)}" y="0" width="${f(U1 - U0)}" height="${f(V1)}" fill="#fff"/>${bands}
          <rect x="${f(CORD - 0.003)}" y="0" width="0.006" height="${f(V1)}" fill="#000"/></g></mask></defs>
        <g filter="url(#${id}b)"><rect x="-100" y="-100" width="${w + 200}" height="${h + 200}" fill="#fffefa" mask="url(#${id}m)"/></g></svg>`);
      el._sun = el.lastElementChild;
    }
    /* 背景墙：和入口页的墙一样（用户 2026-11-03："把我们的背景统一，和主页入口对齐"）。原来是一排竖着的浅色木板 + 木纹 + 右上角的窗光 + 四角的天蓝暗角。
       入口页的墙是一面白色粗灰泥墙，左边被百叶光照着、右边在阴影里；这里按同一套光画出来（跟着入口页面板"保存"的参数变）：
       · 颜色是从入口页截图（1440×900，默认参数）量的，单位是 0–255 的屏幕亮度：
         亮条约 250（WALL_LIT），亮区里的暗带约 196（WALL_BAND：百叶片半透光、还有反光，所以比阴影亮），
         阴影里紧挨亮区约 168、往右越来越暗，离亮区 0.81 m 处约 140，再往右不变（WALL_SHADE0 → WALL_SHADE1，略偏蓝）；
         暗带约占条纹间距的 40%，边缘过渡（10%–90%）约占间距的 22%（墙离窗远，比板上虚）。
       · 墙在画面上怎么摆：
         - 卡册、手账、小票：和入口页一样 1:1——画面宽 = 2.536 m，画面正中对着墙上 (0, YC)，就像站在入口页同一个位置看这面墙；
         - 首页（项目、便签）：和板上的光一起放大（见上面 paintBoard），墙上的条纹和板上的条纹接得上——
           板面在墙上的那块长方形对着屏幕上的板，四周的墙按同样的倍数铺开（1440×900 下约 4.8 倍）。
           两块板在墙上的长方形高度不同（布板高 5 cm），翻页时墙换一张、淡入淡出。
       · 粗灰泥的颗粒：沿用原来的细噪点层（.tooth）。 */
    const WALL_LIT = "#fbfbfa", WALL_BAND = "#c3c5c5", WALL_SHADE0 = "#a3a9ab", WALL_SHADE1 = "#8c9294", WALL_DARK = 0.40, WALL_EDGE = 0.22;
    const YC = 1.5 - 3 * 2.536 / 1140;                                  // 入口页画面正中对着的墙高（m）
    let wallKey = "", wallN = 0;
    function paintWall() {
      const room = document.getElementById("room"); if (!room) return;
      const W = innerWidth, H = innerHeight, L = read("paper-desk.light.v1", LIGHT_DEFAULT);
      // 屏幕上的点 (x0, y0) 对着墙上的 (Xc, Yc)，每像素 s 米
      let s = VIEW_W / W, Xc = 0, Yc = YC, x0 = W / 2, y0 = H / 2;
      const boards = [...document.querySelectorAll("[data-sunlit]")];
      if (boards.length) {
        const el = boards[window.Desk && Desk.page ? Desk.page() : 0] || boards[0], pg = el.closest(".page"), host = document.getElementById("pages");
        const R = read("paper-desk.boards-at-center.v1", RECT_DEFAULT)[el.dataset.sunlit] || RECT_DEFAULT.silk;
        const r = el.getBoundingClientRect(), pr = pg ? pg.getBoundingClientRect() : r, hr = host && host.parentElement ? host.parentElement.getBoundingClientRect() : { left: 0 };
        const left = hr.left + (r.left - pr.left);                       // 这块板翻到眼前时在屏幕上的左边（翻页滑动中也按停好时算）
        s = (R[1] - R[0]) / el.clientWidth; Xc = (R[0] + R[1]) / 2; Yc = (R[2] + R[3]) / 2; x0 = left + el.clientWidth / 2; y0 = r.top + el.clientHeight / 2;
      }
      const key = [W, H, s, Xc, Yc, x0, y0, JSON.stringify(L)].map(v => typeof v === "number" ? v.toFixed(5) : v).join("|");
      if (key === wallKey) return; wallKey = key;
      const d = Math.PI / 180, tr = L.turn * d, ce = Math.cos(L.el * d), se = Math.sin(L.el * d), ca = Math.cos(L.az * d), sa = Math.sin(L.az * d);
      const KX = Math.sin(tr) + Math.cos(tr) * ca / sa, KY = Math.cos(tr) * se / (ce * sa);
      const X0 = -VIEW_W / 2 - 0.2, X1 = -VIEW_W / 2 + L.area * VIEW_W;
      const U0 = (X0 + WIN) / KX, U1 = Math.max(U0 + 0.05, (X1 + WIN) / KX), V1 = L.topY + KY * U1, CORD = U0 + (U1 - U0) / 3;
      const px = X => x0 + (X - Xc) / s, py = Y => y0 - (Y - Yc) / s, f = x => +x.toFixed(5);
      // 窗上的点 (u, v) → 墙上 (X = -3 + KX·u, Y = v - KY·u) → 屏幕：一个仿射变换
      const M = [KX / s, KY / s, 0, -1 / s, px(-WIN), py(0)].map(x => +x.toFixed(4)).join(" ");
      let bands = "";
      for (let k = 0; (k + 0.5 - WALL_DARK / 2) * L.pitch < V1; k++)
        bands += `<rect x="${f(U0 - 0.5)}" y="${f((k + 0.5 - WALL_DARK / 2) * L.pitch)}" width="${f(U1 - U0 + 1)}" height="${f(WALL_DARK * L.pitch)}" fill="${WALL_BAND}"/>`;
      const blur = Math.max(1, WALL_EDGE * L.pitch / 2.56 / s), id = "wall" + (++wallN);
      const svg = `<svg class="wall" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
        <linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${px(X1).toFixed(1)}" y1="0" x2="${px(X1 + 0.81).toFixed(1)}" y2="0">
          <stop offset="0" stop-color="${WALL_SHADE0}"/><stop offset="1" stop-color="${WALL_SHADE1}"/></linearGradient>
        <clipPath id="${id}c"><rect transform="matrix(${M})" x="${f(U0)}" y="0" width="${f(U1 - U0)}" height="${f(V1)}"/></clipPath>
        <filter id="${id}b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter></defs>
        <rect width="${W}" height="${H}" fill="url(#${id}g)"/>
        <g filter="url(#${id}b)"><g clip-path="url(#${id}c)"><g transform="matrix(${M})">
          <rect x="${f(U0 - 0.5)}" y="-1" width="${f(U1 - U0 + 1)}" height="${f(V1 + 2)}" fill="${WALL_LIT}"/>${bands}
          <rect x="${f(CORD - 0.003)}" y="0" width="0.006" height="${f(V1)}" fill="${WALL_BAND}"/></g></g></g></svg>`;
      const old = [...room.querySelectorAll("svg.wall")];
      room.insertAdjacentHTML("afterbegin", svg);
      const now = room.firstElementChild;
      if (old.length) { now.style.opacity = 0; requestAnimationFrame(() => { now.style.opacity = 1; }); setTimeout(() => old.forEach(e => e.remove()), 700); }
    }
    addEventListener("deskpage", () => setTimeout(paintWall, 0));
    const paint = () => { document.querySelectorAll("[data-sunlit]").forEach(paintBoard); paintWall(); };
    window.roomRelight = paint;
    // 板的大小变了（窗口、字体到了）、入口页改了光：重画；翻页滑动不改板的大小，不重画
    paint(); setInterval(paint, 500); addEventListener("resize", paint);
  };
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);

  /* ───────── a name seal (印): your name cut in a red square, read top to bottom, right to left.
     Click any seal to change what it says (1–4 characters). ───────── */
  const SEALKEY = "paper-desk.seal.v1";
  const sealName = () => { try { return (JSON.parse(localStorage.getItem(SEALKEY)) || "纸桌").slice(0, 4); } catch { return "纸桌"; } };
  function sealSVG(name) {
    const ch = [...(name || "纸桌")].slice(0, 4), n = ch.length;
    const cols = n <= 2 ? 1 : 2, perCol = Math.ceil(n / cols);
    const fs = cols === 1 ? (n === 1 ? 58 : 38) : 34, cw = 76 / cols, ch0 = 76 / perCol;
    let t = "";
    ch.forEach((c, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const x = 88 - cw * col - cw / 2, y = 12 + ch0 * row + ch0 / 2 + fs * .36;
      t += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fs}">${c}</text>`;
    });
    return `<svg viewBox="0 0 100 100" aria-label="印：${ch.join("")}"><defs><filter id="sealInk" x="-5%" y="-5%" width="110%" height="110%">` +
      `<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="t"/><feColorMatrix in="t" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.25" result="m"/>` +
      `<feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="9" result="w"/>` +
      `<feDisplacementMap in="c" in2="w" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter></defs>` +
      `<g filter="url(#sealInk)"><rect x="4" y="4" width="92" height="92" rx="5" fill="#b5523b"/><g fill="#f6efe6" font-family="Noto Serif SC, Songti SC, serif" font-weight="700">${t}</g>` +
      `<rect x="9" y="9" width="82" height="82" rx="3" fill="none" stroke="#f6efe6" stroke-width="1.6" opacity=".55"/></g></svg>`;
  }
  function paintSeals() { document.querySelectorAll(".seal").forEach(e => { e.innerHTML = sealSVG(sealName()); e.title = "点一下改印章上的字"; }); }
  addEventListener("click", e => {
    const se = e.target.closest && e.target.closest(".seal"); if (!se) return;
    e.stopPropagation(); e.preventDefault();
    const v = prompt("印章上刻什么字？（1–4 个字）", sealName());
    if (v && v.trim()) { try { localStorage.setItem(SEALKEY, JSON.stringify(v.trim().slice(0, 4))); } catch {} paintSeals(); }
  }, true);
  new MutationObserver(() => { document.querySelectorAll(".seal:empty").forEach(() => paintSeals()); }).observe(document.documentElement, { childList: true, subtree: true });
  window.Seal = { svg: sealSVG, name: sealName, paint: paintSeals };

  /* ───────── the running title in the margin (柱), set vertically, like a book's ───────── */
  function hashira() {
    let h = document.getElementById("hashira");
    if (!h) { h = document.createElement("div"); h.id = "hashira"; h.setAttribute("aria-hidden", "true"); document.body.appendChild(h); }
    h.textContent = document.documentElement.dataset.hashira || "";
  }
  window.setHashira = t => { document.documentElement.dataset.hashira = t; if (document.body) hashira(); };
  if (document.body) hashira(); else addEventListener("DOMContentLoaded", hashira);
})();
