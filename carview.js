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
  /* the view, after HD-2D, from real snow (Poly Haven, CC0): a snowfield with forest on the far hills (a whole 360° panorama,
     so it never ends) sliding slowly; birch groves cut out of a second photo by depth, passing nearer; single birches right by
     the line, fast and out of focus; snow in the air. Drawn small and shown big, in fine crisp pixels, a soft glow on the snow. */
  const LH = 270, LW = Math.round(LH * 1.74);
  const mk = () => { const c = document.createElement("canvas"); c.width = LW; c.height = LH; const x = c.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; return [c, x]; };
  const [low, l] = mk(), [glow, gl] = mk();
  let A = null, ready = false;
  Promise.all(["field", "birch"].map(n => img(`assets/view/${n}.webp`))).then(([field, birch]) => { A = { field, grove: null, birch }; ready = !!field; });   // the cut-out grove read as a pasted box: left out
  let seed = 5; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const LOOP = 3000, groves = [], birches = [];
  for (let x = 200; x < LOOP;) { groves.push({ x, k: .8 + rnd() * .3, f: rnd() < .5 }); x += 700 + rnd() * 900; }
  for (let x = 80; x < LOOP;) { birches.push({ x, k: 1 + rnd() * .3, f: rnd() < .5 }); x += 180 + rnd() * 520; }
  const flakes = Array.from({ length: 90 }, () => ({ x: rnd() * LW, y: rnd() * LH, z: rnd() }));
  let last = performance.now(), vel = 0, run = 0, sized = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!car.classList.contains("on")) return;
    if (!sized) { layout(); sized = true; }
    if (!ready) return;
    vel += (Math.min(1, (+window.trainSpeed || 0) * 6) - vel) * Math.min(1, dt * 1.2); run += dt * vel;
    l.filter = "none"; l.globalAlpha = 1;
    // the field and the far hills: the panorama's horizon sits at 47% of its height; put it a little below the middle
    const fh = LH * 1.15, fw = A.field.width * fh / A.field.height, hz = LH * .5, fy = hz - fh * .467;
    for (let x = -((run * 12) % fw); x < LW; x += fw) l.drawImage(A.field, x, fy, fw, fh);
    // the near snow rushes: the lower field smeared by the speed
    if (vel > .05) { l.save(); l.beginPath(); l.rect(0, hz + LH * .1, LW, LH); l.clip(); l.globalAlpha = Math.min(.8, vel);
      l.filter = `blur(${(vel * 3).toFixed(1)}px)`; const fx2 = -((run * 140) % fw); for (let x = fx2; x < LW; x += fw) l.drawImage(A.field, x, fy, fw, fh); l.restore(); l.filter = "none"; l.globalAlpha = 1; }
    // birch groves passing nearer, standing on the field
    if (A.grove) { const gh = LH * .36, gw = A.grove.width * gh / A.grove.height, gx = (run * 55) % LOOP;
      for (const g0 of groves) { let x = g0.x - gx; if (x < -gw) x += LOOP; if (x > LW) continue; const h = gh * g0.k, w = gw * g0.k;
        l.save(); l.translate(x, hz + LH * .12 - h); if (g0.f) { l.translate(w, 0); l.scale(-1, 1); } l.drawImage(A.grove, 0, 0, w, h); l.restore(); } }
    // a breath of mist over the distance
    const fog = l.createLinearGradient(0, 0, 0, LH); fog.addColorStop(0, "rgba(226,234,244,.10)"); fog.addColorStop(.5, "rgba(226,234,244,.18)"); fog.addColorStop(1, "rgba(226,234,244,0)");
    l.fillStyle = fog; l.fillRect(0, 0, LW, LH);
    // single birches right by the line: fast, big, out of focus
    if (A.birch) { const bh = LH * 1.3, bw = A.birch.width * bh / A.birch.height * 1.6, bx = (run * 420) % LOOP; l.filter = `blur(${(1.4 + vel * 2).toFixed(1)}px)`;
      for (const b of birches) { let x = b.x - bx; if (x < -bw * 2) x += LOOP; if (x > LW) continue; const h = bh * b.k, w = bw * b.k;
        l.save(); l.translate(x, LH + LH * .1 - h); if (b.f) { l.translate(w, 0); l.scale(-1, 1); } l.drawImage(A.birch, 0, 0, w, h); l.restore(); }
      l.filter = "none"; }
    // snow in the air
    for (const f of flakes) { f.x -= dt * (6 + vel * (40 + f.z * 300)); f.y += dt * (8 + f.z * 12); if (f.x < -4) f.x += LW + 8; if (f.y > LH) f.y -= LH;
      l.fillStyle = "#fbfdff"; if (f.z > .85) { l.globalAlpha = .5; l.beginPath(); l.arc(f.x, f.y, 2, 0, 7); l.fill(); } else { l.globalAlpha = .9; l.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); } }
    l.globalAlpha = 1;
    g.imageSmoothingEnabled = false; g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none";
    g.drawImage(low, 0, 0, cv.width, cv.height);
    gl.clearRect(0, 0, LW, LH); gl.filter = "blur(6px) brightness(1.1)"; gl.drawImage(low, 0, 0); gl.filter = "none";
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = "screen"; g.globalAlpha = .14; g.drawImage(glow, 0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
})();
