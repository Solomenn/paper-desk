/* sasshi's morning room (src/app/Room.tsx + layout.ts lightOf): painted once per viewport size, behind the page,
   with the window bar and a twig cast over everything. Shared by album.html, journal.html, receipt.html. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const start = () => {
    if (!$("#room")) document.body.insertAdjacentHTML("afterbegin", '<div class="desk" id="room" aria-hidden="true"><i class="fl fl-a"></i><i class="fl fl-b"></i><i class="fl fl-c"></i><i class="fl fl-s"></i><i class="falloff"></i></div>');
  /* ───────── the room (sasshi, src/app/Room.tsx + layout.ts lightOf): geometry from the 1440 × 900 reference, scaled ───────── */
  (function room() {
    const REF = { w: 1440, h: 900, patch: [[560, -60], [1520, -60], [1520, 690], [1240, 960], [300, 960]], bars: [[910, -60, 730, 960, 16]], twig: [560, -14, 1] };
    const LEAVES = [[842, 62, -8, .8], [772, 118, -38, 1.05], [706, 186, 24, 1.1], [650, 246, -58, .95], [590, 322, 14, 1.15], [536, 408, -70, 1],
      [486, 494, 20, 1.1], [430, 590, -46, .9], [380, 676, 30, .85], [612, 268, 150, .7], [724, 150, 140, .75]];
    const TWIG = "M905 20 C 770 110, 650 200, 530 380 S 390 630, 320 880";
    const LEAF = "M0 0 C 22 -17, 64 -19, 92 0 C 64 17, 22 15, 0 0 Z";
    const desk = $("#room");
    const pts = p => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const twig = leaf => `<path d="${TWIG}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>` +
      LEAVES.map(([x, y, r, k]) => `<use href="#${leaf}" transform="translate(${x} ${y}) rotate(${r}) scale(${k})"/>`).join("");
    let cast = null;
    function paint() {
      const W = innerWidth, H = innerHeight, sx = W / REF.w, sy = H / REF.h, k = Math.sqrt(sx * sy);
      const small = W < 900;
      const blur = small ? { patch: 9, bar: 5, umbra: 1.1, penumbra: 5 } : { patch: 16, bar: 10, umbra: 2.2, penumbra: 12 };
      const patch = pts(REF.patch.map(([x, y]) => [x * sx, y * sy]));
      const bars = REF.bars.map(([x1, y1, x2, y2, w]) => `<line x1="${x1 * sx}" y1="${y1 * sy}" x2="${x2 * sx}" y2="${y2 * sy}" stroke="#22344a" stroke-width="${w * Math.min(1.25, k)}"/>`).join("");
      const tw = `translate(${(REF.twig[0] * sx).toFixed(1)} ${(REF.twig[1] * sy).toFixed(1)}) scale(${(REF.twig[2] * k).toFixed(3)})`;
      const vb = `viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"`;
      $$(":scope > svg", desk).forEach(e => e.remove());
      const add = html => { desk.insertAdjacentHTML("beforeend", html); };
      add(`<svg class="sun" ${vb}><defs><filter id="room-sb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur.patch}"/></filter>
        <linearGradient id="room-sg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="rgb(250 251 252)"/><stop offset="${small ? 0 : .17}" stop-color="rgb(248 250 251)"/>
        <stop offset="${small ? .2 : .3}" stop-color="rgb(240 243 246)"/><stop offset="1" stop-color="rgb(238 242 245)"/></linearGradient></defs>
        <rect x="-10" y="-10" width="${W + 20}" height="${H + 20}" fill="url(#room-sg)"/><polygon points="${patch}" fill="#fff" filter="url(#room-sb)"/></svg>`);
      add(`<svg class="lift" ${vb}><defs><filter id="room-lb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur.patch}"/></filter></defs>
        <polygon points="${patch}" fill="rgb(19 20 21)" filter="url(#room-lb)"/></svg>`);
      const old = desk.querySelector(".tooth"); if (old) old.remove();
      desk.insertAdjacentHTML("beforeend", '<i class="tooth"></i>');
      if (cast) cast.remove();
      document.body.insertAdjacentHTML("beforeend", `<svg class="cast" ${vb} aria-hidden="true"><defs>
        <filter id="room-pb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur.patch}"/></filter>
        <filter id="room-bb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur.bar}"/></filter>
        <filter id="room-um"><feGaussianBlur stdDeviation="${blur.umbra}"/></filter>
        <filter id="room-pe" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur.penumbra}"/></filter>
        <path id="room-leaf" d="${LEAF}"/>
        <mask id="room-m" maskUnits="userSpaceOnUse" x="-200" y="-200" width="${W + 400}" height="${H + 400}"><polygon points="${patch}" fill="#fff" filter="url(#room-pb)"/></mask></defs>
        <g mask="url(#room-m)" color="#22344a" fill="#22344a"><g filter="url(#room-bb)" opacity=".9">${bars}</g>
        <g transform="${tw}"><g filter="url(#room-um)">${twig("room-leaf")}</g><g filter="url(#room-pe)" opacity=".55" transform="translate(16 12)">${twig("room-leaf")}</g></g></g></svg>`);
      cast = document.body.lastElementChild;
    }
    paint();
    let rt = 0; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(paint, 120); });
    // daybreak: the light rises with the first load
    document.documentElement.style.setProperty("--day", "0");
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.style.setProperty("--day", "1")));
  })();
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
      `<g filter="url(#sealInk)"><rect x="4" y="4" width="92" height="92" rx="5" fill="#b5523b"/><g fill="#f6efe6" font-family="LXGW WenKai, KaiTi, serif" font-weight="700">${t}</g>` +
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
