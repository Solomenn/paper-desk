/* shelf-nav.js：手账页书架怎么看（2026-11-03）。
   用户："先做图二卡片这种尺寸（只参考尺寸）的页面，正对着第一层的书；右侧放一个和主页一样的链条，上下拖动可以依次到达下面的层"。
   · 一次正对一层：镜头对准这一层的正中，放大到这一层（连同两边侧板、上下隔板）正好装进"卡片"那么大的一块——
     卡片的大小照图二量的：宽占画面 84%，高占画面 75%。打开时对着第一层（最上面那层，卡册都在这层）。
   · 右边一根竖着的刻度尺，样子和手感照入口页的切换条刻度：每层一段 9 根小刻度（这一层正对镜头时是中间那根），层与层之间一根长刻度；
     黑色表示现在看到哪；指针靠近时附近几根刻度伸长、变亮，最近那根变宝宝蓝；跨过一根刻度"咔"一声（声音同入口页）。
     每一根刻度都能点、能拖着擦过去；滚轮也能上下换（停 140 ms 后停在最近的一根刻度上）；键盘上下键：上一层、下一层。
   · 拖书架本身（刻度尺以外的地方）：左右最多转 25°、上下最多 12°；双击回到正面。
   · 光还是同一套真 3D 光：镜头一动，墙上的光按新的位置、角度重算；动着时按 1 倍像素画，停下再按原来的清晰度画一遍。 */
