/* 雪国线 · the ride (focus.html): the compartment is a still, rendered offline at full quality — the "1930s Train Cabin" by
   thomas.rynne (CC BY 4.0) lit as in its own Sketchfab scene, plus the sun through the window. The page only moves what
   moves: the snowy wood going by behind the glass (far layer slow, near trunks fast), the snow, and the shadows of the trees
   by the line sweeping over the table. No WebGL: two images and a 2D canvas.

   assets/cabin-day.webp        the compartment in sun; transparent where the glass is (the frost kept as partial alpha)
   assets/cabin-day-shade.webp  the same with the sun blocked — shown through the moving tree shadows
   assets/3d/snow_forest.jpg    Poly Haven "snowy_forest_path_01" (CC0), the far wood */
(() => {
  const host = document.getElementById("car"); if (!host) return;
  if (!/[?&]real\b/.test(location.search)) { pixelRide(host); return; }   // pixel art by default; ?real for the photographic still
  const IW = 1600, IH = 1000;                      // the stills' size; everything below is in still pixels
  const cv = document.createElement("canvas"); cv.id = "ride";
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  host.prepend(cv);
  const PX = false;
  const out = cv.getContext("2d"), low = document.createElement("canvas"); low.width = 400; low.height = 250;
  const g = PX ? low.getContext("2d") : out;
  const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  let sun, shade, wood, ready = false;
  Promise.all(PX ? [img("assets/cabin-day-px.png"), img("assets/cabin-day-shade-px.png"), img("assets/snow-forest-px.png")]
               : [img("assets/cabin-day.webp"), img("assets/cabin-day-shade.webp"), img("assets/3d/snow_forest.jpg")])
    .then(([a, b, c]) => { sun = a; shade = b; wood = c; ready = true; host.classList.add("ride2d"); });

  // near trunks just outside the glass: soft-edged dark stems with snow on the bark, tiling every TW px
  const TW = 3200, trunks = document.createElement("canvas"); trunks.width = TW; trunks.height = IH;
  { const t = trunks.getContext("2d"); let s = 5; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let x = 0; x < TW - 200;) { x += 120 + r() * 420; const w = 50 + r() * 120;
      if (PX) {   // pixel bark: flat tones on the 4-px grid, a snow-lit edge, a few dark notches — no gradients
        const X = Math.round(x / 4) * 4, Wd = Math.round(w / 4) * 4;
        t.fillStyle = "#3a4458"; t.fillRect(X, 0, Wd, IH);          // cool, like the trees in the snow outside
        t.fillStyle = "#2b3346"; t.fillRect(X + Math.round(Wd * .6 / 4) * 4, 0, Wd - Math.round(Wd * .6 / 4) * 4, IH);
        t.fillStyle = "#56627a"; t.fillRect(X + 4, 0, 8, IH);
        t.fillStyle = "#222838"; for (let y = 0; y < IH; y += 60 + Math.floor(r() * 90)) t.fillRect(X + 16 + Math.floor(r() * Wd / 8) * 4, Math.round(y / 4) * 4, 8 + Math.floor(r() * 3) * 4, 4);
        x += w; continue; }
      const gr = t.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, "rgba(28,23,18,0)"); gr.addColorStop(.18, "rgba(28,23,18,.97)"); gr.addColorStop(.6, "rgba(48,40,32,.97)"); gr.addColorStop(.82, "rgba(20,16,12,.97)"); gr.addColorStop(1, "rgba(20,16,12,0)");
      t.fillStyle = gr; t.fillRect(x, 0, w, IH);
      const hl = t.createLinearGradient(x, 0, x + w, 0); hl.addColorStop(0, "rgba(230,236,242,0)"); hl.addColorStop(.25, "rgba(230,236,242,.28)"); hl.addColorStop(.4, "rgba(230,236,242,0)"); t.fillStyle = hl; t.fillRect(x, 0, w, IH);   // the snow light on one side of the bark
      x += w; } }

  // the tree shadows: slanted trunks and needle clumps, blurred — sunlight breaking through a wood. Tiles every SW px.
  const SW = 2400, pat = document.createElement("canvas"); pat.width = SW; pat.height = IH;
  { const p = pat.getContext("2d"); let s = 17; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    p.filter = PX ? "none" : "blur(14px)"; p.fillStyle = "#000";   // in pixel art the shadows keep hard edges
    const slant = .45;                              // the sun comes in low from the side: shadows lean
    for (let i = 0; i < 6; i++) {
      const x0 = i / 6 * SW + r() * 120, w = 30 + r() * 60;
      for (const dx of [0, SW, -SW]) {             // draw across the seam so it tiles
        p.beginPath(); p.moveTo(x0 + dx, 0); p.lineTo(x0 + dx + w, 0); p.lineTo(x0 + dx + w + IH * slant, IH); p.lineTo(x0 + dx + IH * slant, IH); p.fill();
        let sd = i * 31 + 7; const q = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
        for (let b = 0; b < 22; b++) { const y = q() * IH, xx = x0 + dx + y * slant + (q() - .5) * 360; p.globalAlpha = .35 + q() * .4;
          p.beginPath(); p.ellipse(xx, y, 18 + q() * 46, 8 + q() * 22, slant + (q() - .5), 0, Math.PI * 2); p.fill(); }
        p.globalAlpha = 1;
      }
    } }
  const sc = document.createElement("canvas"), sg = sc.getContext("2d");

  // steam off the coffee: soft puffs rising from the rim, curling, thinning out
  const CUP = { x: 1080, y: 888 }, puffs = [];
  const puffImg = document.createElement("canvas"); puffImg.width = puffImg.height = 64;
  { const p = puffImg.getContext("2d"), gr = p.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(.5, "rgba(250,250,248,.2)"); gr.addColorStop(1, "rgba(250,250,248,0)"); p.fillStyle = gr; p.fillRect(0, 0, 64, 64); }
  let puffT = 0;
  function steam(dt, t) {
    puffT -= dt; if (puffT < 0) { puffT = .09; puffs.push({ x: CUP.x + (Math.random() - .5) * 26, y: CUP.y, age: 0, life: 2.6 + Math.random() * 1.4, ph: Math.random() * 6, r: 10 + Math.random() * 6 }); }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.age += dt; if (p.age > p.life) { puffs.splice(i, 1); continue; }
      const u = p.age / p.life; p.y -= dt * (34 - 14 * u); p.x += Math.sin(t * 1.6 + p.ph + u * 5) * dt * 16 - dt * 4;
      const r = p.r * (1 + u * 3.2), al = Math.sin(Math.PI * Math.min(1, u * 1.2)) * .8 * (1 - u * .5);
      if (PX) {   // pixel steam: a small cluster of pale squares on the grid, stepped alpha
        g.globalAlpha = Math.round(al * .3 * 8) / 8; g.fillStyle = "#f4f2ee"; const R = Math.max(1, Math.round(r * .32 / 4));
        for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= R * R + (((i * 7 + j * 3 + (p.ph * 10 | 0)) & 3) ? 0 : -R))
          g.fillRect(Math.round(p.x / 4 + i) * 4, Math.round(p.y / 4 + j) * 4, 4, 4);
      } else { g.globalAlpha = al; g.drawImage(puffImg, p.x - r, p.y - r, r * 2, r * 2); }
    }
    g.globalAlpha = 1;
  }
  const flakes = Array.from({ length: 140 }, () => ({ x: Math.random() * IW, y: Math.random() * IH, z: .4 + Math.random() * .6 }));
  let W = 0, H = 0, k = 1, ox = 0, oy = 0;
  function fit() {
    const d = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = Math.round(cv.clientWidth * d); H = cv.height = Math.round(cv.clientHeight * d);
    if (PX) { sc.width = 400; sc.height = 250; k = .25; ox = oy = 0; [g, sg].forEach(c => c.imageSmoothingEnabled = false); }
    else { sc.width = W; sc.height = H; k = Math.max(W / IW, H / IH); ox = (W - IW * k) / 2; oy = (H - IH * k) / 2; }
  }
  addEventListener("resize", fit);

  let last = performance.now(), vel = 0, run = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!ready || !host.classList.contains("on")) return;
    if (cv.clientWidth * (devicePixelRatio || 1) > W + 2 || W === 0) fit();
    const goal = Math.min(1, (+window.trainSpeed || 0) * 6);
    vel += (goal - vel) * Math.min(1, dt * 1.6); run += dt * vel;
    g.setTransform(k, 0, 0, k, ox, oy);
    // behind the glass: the far wood (slow), the near trunks (fast), the snow
    const fh = 760, fw = wood.width * fh / wood.height, fy = 470 - fh * .62, fx = -((run * 260) % fw);
    g.globalCompositeOperation = "source-over";
    for (let x = fx; x < IW; x += fw) g.drawImage(wood, x, fy, fw, fh);
    const tx = -((run * 2600) % TW);
    for (let x = tx; x < IW; x += TW) g.drawImage(trunks, x, 0);
    g.fillStyle = "#f2f6fa";
    for (const f of flakes) { f.x -= dt * (60 + vel * 900) * f.z; f.y += dt * 40 * f.z; if (f.x < 0) f.x += IW; if (f.y > IH) f.y -= IH;
      g.globalAlpha = .5 + f.z * .4; if (PX) g.fillRect(Math.round(f.x / 4) * 4, Math.round(f.y / 4) * 4, f.z > .75 ? 8 : 4, f.z > .75 ? 8 : 4); else { g.beginPath(); g.arc(f.x, f.y, 1.2 + f.z * 2.2, 0, 7); g.fill(); } }
    g.globalAlpha = 1;
    // the compartment in sun
    g.drawImage(sun, 0, 0, IW, IH);
    // the shade, let through where the trees outside block the sun
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, W, H);
    sg.setTransform(k, 0, 0, k, ox, oy); sg.globalAlpha = .9;
    const px = -((run * 900) % SW); for (let x = px; x < IW; x += SW) sg.drawImage(pat, x, 0);
    sg.globalAlpha = 1; sg.globalCompositeOperation = "source-in"; sg.drawImage(shade, 0, 0, IW, IH);
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(sc, 0, 0);
    g.setTransform(k, 0, 0, k, ox, oy); steam(dt, now / 1000);
    if (PX) {   // up to the screen, crisp: the whole picture fills the window like the still did
      const s = Math.max(W / 400, H / 250); out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false;
      out.drawImage(low, (W - 400 * s) / 2, (H - 250 * s) / 2, 400 * s, 250 * s);
    }
  }
  requestAnimationFrame(frame);
  window.__ride = { set: r => { run = r; vel = 1; }, ready: () => ready };
})();

