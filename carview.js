/* 雪国线 · the window (focus.html)
   车厢与车窗直接使用参考图（assets/cabin.webp，玻璃部分已抠成透明），窗外播放实拍的铁道风景。
   取代骑行的像素车厢：<script src="carview.js"></script> 换掉 ride.js。
   只监听页面原有的 carriageStart 事件，计时/路线/站名/下车/声音的逻辑不参与。 */
(() => {
  const car = document.getElementById("car");
  if (!car) return;

  const CLIPS = [
    { src: "assets/train/lake.mp4",   poster: "assets/train/lake.jpg" },
    { src: "assets/train/forest.mp4", poster: "assets/train/forest.jpg" },
    { src: "assets/train/valley.mp4", poster: "assets/train/valley.jpg" },
    { src: "assets/train/river.mp4",  poster: "assets/train/river.jpg" }
  ];
  const HOLD = 11000;
  const FADE = 1400;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* cabin.webp 是 1710×962（参考图原尺寸 + 两侧墙板延展到 16:9），玻璃开口在这组百分比上 */
  const AR = 1710 / 962;
  const HOLE = { x: 19.24, y: 22.973, w: 61.871, h: 61.331 };

  const css = `
  .cv { position: absolute; inset: 0; z-index: 0; overflow: hidden;
    background: linear-gradient(180deg, #0d0a08 0%, #080605 55%, #040303 100%); }
  /* 整幅放进来（不裁），车厢的墙面自己把四周补满 */
  .cvp { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(100vw, calc(100vh * ${AR.toFixed(5)})); aspect-ratio: ${AR.toFixed(5)}; }
  .cv-v { position: absolute; left: ${HOLE.x}%; top: ${HOLE.y}%; width: ${HOLE.w}%; height: ${HOLE.h}%;
    object-fit: cover; object-position: 50% 50%; opacity: 0; transition: opacity ${FADE}ms ease; }
  .cv-v.on { opacity: 1; }
  .cv-cabin { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
    pointer-events: none; user-select: none; -webkit-user-drag: none;
    /* 竖屏时整幅照片的上下边缘很暗，让它们融进车厢的暗场，别切出一条硬边 */
    -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 3%, #000 97%, transparent 100%);
    mask-image: linear-gradient(180deg, transparent 0, #000 3%, #000 97%, transparent 100%); }

  /* 页面上原有的控件在暗色车厢里重新上色（浅色玻璃底板去掉） */
  #car #line::before { background: none !important; box-shadow: none !important;
    -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
  #car #line .track { background: rgba(236, 224, 196, .20) !important; }
  #car #line .track::after { background: repeating-linear-gradient(90deg, rgba(236, 224, 196, .16) 0 1px, transparent 1px calc(100% / var(--km, 10))) !important; }
  #car #line .done { background: #ecdcb0 !important; }
  #car #line .st { background: transparent !important; box-shadow: inset 0 0 0 1px rgba(236, 224, 196, .45) !important; }
  #car #line .st.past { background: #ecdcb0 !important; box-shadow: none !important; }
  #car #line .st i { color: rgba(236, 224, 196, .48) !important; text-shadow: 0 1px 3px rgba(0, 0, 0, .8); }
  #car #line .st.past i { color: #ecdcb0 !important; }
  #car #line .tr { background: #f4e4b6 !important;
    box-shadow: 0 0 0 2px rgba(16, 13, 10, .9), 0 2px 9px rgba(255, 224, 150, .45) !important; }
  #car #line .tr b { color: #f4e4b6 !important; }
  #car #hud { color: rgba(236, 224, 196, .72) !important; background: none !important; box-shadow: none !important;
    -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
  #car #hud:hover { color: rgba(236, 224, 196, .95) !important; }
  #car #hudName { color: #f0e6cd; }
  #car #hudName:empty::before { color: rgba(236, 224, 196, .42) !important; }
  #car #off, #car #sndT { color: rgba(236, 224, 196, .82) !important; background: rgba(18, 15, 12, .55) !important;
    box-shadow: 0 0 0 .5px rgba(236, 224, 196, .20), 0 8px 20px -12px rgba(0, 0, 0, .95) !important;
    -webkit-backdrop-filter: blur(8px) saturate(1.2); backdrop-filter: blur(8px) saturate(1.2); }
  #car #off:hover, #car #sndT:hover { color: #f4e4b6 !important; }
  body:has(#car.on) .home { color: rgba(236, 224, 196, .85) !important; background: rgba(18, 15, 12, .6) !important;
    box-shadow: 0 0 0 .5px rgba(236, 224, 196, .20), 0 10px 24px -14px rgba(0, 0, 0, .95) !important; }
  @media (prefers-reduced-motion: reduce) { .cv-v { transition: none; } }
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  const scene = document.createElement("div");
  scene.className = "cv";
  scene.setAttribute("aria-hidden", "true");
  scene.innerHTML =
    '<div class="cvp">' +
    '<video class="cv-v" muted playsinline loop preload="auto"></video>' +
    '<video class="cv-v" muted playsinline loop preload="none"></video>' +
    '<img class="cv-cabin" src="assets/cabin.webp" alt="">' +
    "</div>";
  car.prepend(scene);

  const vids = scene.querySelectorAll(".cv-v");
  let active = -1, cur = -1, timer = 0, preload = 0, started = false;

  /* 页面一打开就把第一段拉进来，上车那一刻不用等 */
  if (!still) { setTimeout(() => { if (!started) load(vids[0], 0); }, 1200); }

  const load = (v, n) => {               /* 把第 n 段塞进某个 video 元素 */
    if (v.dataset.clip === String(n)) return;
    v.dataset.clip = String(n);
    v.poster = CLIPS[n].poster;
    v.src = CLIPS[n].src;
  };

  const show = (i) => {
    const a = active === -1 ? 0 : 1 - active;   /* 用没在显示的那一只 */
    const v = vids[a], prev = active === -1 ? null : vids[active];
    load(v, i);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
      v.classList.add("on");
      if (prev) setTimeout(() => prev.classList.remove("on"), FADE);
      active = a;
      cur = i;
      /* 等淡出结束，再把下一段预装进刚空出来的那一只 */
      clearTimeout(preload);
      preload = setTimeout(() => {
        if (active !== a) return;
        load(vids[1 - a], (i + 1) % CLIPS.length);
      }, FADE + 500);
    };
    if (v.readyState >= 2) go();
    else {
      v.addEventListener("canplay", go, { once: true });
      v.addEventListener("error", go, { once: true });   /* 解码不了也先让海报顶上 */
      setTimeout(go, 2500);
    }
  };

  const cycle = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!started) return;
      if (!document.hidden) show((cur + 1) % CLIPS.length);
      cycle();
    }, HOLD + (still ? 4000 : 0));
  };

  const begin = () => { if (!started) { started = true; show(0); cycle(); } };

  addEventListener("carriageStart", begin);
  if (car.classList.contains("on")) begin();

  document.addEventListener("visibilitychange", () => {
    if (!started) return;
    if (document.hidden) vids.forEach((v) => v.pause());
    else if (active >= 0) vids[active].play().catch(() => {});
  });
})();
