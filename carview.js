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
  /* the view, after HD-2D: the snowy wood of the carriage picture split by depth (a depth model on the picture's own window)
     into a misty far wood, the snow, single pines and a near trunk; each at its own distance, speed and focus, drawn small
     and shown big (fine, crisp pixels), with mist between the layers and a soft glow over the bright snow */
  const LH = 200, LW = Math.round(LH * 1.74), S = LH / 400;          // the source panes are 400 px tall
  const mk = () => { const c = document.createElement("canvas"); c.width = LW; c.height = LH; const x = c.getContext("2d"); x.imageSmoothingEnabled = true; return [c, x]; };
  const [low, l] = mk(), [glow, gl] = mk();
  let A = null, ready = false;
  Promise.all(["far", "ground", "pine0", "pine1", "pine2", "pine3", "trunk0"].map(n => img(`assets/view/${n}.png`)))
    .then(([far, ground, ...sp]) => { A = { far, ground, pines: [sp[0], sp[2], sp[3]].filter(Boolean), trunk: sp[4] }; ready = !!far; });   // pine1 (mostly a bare pole) left out
  let seed = 5; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const LOOP = 1600, pines = [], trunks = [];
  for (let x = 0; x < LOOP;) { pines.push({ x, i: Math.floor(rnd() * 4), k: .8 + rnd() * .35, f: rnd() < .5, d: rnd() }); x += 34 + rnd() * 120; }
  for (let x = 120; x < LOOP;) { trunks.push({ x, k: 1.5 + rnd() * .5, f: rnd() < .5 }); x += 260 + rnd() * 420; }
  const flakes = Array.from({ length: 70 }, () => ({ x: rnd() * LW, y: rnd() * LH, z: rnd() }));
  function sprite(im, x, base, k, flip) {
    const w = im.width * S * k, h = im.height * S * k;
    l.save(); l.translate(Math.round(x), Math.round(base - h)); if (flip) { l.translate(w, 0); l.scale(-1, 1); } l.drawImage(im, 0, 0, w, h); l.restore();
  }
  let last = performance.now(), vel = 0, run = 0, sized = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!car.classList.contains("on")) return;
    if (!sized) { layout(); sized = true; }
    if (!ready) return;
    vel += (Math.min(1, (+window.trainSpeed || 0) * 6) - vel) * Math.min(1, dt * 1.2); run += dt * vel;
    const base = LH * .74;
    l.filter = "none"; l.globalAlpha = 1;
    // far wood: slow, a touch out of focus, in the mist
    const fw = A.far.width * S, fh = A.far.height * S; l.filter = "blur(.7px)";
    for (let x = -((run * 7) % fw); x < LW; x += fw) l.drawImage(A.far, x, 0, fw, fh);
    l.filter = "none";
    // the snow: fast, smeared by the speed
    const gw = A.ground.width * S, gh = LH - LH * .66, gy = LH * .66;
    l.filter = vel > .05 ? `blur(${(vel * 1.6).toFixed(2)}px)` : "none";
    for (let x = -((run * 70) % gw); x < LW; x += gw) l.drawImage(A.ground, x, gy, gw, gh);
    l.filter = "none";
    let fog = l.createLinearGradient(0, 0, 0, LH); fog.addColorStop(0, "rgba(232,238,246,.22)"); fog.addColorStop(.7, "rgba(232,238,246,.1)"); fog.addColorStop(1, "rgba(232,238,246,0)");
    l.fillStyle = fog; l.fillRect(0, 0, LW, LH);
    // the pines: in focus, the speed of the line
    const px = (run * 46) % LOOP;
    for (const p of pines) { let x = p.x - px; if (x < -80) x += LOOP; if (x > LW + 10) continue; const im = A.pines[p.i % A.pines.length];
      const k = p.k * (.9 + p.d * .2), b = base + 4 + p.d * 6, w = im.width * S * k;
      sprite(im, x, b, k, p.f);
      // where it stands: a soft bank of snow over the cut, and a faint blue shadow
      l.fillStyle = "rgba(150,165,195,.25)"; l.beginPath(); l.ellipse(x + w * .5, b + 1, w * .55, 2.2, 0, 0, 7); l.fill();
      l.fillStyle = "rgba(246,249,253,.95)"; l.beginPath(); l.ellipse(x + w * .5, b - .5, w * .42, 2.4, 0, 0, 7); l.fill(); }
    // the near trunks: fast, big, out of focus
    if (A.trunk) { const tx = (run * 300) % LOOP; l.filter = `blur(${(1.2 + vel * 1.4).toFixed(2)}px)`;
      for (const t of trunks) { let x = t.x - tx; if (x < -60) x += LOOP; if (x > LW + 10) continue; sprite(A.trunk, x, LH + 10, t.k, t.f); }
      l.filter = "none"; }
    // snow in the air: small crisp flakes far, big soft ones close
    for (const f of flakes) { f.x -= dt * (6 + vel * (40 + f.z * 260)); f.y += dt * (6 + f.z * 10); if (f.x < -4) f.x += LW + 8; if (f.y > LH) f.y -= LH;
      const r = f.z > .85 ? 1.6 : f.z > .5 ? .8 : .5; l.globalAlpha = f.z > .85 ? .55 : .9; l.fillStyle = "#fbfdff";
      if (f.z > .85) { l.beginPath(); l.arc(f.x, f.y, r, 0, 7); l.fill(); } else l.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
    l.globalAlpha = 1;
    // up to the window: crisp pixels, then the glow of the bright snow laid over softly
    g.imageSmoothingEnabled = false; g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none";
    g.drawImage(low, 0, 0, cv.width, cv.height);
    gl.clearRect(0, 0, LW, LH); gl.filter = "blur(5px) brightness(1.15)"; gl.drawImage(low, 0, 0); gl.filter = "none";
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = "screen"; g.globalAlpha = .16; g.drawImage(glow, 0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
})();
