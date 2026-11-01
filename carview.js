/* 雪国线 · the window (focus.html)
   A dark carriage wall with one rounded window, as in the reference frames: a pale rim, a black gasket, the view through it.
   The view through it is pixel art: the snowy wood of the pixel carriage (assets/ride/wood.png) going by slowly, the trunks
   field under them rushes past; telegraph poles, their wires and stands of poplars flick by close to the glass.
   The page drives it: #car.on shows it, window.trainSpeed (0…1) sets the pace. */
(() => {
  const car = document.getElementById("car");
  if (!car) return;

  const css = `
  .cv { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: #121110; }
  /* the wall: near black, a faint warm sheen from the window, a dark rail for the blind above it */
  .cv::before { content: ""; position: absolute; inset: 0;
    background: radial-gradient(70% 60% at 50% 48%, rgba(70, 64, 58, .35), transparent 70%), linear-gradient(180deg, #151311, #0d0b0a 60%, #090807); }
  /* the carriage: the window and the table cut from a photograph of a train window (frame and table shared as free material
     by its author; the view in it was theirs and is not used). The glass is punched out and the view plays behind it. */
  .cv-ph { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); aspect-ratio: 680 / 448; height: min(100vh, calc(100vw * 448 / 680)); }
  .cv-ph > img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 1; pointer-events: none;
    -webkit-mask: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); mask: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); }
  .cv-glass { position: absolute; left: ${91 / 6.8}%; top: ${102 / 4.48}%; width: ${501 / 6.8}%; height: ${286 / 4.48}%; overflow: hidden; background: #c9d0d4; }
  .cv-glass canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; }

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
  scene.innerHTML = '<div class="cv-ph"><div class="cv-glass"><canvas></canvas></div><img src="assets/frame.webp" alt=""></div>';
  car.prepend(scene);
  
  const cv = scene.querySelector("canvas"), g = cv.getContext("2d");

  // the window's place on the wall: about three quarters of the width, 16:9-ish, a little above the middle
  function layout() {
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
  }
  addEventListener("resize", layout);

  const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  /* the view: an open snowfield in the sun, from one photograph (Poly Haven "Passendorf Snow", CC0). No trees to cut.
     The sky and the sun are infinitely far: they stay. The hills and the forest line on the horizon slide slowly. The snow
     goes by faster row by row as it comes nearer (on flat ground the speed grows with the distance below the horizon).
     Nothing is added: at rest the window is the photograph as taken. Drawn small, shown big in fine crisp pixels. */
  const BW = 4096, HZ = 417;                                          // band width, the snow line in the band
  const LH = 270, LW = Math.round(LH * 1.74);
  const K = LH / 505;                                                 // the window shows band rows ~190..655 (some sky, the hills, the field)
  const TOP = 150;
  const [low, l] = (() => { const c = document.createElement("canvas"); c.width = LW; c.height = LH; const x = c.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; return [c, x]; })();
  const [glow, gl] = (() => { const c = document.createElement("canvas"); c.width = LW; c.height = LH; return [c, c.getContext("2d")]; })();
  let A = null, ready = false;
  Promise.all(["skyp.webp", "land.webp", "snow.webp"].map(n => img(`assets/view/${n}`))).then(([sky, land, snow]) => { A = { sky, land, snow }; ready = !!(sky && land && snow); });
  const VH = 9, VG = 3.2;                                             // the hills' speed; the snow's speed per band row below the horizon
  const X0 = 2458 - 264;                                             // at rest the window shows the photograph exactly as taken
  const rowPos = new Float64Array(260).fill(X0 * (LH / 505));
  let landPos = X0 * (LH / 505);
  let seed = 5; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const flakes = Array.from({ length: 40 }, () => ({ x: rnd() * LW, y: rnd() * LH, z: rnd() }));
  let last = performance.now(), vel = 0, sized = false;
  const Y = by => (by - TOP) * K;                                     // band row -> low canvas row
  function wrap(im, sy, sh, off, dy) {
    const bw = BW * K, x0 = -(((off % bw) + bw) % bw);
    for (let x = x0; x < LW; x += bw) l.drawImage(im, 0, sy, BW, sh, x, dy, bw, sh * K + .7);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!car.classList.contains("on")) return;
    if (!sized) { layout(); sized = true; }
    if (!ready) return;
    vel += (Math.min(1, (+window.trainSpeed || 0) * 6) - vel) * Math.min(1, dt * 1.2);
    // the sky exactly as photographed, sun and all: it stays (it is infinitely far)
    l.drawImage(A.sky, 0, TOP, A.sky.width, HZ + 6 - TOP, 0, 0, A.sky.width * K, Y(HZ + 6));
    // the hills and the forest line: slow
    landPos += dt * vel * VH; wrap(A.land, TOP, HZ + 6 - TOP, landPos, 0);
    // the snow, band by band: each a little faster than the one above
    const rows = A.snow.height, STEP = 2;
    for (let r = 0; r < rows; r += STEP) {
      rowPos[r >> 1] += dt * vel * (VH + (r + 2) * VG);
      const bw = BW * K, x0 = -(((rowPos[r >> 1] % bw) + bw) % bw), dy = Y(HZ - 2 + r);
      for (let x = x0; x < LW; x += bw) l.drawImage(A.snow, 0, r, BW, STEP, x, dy, bw, STEP * K + .7);
    }
    // a few flakes glinting in the air
    for (const f of flakes) { f.x -= dt * (4 + vel * (30 + f.z * 300)); f.y += dt * (6 + f.z * 8); if (f.x < -4) f.x += LW + 8; if (f.y > LH) f.y -= LH;
      l.fillStyle = "#ffffff"; l.globalAlpha = .55 + f.z * .4; l.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); }
    l.globalAlpha = 1;
    g.imageSmoothingEnabled = false; g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none";
    g.drawImage(low, 0, 0, cv.width, cv.height);
    gl.clearRect(0, 0, LW, LH); gl.filter = "blur(7px) brightness(1.1)"; gl.drawImage(low, 0, 0); gl.filter = "none";
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = "screen"; g.globalAlpha = .16; g.drawImage(glow, 0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
})();
