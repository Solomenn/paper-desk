/* 雪国线的车票 — after sasshi's admission ticket (src/bag/objects/ticket.ts, AGPL-3.0).
 *
 * 150 × 58 mm of cool white board. The body: the line and the month in small tracked sans, the task in a Song/Mincho serif, the
 * route under it, the big minutes numeral; a hairline, then the fields (date, departs, arrives, seat) and the line's motto at the
 * foot. A 藍 stub behind a perforation (half-round notches, a row of real holes, a short tear started at the top) and an outer edge
 * torn where it came off the book. The back is printed too: the terms and a small 藍 ○.
 *
 *   Ticket.html(t, {stamp})  → markup for one ticket (sized by --tw on .tkt; everything inside is in mm of that width)
 *   Ticket.fill(el, t)       → reprint an existing ticket (the physics stay)
 *   Ticket.physics(el, o)    → it can be picked up: tilts under the pointer, lifts and swings when dragged, springs back on release,
 *                              turns over on a click; the shadow follows the light (top right)
 *   Ticket.punch(el)         → the conductor's punch: a hole, a chad falling out, a jolt
 */
(function () {
  const W = 150, H = 58, PERF = 116, NOTCH = 2.4, PUNCH = { x: 103, y: 47.5, r: 2.3 }, TORN_N = 116;
  const SPOT = "#2f4f73", BOARD = "#eef0ed";
  const DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const TERMS = ["本票限当日当次列车有效，一人一票。", "请保留至出站，车内可能查验。", "检票打孔后，不再用于他次。", "中途下车，票面记下所到之站。"];

  /* ───────── fonts and styles, once ───────── */
  if (!document.getElementById("tk-style")) {
    if (!document.querySelector('link[href*="room.css"], link[href*="fonts.css"]')) {   // the faces, unless the page has them already
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "fonts.css"; document.head.appendChild(l);
    }
    const s = document.createElement("style"); s.id = "tk-style";
    s.textContent = `
.tkt { --u: calc(100cqw / ${W}); --serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif;
  --sans: "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --ink: #1c232b; --ink2: #3a4652; --muted: #6b7682;
  position: relative; width: var(--tw, 560px); aspect-ratio: ${W} / ${H}; container-type: inline-size; perspective: 1400px; color: var(--ink);
  -webkit-user-select: none; user-select: none; touch-action: none; line-height: 1; }
.tkt * { box-sizing: border-box; }
.tk-shadow { position: absolute; inset: 0; pointer-events: none; opacity: .5; transform-origin: 50% 50%;
  filter: blur(calc(var(--u) * 2.2)); will-change: transform, filter, opacity; }
.tk-shadow svg { width: 100%; height: 100%; display: block; }
.tk-body { position: absolute; inset: 0; transform-style: preserve-3d; will-change: transform; }
.tk-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.tk-back { transform: rotateY(180deg); }
.tk-face > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
.tk-face .p { position: absolute; white-space: nowrap; }
.tk-face .mi { font: 500 calc(var(--u) * 1.75) var(--sans); letter-spacing: .14em; color: var(--muted); }
.tk-face .sf { font-family: var(--serif); }
.tk-face .sn { font-family: var(--sans); }
.tk-face .r { transform: translateX(-100%); }
.tk-gl { mix-blend-mode: soft-light; }
body .tkt .tk-face .sf, body .tkt .arr text { font-family: var(--serif) !important; }
body .tkt .tk-face .sn, body .tkt .tk-face .mi { font-family: var(--sans) !important; }
.tkt .tk-cut, .tkt .tk-ring, .tkt .tk-wall { transition: r .16s cubic-bezier(.5, 2, .5, 1), opacity .2s; }
.tkt .tk-cut { r: 0; } .tkt.punched .tk-cut { r: ${PUNCH.r}px; }
.tkt .tk-ring, .tkt .tk-wall { opacity: 0; } .tkt.punched .tk-ring, .tkt.punched .tk-wall { opacity: 1; }
.tkt .arr { position: absolute; left: calc(var(--u) * 55); top: calc(var(--u) * 25); width: calc(var(--u) * 28); height: calc(var(--u) * 28);
  opacity: 0; transform: rotate(-14deg) scale(1.3); mix-blend-mode: multiply; transition: opacity .3s, transform .35s cubic-bezier(.5, 1.6, .5, 1); }
.tkt.stamped .arr { opacity: .72; transform: rotate(-14deg) scale(1); }
.tkt.grab { cursor: grabbing; } .tkt.can { cursor: grab; }
.tk-chad { position: fixed; z-index: 99; border-radius: 50%; background: ${BOARD}; pointer-events: none; box-shadow: 0 1px 2px rgba(0,0,0,.35); }
`;
    document.head.appendChild(s);
  }

  /* ───────── the paper ───────── */
  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const f2 = v => +v.toFixed(3);
  /** the outer edge where the stub came off the book: a slow, irregular wander of about ±0.5 mm, never a fuzz (top to bottom) */
  function torn(seed) {
    const r = rng(seed), l1 = 4.2 + r() * 1.8, l2 = 2.9 + r() * .7, p1 = r() * 6.283, p2 = r() * 6.283, xs = [];
    let n = 0;
    for (let i = 0; i <= TORN_N; i++) {
      const y = .5 + (H - 1) * i / TORN_N; n = n * .7 + (r() - .5) * .12;
      xs.push(W - .62 + .28 * Math.sin(6.283 * y / l1 + p1) + .16 * Math.sin(6.283 * y / l2 + p2) + n);
    }
    return xs;
  }
  const yAt = i => .5 + (H - 1) * i / TORN_N;
  function outline(edge) {
    const c = .6;
    let d = `M${c} 0 L${PERF - NOTCH} 0 A${NOTCH} ${NOTCH} 0 0 0 ${PERF + NOTCH} 0 L${f2(edge[0])} 0`;
    edge.forEach((x, i) => { d += ` L${f2(x)} ${f2(yAt(i))}`; });
    d += ` L${f2(edge[TORN_N])} ${H} L${PERF + NOTCH} ${H} A${NOTCH} ${NOTCH} 0 0 0 ${PERF - NOTCH} ${H} L${c} ${H} Q0 ${H} 0 ${H - c} L0 ${c} Q0 0 ${c} 0 Z`;
    return d;
  }
  /** the holes: the perforation, the tear started at the top notch, the punch (grown when punched) */
  function holes(seed) {
    let s = "";
    for (let y = 4.2; y < H - 4; y += 2.2) s += `<circle cx="${PERF}" cy="${f2(y)}" r=".42"/>`;
    const r = rng(seed ^ 0x7ea), top = NOTCH - .4, L = [], R = [];
    for (let k = 0; k <= 8; k++) { const x = PERF + (.12 + r() * .12) * (k % 2 ? 1 : -1), y = top + k * 5.4 / 8; L.push(`${f2(x - .08)} ${f2(y)}`); R.unshift(`${f2(x + .09)} ${f2(y)}`); }
    s += `<path d="M${PERF - .5} ${top - .6} L${L.join(" L")} L${R.join(" L")} L${PERF + .5} ${top - .6} Z"/>`;
    s += `<circle class="tk-cut" cx="${PUNCH.x}" cy="${PUNCH.y}"/>`;
    return s;
  }
  function paperSVG(id, seed, side) {
    const edge = torn(seed), O = outline(edge), mirror = side === "back" ? ` transform="translate(${W} 0) scale(-1 1)"` : "";
    const r = rng(seed ^ 0x7e);
    // the board's white core where the ink broke off at the tear, with a few fibres standing out of it into the ink
    let fr = `M${W + 1} 0`, wob = 0;
    edge.forEach((x, i) => { wob = wob * .6 + (r() - .5) * .14; fr += ` L${f2(x - .3 - wob)} ${f2(yAt(i))}`; });
    fr += ` L${W + 1} ${H} Z`;
    let fib = "";
    for (let i = 0; i < 26; i++) { const k = Math.floor(r() * TORN_N), x = edge[k] - .3, y = yAt(k), l = .25 + r() * .35; fib += `<path d="M${f2(x)} ${f2(y)} l${f2(-l)} ${f2((r() - .5) * l * .8)}" stroke-width="${f2(.05 + r() * .04)}"/>`; }
    let guide = "";
    for (let y = 4; y < H - 4; y += 2.2) guide += `<rect x="${PERF - .07}" y="${f2(y)}" width=".14" height="1.1"/>`;
    const front = side === "front";
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
  <mask id="m${id}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${W + 4}" height="${H + 4}"><g${mirror}><path d="${O}" fill="#fff"/><g fill="#000">${holes(seed)}</g></g></mask>
  <filter id="g${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${front ? 2.2 : 2}" numOctaves="3" seed="${seed % 97}"/>
    <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .34  0 0 0 0 .38  0 0 0 .11 -.02"/></filter>
  <filter id="t${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="${(seed >> 3) % 97}"/>
    <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .4  0 0 0 0 .45  0 0 0 .07 -.01"/></filter>
  <radialGradient id="h${id}" class="tk-hl" cx=".7" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="d${id}" class="tk-dk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14202f" stop-opacity=".4"/><stop offset=".6" stop-color="#14202f" stop-opacity="0"/></linearGradient>
  <linearGradient id="s${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#15233a" stop-opacity=".07"/></linearGradient>
</defs>
<g mask="url(#m${id})">
  <rect width="${W}" height="${H}" fill="${BOARD}"/>
  <rect width="${W}" height="${H}" filter="url(#t${id})"/>
  <rect width="${W}" height="${H}" filter="url(#g${id})"/>
  ${front ? `<g fill="rgba(28,35,43,.14)">${guide}</g>
  <rect x="${PERF + .35}" width="${W - PERF}" height="${H}" fill="var(--spot, ${SPOT})"/>
  <rect x="${PERF + .35}" width="${W - PERF}" height="${H}" fill="url(#s${id})"/>
  <rect x="${PERF + .35}" width="${W - PERF}" height="${H}" filter="url(#g${id})" opacity=".8"/>
  <path d="${fr}" fill="#f4f5f2"/><g stroke="rgba(244,245,242,.7)" stroke-linecap="round" fill="none">${fib}</g>
  <circle class="tk-ring" cx="${PUNCH.x}" cy="${PUNCH.y}" r="${PUNCH.r + .08}" fill="none" stroke="rgba(40,52,66,.18)" stroke-width=".18"/>
  <g class="tk-wall" fill="none" stroke-linecap="round">${[0, 1, 2].map(k => { const a0 = Math.PI * (.92 + k * .08), a1 = Math.PI * (1.62 - k * .08), R = PUNCH.r + .15;
    return `<path d="M${f2(PUNCH.x + R * Math.cos(a0))} ${f2(PUNCH.y + R * Math.sin(a0))} A${R} ${R} 0 0 1 ${f2(PUNCH.x + R * Math.cos(a1))} ${f2(PUNCH.y + R * Math.sin(a1))}" stroke="rgba(21,35,58,${f2(.18 * (3 - k) / 3)})" stroke-width="${f2(.3 - k * .06)}"/>`; }).join("")}</g>` : ""}
  <g class="tk-gl" opacity="0"><rect width="${W}" height="${H}" fill="url(#h${id})"/><rect width="${W}" height="${H}" fill="url(#d${id})"/></g>
</g></svg>`;
  }
  function shadowSVG(id, seed) {
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><mask id="d${id}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${W + 4}" height="${H + 4}"><path d="${outline(torn(seed))}" fill="#fff"/><g fill="#000">${holes(seed)}</g></mask></defs>
      <rect width="${W}" height="${H}" fill="#050b16" mask="url(#d${id})"/></svg>`;
  }

  /* ───────── the print ───────── */
  const esc = x => String(x == null ? "" : x).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const hm = ts => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  /** a run of text set on a baseline: x, baseline and size in mm */
  function at(x, base, size, cls, text, extra = "") {
    return `<span class="p ${cls}" style="left:calc(var(--u)*${x});top:calc(var(--u)*${f2(base - size * .88)});font-size:calc(var(--u)*${size});${extra}">${text}</span>`;
  }
  /** about how wide a line is, in ems (Han ≈ 1, Latin narrower) */
  const ems = s => [...String(s)].reduce((a, c) => a + (/[　-鿿＀-￯]/.test(c) ? 1 : /[A-Z0-9]/.test(c) ? .62 : c === " " ? .28 : .52), 0);
  function frontPrint(t) {
    const d = new Date(t.start || Date.now()), stops = t.stops || [], x0 = 8, right = PERF - 8;
    let s = "";
    s += at(x0, 10.6, 1.75, "mi", "雪国线 · 乘车券");
    s += at(right, 10.6, 1.75, "mi r", `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`);
    // the big numeral: the minutes of the ride
    s += at(right, 31.2, String(t.minutes).length > 2 ? 16 : 21, "sf r", esc(t.minutes), "font-weight:500;letter-spacing:-.015em");
    s += at(right, 35.4, 1.75, "mi r", t.open && !t.endAt ? "分 钟 起" : "分 钟");
    // the task: one line if it fits at 70 % of the size, else two smaller lines
    const name = t.name || (t.start ? "先上车，再想" : "这一程，专注什么？"), evW = right - x0 - 30, full = ems(name) * 8.6;
    if (full <= evW / .7) {
      const px = Math.min(8.6, 8.6 * evW / full);
      s += at(x0 - .4, 23, f2(px), "sf", esc(name), "font-weight:500;letter-spacing:-.005em");
    } else {
      const chars = [...name], per = Math.floor(evW / 6.4 / (ems(name) / chars.length));
      let a = chars.slice(0, per).join(""), b = chars.slice(per).join("");
      if (ems(b) * 6.4 > evW) b = [...b].slice(0, per - 1).join("") + "…";
      s += at(x0 - .4, 18, 6.4, "sf", esc(a), "font-weight:500") + at(x0 - .4, 18 + 6.4 * 1.1, 6.4, "sf", esc(b), "font-weight:500");
    }
    const one = full <= evW / .7;
    s += at(x0, one ? 30.4 : 31.8, 3.4, "sf", `${esc(stops[0] || "")} → ${esc(stops[stops.length - 1] || "")}<span style="color:var(--muted)"> · ${Math.max(0, stops.length - 1)} 站</span>`, "color:var(--ink2)");
    // a hairline, then the fields
    s += `<i class="p" style="left:calc(var(--u)*${x0});top:calc(var(--u)*37.6);width:calc(var(--u)*${right - x0});height:max(1px,calc(var(--u)*.16));background:rgba(28,35,43,.2)"></i>`;
    const start = t.start || Date.now(), F = [[x0, "日 期", `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${DAYS[d.getDay()]}`], [x0 + 36, "发 车", hm(start)],
      [x0 + 53, "到 达", t.endAt ? hm(t.endAt) : t.open ? "随 时" : hm(start + t.minutes * (t.unit || 60000))], [x0 + 70, "座 位", esc(t.seat || "")]];
    for (const [x, k, v] of F) s += at(x, 42.2, 1.75, "mi", k) + at(x, 47.4, 3, "sn", v, "color:var(--ink)");
    const n = (t.stamps || []).length;
    s += at(x0, 53.4, 2.4, "sn", t.endAt ? `雪国线 · 夜行${t.km != null ? " · " + t.km + " km" : ""}` : t.open ? "雪国线 · 夜行 · 不限时" : "雪国线 · 夜行 · 车内请保持安静", "color:var(--muted);letter-spacing:.06em");
    // the stub: upright characters down its middle, the number small along its outer side
    const sx = PERF + 9.6, chars = ["乘", "车", "凭", "证"], px = 2.8, step = px * 1.6, y0 = H / 2 - step * 1.5 + px * .36;
    chars.forEach((c, i) => { s += at(sx - px / 2, f2(y0 + i * step), px, "sn", c, "color:#eef2f6;font-weight:500"); });
    s += `<span class="p sn" style="left:calc(var(--u)*${W - 6.4});top:50%;font-size:calc(var(--u)*1.8);color:rgba(238,242,246,.72);letter-spacing:.12em;transform:translate(-50%,-50%) rotate(-90deg)">No. ${esc(t.no || "")}</span>`;
    // the station's stamp, once the ride is over
    if (t.at) {
      const nm = t.done === false ? `中途下车 · ${t.at}` : `${t.at} · 到站`;
      s += `<svg class="arr" viewBox="0 0 100 100" aria-hidden="true"><defs><path id="a${t.id || "x"}" d="M21 52 A29 29 0 0 1 79 52"/></defs>
        <g fill="none" stroke="var(--spot, ${SPOT})"><circle cx="50" cy="50" r="40" stroke-width="2.4"/><circle cx="50" cy="50" r="30" stroke-width="1.2"/></g>
        <g fill="var(--spot, ${SPOT})" font-family="Noto Serif SC, Songti SC, serif"><text font-size="9" letter-spacing="1.5"><textPath href="#a${t.id || "x"}" startOffset="50%" text-anchor="middle">${esc(nm)}</textPath></text>
        <text x="50" y="62" text-anchor="middle" font-size="10">${hm(t.endAt || t.end || Date.now())}</text></g></svg>`;
    }
    return s;
  }
  function backPrint(t) {
    // seen from behind the stub is on the left: the print starts past it
    const bx = W - PERF + 10, d = new Date(t.start || Date.now()), pitch = 3.2, top = 12.4;
    let s = at(bx, top, 3.2, "sf", `雪国线 夜行 ${d.getFullYear()}`, "font-weight:500");
    let row = top + pitch * 3;
    TERMS.forEach((x, i) => { s += at(bx, f2(row), 1.9, "sn", `${i + 1}.`, "color:var(--muted);font-weight:500") + at(bx + 4.2, f2(row), 1.9, "sn", esc(x), "color:#4a5560;letter-spacing:.02em"); row += pitch; });
    const foot = top + pitch * Math.min(12, Math.floor((PUNCH.y - PUNCH.r - 3.6 - top) / pitch));
    s += `<i class="p" style="left:calc(var(--u)*${bx});top:calc(var(--u)*${f2(foot - pitch * 1.1)});width:calc(var(--u)*70);height:max(1px,calc(var(--u)*.14));background:rgba(28,35,43,.2)"></i>`;
    s += at(bx, f2(foot), 1.9, "sn", "雪国线 · 夜行 · 一人一票", "color:var(--muted);letter-spacing:.04em");
    // the station stamps collected on the way, inked over the back in a loose row
    (t.stamps || []).slice(0, 7).forEach((x, i) => {
      const cx0 = 98 + (i % 4) * 8.6, cy0 = 14 + Math.floor(i / 4) * 9 + (i % 2) * 1.2, r = ((x.k * 37) % 17) - 8;
      s += `<span class="p sn" style="left:calc(var(--u)*${f2(cx0)});top:calc(var(--u)*${f2(cy0)});width:calc(var(--u)*7.4);height:calc(var(--u)*7.4);border-radius:50%;
        box-shadow:inset 0 0 0 calc(var(--u)*.28) var(--spot, ${SPOT}), inset 0 0 0 calc(var(--u)*.6) transparent, inset 0 0 0 calc(var(--u)*.78) var(--spot, ${SPOT});
        display:grid;place-items:center;font-size:calc(var(--u)*1.55);color:var(--spot, ${SPOT});opacity:.72;transform:rotate(${r}deg);mix-blend-mode:multiply">${esc(x.name)}</span>`;
    });
    s += at(W - 8, f2(foot), 1.9, "sn r", `<i style="display:inline-block;width:calc(var(--u)*1.64);height:calc(var(--u)*1.64);border-radius:50%;background:var(--spot, ${SPOT});margin-right:calc(var(--u)*1.2);vertical-align:-.05em"></i>No. ${esc(t.no || "")}`, "color:var(--muted);letter-spacing:.15em");
    return s;
  }

  let uid = 0;
  function html(t, o = {}) {
    const id = "tk" + (++uid), seed = hash((t.id || "") + (t.no || "") + "雪国线");
    return `<div class="tkt${o.punched ? " punched" : ""}" data-tkid="${id}">
  <div class="tk-shadow">${shadowSVG(id, seed)}</div>
  <div class="tk-body">
    <div class="tk-face tk-front">${paperSVG(id + "f", seed, "front")}<div class="pr">${frontPrint(t)}</div></div>
    <div class="tk-face tk-back">${paperSVG(id + "b", seed, "back")}<div class="pr">${backPrint(t)}</div></div>
  </div></div>`;
  }
  function fill(el, t) {
    el.querySelector(".tk-front .pr").innerHTML = frontPrint(t);
    el.querySelector(".tk-back .pr").innerHTML = backPrint(t);
  }

  /* ───────── the physics: a stiff card held by the hand ───────── */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function physics(el, o = {}) {
    if (el._ph) return el._ph;
    const body = el.querySelector(".tk-body"), shadow = el.querySelector(".tk-shadow"), gls = el.querySelectorAll(".tk-gl"), hls = el.querySelectorAll(".tk-hl"), dks = el.querySelectorAll(".tk-dk");
    const S = { x: 0, y: 0, vx: 0, vy: 0, rx: 0, ry: 0, vrx: 0, vry: 0, rz: 0, vrz: 0, f: 0, vf: 0, tf: 0, l: 0, vl: 0,
      tx: 0, ty: 0, trx: 0, try_: 0, tl: 0, drag: null, hover: false, raf: 0 };
    el.classList.add("can");
    const spring = (p, v, target, k, z, dt) => { const a = -k * (S[p] - target) - z * S[v]; S[v] += a * dt; S[p] += S[v] * dt; };
    let last = 0;
    function step(now) {
      const dt = Math.min(.033, (now - (last || now)) / 1000) || .016; last = now;
      // where the hand wants it
      if (S.drag) { S.tl = 1; }
      else { S.tx = 0; S.ty = 0; S.tl = Math.abs(S.f - S.tf) > 25 ? .7 : 0; }
      const px = S.x, py = S.y;
      spring("x", "vx", S.tx, S.drag ? 900 : 160, S.drag ? 50 : 15, dt);
      spring("y", "vy", S.ty, S.drag ? 900 : 160, S.drag ? 50 : 15, dt);
      const mvx = (S.x - px) / dt, mvy = (S.y - py) / dt;
      // carried through the air it leans against the motion and swings about the hand; at rest it follows the pointer's tilt
      const lean = S.drag ? 1 : .35;
      spring("rx", "vrx", S.trx + Math.max(-14, Math.min(14, mvy * .02 * lean)), 140, 11, dt);
      spring("ry", "vry", S.try_ - Math.max(-14, Math.min(14, mvx * .02 * lean)), 140, 11, dt);
      spring("rz", "vrz", S.drag ? Math.max(-10, Math.min(10, mvx * S.drag.arm * .03)) : 0, 90, 7, dt);
      spring("f", "vf", S.tf, 70, 10, dt);
      spring("l", "vl", S.tl, 120, 14, dt);
      const lift = Math.max(0, S.l);
      body.style.transform = `translate3d(${S.x.toFixed(2)}px, ${S.y.toFixed(2)}px, ${(lift * 40).toFixed(1)}px) rotateZ(${S.rz.toFixed(2)}deg) rotateX(${S.rx.toFixed(2)}deg) rotateY(${(S.ry + S.f).toFixed(2)}deg)`;
      // the light is up at the top right: the shadow falls down and to the left, further and softer as the card is lifted
      const tilt = Math.hypot(S.rx, S.ry);
      shadow.style.transform = `translate(${(S.x - 4 - lift * 18 + S.ry * .5).toFixed(1)}px, ${(S.y + 10 + lift * 26 - S.rx * .5).toFixed(1)}px) rotate(${S.rz.toFixed(2)}deg) scale(${(Math.abs(Math.cos((S.f + S.ry) * Math.PI / 180)) * (1 + lift * .05)).toFixed(3)}, ${(1 + lift * .05).toFixed(3)})`;
      shadow.style.filter = `blur(${(6 + lift * 16).toFixed(1)}px)`;
      shadow.style.opacity = (.55 - lift * .2).toFixed(3);
      // the board is matte: a soft glow where it faces the light, a shade on the side tipped away
      const face = ((S.f % 360) + 360) % 360 > 90 && ((S.f % 360) + 360) % 360 < 270 ? -1 : 1;
      const g = Math.min(.9, .25 + tilt * .05 + lift * .2), ang = Math.atan2(S.rx, -S.ry * face), cx = .5 + Math.cos(ang) * .5, cy = .5 + Math.sin(ang) * .5;
      gls.forEach(e => e.setAttribute("opacity", g.toFixed(3)));
      hls.forEach(e => { e.setAttribute("cx", (.7 + S.ry * .03 * face).toFixed(3)); e.setAttribute("cy", (.2 - S.rx * .03).toFixed(3)); });
      dks.forEach(e => { e.setAttribute("x1", cx.toFixed(3)); e.setAttribute("y1", cy.toFixed(3)); e.setAttribute("x2", (1 - cx).toFixed(3)); e.setAttribute("y2", (1 - cy).toFixed(3)); });
      const busy = S.drag || S.hover || [S.x, S.y, S.rx, S.ry, S.rz, S.f - S.tf, S.l - S.tl].some(v => Math.abs(v) > .02) || [S.vx, S.vy, S.vrx, S.vry, S.vrz, S.vf, S.vl].some(v => Math.abs(v) > .02);
      S.raf = busy ? requestAnimationFrame(step) : 0;
      if (!busy) last = 0;
    }
    const wake = () => { if (!S.raf) S.raf = requestAnimationFrame(step); };
    function aim(e) {
      if (reduce) return;
      const r = el.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width * 2 - 1, dy = (e.clientY - r.top) / r.height * 2 - 1;
      S.trx = -dy * 6; S.try_ = dx * 7 * (Math.cos(S.tf * Math.PI / 180) < 0 ? -1 : 1);
    }
    el.addEventListener("pointerenter", e => { S.hover = true; aim(e); wake(); });
    el.addEventListener("pointermove", e => {
      if (S.drag && e.pointerId === S.drag.id) {
        const dx = e.clientX - S.drag.sx, dy = e.clientY - S.drag.sy;
        if (!S.drag.moved && Math.hypot(dx, dy) > 5) { S.drag.moved = true; el.classList.add("grab"); window.Sound && Sound.play("pickUp", { vol: .5 }); }
        if (S.drag.moved && o.drag !== false) { S.tx = dx; S.ty = dy; }
      }
      aim(e); wake();
    });
    el.addEventListener("pointerleave", () => { if (S.drag) return; S.hover = false; S.trx = 0; S.try_ = 0; wake(); });
    el.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      const r = el.getBoundingClientRect();
      S.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, arm: ((e.clientY - r.top) / r.height - .5) * -2 + ((e.clientX - r.left) / r.width - .5) * .4 };
      el.setPointerCapture(e.pointerId); wake();
    });
    const up = e => {
      if (!S.drag || e.pointerId !== S.drag.id) return;
      const moved = S.drag.moved; S.drag = null; el.classList.remove("grab");
      if (moved) { window.Sound && Sound.impact("card", Math.min(1, Math.hypot(S.vx, S.vy) / 1500 + .2)); }
      else if (o.flip !== false) turn();
      if (e.type === "pointercancel" || !el.matches(":hover")) { S.hover = false; S.trx = 0; S.try_ = 0; }
      wake();
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("click", e => e.stopPropagation());
    function turn() { S.tf += 180; S.vl += 3; window.Sound && Sound.play("pageTurn", { vol: .55 }); wake(); }
    function kick(vx, vy, vrx) { S.vx += vx; S.vy += vy; S.vrx += vrx; wake(); }
    el._ph = { turn, kick };
    wake();
    return el._ph;
  }

  function punch(el) {
    el.classList.add("punched");
    if (el._ph) el._ph.kick(0, 60, -40);
    if (reduce) return;
    // the chad: a little disc of board drops out of the hole, turning as it falls
    const r = el.getBoundingClientRect(), d = r.width * PUNCH.r * 2 / W, c = document.createElement("i");
    c.className = "tk-chad";
    let x = r.left + r.width * PUNCH.x / W - d / 2, y = r.top + r.height * PUNCH.y / H - d / 2, vx = (Math.random() - .5) * 60, vy = -40, a = 0, t0 = performance.now(), prev = t0;
    Object.assign(c.style, { width: d + "px", height: d + "px", left: x + "px", top: y + "px" });
    document.body.appendChild(c);
    (function fall(now) {
      const dt = (now - prev) / 1000; prev = now; vy += 900 * dt; x += vx * dt; y += vy * dt; a += dt * 9;
      const age = (now - t0) / 1000;
      c.style.transform = `translate(${x - parseFloat(c.style.left)}px, ${y - parseFloat(c.style.top)}px) scaleY(${Math.cos(a).toFixed(3)})`;
      c.style.opacity = Math.max(0, 1 - Math.max(0, age - .5) * 2);
      if (age < 1.1) requestAnimationFrame(fall); else c.remove();
    })(t0);
  }

  window.Ticket = { html, fill, physics, punch };
})();
