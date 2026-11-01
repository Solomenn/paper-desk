/* 雪国线 · the window (focus.html)
   A dark carriage wall with one rounded window, as in the reference frames: a pale rim, a black gasket, the view through it.
   The view through it is pixel art: the snowy wood of the pixel carriage (assets/ride/wood.png) going by slowly, the trunks
   field under them rushes past; telegraph poles, their wires and stands of poplars flick by close to the glass.
   The page drives it: #car.on shows it, window.trainSpeed (0…1) sets the pace. */
(() => {
  const car = document.getElementById("car");
  if (!car) return;

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
  .cv-glass canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; }
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
  // the view is pixel art, as the snowy wood of the pixel carriage: drawn small (LW×LH) and shown big, crisp
  const LH = 140, LW = Math.round(LH * 1.74), low = document.createElement("canvas"); low.width = LW; low.height = LH;
  const l = low.getContext("2d"); l.imageSmoothingEnabled = false;
  let wood = null, ready = false;
  img("assets/ride/wood.png").then(a => { wood = a; ready = !!a; });

  // near trunks just outside the glass: flat cool bark, a lit edge, a few knots, snow caught on them (pixel grid)
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const TW = 900, trunks = document.createElement("canvas"); trunks.width = TW; trunks.height = LH;
  { const t = trunks.getContext("2d");
    for (let x = 30; x < TW - 40;) { const w = 6 + Math.floor(rnd() * 9);
      t.fillStyle = "#6d7894"; t.fillRect(x, 0, w, LH); t.fillStyle = "#58627c"; t.fillRect(x + Math.ceil(w * .6), 0, w - Math.ceil(w * .6), LH);
      t.fillStyle = "#a9b4cc"; t.fillRect(x + 1, 0, 1, LH);
      t.fillStyle = "#4b546c"; for (let y = 8 + rnd() * 20; y < LH; y += 18 + rnd() * 30) t.fillRect(x + 2 + Math.floor(rnd() * (w - 4)), Math.floor(y), 2, 1);
      x += w + 70 + Math.floor(rnd() * 180); } }
  const flakes = Array.from({ length: 60 }, () => ({ x: rnd() * LW, y: rnd() * LH, z: .4 + rnd() * .6 }));

  let last = performance.now(), vel = 0, run = 0, sized = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!car.classList.contains("on")) return;
    if (!sized) { layout(); sized = true; }
    if (!ready) return;
    vel += (Math.min(1, (+window.trainSpeed || 0) * 6) - vel) * Math.min(1, dt * 1.2); run += dt * vel;
    // the wood, slow; the trunks by the line, fast; snow drifting across
    const fx = -Math.floor((run * 40) % wood.width); for (let x = fx; x < LW; x += wood.width) l.drawImage(wood, x, 0);
    const tx = -Math.floor((run * 380) % TW); for (let x = tx; x < LW; x += TW) l.drawImage(trunks, x, 0);
    l.fillStyle = "#f7f9fd";
    for (const f of flakes) { f.x -= dt * (8 + vel * 150) * f.z; f.y += dt * 9 * f.z; if (f.x < 0) f.x += LW; if (f.y > LH) f.y -= LH;
      l.fillRect(Math.round(f.x), Math.round(f.y), f.z > .8 ? 2 : 1, 1); }
    g.imageSmoothingEnabled = false; g.drawImage(low, 0, 0, cv.width, cv.height);
  }
  requestAnimationFrame(frame);
})();