export function setupShelfNav(R, books) {
  const THREE = R.THREE, cam = R.camera, deg = R.deg;
  const reader = document.getElementById("reader");
  const busy = () => reader && reader.classList.contains("on");           // 手账打开着：不响应

  /* ── 每一层在场景里的位置和大小（m）：内框加两边侧板、上下各半块隔板 ── */
  const measure = () => books.bays.map(b => {
    const zm = (b.zb + b.zf) / 2, a = books.toWorld(new THREE.Vector3(b.x0, b.y0, zm)), c = books.toWorld(new THREE.Vector3(b.x1, b.y1, zm));
    const k = Math.abs(c.x - a.x) / Math.abs(b.x1 - b.x0);               // 书架现在的缩放（模型单位 → m）
    return { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, z: a.z, w: Math.abs(c.x - a.x) + 0.05 * k, h: Math.abs(c.y - a.y) + 0.03 * k };
  });
  let lv = measure();
  if (!lv.length) return;
  const N = lv.length, PER = 9, STEP = PER + 1;                           // 每层 9 根小刻度 + 层间 1 根长刻度
  const CARD_W = 0.84, CARD_H = 0.75;                                     // 卡片占画面的比例（图二：1150 / 1366、645 / 855）
  /* 位置 p：第几层（0 = 最上面），可以是小数（两层之间）；刻度 s（0 起）↔ p = (s − 4) / 10 */
  const ticks = []; for (let s = 0; s < N * STEP - 1; s++) ticks.push({ s, p: (s - (PER - 1) / 2) / STEP, sep: s % STEP === PER });
  const PMIN = ticks[0].p, PMAX = ticks.at(-1).p;
  const at = p => {                                                       // 位置 p 时镜头对着哪、放大多少（两层之间按比例插值，两头往外延一点）
    const i = Math.max(0, Math.min(N - 2, Math.floor(p))), t = N > 1 ? p - i : 0, A = lv[i], B = lv[Math.min(N - 1, i + 1)];
    const m = (u, v) => u + (v - u) * t, w = m(A.w, B.w), h = m(A.h, B.h);
    const zoom = Math.min(CARD_W * R.VIEW_W / w, CARD_H * (innerHeight / R.PXM) / h);
    return { x: m(A.x, B.x), y: m(A.y, B.y), z: m(A.z, B.z), zoom };
  };

  /* ── 镜头：位置 P 追目标 Pt；转角 yaw / pitch 追 Yt / Xt ── */
  const S = { P: 0, Pt: 0, yaw: 0, Yt: 0, pit: 0, Xt: 0, drag: null };
  const DIST = 9.8, T = new THREE.Vector3();
  const aim = () => {
    const f = at(S.P); T.set(f.x, f.y, f.z);
    cam.position.set(T.x + DIST * Math.sin(S.yaw) * Math.cos(S.pit), T.y + DIST * Math.sin(S.pit), T.z + DIST * Math.cos(S.yaw) * Math.cos(S.pit));
    cam.lookAt(T); cam.zoom = f.zoom; cam.updateProjectionMatrix();
  };
  const DPR = R.renderer.getPixelRatio();
  const sharp = on => { const want = on ? DPR : Math.min(1, DPR); if (R.renderer.getPixelRatio() !== want) { R.renderer.setPixelRatio(want); R.renderer.setSize(innerWidth, innerHeight, false); } };
  const draw = rest => { aim(); sharp(rest); R.bakeWall(!rest); R.render(); };
  let raf = 0, last = 0, moving = false;
  const loop = t => {
    raf = 0; const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
    const k = 1 - Math.exp(-dt * 11);                                       // 追目标的快慢：约 0.2 秒追上九成
    const before = S.P; S.P += (S.Pt - S.P) * k; S.yaw += (S.Yt - S.yaw) * k; S.pit += (S.Xt - S.pit) * k;
    travel(before, S.P);
    const still = Math.abs(S.Pt - S.P) < 1e-4 && Math.abs(S.Yt - S.yaw) < 1e-4 && Math.abs(S.Xt - S.pit) < 1e-4 && !S.drag;
    if (still) { S.P = S.Pt; S.yaw = S.Yt; S.pit = S.Xt; }
    draw(still); paint();
    if (!still) raf = requestAnimationFrame(loop); else { last = 0; moving = false; }
  };
  const kick = () => { moving = true; if (!raf) raf = requestAnimationFrame(loop); };

  /* ── 声音：同入口页（40 ms 的咔声：高通白噪声 + 5.2 kHz / 7.4 kHz 两个衰减正弦）。line：指针换一根；month：跨过一层；travel：滑行中越过一根 ── */
  const KINDS = { line: [1, 1, 1], month: [.88, 1.2, 1.1], travel: [1.08, .8, .5] };
  let ac = null, lastAt = -1; const bufs = {};
  const makeClick = (sr, pitch, decay) => {
    const n = Math.round(sr * .04 * Math.max(1, decay)), out = new Float32Array(n);
    const w = 2 * Math.PI * 4000 * pitch / sr, cw = Math.cos(w), al = Math.sin(w) / 1.414;
    const b0 = (1 + cw) / 2, b1 = -(1 + cw), b2 = b0, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, peak = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, x = Math.random() * 2 - 1, y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      let v = .5 * y * Math.exp(-t / (.25 * decay / 1000)) * 3;
      v += .6 * Math.sin(2 * Math.PI * 5200 * pitch * t) * Math.exp(-t / (.8 * decay / 1000));
      v += .4 * Math.sin(2 * Math.PI * 7400 * pitch * t) * Math.exp(-t / (.5 * decay / 1000));
      out[i] = v * Math.min(1, t / 1e-4); peak = Math.max(peak, Math.abs(out[i]));
    }
    const fade = Math.round(sr * .005); for (let k = 0; k < fade; k++) out[n - 1 - k] *= k / fade;
    for (let i = 0; i < n; i++) out[i] /= peak || 1;
    return out;
  };
  const click = kind => {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; ac = new A(); }
    if (ac.state !== "running") { ac.resume(); return; }                  // 声音还没解锁（第一次按下之前）：这一声不放
    if (kind !== "travel" && ac.currentTime < lastAt + .06) return;      // 60 ms 内只放一声
    if (!bufs[kind]) { const [p, d] = KINDS[kind], s = makeClick(ac.sampleRate, p, d), b = ac.createBuffer(1, s.length, ac.sampleRate); b.getChannelData(0).set(s); bufs[kind] = b; }
    lastAt = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = bufs[kind]; src.playbackRate.value = 1 + (Math.random() - .5) * .04;
    const g = ac.createGain(); g.gain.value = .2 * KINDS[kind][2]; src.connect(g).connect(ac.destination); src.start();
  };
  addEventListener("pointerdown", () => { if (ac && ac.state !== "running") ac.resume(); }, { capture: true });
  let lastTravel = null;
  const tickAt = p => Math.round(p * STEP + (PER - 1) / 2);              // 位置 p 最近的刻度
  function travel(a, b) {                                                 // 滑行中现在的位置越过一根刻度：响一声 travel（擦动时擦动自己出声）
    const s = tickAt(b); if (lastTravel === null) { lastTravel = s; return; }
    if (s !== lastTravel && !H.down) click(ticks[Math.max(0, Math.min(ticks.length - 1, s))].sep ? "month" : "travel");
    lastTravel = s;
  }

  /* ── 刻度尺（DOM）：竖在画面右边、上下居中；每根刻度 3 px 粗、8 px 长（长刻度 14 px），间距 9 px，同入口页（入口页是横的） ── */
  const C = 9, LINE = 40;                                                 // 刻度中线离刻度区左边 40 px
  const zone = document.createElement("div"); zone.id = "navZone"; zone.tabIndex = 0; zone.setAttribute("role", "slider"); zone.setAttribute("aria-label", "书架的第几层");
  const ZH = C * ticks.length + 48;
  zone.style.cssText = `position:fixed;right:28px;top:50%;width:80px;height:${ZH}px;margin-top:${-ZH / 2}px;z-index:40;cursor:none;touch-action:none;outline:none`;
  const yOf = s => 24 + (s + .5) * C;
  const els = ticks.map(() => { const d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;width:8px;height:3px;border-radius:999px;background:#1a1a1a;will-change:transform,width,opacity"; zone.append(d); return d; });
  const lab = document.createElement("div");                             // 指着的那一层："第 1 层"
  lab.style.cssText = "position:absolute;left:0;top:0;font:500 13px/1 -apple-system,'PingFang SC','Noto Sans SC',sans-serif;color:#1d1d1d;white-space:nowrap;pointer-events:none;opacity:0;transform:translate(-100%,-50%)";
  zone.append(lab); document.body.append(zone);
  const H = { in: false, py: 999, amt: 0, down: null, tick: -1, raf: 0 };
  const levelName = s => `第 ${Math.max(1, Math.min(N, Math.round(ticks[s].p) + 1))} 层`;
  function paint() {
    const mk = yOf(S.P * STEP + (PER - 1) / 2);                           // 现在看到的位置在尺子上的 y
    let hot = -1, bd = 1e9; if (H.amt > .001) ticks.forEach((t, k) => { const d = Math.abs(yOf(k) - H.py); if (d < bd) { bd = d; hot = k; } });
    ticks.forEach((t, k) => {
      const y0 = yOf(k), near = Math.min(1, Math.max(0, (1.5 * C - Math.abs(y0 - mk)) / C));
      let len = t.sep ? 14 : 8, th = 3, op = t.sep ? Math.max(.28, .14 + .86 * near) : .14 + .86 * near, col = "#1a1a1a", y = y0;
      if (H.amt > .001) {                                                 // 指针附近的刻度按离指针多远（以格计）伸长变亮，两侧稍稍让开（同入口页的数）
        const d = (y0 - H.py) / C, W = Math.exp(-(d * d) / (.575 * .575)), G = Math.exp(-(d * d) / (2.2 * 2.2)), a = H.amt;
        y += Math.sign(d) * 1.4 * Math.min(1, Math.abs(d)) * a; len += a * (25.4 * W + 2.5 * G); th += a * W; op = Math.min(1, op + a * (.86 * W + .12 * G));
        if (k === hot && a > .5) col = "#7FC1EC";
      }
      const el = els[k]; el.style.transform = `translate(${LINE - len / 2}px, ${y - th / 2}px)`; el.style.width = len + "px"; el.style.height = th + "px"; el.style.opacity = op; el.style.background = col;
    });
    if (hot >= 0 && H.amt > .01) { lab.textContent = levelName(hot); lab.style.transform = `translate(calc(${LINE - 30}px - 100%), ${yOf(hot)}px) translateY(-50%)`; lab.style.opacity = H.amt; }
    else lab.style.opacity = 0;
    zone.setAttribute("aria-valuenow", Math.round(S.Pt) + 1); zone.setAttribute("aria-valuetext", `第 ${Math.round(S.Pt) + 1} 层`);
  }
  const hoverLoop = () => {                                               // 指针进出刻度区：展开 / 收起（约 0.15 秒）
    H.raf = 0; const target = H.in || H.down ? 1 : 0; H.amt += (target - H.amt) * 0.25; if (Math.abs(target - H.amt) < .005) H.amt = target;
    paint(); if (H.amt !== target) H.raf = requestAnimationFrame(hoverLoop);
  };
  const hov = () => { if (!H.raf) H.raf = requestAnimationFrame(hoverLoop); };
  const tickUnder = py => Math.max(0, Math.min(ticks.length - 1, Math.round((py - 24) / C - .5)));
  const goTick = s => { S.Pt = ticks[s].p; kick(); };
  zone.addEventListener("pointermove", e => {
    const r = zone.getBoundingClientRect(); H.py = e.clientY - r.top; H.in = true; hov();
    const s = tickUnder(H.py);
    if (s !== H.tick) { if (H.tick >= 0) click(ticks[s].sep !== ticks[H.tick].sep && (ticks[s].sep || ticks[H.tick].sep) ? "month" : "line"); H.tick = s; if (H.down) goTick(s); }
    paint();
  });
  zone.addEventListener("pointerleave", () => { H.in = false; if (!H.down) { H.tick = -1; H.py = 999; } hov(); });
  zone.addEventListener("pointerdown", e => {
    if (e.button !== 0 || busy()) return; zone.setPointerCapture(e.pointerId); e.preventDefault();
    const r = zone.getBoundingClientRect(); H.py = e.clientY - r.top; H.down = true; H.tick = tickUnder(H.py); goTick(H.tick); hov();
  });
  const up = () => { H.down = null; hov(); };
  zone.addEventListener("pointerup", up); zone.addEventListener("pointercancel", up);
  zone.addEventListener("keydown", e => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; e.preventDefault();
    S.Pt = Math.max(0, Math.min(N - 1, Math.round(S.Pt) + (e.key === "ArrowDown" ? 1 : -1))); kick();
  });
  /* 滚轮：上下换（每 100 px 滚动约 0.4 层）；停 140 ms 后停到最近的一根刻度 */
  let wt = 0;
  addEventListener("wheel", e => {
    if (busy()) return; e.preventDefault();
    S.Pt = Math.max(PMIN, Math.min(PMAX, S.Pt + e.deltaY * 0.004)); kick();
    clearTimeout(wt); wt = setTimeout(() => { S.Pt = ticks[Math.max(0, Math.min(ticks.length - 1, tickAt(S.Pt)))].p; kick(); }, 140);
  }, { passive: false });

  /* ── 拖书架：转一转（左右最多 25°，上下最多 12°）；双击回到正面 ── */
  const host = document.getElementById("shelf");
  if (host) {
    host.style.touchAction = "none";
    host.addEventListener("pointerdown", e => { if (e.button !== 0 || busy()) return; S.drag = { x: e.clientX, y: e.clientY, Y: S.Yt, X: S.Xt }; });
    addEventListener("pointermove", e => {
      if (!S.drag) return;
      S.Yt = Math.max(-25 * deg, Math.min(25 * deg, S.drag.Y - (e.clientX - S.drag.x) * 0.005));
      S.Xt = Math.max(-12 * deg, Math.min(12 * deg, S.drag.X + (e.clientY - S.drag.y) * 0.004)); kick();
    });
    const end = () => { if (S.drag) { S.drag = null; kick(); } };
    addEventListener("pointerup", end); addEventListener("pointercancel", end);
    host.addEventListener("dblclick", () => { S.Yt = 0; S.Xt = 0; kick(); });
  }
  addEventListener("resize", () => setTimeout(() => { lv = measure(); draw(true); }, 250));   // room3d 重排版（150 ms，书架按网页书柜重新摆）之后，重新量每一层、重新对准

  // 提示（第一次动过以后消失）
  const hint = Object.assign(document.createElement("div"), { id: "navHint", textContent: "右边刻度上下拖动换一层 · 拖动书架转一转 · 双击回到正面" });
  hint.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:40;pointer-events:none;font:12px/1 system-ui,sans-serif;letter-spacing:.12em;color:rgba(40,44,46,.62);background:rgba(250,249,246,.7);padding:8px 14px;border-radius:14px;backdrop-filter:blur(8px);transition:opacity .6s";
  document.body.append(hint);
  const gone = () => { hint.style.opacity = 0; };
  zone.addEventListener("pointerdown", gone, { once: true }); if (host) host.addEventListener("pointerdown", gone, { once: true }); addEventListener("wheel", gone, { once: true });

  draw(true); paint();
}
