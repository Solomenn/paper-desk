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
  /* the view, after HD-2D, from ONE real photograph (Poly Haven "Snowy Park 01", CC0): its 360° horizon band split by depth
     (Depth Anything V2) into the far field and sky, the middle trees and the near tree. Everything moves at the speed its depth
     gives it: the sky and far line slowly, the snow faster row by row towards us, each tree layer at the speed of the ground it
     stands on — so nothing slides against anything. Fine pixels, a soft glow. */
  const BH = 573, HZ = 412;                                          // the band's height and where its horizon is
  const LH = 270, LW = Math.round(LH * 1.74), K = LH / BH;
  const mk = () => { const c = document.createElement("canvas"); c.width = LW; c.height = LH; const x = c.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; return [c, x]; };
  const [low, l] = mk(), [glow, gl] = mk();
  let A = null, ready = false;
  Promise.all(["bg", "mid", "near"].map(n => img(`assets/view/${n}.webp`))).then(([bg, mid, near]) => { A = { bg, mid, near }; ready = !!bg; });
  const VF = 6, VB = 150;                                            // far and nearest ground speed, low-res px per second at full speed
  const speedAt = y => y <= HZ ? VF : VF + (y - HZ) / (BH - HZ) * (VB - VF);
  let seed = 5; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const flakes = Array.from({ length: 90 }, () => ({ x: rnd() * LW, y: rnd() * LH, z: rnd() }));
  const pos = new Float64Array(BH + 2);                              // how far each row has travelled
  let last = performance.now(), vel = 0, sized = false, mpos = 0, npos = 0;
  function strip(im, y0, y1, off) {                                  // rows y0..y1 of a layer, wrapped horizontally
    const bw = im.width * K, x0 = -(((off % bw) + bw) % bw);
    for (let x = x0; x < LW; x += bw) l.drawImage(im, 0, y0, im.width, y1 - y0, x, y0 * K, bw, (y1 - y0) * K + .6);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!car.classList.contains("on")) return;
    if (!sized) { layout(); sized = true; }
    if (!ready) return;
    vel += (Math.min(1, (+window.trainSpeed || 0) * 6) - vel) * Math.min(1, dt * 1.2);
    l.filter = "none"; l.globalAlpha = 1;
    // background: sky and far line together, then the snow in bands, each a little faster than the one above
    pos[0] += dt * vel * VF; strip(A.bg, 0, HZ, pos[0] / K);
    const STEP = 1;
    l.filter = vel > .05 ? `blur(${(vel * 1.6).toFixed(1)}px)` : "none";
    for (let y = HZ; y < BH; y += STEP) { const i = y + 1; pos[i] += dt * vel * speedAt(y + STEP / 2); strip(A.bg, y, Math.min(BH, y + STEP), pos[i] / K); }
    l.filter = "none";
    // the middle trees stand about 60 rows below the horizon; the near tree stands on the bottom edge
    mpos += dt * vel * speedAt(HZ + 60); npos += dt * vel * VB * 1.05;
    l.filter = "none"; strip(A.mid, 0, BH, mpos / K);
    l.filter = vel > .05 ? `blur(${(.4 + vel * 1.2).toFixed(1)}px)` : "blur(.4px)"; strip(A.near, 0, BH, npos / K); l.filter = "none";
    // snow in the air
    for (const f of flakes) { f.x -= dt * (5 + vel * (30 + f.z * 260)); f.y += dt * (8 + f.z * 12); if (f.x < -4) f.x += LW + 8; if (f.y > LH) f.y -= LH;
      l.fillStyle = "#fbfdff"; if (f.z > .85) { l.globalAlpha = .5; l.beginPath(); l.arc(f.x, f.y, 2, 0, 7); l.fill(); } else { l.globalAlpha = .9; l.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); } }
    l.globalAlpha = 1;
    g.imageSmoothingEnabled = false; g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none";
    g.drawImage(low, 0, 0, cv.width, cv.height);
    gl.clearRect(0, 0, LW, LH); gl.filter = "blur(6px) brightness(1.1)"; gl.drawImage(low, 0, 0); gl.filter = "none";
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = "screen"; g.globalAlpha = .12; g.drawImage(glow, 0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
})();
