/* 雪国线 · the ride (focus.html): the compartment is a still, rendered offline at full quality — the "1930s Train Cabin" by
   thomas.rynne (CC BY 4.0) lit as in its own Sketchfab scene, plus the sun through the window. The page only moves what
   moves: the snowy wood going by behind the glass (far layer slow, near trunks fast), the snow, and the shadows of the trees
   by the line sweeping over the table. No WebGL: two images and a 2D canvas.

   assets/cabin-day.webp        the compartment in sun; transparent where the glass is (the frost kept as partial alpha)
   assets/cabin-day-shade.webp  the same with the sun blocked — shown through the moving tree shadows
   assets/3d/snow_forest.jpg    Poly Haven "snowy_forest_path_01" (CC0), the far wood */
(() => {
  const host = document.getElementById("car"); if (!host) return;
  const IW = 1600, IH = 1000;                      // the stills' size; everything below is in still pixels
  const cv = document.createElement("canvas"); cv.id = "ride";
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  host.prepend(cv);
  const g = cv.getContext("2d");
  const img = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  let sun, shade, wood, ready = false;
  Promise.all([img("assets/cabin-day.webp"), img("assets/cabin-day-shade.webp"), img("assets/3d/snow_forest.jpg")])
    .then(([a, b, c]) => { sun = a; shade = b; wood = c; ready = true; host.classList.add("ride2d"); });

  // near trunks just outside the glass: soft-edged dark stems with snow on the bark, tiling every TW px
  const TW = 3200, trunks = document.createElement("canvas"); trunks.width = TW; trunks.height = IH;
  { const t = trunks.getContext("2d"); let s = 5; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let x = 0; x < TW - 200;) { x += 120 + r() * 420; const w = 50 + r() * 120;
      const gr = t.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, "rgba(28,23,18,0)"); gr.addColorStop(.18, "rgba(28,23,18,.97)"); gr.addColorStop(.6, "rgba(48,40,32,.97)"); gr.addColorStop(.82, "rgba(20,16,12,.97)"); gr.addColorStop(1, "rgba(20,16,12,0)");
      t.fillStyle = gr; t.fillRect(x, 0, w, IH);
      const hl = t.createLinearGradient(x, 0, x + w, 0); hl.addColorStop(0, "rgba(230,236,242,0)"); hl.addColorStop(.25, "rgba(230,236,242,.28)"); hl.addColorStop(.4, "rgba(230,236,242,0)"); t.fillStyle = hl; t.fillRect(x, 0, w, IH);   // the snow light on one side of the bark
      x += w; } }

  // the tree shadows: slanted trunks and needle clumps, blurred — sunlight breaking through a wood. Tiles every SW px.
  const SW = 2400, pat = document.createElement("canvas"); pat.width = SW; pat.height = IH;
  { const p = pat.getContext("2d"); let s = 17; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    p.filter = "blur(14px)"; p.fillStyle = "#000";
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
  const CUP = { x: 1027, y: 832 }, puffs = [];
  const puffImg = document.createElement("canvas"); puffImg.width = puffImg.height = 64;
  { const p = puffImg.getContext("2d"), gr = p.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(.5, "rgba(250,250,248,.2)"); gr.addColorStop(1, "rgba(250,250,248,0)"); p.fillStyle = gr; p.fillRect(0, 0, 64, 64); }
  let puffT = 0;
  function steam(dt, t) {
    puffT -= dt; if (puffT < 0) { puffT = .09; puffs.push({ x: CUP.x + (Math.random() - .5) * 26, y: CUP.y, age: 0, life: 2.6 + Math.random() * 1.4, ph: Math.random() * 6, r: 10 + Math.random() * 6 }); }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.age += dt; if (p.age > p.life) { puffs.splice(i, 1); continue; }
      const u = p.age / p.life; p.y -= dt * (34 - 14 * u); p.x += Math.sin(t * 1.6 + p.ph + u * 5) * dt * 16 - dt * 4;
      const r = p.r * (1 + u * 3.2); g.globalAlpha = Math.sin(Math.PI * Math.min(1, u * 1.2)) * .8 * (1 - u * .5);
      g.drawImage(puffImg, p.x - r, p.y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  }
  const flakes = Array.from({ length: 140 }, () => ({ x: Math.random() * IW, y: Math.random() * IH, z: .4 + Math.random() * .6 }));
  let W = 0, H = 0, k = 1, ox = 0, oy = 0;
  function fit() {
    const d = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = Math.round(cv.clientWidth * d); H = cv.height = Math.round(cv.clientHeight * d);
    sc.width = W; sc.height = H; k = Math.max(W / IW, H / IH); ox = (W - IW * k) / 2; oy = (H - IH * k) / 2;
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
      g.globalAlpha = .5 + f.z * .4; g.beginPath(); g.arc(f.x, f.y, 1.2 + f.z * 2.2, 0, 7); g.fill(); }
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
  }
  requestAnimationFrame(frame);
  window.__ride = { set: r => { run = r; vel = 1; }, ready: () => ready };
})();