/* the pixel ride: assets/ride/* from tools/ride_px.py (the compartment illustration at 480×300, 48 colours).
   At rest the picture is exactly the illustration; when the train runs, the view behind the glass fades into a moving
   wood (far layer slow, near trunks fast, snow), and the shadows of the trees by the line sweep over the sunlit table. */
function pixelRide(host) {
  const W = 480, H = 300, WY = 69, WH = 140;
  const cv = document.createElement("canvas"); cv.id = "ride";
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated";
  host.prepend(cv);
  const out = cv.getContext("2d");
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; };
  const [low, g] = mk(), [oc, o] = mk(), [sc, sg] = mk();
  const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  let cab, shade, glass, wood, ready = false;
  Promise.all(["cabin", "shade", "glass", "wood"].map(n => img(`assets/ride/${n}.png${n === "glass" ? "?foreground-1" : ""}`)))
    .then(([a, b, c, d]) => { cab = a; shade = b; wood = d;
      const [m, mx] = mk(); mx.drawImage(c, 0, 0); const id = mx.getImageData(0, 0, W, H);   // glass.png (white = glass) → alpha mask
      for (let i = 0; i < id.data.length; i += 4) { id.data[i + 3] = id.data[i]; } mx.putImageData(id, 0, 0); glass = m;
      ready = true; host.classList.add("ride2d"); });
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // near trunks just outside the glass, in the picture's own cool greys: flat bark, a lit edge, a few knots
  const TW = 1400, [trunks, tx_] = (() => { const c = document.createElement("canvas"); c.width = TW; c.height = H; return [c, c.getContext("2d")]; })();
  for (let x = 20; x < TW - 40;) { const w = 7 + Math.floor(rnd() * 10);
    tx_.fillStyle = "#6d7894"; tx_.fillRect(x, 0, w, H); tx_.fillStyle = "#58627c"; tx_.fillRect(x + Math.ceil(w * .6), 0, w - Math.ceil(w * .6), H);
    tx_.fillStyle = "#a9b4cc"; tx_.fillRect(x + 1, 0, 2, H);
    tx_.fillStyle = "#4b546c"; for (let y = 10 + rnd() * 30; y < H; y += 25 + rnd() * 40) tx_.fillRect(x + 3 + Math.floor(rnd() * (w - 5)), Math.floor(y), 2 + Math.floor(rnd() * 2), 1);
    tx_.fillStyle = "#e9eef8"; for (let y = 20 + rnd() * 60; y < H; y += 50 + rnd() * 70) tx_.fillRect(x, Math.floor(y), Math.ceil(w * .5), 1);   // snow on the bark
    x += w + 60 + Math.floor(rnd() * 160); }

  // tree shadows: leaning trunks and needle clumps, hard-edged (thresholded), tiling every SW px
  const SW = 720, pat = document.createElement("canvas"); pat.width = SW; pat.height = H;
  { const p = pat.getContext("2d"); p.fillStyle = "#000"; const slant = .45;
    for (let i = 0; i < 5; i++) { const x0 = i / 5 * SW + rnd() * 40, w = 8 + rnd() * 14;
      for (const dx of [0, SW, -SW]) {
        p.beginPath(); p.moveTo(x0 + dx, 0); p.lineTo(x0 + dx + w, 0); p.lineTo(x0 + dx + w + H * slant, H); p.lineTo(x0 + dx + H * slant, H); p.fill();
        let sd = i * 31 + 7; const q = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
        for (let b = 0; b < 16; b++) { const y = q() * H, xx = x0 + dx + y * slant + (q() - .5) * 110;
          p.beginPath(); p.ellipse(xx, y, 5 + q() * 14, 3 + q() * 7, slant + (q() - .5), 0, 7); p.fill(); } } }
    const id = p.getImageData(0, 0, SW, H); for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 110 ? 255 : 0; p.putImageData(id, 0, 0); }

  // steam off the coffee: a few pale pixels rising, curling, thinning out
  const CUP = { x: 316, y: 262 }, puffs = []; let puffT = 0;
  function steam(dt, t) {
    puffT -= dt; if (puffT < 0) { puffT = .14; puffs.push({ x: CUP.x + (rnd() - .5) * 6, y: CUP.y, age: 0, life: 2.2 + rnd(), ph: rnd() * 6 }); }
    g.fillStyle = "#f4f6fa";
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.age += dt; if (p.age > p.life) { puffs.splice(i, 1); continue; }
      const u = p.age / p.life; p.y -= dt * (11 - 5 * u); p.x += Math.sin(t * 1.7 + p.ph + u * 5) * dt * 5;
      g.globalAlpha = Math.round(Math.sin(Math.PI * Math.min(1, u * 1.3)) * .55 * 4) / 4; const R = u < .35 ? 0 : 1;
      g.fillRect(Math.round(p.x) - R, Math.round(p.y) - R, 1 + 2 * R, 1 + 2 * R); }
    g.globalAlpha = 1; }

  const flakes = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: WY + rnd() * WH, z: .4 + rnd() * .6 }));
  let last = performance.now(), vel = 0, run = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!ready || !host.classList.contains("on")) return;
    const d = Math.min(devicePixelRatio || 1, 2), cw = Math.round(cv.clientWidth * d), ch = Math.round(cv.clientHeight * d);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const goal = Math.min(1, (+window.trainSpeed || 0) * 6);
    vel += (goal - vel) * Math.min(1, dt * 1.6); run += dt * vel;
    g.globalCompositeOperation = "source-over"; g.drawImage(cab, 0, 0);
    // the moving view, faded in with the speed so the picture at rest is untouched
    const a = Math.min(1, vel * 3);
    if (a > .01) {
      o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, W, H);
      const fx = -Math.floor((run * 78) % wood.width); for (let x = fx; x < W; x += wood.width) o.drawImage(wood, x, WY);
      const tx = -Math.floor((run * 780) % TW); for (let x = tx; x < W; x += TW) o.drawImage(trunks, x, 0);
      o.fillStyle = "#f7f9fd";
      for (const f of flakes) { f.x -= dt * (12 + vel * 260) * f.z; f.y += dt * 10 * f.z; if (f.x < 0) f.x += W; if (f.y > WY + WH) f.y -= WH;
        o.fillRect(Math.round(f.x), Math.round(f.y), f.z > .8 ? 2 : 1, 1); }
      o.globalCompositeOperation = "destination-in"; o.drawImage(glass, 0, 0);
      g.globalAlpha = a; g.drawImage(oc, 0, 0); g.globalAlpha = 1;
      // tree shadows over the sunlit table and seats
      sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, W, H);
      const px = -Math.floor((run * 270) % SW); for (let x = px; x < W; x += SW) sg.drawImage(pat, x, 0);
      sg.globalCompositeOperation = "source-in"; sg.drawImage(shade, 0, 0);
      g.globalAlpha = a; g.drawImage(sc, 0, 0); g.globalAlpha = 1;
    }
    steam(dt, now / 1000);
    const s = Math.max(cw / W, ch / H); out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false;
    out.drawImage(low, Math.round((cw - W * s) / 2), Math.round((ch - H * s) / 2), Math.round(W * s), Math.round(H * s));
  }
  requestAnimationFrame(frame);
  window.__ride = { set: r => { run = r; vel = 1; }, ready: () => ready };
}
