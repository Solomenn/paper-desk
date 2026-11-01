/* 雪国线 · the window (focus.html)
   The carriage is a photograph of a train window (assets/frame.webp, 1440×962; the window and the table are shared free
   material by its author, the views in his photos are his and are not used): the median of six of his frames, the
   watermark taken out, the glass punched out as a rounded rectangle. The view plays behind the glass.
   The page drives it: #car.on shows it, window.trainSpeed (0…1) sets the pace. */
(() => {
  const car = document.getElementById("car");
  if (!car) return;

  const FW = 1440, FH = 962;                                          // the frame photograph
  const GL = 190, GT = 221, GW = 1067, GH = 611;                      // the glass in it (a little under the gasket)
  const css = `
  .cv { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: #0c0a08; }
  /* the photograph covers the screen: the wall, the rail above, the table below */
  .cv-ph { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: max(100vw, calc(100vh * ${FW} / ${FH})); aspect-ratio: ${FW} / ${FH}; }
  .cv-ph > img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 1; pointer-events: none; }
  .cv-glass { position: absolute; left: ${GL / FW * 100}%; top: ${GT / FH * 100}%; width: ${GW / FW * 100}%; height: ${GH / FH * 100}%;
    overflow: hidden; background: #9fa9a8; }
  .cv-glass canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

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
  scene.innerHTML = '<div class="cv-ph"><div class="cv-glass"><canvas></canvas></div><img src="assets/frame.webp?v=2" alt=""></div>';
  car.prepend(scene);
  
  const cv = scene.querySelector("canvas"), g = cv.getContext("2d");
  let LW = 1, LH = 1, K = 1;
  function layout() {
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    cv.width = LW = Math.max(1, Math.round(r.width * d)); cv.height = LH = Math.max(1, Math.round(r.height * d));
    K = LW / VW;                                                      // band px -> canvas px
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  }
  addEventListener("resize", () => { if (car.classList.contains("on")) layout(); else sized = false; });

  const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  /* the view: an open snowfield in the sun, from one photograph (Poly Haven "Passendorf Snow", CC0, the 8K panorama),
     graded like the author's window photos (tools/view_snowfield.py: muted, a teal cast, the highlights rolled off).
     The sky and the sun are infinitely far: they stay. The hills and the forest line on the horizon slide slowly. The snow
     goes by faster row by row as it comes nearer (on flat ground the speed grows with the distance below the horizon).
     Nothing is added: at rest the window is the photograph as taken. Drawn at the screen's own resolution. */
  const BW = 8192, HZ = 834, TOP = 300, VW = 1760;                    // band width, the snow line, the band row at the window's top, the window's width in band px
  const X0 = 4916 - 528;                                              // at rest the window shows the photograph exactly as taken
  let A = null, ready = false;
  Promise.all(["skyp.webp", "land.webp", "snow.webp"].map(n => img(`assets/view/${n}?v=2`))).then(([sky, land, snow]) => { A = { sky, land, snow }; ready = !!(sky && land && snow); });
  const SP = 505 / 270;                                               // the old speeds were in canvas px of a 270-row window
  const VH = 9 * SP * 2;                                              // the hills, band px per second
  const vSnow = r => (9 + (r / 2 + 2) * 3.2) * SP * 2;                // the snow, row r below the horizon
  const STEP = 4;
  const rowPos = new Float64Array(Math.ceil(480 / STEP)).fill(X0);
  let landPos = X0;
  let seed = 5; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const flakes = Array.from({ length: 40 }, () => ({ x: rnd(), y: rnd(), z: rnd() }));
  const [glow, gl] = (() => { const c = document.createElement("canvas"); c.width = 470; c.height = 270; return [c, c.getContext("2d")]; })();
  let last = performance.now(), vel = 0, sized = false, tick = 0;
  const Y = by => (by - TOP) * K;                                     // band row -> canvas row
  // the visible stretch of a band at position pos (band px), wrapping round the panorama
  function span(im, sy, sh, pos, dy, dh) {
    const w = LW / K, s0 = ((pos % BW) + BW) % BW, a = Math.min(w, BW - s0);
    g.drawImage(im, s0, sy, a, sh, 0, dy, a * K, dh);
    if (a < w) g.drawImage(im, 0, sy, w - a, sh, a * K, dy, (w - a) * K, dh);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!car.classList.contains("on")) return;
    if (!sized) { layout(); sized = true; }
    if (!ready) return;
    vel += (Math.min(1, (+window.trainSpeed || 0) * 6) - vel) * Math.min(1, dt * 1.2);
    // the sky exactly as photographed, sun and all: it stays (it is infinitely far)
    g.drawImage(A.sky, 0, TOP, VW, HZ + 12 - TOP, 0, 0, VW * K, Y(HZ + 12));
    // the hills and the forest line: slow
    landPos += dt * vel * VH; span(A.land, TOP, HZ + 12 - TOP, landPos, 0, Y(HZ + 12));
    // the snow, band by band: each a little faster than the one above
    for (let r = 0; r < A.snow.height; r += STEP) {
      const p = rowPos[r / STEP] += dt * vel * vSnow(r);
      span(A.snow, r, STEP, p, Y(HZ - 4 + r), STEP * K + .7);
    }
    // a few flakes glinting in the air
    const fs = Math.max(1, Math.round(LH / 300));
    g.fillStyle = "#ffffff";
    for (const f of flakes) {
      f.x -= dt * (4 + vel * (30 + f.z * 300)) / 470; f.y += dt * (6 + f.z * 8) / 270;
      if (f.x < -.01) f.x += 1.02; if (f.y > 1) f.y -= 1;
      g.globalAlpha = .55 + f.z * .4; g.beginPath(); g.arc(f.x * LW, f.y * LH, fs * (.5 + f.z * .4), 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    // a faint bloom, as through glass
    if (!(tick++ & 3)) { gl.clearRect(0, 0, 470, 270); gl.filter = "blur(7px) brightness(1.1)"; gl.drawImage(cv, 0, 0, 470, 270); gl.filter = "none"; }
    g.globalCompositeOperation = "screen"; g.globalAlpha = .16; g.drawImage(glow, 0, 0, LW, LH);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
})();
