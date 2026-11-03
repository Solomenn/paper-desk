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
    shelfNav();
  }
  R.layout();
  document.body.classList.add("w3d");

  /* 书架怎么看：一次正对一层，右边一根刻度尺（同入口页的切换条刻度）上下拖动换层，拖书架本身能稍微转一转（shelf-nav.js） */
  async function shelfNav() {
    if (!books || !books.bays) return;
    const { setupShelfNav } = await import("./shelf-nav.js");
    setupShelfNav(R, books);
  }
}
