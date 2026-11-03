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
    /* 首页两块板的阳光：和入口页（lab/entry.html）同一束百叶窗光（用户 2026-11-03："把两个板子的光照都统一——改成主页的光照"）。
       原来是一块窗户形状的亮斑（两格三格的窗棂）照在"在做"那一栏 / 便签页左边 42%，现在换成入口页的百叶条纹，算法照搬：
       · 参数：先读入口页面板"保存"进浏览器的值（paper-desk.light.v1），没有就用入口页的默认值（LIGHT_DEFAULT，改那边时这里一起改）；
       · 范围：每块板左边 area（默认 68%）；亮区顶边是一条和条纹平行的斜边，亮区右上角落在离画面上沿 (2.28 - topY) m 处；
       · 条纹：入口页里窗上的点 (u, v) 落到墙上是 X = -3 + KX·u、Y = v - KY·u，百叶片（v 固定）→ 斜率 -KY/KX 的斜线，
         竖直方向每隔 pitch 一道；按入口页的比例换成像素（画面宽 = 2.536 m）。默认值算出来往右下斜约 22°，间距约画面宽的 6%；
       · 暗条宽度：随百叶角度 tilt 变（实测入口页 tilt 20° 时暗条约占 40%），越大越透光；
       · 拉绳：亮区宽 1/3 处一条细竖线；边缘：入口页的条纹边缘过渡约占周期的 22%，这里用同样的模糊。
       亮度和混合方式仍是首页原来的（.cast.sun：soft-light、白天 0.7），不改色调。 */
    const LIGHT_DEFAULT = { area: 0.68, topY: 1.94, az: 18, el: 32, turn: 63, pitch: 0.15, tilt: 20 };
    const light = () => { const L = { ...LIGHT_DEFAULT }; try { const s = JSON.parse(localStorage.getItem("paper-desk.light.v1") || "{}"); for (const k in L) if (typeof s[k] === "number") L[k] = s[k]; } catch {} return L; };
    let sun = null, seen = "";
    function paint() {
      const W = innerWidth, H = innerHeight;   // 画面上那块标了 [data-sunlit] 的板（值 = 亮区占板宽的比例；空 = 用入口页的 area）
      // 选在画面上露出最多的那一块（翻页时旁边那块会露出一条边，选"第一个在画面上的"会选错，光画到画面外面去）
      const seenW = e => { const b = e.getBoundingClientRect(); return Math.max(0, Math.min(b.right, W) - Math.max(b.left, 0)); };
      const t = [...document.querySelectorAll("[data-sunlit]")].sort((a, b) => seenW(b) - seenW(a)).find(e => seenW(e) > 40);
      const r = t ? t.getBoundingClientRect() : null, L = light();
      const key = r ? [r.left, r.top, r.width, r.height, W, H, JSON.stringify(L)].map(v => typeof v === "number" ? Math.round(v) : v).join() : "";
      if (key === seen && (sun || !t)) return;                     // 没动：光照不变
      seen = key; if (sun) { sun.remove(); sun = null; }
      if (!t || r.width < 40 || r.right < 0 || r.left > W) return;
      const d = Math.PI / 180, tr = L.turn * d, ce = Math.cos(L.el * d), se = Math.sin(L.el * d), ca = Math.cos(L.az * d), sa = Math.sin(L.az * d);
      const KX = Math.sin(tr) + Math.cos(tr) * ca / sa, KY = Math.cos(tr) * se / (ce * sa), slope = KY / KX;   // 屏幕上往右每 1 px，条纹往下 slope px
      const PXM = W / 2.536, period = L.pitch * PXM;                    // 条纹竖直方向的间距（px）
      const frac = +t.dataset.sunlit || L.area, x0 = r.left, x1 = r.left + r.width * frac;
      const yTopR = r.top + (2.28 - L.topY) * PXM;                      // 亮区右上角
      const topAt = x => yTopR - (x1 - x) * slope;                      // 亮区顶边：往左上升
      const dark = Math.max(0.05, Math.min(0.95, 0.4 + (20 - L.tilt) * 0.015));
      let bands = "";
      for (let y = yTopR - (x1 - x0) * slope - period; y < r.bottom + period; y += period) {   // 每道暗条：从亮区左边到右边的一条斜带
        const a = y + period * (1 - dark), b = y + period;
        bands += `<polygon points="${x0 - 20},${(a - (x1 - x0 + 20) * 0).toFixed(1)} ${x1 + 20},${(a + (x1 - x0 + 40) * slope).toFixed(1)} ${x1 + 20},${(b + (x1 - x0 + 40) * slope).toFixed(1)} ${x0 - 20},${b.toFixed(1)}" fill="#000"/>`;
      }
      const cx = x0 + (x1 - x0) / 3;                                   // 拉绳
      const blur = Math.max(1.5, period * 0.22 / 2.56);                // 边缘过渡约占周期 22%（10%–90%）
      document.body.insertAdjacentHTML("beforeend", `<svg class="cast sun" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
        <filter id="room-sb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter>
        <clipPath id="room-sc"><rect x="${r.left}" y="${r.top}" width="${r.width}" height="${r.height}"/></clipPath>
        <mask id="room-sm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
          <polygon points="${x0},${topAt(x0).toFixed(1)} ${x1},${yTopR.toFixed(1)} ${x1},${r.bottom} ${x0},${r.bottom}" fill="#fff"/>${bands}
          <rect x="${(cx - 1.5).toFixed(1)}" y="${r.top}" width="3" height="${r.height}" fill="#000"/></mask></defs>
        <g clip-path="url(#room-sc)"><g filter="url(#room-sb)"><rect width="${W}" height="${H}" fill="#fffefa" mask="url(#room-sm)"/></g></g></svg>`);
      sun = document.body.lastElementChild;
    }
    window.roomRelight = paint;
    // the column moves and resizes (fonts arriving, the board settling in, a page turn, cards added): check twice a second
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
