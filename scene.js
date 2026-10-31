/* 雪国驿舍 · the corner by the desk (index.html): the boards keep most of the wall; to their right a window onto the snow — a street
   lamp, roofs, pines, the snow coming down — a pipe and a magnifying glass on the sill, the deerstalker and the Inverness cape on
   their hook, the violin against the wall, and the stove in the corner with its fire. Night: the lamp outside is lit and the fire
   is the warmest thing in the room. Day: snow light, the lamp off, the fire low. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const css = `
  #side { position: fixed; top: 0; right: 0; bottom: 0; width: var(--sidew); z-index: 1; pointer-events: none; }
  body.noside #side { display: none; }
  #side > * { position: absolute; }
  /* the window */
  #side .win { left: 5%; top: calc(var(--toph) + 22px); width: 60%; height: min(46vh, 400px); border-radius: 3px; padding: 9px;
    background: linear-gradient(90deg, #6e4d31, #8a6542 20%, #74532f 60%, #5e4128); box-shadow: 0 0 0 1px rgba(40,25,12,.6), 0 18px 30px -14px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,230,190,.3); }
  #side .win canvas { position: absolute; inset: 9px; width: calc(100% - 18px); height: calc(100% - 18px); border-radius: 1px; }
  #side .win .bars { position: absolute; inset: 9px; background:
      linear-gradient(90deg, transparent calc(50% - 4px), #7a5836 calc(50% - 4px) calc(50% + 4px), transparent calc(50% + 4px)),
      linear-gradient(180deg, transparent calc(33% - 3px), #7a5836 calc(33% - 3px) calc(33% + 3px), transparent calc(33% + 3px) calc(66% - 3px), #7a5836 calc(66% - 3px) calc(66% + 3px), transparent calc(66% + 3px)); }
  /* frost creeping in from the corners of each pane, and the cold glass */
  #side .win .frost { position: absolute; inset: 9px; pointer-events: none; box-shadow: inset 0 0 18px 4px rgba(225, 235, 245, .35);
    background: radial-gradient(40% 30% at 0 100%, rgba(235,242,250,.45), transparent 70%), radial-gradient(35% 25% at 100% 100%, rgba(235,242,250,.35), transparent 70%); }
  #side .sill { left: 1%; width: 68%; height: 13px; border-radius: 2px; background: linear-gradient(#9a7048, #6b4a2c); box-shadow: 0 8px 12px -6px rgba(0,0,0,.6); }
  #side svg { overflow: visible; }
  #side .stoveglow { left: -40%; bottom: -10%; width: 140%; height: 70%; background: radial-gradient(50% 50% at 50% 70%, rgba(255, 140, 60, .32), rgba(255, 120, 50, .1) 45%, transparent 70%);
    mix-blend-mode: screen; animation: ember 3.1s ease-in-out infinite; }
  html[data-theme="day"] #side .stoveglow { opacity: .35; }
  #side .fire { animation: fire 1.3s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
  #side .fire.b { animation-duration: 1.7s; animation-delay: -.6s; }
  html[data-theme="day"] #side .fire { opacity: .65; }
  @keyframes fire { 0%, 100% { transform: scaleY(1) skewX(0); } 30% { transform: scaleY(1.12) skewX(-3deg); } 60% { transform: scaleY(.92) skewX(2deg); } }
  #side .smoke { fill: none; stroke: rgba(236, 232, 222, .6); stroke-width: 1.8; stroke-linecap: round; stroke-dasharray: 3 9; animation: smoke 3.4s linear infinite; }
  @keyframes smoke { to { stroke-dashoffset: -48; } }
  @media (prefers-reduced-motion: reduce) { #side .fire, #side .stoveglow, #side .smoke { animation: none; } }
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  // a tweed check for the hat and the cape
  const tweed = (id, a, b, c) => `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${a}"/>
    <path d="M0 1.5h8M0 5.5h8" stroke="${b}" stroke-width="1.2" opacity=".55"/><path d="M1.5 0v8M5.5 0v8" stroke="${b}" stroke-width="1.2" opacity=".45"/><path d="M0 3.5h8M3.5 0v8" stroke="${c}" stroke-width=".5" opacity=".6"/></pattern>`;

  const HAT_COAT = `<svg viewBox="0 0 120 470" class="coat" aria-hidden="true"><defs>${tweed("sc-tw1", "#3f342b", "#221b15", "#6a5a48")}${tweed("sc-tw2", "#4a3d31", "#271f17", "#77654f")}${tweed("sc-tw3", "#b39a74", "#6e5638", "#e2cfa8")}
      <linearGradient id="sc-fold" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient></defs>
    <path d="M58 6h8v14h-8z" fill="#2b2118"/><path d="M50 18h24l-4 10H54z" fill="#b39255"/><path d="M62 28q0 10 -6 14" stroke="#b39255" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- the Inverness: a long coat and the cape over its shoulders -->
    <path d="M44 70 L80 70 L100 300 L104 440 L18 440 L22 300 Z" fill="url(#sc-tw1)"/><path d="M44 70 L80 70 L100 300 L104 440 L18 440 L22 300 Z" fill="url(#sc-fold)"/>
    <path d="M60 80 L60 440" stroke="#2b1e12" stroke-width="1.5" opacity=".6"/><circle cx="64" cy="150" r="2.4" fill="#2b1e12"/><circle cx="64" cy="200" r="2.4" fill="#2b1e12"/><circle cx="64" cy="250" r="2.4" fill="#2b1e12"/>
    <path d="M40 58 Q62 46 84 58 L118 200 Q62 222 4 200 Z" fill="url(#sc-tw2)"/><path d="M40 58 Q62 46 84 58 L118 200 Q62 222 4 200 Z" fill="url(#sc-fold)"/>
    <path d="M4 200 Q62 222 118 200" stroke="#2f2215" stroke-width="2" fill="none" opacity=".5"/><path d="M48 56 L62 80 L76 56" fill="#4a3522"/>
    <!-- the deerstalker on the hook: peaks front and back, the ear flaps tied up over the crown -->
    <g transform="translate(62 46)"><path d="M-30 6 Q-40 10 -44 4 Q-34 0 -24 2 Z" fill="url(#sc-tw3)"/><path d="M30 6 Q40 10 44 4 Q34 0 24 2 Z" fill="url(#sc-tw3)"/>
      <path d="M-28 6 Q-28 -30 0 -32 Q28 -30 28 6 Q0 12 -28 6 Z" fill="url(#sc-tw3)"/><path d="M-28 6 Q-28 -30 0 -32 Q28 -30 28 6 Q0 12 -28 6 Z" fill="url(#sc-fold)"/>
      <path d="M0 -32 V6" stroke="#3a2a19" stroke-width="1" opacity=".6"/><path d="M-22 -10 Q-12 -22 -2 -30 M22 -10 Q12 -22 2 -30" stroke="#3a2a19" stroke-width="1.2" fill="none" opacity=".55"/>
      <path d="M-5 -33 q-6 -6 -10 -2 q4 4 10 2 M5 -33 q6 -6 10 -2 q-4 4 -10 2" fill="#5a4129" stroke="#3a2a19" stroke-width=".8"/><circle cy="-33" r="2" fill="#3a2a19"/></g></svg>`;

  const STOVE = `<svg viewBox="0 0 200 330" class="stove" aria-hidden="true"><defs>
      <linearGradient id="sc-iron" x1="0" x2="1"><stop offset="0" stop-color="#16171a"/><stop offset=".35" stop-color="#3b3d40"/><stop offset=".6" stop-color="#26282b"/><stop offset="1" stop-color="#101113"/></linearGradient>
      <radialGradient id="sc-coals" cx=".5" cy=".85" r=".8"><stop offset="0" stop-color="#ffd27a"/><stop offset=".4" stop-color="#ff8a3a"/><stop offset="1" stop-color="#7a1e0c"/></radialGradient></defs>
    <!-- the flue: up a little, then into the wall through its collar -->
    <rect x="88" y="-46" width="24" height="106" fill="url(#sc-iron)"/><rect x="84" y="40" width="32" height="8" rx="2" fill="#2a2b2e"/>
    <circle cx="100" cy="-58" r="24" fill="#3a3c40"/><circle cx="100" cy="-58" r="19" fill="#1a1b1e"/><circle cx="100" cy="-58" r="13" fill="url(#sc-iron)"/>
    <!-- the pot belly on its legs -->
    <path d="M60 300 l-14 28 h10 l12 -24 M140 300 l14 28 h-10 l-12 -24" fill="#1b1c1f"/>
    <rect x="66" y="58" width="68" height="16" rx="3" fill="#2b2d30"/><rect x="58" y="70" width="84" height="10" rx="3" fill="#3a3c40"/>
    <path d="M70 80 Q24 120 30 200 Q34 280 70 300 H130 Q166 280 170 200 Q176 120 130 80 Z" fill="url(#sc-iron)"/>
    <path d="M44 150 H156 M38 230 H162" stroke="#4a4c50" stroke-width="3" opacity=".7"/><rect x="40" y="296" width="120" height="12" rx="3" fill="#2b2d30"/>
    <!-- the fire door, open a crack of glass: the fire behind it -->
    <rect x="68" y="168" width="64" height="58" rx="8" fill="#120b08"/><rect x="72" y="172" width="56" height="50" rx="6" fill="url(#sc-coals)"/>
    <path class="fire" d="M80 222 Q84 196 92 190 Q92 206 100 200 Q104 184 112 180 Q112 200 120 196 Q122 210 120 222 Z" fill="#ffb347" opacity=".9"/>
    <path class="fire b" d="M86 222 Q92 204 98 206 Q102 194 108 196 Q110 210 116 222 Z" fill="#fff0b0" opacity=".8"/>
    <path d="M72 172 h56 M72 188 h56 M72 204 h56" stroke="#120b08" stroke-width="2.5" opacity=".75"/><rect x="66" y="166" width="68" height="62" rx="9" fill="none" stroke="#4d4f53" stroke-width="3"/>
    <circle cx="138" cy="196" r="4" fill="#8a7b5c"/>
    <!-- a kettle keeping warm -->
    <g transform="translate(72 64)"><path d="M-24 0 Q-26 -26 0 -28 Q26 -26 24 0 Z" fill="#7d6a4c"/><path d="M-16 -26 Q0 -48 16 -26" stroke="#3a2f22" stroke-width="3" fill="none"/>
      <path d="M22 -12 L40 -24 L38 -18 L24 -6" fill="#6c5a40"/><rect x="-26" y="-2" width="52" height="5" rx="2" fill="#5f4f37"/></g></svg>`;

  const VIOLIN = `<svg viewBox="0 0 90 260" class="violin" aria-hidden="true"><defs>
      <radialGradient id="sc-varnish" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#d48a3c"/><stop offset=".55" stop-color="#9a4e1c"/><stop offset="1" stop-color="#5a2a0e"/></radialGradient></defs>
    <g transform="rotate(-9 45 250)">
      <path d="M45 98 C20 98 18 120 26 132 C30 140 22 146 22 160 C22 190 18 214 45 216 C72 214 68 190 68 160 C68 146 60 140 64 132 C72 120 70 98 45 98 Z" fill="url(#sc-varnish)" stroke="#3a1a08" stroke-width="1.2"/>
      <path d="M36 140 q-4 10 0 22 M54 140 q4 10 0 22" stroke="#1e0d04" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M40 186 h10 l-1 20 h-8 z" fill="#1c1410"/><path d="M38 214 q7 6 14 0 v-6 h-14 z" fill="#1c1410"/>
      <rect x="41" y="20" width="8" height="84" rx="2" fill="#1c1410"/><path d="M45 4 q-8 2 -6 10 q2 6 6 4 q4 2 6 -4 q2 -8 -6 -10 z" fill="#7a3b14" stroke="#3a1a08"/>
      <path d="M38 14 h-4 M38 20 h-4 M52 14 h4 M52 20 h4" stroke="#1c1410" stroke-width="2"/>
      <path d="M43.4 18 V196 M44.8 18 V196 M46.2 18 V196 M47.6 18 V196" stroke="#e8e0c8" stroke-width=".45" opacity=".8"/><path d="M38 170 h14" stroke="#e6d4a8" stroke-width="2"/></g>
    <!-- the bow beside it -->
    <path d="M78 6 L70 254" stroke="#3a2412" stroke-width="2.2"/><path d="M80.5 8 L74 252" stroke="#efe6cf" stroke-width="1" opacity=".85"/><rect x="66" y="236" width="9" height="14" rx="1.5" transform="rotate(-2 70 243)" fill="#1c1410"/></svg>`;

  const SILL = `<svg viewBox="0 0 220 40" class="onsill" aria-hidden="true"><defs>
      <linearGradient id="sc-brass" x1="0" x2="1"><stop offset="0" stop-color="#7a5f2a"/><stop offset=".5" stop-color="#e2c27a"/><stop offset="1" stop-color="#8a6a2c"/></linearGradient>
      <radialGradient id="sc-lens" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".6" stop-color="#cfe0ee" stop-opacity=".18"/><stop offset="1" stop-color="#9fb4c8" stop-opacity=".3"/></radialGradient></defs>
    <!-- the pipe: a curved stem and a calabash bowl, a thread of smoke -->
    <path d="M18 34 Q34 36 52 28 Q64 22 70 24" stroke="#1e130b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M60 14 Q58 36 72 37 Q86 36 84 14 Z" fill="#6b3a1a"/><ellipse cx="72" cy="14" rx="12" ry="3.4" fill="#2a1609"/><ellipse cx="72" cy="14" rx="8" ry="2" fill="#c45a24" opacity=".7"/>
    <path class="smoke" d="M72 10 C66 2 78 -6 70 -14 C62 -22 76 -30 68 -40"/>
    <!-- the magnifying glass -->
    <g transform="translate(150 22) rotate(-12)"><rect x="18" y="-3.5" width="46" height="7" rx="3" fill="#4a2a14"/><rect x="14" y="-4.5" width="8" height="9" rx="2" fill="url(#sc-brass)"/>
      <circle r="17" fill="url(#sc-lens)" stroke="url(#sc-brass)" stroke-width="4"/></g></svg>`;

  // the scene
  const side = document.createElement("div"); side.id = "side"; side.setAttribute("aria-hidden", "true");
  side.innerHTML = `<i class="stoveglow"></i><div class="win"><canvas></canvas><i class="bars"></i><i class="frost"></i></div><i class="sill"></i>${SILL}${HAT_COAT}${STOVE}${VIOLIN}`;
  const start = () => { document.body.appendChild(side); layout(); requestAnimationFrame(tick); };
  function layout() {
    const S = side.clientWidth, H = innerHeight, win = $(".win", side), wr = win.getBoundingClientRect();
    const sillY = wr.bottom + 4;
    Object.assign($(".sill", side).style, { top: sillY + "px" });
    const on = $(".onsill", side), ow = S * .62; Object.assign(on.style, { left: (S * .05) + "px", top: (sillY - ow * 40 / 220 + 4) + "px", width: ow + "px" });
    const coat = $(".coat", side), cw = S * .34; Object.assign(coat.style, { left: (S * .68) + "px", top: (wr.top - 18) + "px", width: cw + "px" });
    const st = $(".stove", side), sw = Math.min(S * .52, H * .26); Object.assign(st.style, { left: (S * .04) + "px", bottom: "-6px", width: sw + "px" });
    const vi = $(".violin", side), vh = Math.min(H * .3, 260); Object.assign(vi.style, { right: (S * .02) + "px", bottom: "4px", height: vh + "px", width: (vh * 90 / 260) + "px" });
    const cv = $(".win canvas", side); cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio;
  }
  addEventListener("resize", () => requestAnimationFrame(layout));

  /* outside: sky, a far ridge, roofs with a lit window, pines, the street lamp and its cone, the snow coming down */
  const flakes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), p: Math.random() * 6 }));
  const hs = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  let last = 0;
  function tick(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    const cv = $(".win canvas", side), c = cv.getContext("2d"), w = cv.width, h = cv.height, night = document.documentElement.dataset.theme !== "day";
    if (!w) return requestAnimationFrame(tick);
    const sky = c.createLinearGradient(0, 0, 0, h);
    if (night) { sky.addColorStop(0, "#0b1120"); sky.addColorStop(.6, "#1d2a44"); sky.addColorStop(1, "#2c3b58"); }
    else { sky.addColorStop(0, "#b9c6d4"); sky.addColorStop(.6, "#d9e1ea"); sky.addColorStop(1, "#e9eef3"); }
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    // a far ridge and the roofs of the station street
    c.fillStyle = night ? "#22304a" : "#a9b6c5"; c.beginPath(); c.moveTo(0, h * .62);
    for (let x = 0; x <= w; x += w / 12) c.lineTo(x, h * (.55 + hs(x * .01) * .08)); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    const roof = (x, y, rw, rh) => {
      c.fillStyle = night ? "#121a28" : "#5d6772"; c.fillRect(x, y, rw, h - y);
      c.fillStyle = night ? "#dfe7f0" : "#fbfcfd"; c.beginPath(); c.moveTo(x - rw * .1, y); c.lineTo(x + rw / 2, y - rh); c.lineTo(x + rw * 1.1, y); c.closePath(); c.fill();
      if (night) { c.fillStyle = "#ffcf86"; c.fillRect(x + rw * .3, y + rh * .5, rw * .16, rh * .3); }
    };
    roof(w * .08, h * .72, w * .3, h * .1); roof(w * .55, h * .76, w * .34, h * .09);
    for (let i = 0; i < 7; i++) { const x = hs(i * 3.3) * w, s = h * (.05 + hs(i) * .05), y = h * .86;
      c.fillStyle = night ? "#0c1320" : "#3e4a56"; c.beginPath(); c.moveTo(x, y - s * 2.4); c.lineTo(x + s * .7, y); c.lineTo(x - s * .7, y); c.fill(); }
    c.fillStyle = night ? "#c9d4e2" : "#f7f9fb"; c.fillRect(0, h * .86, w, h * .14);
    // the street lamp
    const lx = w * .78, top = h * .42;
    c.fillStyle = night ? "#0a0f18" : "#2f3640"; c.fillRect(lx - 2.5 * devicePixelRatio, top, 5 * devicePixelRatio, h * .5);
    c.fillRect(lx - 10 * devicePixelRatio, top - 6 * devicePixelRatio, 20 * devicePixelRatio, 7 * devicePixelRatio);
    if (night) {
      const g = c.createRadialGradient(lx, top, 0, lx, top, h * .32); g.addColorStop(0, "rgba(255,214,150,.55)"); g.addColorStop(1, "rgba(255,214,150,0)");
      c.fillStyle = g; c.fillRect(lx - h * .32, top - h * .32, h * .64, h * .64);
      const cone = c.createLinearGradient(0, top, 0, h * .9); cone.addColorStop(0, "rgba(255,220,160,.28)"); cone.addColorStop(1, "rgba(255,220,160,.04)");
      c.fillStyle = cone; c.beginPath(); c.moveTo(lx - 6 * devicePixelRatio, top); c.lineTo(lx + 6 * devicePixelRatio, top); c.lineTo(lx + w * .24, h * .9); c.lineTo(lx - w * .24, h * .9); c.fill();
      c.fillStyle = "#fff1cf"; c.fillRect(lx - 7 * devicePixelRatio, top, 14 * devicePixelRatio, 3 * devicePixelRatio);
    }
    // the snow: brighter where the lamp's cone catches it
    for (const f of flakes) {
      f.y += (.04 + f.z * .09) * dt; f.x += (Math.sin(now / 1000 * .7 + f.p) * .02 - .01) * dt;
      if (f.y > 1) { f.y = -.02; f.x = Math.random(); } if (f.x < 0) f.x += 1;
      const px = f.x * w, py = f.y * h, r = (.6 + f.z * 1.6) * devicePixelRatio, lit = night && Math.abs(px - lx) < (py - top) * .55 && py > top;
      c.globalAlpha = night ? (lit ? .95 : .55) : .8; c.fillStyle = lit ? "#fff3d6" : "#ffffff";
      c.beginPath(); c.arc(px, py, r, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
