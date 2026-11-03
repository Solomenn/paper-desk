/* board3d.js：首页两块板的 3D（用户 2026-11-03 选 B1："首页也用主页那套 3D 真光，板子、项目卡、便签都是 3D 物体"）。
   光照全部来自 room3d.js——和入口页同一份代码、同一组参数：同一面墙、同一扇百叶窗、同一个太阳，近硬远软的影子、
   反射光、闭塞阴影、光柱、浮尘、胶片感、ACES 色调映射都一样。
   画面和世界的对应同入口页：画面宽 2.536 m，画面正中对着墙上 (0, YC)；网页上一个元素在哪，3D 里对应的东西就摆在哪。
   项目页：
   · 板：LINTEX Silk Wall 官方模型（入口页那个 GLB，官方材质），宽高拉到网页上项目板的大小，厚度不变（玻璃正面离墙约 11 mm）；
   · 板上写的字（在做 / 待做 / 做完、两侧细线、栏之间的竖线）：画成透明贴图，贴在玻璃正面前 0.2 mm；
   · 笔槽和三支笔：一个 8 mm 深的小盒子，正面贴网页画出来的样子；
   · 项目卡（在做栏的大卡 .pcard.inl、待做 / 做完栏的小卡 .mini）：0.5 mm 厚的纸，被磁铁按在玻璃上——顶边贴着、往下慢慢翘，
     底边离玻璃 3 mm；小卡按网页的倾斜角度转；拖着走的那张（.ghost）离玻璃 3 cm；被拖起的原卡（.lifted）30% 透明；
   · 磁铁：小球压扁成 0.7，颜色取每栏的颜色，表面有清漆高光。
   便签页：
   · 软木板：12 mm 厚的板，正面贴网页画出来的软木和木框；四边木框再凸出 6 mm（阳光下框会在软木上投出影子）；
   · 便签：0.1 mm 厚，上面 25% 是背胶、贴平，往下慢慢翘起，底边离板 4 mm；拿起来时按网页里便签的"抬起"程度（--lift，0–1）离板，最多 4 cm；
   · 图钉：红色亮面小球；拔下来拿在手里（.pin.free.held）离板 2 cm。
   网页版都还在原来的位置，只是透明了：点击、拖动、打字照旧由网页处理，3D 每一帧照着网页摆。
   正在编辑的卡或便签：网页版的字显示出来（纸仍是 3D 的，只是不画字），编辑完恢复。
   贴图由 paint-dom.js 按网页排好的样子一个字一个字画出来（不是截图）。没有 WebGL 时什么都不做，首页保持原样。 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createRoom3D } from "./room3d.js";
import { paintDOM } from "./paint-dom.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const chalkInner = $("#chalk .inner"), corkFrame = $("#cork .frame"), stage = $("#stage");
const okGL = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
const AMBIENT = 1.5;                                                     // 暗部提亮倍数（天光、反射光）
if (chalkInner && corkFrame && stage && okGL) start();

async function start() {
  // 画布盖满整个窗口：在页面内容（#stage 等）下面
  const canvas = Object.assign(document.createElement("canvas"), { id: "gl3d" });
  const dust = Object.assign(document.createElement("canvas"), { id: "dust3d" });
  const film = Object.assign(document.createElement("div"), { id: "film3d" });
  document.body.prepend(canvas, dust, film);
  /* 光（用户 2026-11-03）：窗形用百叶窗之前那一版主页的拱窗（三扇半圆拱窗 + 横档），强度等参数照旧；暗部太暗，天光和反射光 × 1.5 */
  const R = await createRoom3D({ canvas, base: "./", dust, film, beforeRender: place, window: "arch", ambient: AMBIENT });
  const { objects, addRefl } = R;
  R.renderer.localClippingEnabled = true;
  const SCALE = Math.min(2, devicePixelRatio || 1);
  const wx = x => (x - innerWidth / 2) / R.PXM, wy = y => R.YC - (y - innerHeight / 2) / R.PXM, wl = v => v / R.PXM;
  const newTex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; };

  /* ── 裁切：#stage 外面的不画（翻页时滑出舞台的那块板，网页里被裁掉，3D 里也裁）。
     每样东西各有一组裁切面：项目卡另外裁到所在那一栏的滚动区域；挂在舞台外面的（拖着走的卡、收进右边抽屉的便签）不裁，同网页。 ── */
  const newPlanes = () => [[1, 0], [-1, 0], [0, -1], [0, 1], [0, -1], [0, 1]].map(([a, b]) => new THREE.Plane(new THREE.Vector3(a, b, 0), 1e3));
  let SR = null;                                                         // 舞台的屏幕位置（每帧更新）
  const setPlanes = (P, stageClip, box) => {
    P[0].constant = stageClip ? -wx(SR.left) : 1e3; P[1].constant = stageClip ? wx(SR.right) : 1e3;
    P[2].constant = stageClip ? wy(SR.top) : 1e3; P[3].constant = stageClip ? -wy(SR.bottom) : 1e3;
    P[4].constant = box ? wy(box.top) : 1e3; P[5].constant = box ? -wy(box.bottom) : 1e3;
  };
  const BOARD_PLANES = newPlanes();
  const mat = (m, planes = BOARD_PLANES) => { m.clippingPlanes = planes; m.clipShadows = true; addRefl(m); return m; };

  /* ════════ 项目页的板 ════════ */
  const silk = new THREE.Group(); objects.add(silk);
  let silkFit = null;
  new GLTFLoader().loadAsync("assets/objects/silk-wall-2000x1000-350.glb").then(g => {
    const s = g.scene; const screws = s.getObjectByName("illustrative-wall-screws"); if (screws) screws.removeFromParent();
    s.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mat(m)); } });
    const box = new THREE.Box3().setFromObject(s);
    silkFit = { model: s, size: box.getSize(new THREE.Vector3()), c: box.getCenter(new THREE.Vector3()), front: box.max.z };
    silk.add(s); dirty = true;
  }).catch(e => console.error("silk", e));
  const SILK_FRONT = () => silkFit ? silkFit.front : 0.0114;            // 玻璃正面离墙（m）
  const printMat = mat(new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.6, depthWrite: false }));
  const print = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), printMat); print.receiveShadow = true; objects.add(print);
  const ledgeEl = $(".ledge", chalkInner);
  const ledgeFront = mat(new THREE.MeshStandardMaterial({ roughness: 0.5 })), ledgeSide = mat(new THREE.MeshStandardMaterial({ color: 0xd9dcdc, roughness: 0.5 }));
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [ledgeSide, ledgeSide, ledgeSide, ledgeSide, ledgeFront, ledgeSide]);
  ledge.castShadow = ledge.receiveShadow = true; objects.add(ledge);

  /* ════════ 便签页的板：软木（12 mm 厚）+ 四边木框（再凸出 6 mm） ════════ */
  const CORK_D = 0.012, FRAME_D = 0.006;
  const woodSide = mat(new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.7 }));
  const corkFront = mat(new THREE.MeshStandardMaterial({ roughness: 0.95 }));
  const cork = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [woodSide, woodSide, woodSide, woodSide, corkFront, woodSide]);
  cork.castShadow = cork.receiveShadow = true; objects.add(cork);
  const bars = [0, 1, 2, 3].map(() => {                                  // 上、下、左、右四条框：正面用同一张图的对应那一块
    const front = mat(new THREE.MeshStandardMaterial({ roughness: 0.7 }));
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [woodSide, woodSide, woodSide, woodSide, front, woodSide]);
    m.castShadow = m.receiveShadow = true; objects.add(m); return { m, front };
  });

  /* ════════ 纸：项目卡和便签 ════════ */
  // 一张 1 × 1 的薄片：从顶边往下 flat 这一段是平的，再往下慢慢翘，底边离板 lift（二次曲线）；每张只改 x、y 的缩放
  const sheetGeo = (thick, lift, flat) => {
    const g = new THREE.BoxGeometry(1, 1, thick, 1, 16, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = Math.max(0, (0.5 - p.getY(i) - flat) / (1 - flat)); p.setZ(i, p.getZ(i) + lift * k * k); }
    g.computeVertexNormals(); return g;
  };
  const CARD_T = 0.0005, NOTE_T = 0.0001;
  const cardGeo = sheetGeo(CARD_T, 0.003, 0), noteGeo = sheetGeo(NOTE_T, 0.004, 0.25);
  const paperBump = (() => {                                             // 纸面细微的起伏
    const c = document.createElement("canvas"); c.width = c.height = 256; const q = c.getContext("2d"), im = q.createImageData(256, 256);
    let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (r() + r() - 1) * 40; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    q.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t;
  })();
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const KIND = {
    card: {
      // 翻到背面的卡（.flipc.back）画背面那张纸
      face: el => el.classList.contains("mini") ? el : $(el.classList.contains("back") ? ".face.b > .sheetc" : ".face.f > .sheetc", el) || el, flatten: () => [],
      geo: cardGeo, thick: CARD_T, sideColor: () => "#f6f4ee", z0: () => SILK_FRONT(), hideEl: el => el,
      // 只有输入框、多行输入框里在打字才算编辑（点勾选框时按钮也会拿到焦点，那不算）
      editing: el => { const a = document.activeElement; return !!a && el.contains(a) && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable); },
    },
    note: {
      face: el => $(".sheet", el), flatten: el => [el], skipPseudo: (el, w) => el.classList.contains("sheet") && w === "::after",   // .sheet::after 是假的阴影，3D 里有真的
      geo: noteGeo, thick: NOTE_T, sideColor: el => getComputedStyle(el).getPropertyValue("--c").trim() || "#f3e2a1", z0: () => CORK_D,
      editing: el => el.classList.contains("editing"), hideEl: el => $(".sheet", el),
    },
  };
  const items = new Map();                                               // 网页元素 → 3D 里的那张纸
  function itemOf(el, kind) {
    const K = KIND[kind], planes = newPlanes();
    const front = mat(new THREE.MeshStandardMaterial({ roughness: 0.92, bumpMap: paperBump, bumpScale: 0.15 }), planes);
    const side = mat(new THREE.MeshStandardMaterial({ color: K.sideColor(el), roughness: 0.92 }), planes);
    const mesh = new THREE.Mesh(K.geo, [side, side, side, side, front, side]); mesh.castShadow = mesh.receiveShadow = true; objects.add(mesh);
    const pin = kind === "card" ? new THREE.Mesh(sphere, mat(new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }), planes)) : null;
    if (pin) { pin.castShadow = pin.receiveShadow = true; objects.add(pin); }
    const it = { el, kind, K, mesh, pin, front, side, planes, tex: null, dirty: true, painting: false, editing: false };
    items.set(el, it); return it;
  }
  function dropItem(it) { objects.remove(it.mesh); if (it.pin) { objects.remove(it.pin); it.pin.material.dispose(); } it.tex?.dispose(); it.front.dispose(); it.side.dispose(); items.delete(it.el); }
  async function paintItem(it) {
    if (it.painting) return; it.painting = true; it.dirty = false;
    try {
      const editing = it.K.editing(it.el), face = it.K.face(it.el); if (!face) return;
      // 网页版在 3D 开着时是透明的（编辑时纸的背景也是透明的）：画的那一刻临时去掉 b3d、画完马上加回（同步，不闪）
      it.el.classList.toggle("edit3d", editing);
      const cv = await paintDOM(face, { scale: SCALE, noText: editing, flatten: it.K.flatten(it.el), skipPseudo: it.K.skipPseudo,
        before: () => document.body.classList.remove("b3d"), after: () => document.body.classList.add("b3d") });
      const t = newTex(cv); it.front.map = t; it.front.needsUpdate = true; it.tex?.dispose(); it.tex = t;   // 贴图大小会变：每次换一张新的
      it.side.color.set(it.K.sideColor(it.el)); it.editing = editing; dirty = true;
    } finally { it.painting = false; }
  }
  /* 图钉（便签页）：红色亮面小球，网页里的 .pin 在哪就摆在哪 */
  const pins = new Map();
  function pinOf(el) {
    const planes = newPlanes();
    const p = new THREE.Mesh(sphere, mat(new THREE.MeshPhysicalMaterial({ color: 0xcc5c42, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }), planes));
    p.castShadow = p.receiveShadow = true; p.userData.planes = planes; objects.add(p); pins.set(el, p); return p;
  }

  /* ── 网页一变就重画贴图：MutationObserver + 输入；字体到了全部重画 ── */
  let dirty = true, printDirty = true, corkDirty = true, sig = "";
  const markFrom = t => {
    const el = t && (t.nodeType === 1 ? t : t.parentElement); if (!el) return;
    const host = el.closest(".pcard, .mini, .note");
    if (host) { const it = items.get(host); if (it) it.dirty = true; }
    else if (el.closest("#chalk")) printDirty = true;
    else if (el.closest("#cork")) corkDirty = true;
  };
  new MutationObserver(ms => { for (const m of ms) markFrom(m.target); dirty = true; })
    .observe($("#pages"), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "value"] });
  new MutationObserver(() => { dirty = true; }).observe(document.body, { childList: true });   // 拖动时的 .ghost、拿在手里的图钉挂在 body 上
  addEventListener("input", e => { markFrom(e.target); dirty = true; });
  addEventListener("focusin", e => markFrom(e.target)); addEventListener("focusout", e => setTimeout(() => markFrom(e.target), 0));
  const repaintAll = () => { items.forEach(it => it.dirty = true); printDirty = corkDirty = true; };
  document.fonts?.ready.then(repaintAll); document.fonts?.addEventListener?.("loadingdone", repaintAll);
  let printing = false, corking = false;
  async function paintPrint() {
    if (printing) return; printing = true; printDirty = false;
    try {
      const cv = await paintDOM(chalkInner, { scale: SCALE, textOnly: true, skip: el => el.matches(".cards, .ledge, .add, .sunlit") });   // 栏里的卡单独做成 3D；空栏提示、拖动落点这些操作提示留在网页上
      const t = printMat.map; printMat.map = newTex(cv); printMat.needsUpdate = true; t?.dispose();
      if (ledgeEl) { const lv = await paintDOM(ledgeEl, { scale: SCALE }); const o = ledgeFront.map; ledgeFront.map = newTex(lv); ledgeFront.needsUpdate = true; o?.dispose(); }
      dirty = true;
    } finally { printing = false; }
  }
  async function paintCork() {
    if (corking) return; corking = true; corkDirty = false;
    try {
      // 网页版的软木和木框在 3D 开着时是透明的（body.b3d）；画贴图那一刻临时去掉 b3d、画完马上加回（同步，不闪）。
      // .sunlit 是 room.js 在没有 WebGL 时用的平面光（2D），去掉 b3d 时它会露出来，不能画进贴图
      const cv = await paintDOM(corkFrame, { scale: SCALE, skip: el => el.matches("#notes, .sunlit"), before: () => document.body.classList.remove("b3d"), after: () => document.body.classList.add("b3d") });
      const t = newTex(cv), old = corkFront.map; corkFront.map = t; corkFront.needsUpdate = true; old?.dispose();
      bars.forEach(b => { b.front.map?.dispose(); b.front.map = t.clone(); b.front.needsUpdate = true; });   // 共用同一张图，各取一块（见 place）
      dirty = true;
    } finally { corking = false; }
  }

  /* ── 每一帧照网页摆好 ── */
  const angleOf = el => { const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform); if (!m) return [0, 1]; const v = m[1].split(",").map(Number); return [Math.atan2(v[1], v[0]), Math.hypot(v[0], v[1])]; };
  const liftOf = el => el ? Math.max(0, Math.min(1, parseFloat(getComputedStyle(el).getPropertyValue("--lift")) || 0)) : 0;
  function place() {
    SR = stage.getBoundingClientRect(); setPlanes(BOARD_PLANES, true, null);
    const onStage = r => r.right > SR.left && r.left < SR.right && r.bottom > SR.top && r.top < SR.bottom;
    // 项目页的板
    const br = chalkInner.getBoundingClientRect(), z0 = SILK_FRONT(), silkOn = onStage(br);
    silk.visible = print.visible = silkOn;
    if (silkFit) { const sx = wl(br.width) / silkFit.size.x, sy = wl(br.height) / silkFit.size.y; silkFit.model.scale.set(sx, sy, 1); silkFit.model.position.set(-silkFit.c.x * sx, -silkFit.c.y * sy, 0); silk.position.set(wx(br.left + br.width / 2), wy(br.top + br.height / 2), 0); }
    print.scale.set(wl(br.width), wl(br.height), 1); print.position.set(wx(br.left + br.width / 2), wy(br.top + br.height / 2), z0 + 0.0002);
    if (ledgeEl) { const lr = ledgeEl.getBoundingClientRect(); ledge.visible = silkOn && lr.width > 0; ledge.scale.set(wl(lr.width), wl(lr.height), 0.008); ledge.position.set(wx(lr.left + lr.width / 2), wy(lr.top + lr.height / 2), z0 + 0.004); }
    // 便签页的板：软木 + 四条框
    const fr = corkFrame.getBoundingClientRect(), corkOn = onStage(fr), fw = fr.width, fh = fr.height, pad = parseFloat(getComputedStyle(corkFrame).paddingTop) || 14;
    cork.visible = corkOn; cork.scale.set(wl(fw), wl(fh), CORK_D); cork.position.set(wx(fr.left + fw / 2), wy(fr.top + fh / 2), CORK_D / 2);
    [[0, 0, fw, pad], [0, fh - pad, fw, pad], [0, pad, pad, fh - 2 * pad], [fw - pad, pad, pad, fh - 2 * pad]].forEach(([x, y, w, h], i) => {
      const b = bars[i]; b.m.visible = corkOn;
      b.m.scale.set(wl(w), wl(h), FRAME_D); b.m.position.set(wx(fr.left + x + w / 2), wy(fr.top + y + h / 2), CORK_D + FRAME_D / 2);
      if (b.front.map) { b.front.map.repeat.set(w / fw, h / fh); b.front.map.offset.set(x / fw, 1 - (y + h) / fh); }
    });
    // 纸
    for (const it of items.values()) {
      const el = it.el, r = el.getBoundingClientRect(), face = it.K.face(el);
      const ghost = el.classList.contains("ghost"), lifted = el.classList.contains("lifted"), outside = ghost || !!el.closest("#fly");   // 舞台外面的（拖着走的卡、抽屉里的便签）
      const show = el.isConnected && face && r.width > 0 && getComputedStyle(el).display !== "none" && (outside || onStage(r));
      it.mesh.visible = !!show; if (it.pin) it.pin.visible = !!show; if (!show) continue;
      const w = face.offsetWidth, h = face.offsetHeight, [a, s] = angleOf(el), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const z = it.K.z0() + it.K.thick / 2 + 0.0002 + (ghost ? 0.03 : 0) + (it.kind === "note" ? liftOf(el) * 0.04 : 0);
      it.mesh.scale.set(wl(w * s), wl(h * s), 1); it.mesh.rotation.set(0, 0, -a); it.mesh.position.set(wx(cx), wy(cy), z);
      const op = lifted ? 0.3 : 1; [it.front, it.side].forEach(x => { x.transparent = op < 1; x.opacity = op; });
      const box = it.kind === "card" && !ghost && el.closest(".cards");
      setPlanes(it.planes, !outside, box ? box.getBoundingClientRect() : null);
      if (it.pin) {                                                      // 磁铁：大卡用 .grip 的位置，小卡在顶边正中往下 2 px（网页里是 ::before）
        it.pin.material.color.set(getComputedStyle(el).getPropertyValue("--mg").trim() || "#c9573f"); it.pin.material.opacity = op; it.pin.material.transparent = op < 1;
        const grip = el.classList.contains("pcard") && $(".grip", el);
        let px, py, pr;
        if (grip) { const g = grip.getBoundingClientRect(); px = g.left + g.width / 2; py = g.top + g.height / 2; pr = g.width / 2; }
        else { const dy = -h / 2 + 2; px = cx - Math.sin(a) * dy; py = cy + Math.cos(a) * dy; pr = 8; }
        it.pin.scale.set(wl(pr), wl(pr), wl(pr) * 0.7); it.pin.position.set(wx(px), wy(py), z + it.K.thick / 2 + wl(pr) * 0.7 * 0.6);
      }
    }
    // 便签页的图钉
    for (const [el, p] of pins) {
      const r = el.getBoundingClientRect(), free = el.classList.contains("free");
      const show = el.isConnected && r.width > 0 && getComputedStyle(el).display !== "none" && (free || onStage(r));
      p.visible = !!show; if (!show) continue;
      const held = free && el.classList.contains("held"), pr = r.width / 2, lz = liftOf(el.closest(".note")) * 0.04;
      setPlanes(p.userData.planes, !free, null);
      p.scale.set(wl(pr), wl(pr), wl(pr) * 0.8);
      p.position.set(wx(r.left + pr), wy(r.top + r.height / 2), CORK_D + NOTE_T + 0.0003 + lz + (held ? 0.02 : 0) + wl(pr) * 0.8 * 0.6);
    }
  }
  function signature() {
    const parts = [innerWidth, innerHeight, $("#pages")?.style.transform];
    for (const e of [chalkInner, corkFrame]) { const r = e.getBoundingClientRect(); parts.push(r.left | 0, r.top | 0, r.width | 0, r.height | 0); }
    for (const it of items.values()) { const q = it.el.getBoundingClientRect(), cs = getComputedStyle(it.el); parts.push(q.left.toFixed(1), q.top.toFixed(1), q.width | 0, q.height | 0, cs.transform, it.el.className, cs.getPropertyValue("--lift")); }
    for (const el of pins.keys()) { const q = el.getBoundingClientRect(); parts.push(q.left.toFixed(1), q.top.toFixed(1), el.className); }
    for (const b of $$("#chalk .cards")) parts.push(b.scrollTop);
    return parts.join(",");
  }
  function sync() {                                                      // 网页上现在有哪些纸、图钉：新的建出来，没了的删掉
    const now = new Map();
    for (const el of [...$$("#chalk .pcard.inl, #chalk .mini"), ...$$("body > .pcard.ghost, body > .mini.ghost")]) now.set(el, "card");
    for (const el of $$(".note:not(.hidden)")) now.set(el, "note");
    for (const it of [...items.values()]) if (!now.has(it.el)) { dropItem(it); dirty = true; }
    for (const [el, kind] of now) { if (!items.has(el)) { itemOf(el, kind); dirty = true; } const h = KIND[kind].hideEl(el); if (h) h.classList.add("x3d"); }
    const pnow = new Set($$(".pin"));
    for (const [el, p] of [...pins]) if (!pnow.has(el)) { objects.remove(p); p.material.dispose(); pins.delete(el); dirty = true; }
    for (const el of pnow) { if (!pins.has(el)) { pinOf(el); dirty = true; } el.classList.add("x3d"); }
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!R.ready) return;
    sync();
    for (const it of items.values()) if (it.dirty || it.editing !== it.K.editing(it.el)) paintItem(it);
    if (printDirty) paintPrint();
    if (corkDirty) paintCork();
    const s = signature(); if (s !== sig) { sig = s; dirty = true; }
    if (dirty) { dirty = false; R.render(); }
  }
  $$("#chalk .lane h3, #chalk .ledge").forEach(e => e.classList.add("x3d"));
  $$("#chalk .lane").forEach(e => e.classList.add("x3dp"));
  R.layout();
  document.body.classList.add("b3d");
  requestAnimationFrame(frame);
  window.__board3d = { R, items, pins, render: () => { dirty = true; } };
}
