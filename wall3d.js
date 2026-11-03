/* wall3d.js：卡册、手账、小票这几页的背景墙（2026-11-03，用户："我一直以为是真实光……用主页光"）。
   原来是 room.js 按入口页的公式画的一张平面图（SVG，颜色从截图量的）——形状对，但不是照出来的。
   现在用 room3d.js 渲染：和入口页同一面墙、同一扇百叶窗、同一个太阳、同样的软影、反射光、高光溢出、光柱、浮尘、胶片感、ACES。
   这几页墙前面没有 3D 物件，只画墙；画面和墙的对应同入口页（画面宽 2.536 m，正中对着墙上 (0, YC)）。
   没有 WebGL 时什么都不做，room.js 画的那张平面图留着当替补（手账页的网页书柜也留着）。 */
import { createRoom3D } from "./room3d.js";

const okGL = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
if (okGL) {
  const canvas = Object.assign(document.createElement("canvas"), { id: "gl3d" });
  const dust = Object.assign(document.createElement("canvas"), { id: "dust3d" });
  const film = Object.assign(document.createElement("div"), { id: "film3d" });
  for (const [el, css] of [[canvas, "position:fixed;inset:0;width:100%;height:100%;display:block;z-index:-1;pointer-events:none"],
                           [dust, "position:fixed;inset:0;width:100%;height:100%;display:block;z-index:-1;pointer-events:none"],
                           [film, "position:fixed;inset:0;z-index:-1;pointer-events:none"]]) el.style.cssText = css;
  document.body.prepend(canvas, dust, film);
  /* 手账页：书柜换成入口页那个米白实体书架（wooden-shelf.glb，Vilson Pistori「Wooden Shelf」，CC BY 4.0；用户 2026-11-03）。
     摆在网页书柜（#shelf .case）原来的位置：按网页书柜的高度等比缩放（模型是竖长的 0.83 × 1.85，不拉变形）、左右居中、底边对齐，
     背面离墙 12 mm（同入口页）。网页画的书柜和书隐藏；书架上立实体卡册（shelf3d.js，用户 2026-11-03）。 */
  const caseEl = document.querySelector("#shelf .case");
  let shelf = null, R = null, books = null;
  const place = () => {
    if (!shelf || !caseEl) return;
    const r = caseEl.getBoundingClientRect(), f = shelf.userData.fit, k = (r.height / R.PXM) / f.size.y;
    shelf.scale.setScalar(f.s0 * k);
    shelf.position.set((r.left + r.width / 2 - innerWidth / 2) / R.PXM - f.c.x * k, R.YC - (r.bottom - innerHeight / 2) / R.PXM - f.min.y * k, 0.012 - f.min.z * k);
    if (books) books();                                                    // 书架上的卡册（shelf3d.js）
  };
  R = await createRoom3D({ canvas, base: "./", dust, film, beforeRender: place });
  if (caseEl) {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"), THREE = R.THREE;
    const s = (await new GLTFLoader().loadAsync("assets/objects/wooden-shelf.glb")).scene;
    const box = new THREE.Box3().setFromObject(s);
    s.userData.fit = { size: box.getSize(new THREE.Vector3()), c: box.getCenter(new THREE.Vector3()), min: box.min.clone(), s0: s.scale.x };
    s.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => R.addRefl(m)); } });
    shelf = s; R.objects.add(s); document.body.classList.add("shelf3d");
    const { setupShelf } = await import("./shelf3d.js");                    // 实体卡册立进书架（2026-11-03）
    books = await setupShelf(R, s, () => R.render());
    let t = 0; addEventListener("scroll", () => { cancelAnimationFrame(t); t = requestAnimationFrame(() => R.render()); }, true);
    orbit(THREE);
  }
  R.layout();
  document.body.classList.add("w3d");

  /* ── 书架能转、能放大（用户 2026-11-03："能设置成收音机页面那种可以旋转放大的吗"，选了"整个书架连同墙一起转"）──
     拖动：绕书架转（左右各最多 35°，上下各最多 15°）；滚轮或双指：放大（1–5 倍，往指针那里放大）；右键或双指拖：平移；双击：回到正面。
     还是同一套真 3D 光：镜头一动，墙上的光（阳光、天光、反射光三遍）按新的角度重新算，再画物件、影子、闭塞、光柱（不是贴图，是每帧算的）。
     镜头仍是平行投影（没有近大远小），和其他页面一样；放大倍数 1 时画面和墙 1:1，看到的和原来完全一样。
     转到最大角度时画面还在墙里面（墙 4.4 × 3.8 m）；没有地板，往下看时书架底下还是墙。 */
  async function orbit(THREE) {
    const host = document.getElementById("shelf"); if (!host) return;
    const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
    const cam = R.camera, T0 = new THREE.Vector3(0, R.YC, 0.18);          // 转的中心：画面正中、书架进深的一半左右
    const ctl = new OrbitControls(cam, host);
    ctl.target.copy(T0); ctl.enableDamping = true; ctl.dampingFactor = 0.09; ctl.rotateSpeed = 0.6;
    ctl.zoomToCursor = true; ctl.screenSpacePanning = true; ctl.minZoom = 1; ctl.maxZoom = 5;
    ctl.minAzimuthAngle = -35 * R.deg; ctl.maxAzimuthAngle = 35 * R.deg;
    ctl.minPolarAngle = (90 - 15) * R.deg; ctl.maxPolarAngle = (90 + 15) * R.deg;
    ctl.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    ctl.update(); ctl.saveState();
    // 平移不能把画面移出墙：放大 z 倍时，转的中心离正中最多 (1 − 1/z) × 半个画面
    const clamp = () => {
      const k = 1 - 1 / cam.zoom, hx = R.VIEW_W / 2 * k, hy = innerHeight / 2 / R.PXM * k;
      const c = ctl.target, d = new THREE.Vector3(
        Math.max(T0.x - hx, Math.min(T0.x + hx, c.x)) - c.x, Math.max(T0.y - hy, Math.min(T0.y + hy, c.y)) - c.y, T0.z - c.z);
      if (d.lengthSq() > 1e-12) { c.add(d); cam.position.add(d); }
    };
    let raf = 0, active = false, quiet = 0;
    /* 动着的时候每一帧都要重算墙上的光，比静止时多画三遍：这时按 1 倍像素画（高清屏平时是 2 倍，像素少四分之三），停下来再按原来的清晰度画一遍。
       所以转动中画面会稍微软一点，松手约 0.1 秒后变清楚。 */
    const DPR = R.renderer.getPixelRatio();
    const sharp = on => { const want = on ? DPR : Math.min(1, DPR); if (R.renderer.getPixelRatio() !== want) { R.renderer.setPixelRatio(want); R.renderer.setSize(innerWidth, innerHeight, false); } };
    const draw = rest => { clamp(); sharp(rest); R.bakeWall(!rest); R.render(); };   // 动着时浮尘的亮区图半秒才读一次；停下来读一次
    const tick = () => {
      raf = 0; const moved = ctl.update();
      if (moved) { quiet = 0; draw(false); } else quiet++;
      if (active || quiet < 3) raf = requestAnimationFrame(tick); else draw(true);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    ctl.addEventListener("start", () => { active = true; quiet = 0; go(); hint.classList.add("off"); });
    ctl.addEventListener("end", () => { active = false; go(); });
    ctl.addEventListener("change", go);
    host.addEventListener("dblclick", () => { ctl.reset(); draw(true); });
    // 提示（第一次转动后消失）
    const hint = Object.assign(document.createElement("div"), { id: "orbitHint", textContent: matchMedia("(pointer: coarse)").matches ? "单指转动 · 双指放大 · 双击回到正面" : "拖动转动 · 滚轮放大 · 双击回到正面" });
    hint.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:40;pointer-events:none;font:12px/1 system-ui,sans-serif;letter-spacing:.12em;color:rgba(40,44,46,.62);background:rgba(250,249,246,.7);padding:8px 14px;border-radius:14px;backdrop-filter:blur(8px);transition:opacity .6s";
    const st = document.createElement("style"); st.textContent = "#orbitHint.off{opacity:0}"; document.head.append(st);
    document.body.append(hint);
  }
}
