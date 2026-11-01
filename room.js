/* 雪国驿舍: the room behind every page (room.css), the day / night theme, the seal, the running title.
   Shared by index.html, album.html, journal.html, receipt.html. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  /* ───────── the theme: night (lamp and stove) or day (snow light); remembered, switched with the knob or D ───────── */
  const TKEY = "paper-desk.theme.v1", root = document.documentElement;
  const saved = (() => { try { return JSON.parse(localStorage.getItem(TKEY)); } catch { return null; } })();
  root.dataset.theme = saved === "day" ? "day" : "night";
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
  addEventListener("keydown", e => {
    if ((e.key === "d" || e.key === "D") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.closest("input, textarea, [contenteditable]")) Theme.toggle();
  });
  addEventListener("storage", e => { if (e.key === TKEY && e.newValue) setTheme(JSON.parse(e.newValue)); });

  const start = () => {
    if (!$("#room")) document.body.insertAdjacentHTML("afterbegin", '<div class="desk" id="room" aria-hidden="true"><i class="boards"></i><i class="grain"></i><i class="win"></i><i class="lamp"></i><i class="stove"></i><i class="tooth"></i></div>');
    document.body.insertAdjacentHTML("beforeend", '<i class="cast shade" aria-hidden="true"></i><i class="cast glow" aria-hidden="true"></i>');
    if (!document.body.dataset.noTheme) {
      const b = document.createElement("button"); b.className = "themeBtn"; b.type = "button"; b.onclick = () => Theme.toggle(); document.body.appendChild(b);
    }
    setTheme(root.dataset.theme); root.classList.remove("theming");
    // by day the morning sun comes through a window up and to the right and falls on what you're working on (the element
    // marked [data-sunlit] — on the desk, the 在做 column): a patch in the window's shape, leaning with the light, with the
    // window's bars (two panes across, three down) as clean shadow lines in it. Nothing else — the board stays quiet.
    let sun = null;
    function paint() {
      if (sun) { sun.remove(); sun = null; }
      const t = document.querySelector("[data-sunlit]"); if (!t) return;
      const r = t.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      if (r.width < 40 || r.right < 0 || r.left > W) return;
      const top = r.top + 8, bot = r.bottom - 8, h = bot - top, lean = Math.min(h * .14, r.width * .22);
      const x0 = r.left + 10, x1 = r.right - 10 - lean;                 // leaning right as it goes up, kept inside the column
      const at = (u, v) => [x0 + (x1 - x0) * u + lean * (1 - v), top + h * v];   // u across, v down
      const poly = pts => pts.map(([u, v]) => at(u, v).map(n => n.toFixed(1)).join(",")).join(" ");
      const bw = Math.max(6, Math.min(12, r.width * .018));             // the bars' shadow width
      const bars = [[.5, 0, .5, 1], [0, 1 / 3, 1, 1 / 3], [0, 2 / 3, 1, 2 / 3]].map(([u0, v0, u1, v1]) => {
        const [ax, ay] = at(u0, v0), [bx, by] = at(u1, v1); return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#000" stroke-width="${bw}"/>`; }).join("");
      document.body.insertAdjacentHTML("beforeend", `<svg class="cast sun" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
        <filter id="room-sb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${W < 900 ? 2.5 : 4}"/></filter>
        <mask id="room-sm" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
          <polygon points="${poly([[0, 0], [1, 0], [1, 1], [0, 1]])}" fill="#fff"/>${bars}</mask></defs>
        <g filter="url(#room-sb)"><rect width="${W}" height="${H}" fill="#fffefa" mask="url(#room-sm)"/></g></svg>`);
      sun = document.body.lastElementChild;
    }
    window.roomRelight = paint;
    addEventListener("deskpage", () => setTimeout(paint, 700)); addEventListener("load", () => setTimeout(paint, 300));
    paint();
    let rt = 0; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(paint, 120); });
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
