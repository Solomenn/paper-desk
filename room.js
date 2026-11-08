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

  /* 首页的 3D 用拱窗（board3d.js 给 room3d.js 的 window: "arch"）。3D 画好之前，平面墙也按拱窗画：
     否则第一次进入、3D 还没出来时，先看到的是一墙百叶窗条纹，过几秒才跳成拱窗。
     窗形和太阳方向读入口页导出的 assets/objects/lintex-light-gobo.json（和 room3d.js 同一份）。
     只有首页在 room.js 之前设了 window.__archLight；卡册、手账、小票仍是百叶窗。 */
  const ARCH_LIGHT = !!window.__archLight; let ARCH = null;
  if (ARCH_LIGHT) fetch("assets/objects/lintex-light-gobo.json").then(r => r.json()).then(d => {
    ARCH = d; if (window.roomRelight) window.roomRelight();
  }).catch(() => {});

  const start = () => {
    if (!$("#room")) document.body.insertAdjacentHTML("afterbegin", '<div class="desk" id="room" aria-hidden="true"><i class="boards"></i><i class="grain"></i><i class="win"></i><i class="lamp"></i><i class="stove"></i><i class="tooth"></i></div>');
    document.body.insertAdjacentHTML("beforeend", '<i class="cast shade" aria-hidden="true"></i><i class="cast glow" aria-hidden="true"></i>');
    setTheme(root.dataset.theme); root.classList.remove("theming");
    /* 首页两块板和所有页面背景墙上的阳光：和入口页（lab/entry.html）同一束百叶窗光，1:1，不放大（用户 2026-11-03）。
       首页例外（2026-11-09）：3D 用的是拱窗（board3d.js 的 window: "arch"），3D 出来之前的平面墙也画拱窗，
       否则第一次进入会先看到百叶窗条纹、几秒后跳成拱窗；窗洞和横档来自 assets/objects/lintex-light-gobo.json，
       和百叶窗条带用同一个仿射变换投到墙上。卡册、手账、小票仍是这一段说的百叶窗。
       ① "把两个板子的光照都统一——改成主页的光照"；② "两个板子不要和主页放大缩小统一了；统一改成主页那种光照；不用考虑位置了"。
       · 画面怎么对着墙：和入口页一样——画面宽 = 2.536 m，画面正中对着墙上 (0, YC)。所以条纹的粗细、间距、斜度、
         亮区在画面左边多少，都和入口页一模一样（1440×900 下条纹竖直间距约 85 px，亮区是画面左边 68%）。
       · 光（入口页的算法照搬）：先在"窗上"画——窗上的点 (u, v)，u 沿百叶片方向、v 是高度（米）：
         亮的窗洞 u 从 U0 到 U1、v 从 0 到 V1（U0、U1、V1 按 area、topY 反推，同入口页 buildWindow）；
         第 k 片百叶的影子：v = (k + 0.5)·pitch 附近一条暗带；拉绳：u = 亮区宽 1/3 处，6 mm。
         再顺着阳光投到墙上：X = -3 + KX·u，Y = v - KY·u——一个仿射变换，直接写成 SVG 的 matrix。
       · 墙（背景，paintWall）：颜色是从入口页截图（1440×900，默认参数）量的，0–255 的屏幕亮度：
         亮条约 250，亮区里的暗带约 196（百叶片半透光、还有反光，所以比阴影亮），阴影里紧挨亮区约 168、
         离亮区 0.81 m 处约 140，再往右不变（略偏蓝）；暗带约占条纹间距的 40%，边缘过渡（10%–90%）约 22%。
       · 板（paintBoard）：叠在板上的一层白光（soft-light、白天 0.7，首页原来的叠法，不改色调），形状同墙上的亮条；
         入口页里板上的条纹比墙上清楚（板离墙近）：暗带约占 49%，边缘过渡约 8.8%，比墙上的条纹往下偏约 0.082 × pitch（量过）。
         光画在板自己里面（板的最后一个子元素），按"这块板翻到眼前、停好时"在屏幕上的位置算，翻页滑动时跟着板走。
       · 参数：入口页面板"保存"的值（paper-desk.light.v1），没有就用入口页的默认值（LIGHT_DEFAULT，改那边时这里一起改）。
       · 光是静止的，不随时间变（2026-11-03 入口页的"光的缓慢变化"取消了）。 */
    const LIGHT_DEFAULT = { area: 0.68, topY: 1.94, az: 18, el: 32, turn: 63, pitch: 0.15, tilt: 20 };
    const VIEW_W = 2.536, WIN = 3, YC = 1.5 - 3 * 2.536 / 1140;           // YC：入口页画面正中对着的墙高（m）
    const read = (k, d) => { const o = { ...d }; try { const s = JSON.parse(localStorage.getItem(k) || "{}"); for (const i in o) if (s[i] !== undefined) o[i] = s[i]; } catch {} return o; };
    const f = x => +x.toFixed(5);
    /* 拱窗：窗洞、横档是多边形，点同样是窗上的 (u, v)，和百叶窗条带用同一个仿射变换投到墙上。
       turn 0、方位 35°、仰角 32°（room3d.js 的拱窗这么做）；窗洞外没有阳光。 */
    const archOn = () => ARCH_LIGHT && !!ARCH;
    const archL = L => archOn() ? { ...L, az: ARCH.az, el: ARCH.el, turn: 0 } : L;
    const archShapes = (fillHole, fillIsland) => {
      const poly = (h, fill) => `<path d="M${h.map(p => f(p[0]) + " " + f(p[1])).join("L")}Z" fill="${fill}"/>`;
      return ARCH.holes.map(h => poly(h, fillHole)).join("") + (ARCH.islands || []).map(h => poly(h, fillIsland)).join("");
    };
    // 窗、和"窗上 (u, v) → 屏幕像素"的变换；(ox, oy) = 画的那层的左上角在屏幕上的位置
    function geom(L, ox, oy) {
      const W = innerWidth, H = innerHeight, s = VIEW_W / W, d = Math.PI / 180, tr = L.turn * d;
      const ce = Math.cos(L.el * d), se = Math.sin(L.el * d), ca = Math.cos(L.az * d), sa = Math.sin(L.az * d);
      const KX = Math.sin(tr) + Math.cos(tr) * ca / sa, KY = Math.cos(tr) * se / (ce * sa);
      const X0 = -VIEW_W / 2 - 0.2, X1 = -VIEW_W / 2 + L.area * VIEW_W;
      const U0 = (X0 + WIN) / KX, U1 = Math.max(U0 + 0.05, (X1 + WIN) / KX), V1 = L.topY + KY * U1, CORD = U0 + (U1 - U0) / 3;
      const px = X => W / 2 + X / s - ox, py = Y => H / 2 - (Y - YC) / s - oy;
      const M = [KX / s, KY / s, 0, -1 / s, px(-WIN), py(0)].map(x => +x.toFixed(4)).join(" ");
      return { s, X1, U0, U1, V1, CORD, M, px };
    }
    const bandsOf = (g, L, dark, phase, fill) => { let o = "";
      for (let k = 0; (k + 0.5 - dark / 2 - phase) * L.pitch < g.V1; k++)
        o += `<rect x="${f(g.U0 - 0.5)}" y="${f((k + 0.5 - dark / 2 - phase) * L.pitch)}" width="${f(g.U1 - g.U0 + 1)}" height="${f(dark * L.pitch)}" fill="${fill}"/>`;
      return o; };
    let n = 0;
    function paintBoard(el) {
      const w = el.clientWidth, h = el.clientHeight, L = archL(read("paper-desk.light.v1", LIGHT_DEFAULT));
      // 这块板翻到眼前、停好时的左上角（翻页滑动中也按停好时算，光就跟着板一起滑）
      const r = el.getBoundingClientRect(), pg = el.closest(".page"), host = document.getElementById("pages");
      const pr = pg ? pg.getBoundingClientRect() : r, hl = host && host.parentElement ? host.parentElement.getBoundingClientRect().left : 0;
      const ox = pg ? hl + (r.left - pr.left) : r.left, oy = r.top;
      const key = [w, h, Math.round(ox), Math.round(oy), innerWidth, innerHeight, ARCH ? "arch" : "blinds", JSON.stringify(L)].join("|");
      if (el._sunKey === key) return; el._sunKey = key;
      if (el._sun) { el._sun.remove(); el._sun = null; }
      if (w < 40 || h < 40) return;
      if (ARCH_LIGHT && !ARCH) return;                                    // 拱窗数据还没到：先不画，免得闪一下百叶窗
      const g = geom(L, ox, oy), id = "sun" + (++n);
      if (archOn()) {
        const blur = Math.max(1, 0.02 / g.s);
        el.insertAdjacentHTML("beforeend", `<svg class="sunlit" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs>
          <filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter>
          <mask id="${id}m" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${w + 200}" height="${h + 200}"><g transform="matrix(${g.M})">
            ${archShapes("#fff", "#000")}</g></mask></defs>
          <g filter="url(#${id}b)"><rect x="-100" y="-100" width="${w + 200}" height="${h + 200}" fill="#fffefa" mask="url(#${id}m)"/></g></svg>`);
        el._sun = el.lastElementChild; return;
      }
      const dark = Math.max(0.05, Math.min(0.95, 0.49 + (20 - L.tilt) * 0.015));
      const blur = Math.max(1, 0.088 * L.pitch / 2.56 / g.s);            // 高斯：10%–90% 过渡 = 2.56 σ
      el.insertAdjacentHTML("beforeend", `<svg class="sunlit" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs>
        <filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter>
        <mask id="${id}m" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${w + 200}" height="${h + 200}"><g transform="matrix(${g.M})">
          <rect x="${f(g.U0)}" y="0" width="${f(g.U1 - g.U0)}" height="${f(g.V1)}" fill="#fff"/>${bandsOf(g, L, dark, 0.082, "#000")}
          <rect x="${f(g.CORD - 0.003)}" y="0" width="0.006" height="${f(g.V1)}" fill="#000"/></g></mask></defs>
        <g filter="url(#${id}b)"><rect x="-100" y="-100" width="${w + 200}" height="${h + 200}" fill="#fffefa" mask="url(#${id}m)"/></g></svg>`);
      el._sun = el.lastElementChild;
    }
    const WALL_LIT = "#fbfbfa", WALL_BAND = "#c3c5c5", WALL_SHADE0 = "#a3a9ab", WALL_SHADE1 = "#8c9294";
    let wallKey = "";
    function paintWall() {
      const room = document.getElementById("room"); if (!room) return;
      const W = innerWidth, H = innerHeight, L = archL(read("paper-desk.light.v1", LIGHT_DEFAULT));
      const key = [W, H, ARCH ? "arch" : "blinds", JSON.stringify(L)].join("|"); if (key === wallKey) return; wallKey = key;
      const g = geom(L, 0, 0);
      const head = (blur) => `<defs>
        <linearGradient id="wallg" gradientUnits="userSpaceOnUse" x1="${g.px(g.X1).toFixed(1)}" y1="0" x2="${g.px(g.X1 + 0.81).toFixed(1)}" y2="0">
          <stop offset="0" stop-color="${WALL_SHADE0}"/><stop offset="1" stop-color="${WALL_SHADE1}"/></linearGradient>
        <filter id="wallb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter></defs>`;
      let svg;
      if (archOn()) {
        const blur = Math.max(1, 0.04 / g.s);                             // 窗离墙 3 m，影子边缘很软
        svg = `<svg class="wall" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${head(blur)}
          <rect width="${W}" height="${H}" fill="url(#wallg)"/>
          <g filter="url(#wallb)"><g transform="matrix(${g.M})">${archShapes(WALL_LIT, WALL_BAND)}</g></g></svg>`;
      } else if (ARCH_LIGHT) {                                            // 拱窗数据还没到：先只有底色，不画百叶窗
        svg = `<svg class="wall" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${head(1)}
          <rect width="${W}" height="${H}" fill="url(#wallg)"/></svg>`;
      } else {
        const blur = Math.max(1, 0.22 * L.pitch / 2.56 / g.s);
        svg = `<svg class="wall" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${head(blur)}
          <clipPath id="wallc"><rect transform="matrix(${g.M})" x="${f(g.U0)}" y="0" width="${f(g.U1 - g.U0)}" height="${f(g.V1)}"/></clipPath>
          <rect width="${W}" height="${H}" fill="url(#wallg)"/>
          <g filter="url(#wallb)"><g clip-path="url(#wallc)"><g transform="matrix(${g.M})">
            <rect x="${f(g.U0 - 0.5)}" y="-1" width="${f(g.U1 - g.U0 + 1)}" height="${f(g.V1 + 2)}" fill="${WALL_LIT}"/>${bandsOf(g, L, 0.40, 0, WALL_BAND)}
            <rect x="${f(g.CORD - 0.003)}" y="0" width="0.006" height="${f(g.V1)}" fill="${WALL_BAND}"/></g></g></g></svg>`;
      }
      room.querySelectorAll("svg.wall").forEach(e => e.remove());
      room.insertAdjacentHTML("afterbegin", svg);                         // clipPath 里只能放形状，不能放 <g>：变换写在 rect 上
    }
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
