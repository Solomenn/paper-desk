/* 雪国线 · the window (focus.html)
   A dark carriage wall with one rounded window, as in the reference frames: a pale rim, a black gasket, the view through it.
   The view is one continuous ride, not clips: the far mountains are a 360° panorama (Poly Haven, CC0) sliding slowly by; the
   field under them rushes past; telegraph poles, their wires and stands of poplars flick by close to the glass.
   The page drives it: #car.on shows it, window.trainSpeed (0…1) sets the pace. */
(() => {
  const car = document.getElementById("car");
  if (!car) return;
  const PANOS = ["champagne_castle_1"];   // alps_field dropped: the road near the camera bends across the field (equirect), it reads as a photo
  const P = PANOS[new Date().getDate() % PANOS.length];

  const css = `
  .cv { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: #0e0c0b; }
  /* the wall: near black, a faint warm sheen from the window, a dark rail for the blind above it */
  .cv::before { content: ""; position: absolute; inset: 0;
    background: radial-gradient(70% 60% at 50% 48%, rgba(70, 64, 58, .35), transparent 70%), linear-gradient(180deg, #151311, #0d0b0a 60%, #090807); }
  .cv-rail { position: absolute; left: 6%; right: 6%; height: 1.6%; border-radius: 2px; background: linear-gradient(#1d1b19, #121110); box-shadow: 0 1px 0 rgba(255,255,255,.04); }
  .cv-win { position: absolute; left: 50%; transform: translateX(-50%); border-radius: 7.5% / 13%;
    background: linear-gradient(180deg, #a9a7a2, #908e8a 55%, #7a7874); box-shadow: 0 0 0 1px #0007, 0 12px 40px -10px #000c; }
  .cv-gasket { position: absolute; inset: 3.4% 2%; border-radius: 6.4% / 11.6%; background: #0d0d0e; box-shadow: inset 0 0 0 1px #000; }
  .cv-glass { position: absolute; inset: 5.2% 3%; border-radius: 4.6% / 8.4%; overflow: hidden; background: #c9d0d4; }
  .cv-glass canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  /* the glass itself: a soft sheen, a touch darker at the edges */
  .cv-glass::after { content: ""; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(120% 120% at 50% 40%, transparent 60%, rgba(10, 12, 14, .28)), linear-gradient(115deg, rgba(255,255,255,.07), transparent 35%); }
  .cv-table { position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; border-radius: 6px 6px 0 0;
    background: linear-gradient(180deg, #dfe2e4, #b9bdc0); clip-path: polygon(3% 0, 97% 0, 100% 100%, 0 100%); }

  /* the page's own controls, on a dark wall */
  #car #line::before { background: rgba(18, 16, 14, .5) !important; box-shadow: 0 0 0 .5px rgba(236, 228, 210, .14) !important; }
  #car #line .track { background: rgba(236, 228, 210, .22) !important; }
  #car #line .track::after { background: repeating-linear-gradient(90deg, rgba(236, 228, 210, .18) 0 1px, transparent 1px calc(100% / var(--km, 10))) !important; }
  #car #line .done { background: #e9e2d0 !important; }
  #car #line .st { background: #141210 !important; box-shadow: inset 0 0 0 1px rgba(236, 228, 210, .5) !important; }
  #car #line .st.past { background: #e9e2d0 !important; box-shadow: none !important; }
  #car #line .st i { color: rgba(236, 228, 210, .5) !important; }
  #car #line .st.past i { color: #e9e2d0 !important; }
  #car #line .tr { background: #e9e2d0 !important; box-shadow: 0 0 0 2.5px #141210 !important; }
  #car #hud { color: rgba(236, 228, 210, .8) !important; }
  #car #off, #car #sndT, body:has(#car.on) .home { color: rgba(236, 228, 210, .82) !important; background: rgba(24, 21, 19, .6) !important;
    box-shadow: 0 0 0 .5px rgba(236, 228, 210, .18) !important; }
  #car #off:hover, #car #sndT:hover { color: #fff !important; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const scene = document.createElement("div"); scene.className = "cv"; scene.setAttribute("aria-hidden", "true");
  scene.innerHTML = '<i class="cv-rail"></i><div class="cv-win"><div class="cv-gasket"></div><div class="cv-glass"><canvas></canvas></div></div><i class="cv-table"></i>';
  car.prepend(scene);
  const WIN = scene.querySelector(".cv-win"), RAIL = scene.querySelector(".cv-rail"), TABLE = scene.querySelector(".cv-table");
  const cv = scene.querySelector("canvas"), g = cv.getContext("2d");

  // the window's place on the wall: about three quarters of the width, 16:9-ish, a little above the middle
  function layout() {
    const W = innerWidth, H = innerHeight;
    const w = Math.min(W * .76, H * .66 * 1.74), h = w / 1.74, top = Math.max(H * .17, (H - h) / 2 - H * .03);
    Object.assign(WIN.style, { width: w + "px", height: h + "px", top: top + "px" });
    Object.assign(RAIL.style, { top: (top - H * .1) + "px" });
    Object.assign(TABLE.style, { width: w * .3 + "px", height: Math.max(10, H - top - h - H * .06) * .3 + "px" });
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
  }
  addEventListener("resize", layout);

  const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  let far = null, ground = null, ready = false;
  Promise.all([img(`assets/train/${P}.webp`), img(`assets/train/${P}_ground.webp`)]).then(([a, b]) => {
    far = a; ready = !!a; if (!b) return;
    // the field strip, its top edge feathered so it melts into the land under the mountains
    const c = document.createElement("canvas"); c.width = b.width; c.height = b.height * 2; const x = c.getContext("2d");
    x.filter = "blur(26px) saturate(.85)";                       // what a field looks like at speed: streaks, no shapes
    for (const dx of [-b.width, 0, b.width]) x.drawImage(b, dx, 0, b.width, c.height);
    x.filter = "none"; x.globalAlpha = .35; x.drawImage(b, 0, 0, b.width, c.height); x.globalAlpha = 1;   // a little grass texture left in
    x.globalCompositeOperation = "destination-in";
    const gr = x.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(.28, "#000"); x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
    ground = c; });

  // the things close to the line, laid out along a long loop of track (px at a 1000-px-wide window)
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const LOOP = 14000, poles = [], trees = [];
  for (let x = 0; x < LOOP; x += 820 + rnd() * 160) poles.push(x);
  for (let x = 400; x < LOOP;) { const n = 2 + Math.floor(rnd() * 6), at = x; for (let k = 0; k < n; k++) trees.push({ x: at + k * (26 + rnd() * 22), h: .42 + rnd() * .2, w: 9 + rnd() * 6, s: rnd() }); x += 1300 + rnd() * 2600; }

  function poplar(x, base, h, w, dark) {        // a tall narrow tree, leaves in a soft dark column
    g.fillStyle = dark; g.beginPath(); g.moveTo(x, base - h);
    g.bezierCurveTo(x + w * .9, base - h * .7, x + w * 1.05, base - h * .2, x + w * .35, base);
    g.lineTo(x - w * .35, base); g.bezierCurveTo(x - w * 1.05, base - h * .2, x - w * .9, base - h * .7, x, base - h); g.fill();
  }

  let last = performance.now(), vel = 0, run = 0, sized = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!car.classList.contains("on")) return;
    if (!sized) { layout(); sized = true; }
    if (!ready) return;
    vel += (Math.min(1, (+window.trainSpeed || 0) * 6) - vel) * Math.min(1, dt * 1.2); run += dt * vel;
    const W = cv.width, H = cv.height, k = W / 1000;                 // k: canvas px per "window px"
    const horizon = H * .74;                                          // where the far land meets the field
    // far: the panorama, slow
    const fh = H * .98, fw = far.width * fh / far.height, fx = -((run * 22 * k) % fw);
    for (let x = fx; x < W; x += fw) g.drawImage(far, x, horizon - fh * .86, fw, fh);
    // the field: fast, smeared by the speed
    if (ground) {
      const gh = (H - horizon) * 1.45, gw = ground.width * gh / ground.height * 3, gx = -((run * 520 * k) % gw), gy = H - gh;
      g.save(); g.globalAlpha = 1;
      for (let x = gx; x < W; x += gw) g.drawImage(ground, x, gy, gw, gh);
      g.globalAlpha = .35 * vel;                                     // motion smear
      for (let s = 1; s <= 3; s++) for (let x = gx + s * 9 * k; x < W; x += gw) g.drawImage(ground, x, gy, gw, gh);
      g.restore();
      const sh = g.createLinearGradient(0, horizon, 0, H); sh.addColorStop(0, "rgba(40,48,44,0)"); sh.addColorStop(1, "rgba(28,32,30,.45)"); g.fillStyle = sh; g.fillRect(0, horizon, W, H - horizon);
    }
    // near: poles with their wires, close to the glass, blurred by the speed
    const blur = Math.min(4, vel * 3) * k;
    g.save(); g.filter = blur > .5 ? `blur(${blur.toFixed(1)}px)` : "none";
    const tx = (run * 300 * k) % (LOOP * k);
    const px = (run * 900 * k) % (LOOP * k), top = H * .2;
    g.strokeStyle = "rgba(30, 32, 32, .8)"; g.lineWidth = Math.max(1, 1.2 * k);
    const ps = poles.map(p => { let x = p * k - px; if (x < -900 * k) x += LOOP * k; return x; }).sort((a, b) => a - b);
    for (let i = 0; i < ps.length - 1; i++) {                       // the wires: three, sagging between poles
      const a = ps[i], b = ps[i + 1]; if (b < 0 || a > W) continue;
      for (const [dy, sag] of [[0, 38], [16, 44], [30, 52]]) { g.beginPath(); g.moveTo(a, top + dy * k); g.quadraticCurveTo((a + b) / 2, top + (dy + sag) * k, b, top + dy * k); g.stroke(); }
    }
    for (const x of ps) { if (x < -40 * k || x > W + 40 * k) continue;
      g.fillStyle = "#2f2d2a"; g.fillRect(x - 4 * k, top - 22 * k, 8 * k, H - top + 22 * k);
      g.fillRect(x - 34 * k, top - 4 * k, 68 * k, 5 * k); }
    g.restore();
    // a cool, hazy grade over the whole view, like the reference frames
    g.fillStyle = "rgba(196, 206, 212, .06)"; g.fillRect(0, 0, W, H);
  }
  requestAnimationFrame(frame);
})();
