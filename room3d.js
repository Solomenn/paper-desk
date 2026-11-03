/* room3d.js：纸桌那间屋子的 3D 光照（2026-11-03 从 lab/entry.html 抽出来，入口页和首页共用同一份代码）。
   墙、左边那扇百叶窗、太阳、天光、反射光、近硬远软的影子（PCSS）、闭塞阴影、高光溢出、光柱、浮尘、胶片感都在这里；
   每个页面只管往 objects 里放自己的东西（入口页：六个物件；首页：板子、项目卡、便签），在 beforeRender 里摆好位置。
   画面和世界的对应：画面宽永远是 VIEW_W = 2.536 m，画面正中对着墙上 (0, YC)；墙是 z = 0，往镜头是 +z。
   用法：
     const R = await createRoom3D({ canvas, base: "../", dust: 画浮尘的 canvas, film: 胶片层的 div, beforeRender, onLayout });
     R.objects.add(...)；材质交给 R.addRefl(mat)（反光、地面反光、百叶透光、自身闭塞）；R.layout() 第一次排版并画出来；
     之后东西动了就 R.render()。 */
import * as THREE from "three";

export async function createRoom3D({ canvas, base = "", dust: dustCanvas = null, film: filmEl = null, beforeRender = null, onLayout = null } = {}) {
const deg = Math.PI / 180;
const GOBO = await (await fetch(base + "assets/objects/lintex-light-gobo.json")).json();
const W = GOBO.W;
/* ── 阳光参数（用户 2026-11-02）：全部集中在 L 里，地址栏可以逐项覆盖（如 ?area=0.4&sunK=4000），调节面板也改这一组 ──
   area   亮区占画面宽的比例（0.5 = 左边一半）       topY  亮区右上角那条斜边落在墙上的高度（m；画面上沿约 2.28）
   az/el  太阳方位角、仰角（度）                       turn  窗所在的墙绕竖轴转多少度（0 = 正侧墙）
   pitch/tilt  百叶片间距（m）、百叶片斜的角度（度，0 = 平放；越大越顺着光斜、越透光，负的越挡光；实测 20 条纹清楚，40 只剩细线）   ang   太阳的视半径（度）：影子按距离变软的程度
   sun/sky/bounce  阳光、天光、反射光的强度             sunK/skyK  阳光、天光的色温（K）；0 = 原来的颜色（阳光纯白、天光窗光页的冷调）
   glow   高光溢出的强度
   refl   反光：亮墙反弹到物件暗面上的光               ao    闭塞阴影：物件根部、边缘一圈墙上的天光和反射光减弱多少
   haze   光柱：窗和墙之间的空气被阳光照亮的强度（用户 2026-11-02：默认开启；0.12，再大会冲淡反差）
   hazeD  光柱只算墙前多厚一层空气（m）；0 = 自动（见"光柱和条纹在物件上弯折能共存"那段）
   aoObj  物体自身的闭塞阴影（缝隙、凹处更暗）   floor  地面反光（照物体底面和墙的下部）
   env    光滑表面映出环境的强度                  tau   百叶片的透光率（0.08 = 透 8%）
   bleed  环境色：物件的颜色映到旁边墙上的强度
   leaves 窗外树叶的多少（0 没有）                 film  胶片感：颗粒和四角压暗的强度
   dust   浮尘的多少（0 关，1 默认）
   默认值的来由见下面"阳光像真的"那段。 */
const LIGHT_DEFAULT = { area: 0.68, topY: 1.94, az: 18, el: 32, turn: 63, pitch: 0.15, tilt: 20, ang: 0.21,
  sun: 10, sky: 1.0, bounce: 1.2, sunK: 0, skyK: 0, glow: 0.12, dust: 1, refl: 0.6, ao: 0.35, haze: 0.12, hazeD: 0, aoObj: 0.8, floor: 0.5, env: 0.3, tau: 0.08, bleed: 0.04, leaves: 0, film: 0.12 };   // film 0.25 时颗粒盖住了收音机的细节（实测），默认 0.12                  // 用户 2026-11-02 在调节面板里调好的一组；天光、反射光再降（反差 1.8 → 2.7 倍）
const L = { ...LIGHT_DEFAULT };
/* 先读面板"保存"存进浏览器的值（localStorage，键 paper-desk.light.v1），再读地址栏：地址栏里有的以地址栏为准。 */
try { const saved = JSON.parse(localStorage.getItem("paper-desk.light.v1") || "{}"); for (const k in L) if (typeof saved[k] === "number") L[k] = saved[k]; } catch (e) {}
{ const q = new URLSearchParams(location.search); for (const k in L) if (q.get(k) !== null && q.get(k) !== "") L[k] = +q.get(k); }
window.__light = L;
/* 阳光像真的（用户 2026-11-02 给了三张参考图：百叶窗照片、树影油画、胶片；逐项量了亮部/暗部的亮度 L*、色温 b*、饱和度 C*）：
   1. 反差：参考图亮/暗光量比 12–67 倍，我们只有 1.5 倍（暗部 L* 81，天光和反射光补得太多）。
      → 阳光 8.97 → 10，天光 2.26 → 1.0，反射光 4.2 → 1.2：亮条/背光墙 2.7 倍（实测），颜色不变；入口页还要清爽，不压成暗场。
   2、3. 冷暖、饱和度：试过阳光 4300 K 暖白 + Neutral 色调映射，用户 2026-11-02 否了（"不要改我的色调！我不要这种黄昏"）：
      颜色保持原样——阳光纯白、天光窗光页的冷调、ACES 色调映射。sunK / skyK 留着，默认 0（原来的颜色）。
   4. 边缘软硬：近硬远软（用户 2026-11-02："近的投影边缘很硬，远的边缘模糊"），见下面"影子按距离变软"。
   5. 空气感：最亮的地方往外晕一圈光（高光溢出，glow，很淡）；光里飘一点浮尘（dust），只在亮区里看得见；系统要求减少动态效果时不显示。 */
/* ── 影子按距离变软（用户 2026-11-02，学画画的经验：离得近的投影边缘硬，离得远的边缘模糊）──
   太阳不是一个点，有大小（半径 ang 度）：挡光的东西离受光面越远，影子边缘糊开越宽，宽度 = 距离 × tan(ang)。
   three.js 自带的阴影不管远近，边缘一样硬，所以把它的阴影采样换掉（PCSS）：
   1. 在受光点周围的深度图里采 16 个点，找出挡光的东西，求它们的平均深度（离受光点多远）；
   2. 糊开半径 = 这个距离 × tan(ang)（换算成深度图上的大小）；
   3. 在这个半径里再采 32 个点，算有多少比例被挡住 → 影子的深浅。
   墙上的条纹（窗离墙 2–3 m → 糊开约 1 cm）、物件身上的条纹、物件投在墙上的影子（贴墙处几乎不糊，火车头离墙约 30 cm → 约 1 mm）都按这一条走。
   墙也不再叠 48 个太阳方向（NDIR = 1），一遍就算完，调节面板重算更快。 */
const SHADOW_CHUNK = THREE.ShaderChunk.shadowmap_pars_fragment;
function usePCSS() {
  const far = 40, near = 1, size = 5.2, mapSize = 4096;                   // 和下面 sun.shadow.camera 的设置一致
  const scale = (far - near) * Math.tan(L.ang * deg) / size;              // 深度差 1（= 39 m）→ 深度图上的糊开半径
  const search = Math.max(scale * 0.13, 4 / mapSize);                     // 找遮挡物的范围：最远约 5 m 的遮挡物
  const f = v => v.toFixed(7);
  const pcss = `
	float pcssShadow( sampler2D sm, vec2 uv, float zR ) {
		float rot = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) * 6.2832;   // 每个像素转一个角度，免得出条纹
		float sum = 0.0, n = 0.0;
		for ( int i = 0; i < 16; i ++ ) {
			float r = sqrt( ( float( i ) + 0.5 ) / 16.0 ), a = float( i ) * 2.39996 + rot;
			float d = unpackRGBAToDepth( texture2D( sm, uv + vec2( cos( a ), sin( a ) ) * r * ${f(search)} ) );
			if ( d < zR ) { sum += d; n += 1.0; }
		}
		if ( n < 1.0 ) return 1.0;                                        // 周围没有挡光的东西：全亮
		float pen = max( ( zR - sum / n ) * ${f(scale)}, ${f(1.2 / mapSize)} );   // 糊开半径：遮挡物越远越大，最小约 1 个像素
		float lit = 0.0;
		for ( int i = 0; i < 32; i ++ ) {
			float r = sqrt( ( float( i ) + 0.5 ) / 32.0 ), a = float( i ) * 2.39996 + rot;
			lit += texture2DCompare( sm, uv + vec2( cos( a ), sin( a ) ) * r * pen, zR );
		}
		return lit / 32.0;
	}
`;
  THREE.ShaderChunk.shadowmap_pars_fragment = SHADOW_CHUNK
    .replace("float getShadow(", pcss + "\n\tfloat getShadow(")
    .replace("#if defined( SHADOWMAP_TYPE_PCF )", "#if defined( SHADOWMAP_TYPE_PCF )\n\t\t\tshadow = pcssShadow( shadowMap, shadowCoord.xy, shadowCoord.z );\n\t\t#elif defined( PCSS_REPLACED_THE_PCF_BRANCH )");
}
usePCSS();
const kelvin = K => {                                                     // 色温 → 颜色（Tanner Helland 的近似公式，输出 sRGB）
  const t = K / 100; let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = v => Math.max(0, Math.min(255, v)) / 255;
  return new THREE.Color().setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
};
/* 窗：百叶窗，开在左边、绕竖轴转了 turn 度的墙上（turn = 0 时百叶片和视线平行，条纹在物件上永远是直线，像贴上去的）。
   窗上的点（u 沿百叶片方向、v 是高度）在世界里是 (-W + u·sin(turn), v, u·cos(turn))，顺着阳光落到后墙：
   X = -W + KX·u，Y = v - KY·u（KX、KY 由 turn、az、el 算出；默认值下 X ≈ -3 + 1.74·u，Y ≈ v - 0.89·u）。
   百叶片（v 固定）→ 后墙上往右下斜的线；窗的竖边（u 固定）→ 后墙上的竖线。所以按面积反推窗：
   · 窗左边 U0：投到画面左边外（X = -VIEW_W/2 - 0.2）；窗右边 U1：投到 X = -VIEW_W/2 + area·VIEW_W（亮区右边）；
   · 窗顶 V1：亮区右上角那点落在 Y = topY，斜边往左上走出画面；窗底 0：投到画面下面；
   · 一根竖拉绳（参考图里那根细线）：放在亮区宽度的 1/3 处，宽 6 mm。
   例：area 0.5 → 亮区到画面正中（X = 0），U1 ≈ 1.72，V1 ≈ 3.43。 */
const WINDOW = {};
function buildWindow() {
  const ce = Math.cos(L.el * deg), se = Math.sin(L.el * deg), ca = Math.cos(L.az * deg), sa = Math.sin(L.az * deg), tr = L.turn * deg;
  const KX = Math.sin(tr) + Math.cos(tr) * ca / sa, KY = Math.cos(tr) * se / (ce * sa);
  const X0 = -VIEW_W / 2 - 0.2, X1 = -VIEW_W / 2 + L.area * VIEW_W;
  const U0 = (X0 + W) / KX, U1 = Math.max(U0 + 0.05, (X1 + W) / KX), V1 = L.topY + KY * U1;
  const CORD = U0 + (U1 - U0) / 3, CORD_W = 0.006, CHORD = L.pitch * 1.1;   // 百叶片宽（前沿到后沿）比间距略宽，平放时刚好叠住
  // 反射光贴图用的近似窗洞：每片百叶在竖直方向大约挡住 宽 × sin(角度) + 2.5 mm 厚（真正的影子由下面 buildGobo 的立体薄片投出来）
  const block = Math.min(L.pitch * 0.95, Math.max(0.0025, CHORD * Math.sin((40 - L.tilt) * deg) * 0.5 + 0.0025));   // 粗略：40° 时几乎全透，越小挡得越多
  GOBO.holes = []; GOBO.islands = [];
  for (let v = 0; v + L.pitch <= V1 + 1e-9; v += L.pitch) GOBO.holes.push([[U0, v + block], [U1, v + block], [U1, v + L.pitch], [U0, v + L.pitch]]);
  Object.assign(WINDOW, { U0, U1, V1, KX, KY, CORD, CORD_W, CHORD });
}
const NDIR = 1, BSIG = 0.5, WALL = "#f0f0ee";                         // 墙的软阴影交给 PCSS（见"影子按距离变软"），一遍就够
/* ANG：墙上软阴影用的 48 个太阳方向散开的半径（度），只管影子边缘软硬，不影响亮度。窗光页原来是 0.5。
   换成百叶窗后改成 0.12（用户 2026-11-02：墙上的条纹不像光，很奇怪）：0.5° 在 4 m 外糊开约 7 cm，比 4.4 cm 宽的暗条还宽，
   暗条一直漏进阳光，墙上暗条/亮条只有 230/245，物件身上（每帧只用一个太阳方向，边缘锐利）却是 165/235，同一束光两种样子。
   0.12° 糊开约 1.7 cm：墙上条纹和物件身上一样清楚，暗条真正暗下去。 */
const YC = 1.5 - 3 * 2.536 / 1140, VIEW_W = 2.536;                          // 画面宽永远是 2.536 m，和窗光页一样
let wallReady = false;                                                    // 墙的光照算好之前不画

/* canvas 由页面传进来 */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 60); camera.position.set(0, YC, 10);
const scene = new THREE.Scene();

/* 反射光贴图（同窗光页） */
const WX0 = -2.2, WX1 = 2.2, WY0 = -0.2, WY1 = 3.6, RES = 200;
function bounceTexture() {                                               // 窗洞顺着阳光投到后墙的位置，模糊后当反射光（阳光的颜色）
  const cw = Math.round((WX1 - WX0) * RES / 4), ch = Math.round((WY1 - WY0) * RES / 4);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch; const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, cw, ch);
  const ce = Math.cos(L.el * deg), se = Math.sin(L.el * deg), ca = Math.cos(L.az * deg), sa = Math.sin(L.az * deg), tr = L.turn * deg;
  const toPx = (x, y) => [(x - WX0) / (WX1 - WX0) * cw, (1 - (y - WY0) / (WY1 - WY0)) * ch];
  g.fillStyle = L.sunK ? "#" + kelvin(L.sunK).getHexString(THREE.SRGBColorSpace) : "#fff";
  for (const h of [...GOBO.holes, ...(GOBO.islands || []).map(i => ({ island: i }))]) {
    if (h.island) g.fillStyle = "#000";
    g.beginPath();
    (h.island || h).forEach(([u, y], i) => {                              // 窗上的点 (u, y) → 世界 (px, y, pz)（窗墙转了 turn）→ 顺着阳光落到后墙
      const px = -W + u * Math.sin(tr), pz = u * Math.cos(tr), t = pz / (ce * sa), X = px + t * ce * ca, Y = y - t * se;
      const [qx, qy] = toPx(X, Y); i ? g.lineTo(qx, qy) : g.moveTo(qx, qy); });
    g.closePath(); g.fill();
  }
  g.filter = `blur(${BSIG * RES / 4}px)`; g.drawImage(c, 0, 0); g.filter = "none";
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; return tex;
}
function stucco() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d"), img = g.createImageData(512, 512);
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const a = new Float32Array(512 * 512).map(rnd);
  for (let p = 0; p < 2; p++) { const t = a.slice(); for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { let v = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) v += t[((y + dy + 512) % 512) * 512 + ((x + dx + 512) % 512)]; a[y * 512 + x] = v / 9; } }
  for (let i = 0; i < a.length; i++) { const v = Math.max(0, Math.min(255, (a[i] - .5) * 900 + 128)); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 8); return t;
}
buildWindow();
const wallMat = new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.95, bumpMap: stucco(), bumpScale: 0.35, lightMap: bounceTexture(), lightMapIntensity: L.bounce });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WX0, WY1 - WY0), wallMat);
wall.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, 0); wall.receiveShadow = true; scene.add(wall);

/* 左墙的窗：只投影（不画出来）；改了阳光参数时整个重建 */
const gobo = new THREE.Group(); scene.add(gobo);
const goboMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
/* 窗外的树叶（用户 2026-11-02，参考树影油画）：窗外 8 m 远挂两层看不见、只投影的"树叶板"（透明图上画一簇簇叶子）。
   阳光先穿过树叶、再穿过百叶落到墙上：条纹被树影打断，漏下来的光斑是圆的——太阳有大小，离墙远的树叶投下的光斑
   就是太阳的像（小孔成像），8 m 远约 6 cm。两层晃得不一样，风吹时光斑会闪动（见"光的缓慢变化"）。leaves = 0 时没有。
   默认 0（实测 2026-11-02）：太阳方位 18° 时光几乎贴墙扫过来，投到墙上的形状横向被拉长约 3 倍，
   小缝的圆光斑成了长条，加上 8 m 远的软边，整面墙像水波纹，百叶条纹被冲散。太阳方位调大（光更正对墙）再开，光斑才圆。 */
const leaves = new THREE.Group(); scene.add(leaves);
const leafTex = [];
function leafCanvas(seed, amount) {
  /* 圆光斑是从密树冠的小缝里漏下来的（每条小缝在墙上投出一个太阳的像，所以是圆的）：
     贴图上半部分画成密密的树冠（大约 amount × 7000 片叶子），叶子之间自然留下零星小缝；下半部分空着（窗的下半截不挡）。
     第一版是稀疏的几簇叶子，投下来成了一团团烟雾状的影子，不像油画里的光斑（实测）。 */
  const c = document.createElement("canvas"); c.width = c.height = 1024; const g = c.getContext("2d");
  let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  g.fillStyle = "#000";
  const n = Math.round(amount * 7000);
  for (let i = 0; i < n; i++) {
    const x = rnd() * 1024, y = Math.pow(rnd(), 0.7) * 1024 * 0.5;       // 越往上越密
    g.save(); g.translate(x, y); g.rotate(rnd() * 6.283); g.beginPath(); g.ellipse(0, 0, 6 + rnd() * 8, 3 + rnd() * 3, 0, 0, 6.283); g.fill(); g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function buildLeaves() {
  leaves.children.slice().forEach(m => { m.geometry.dispose(); leaves.remove(m); }); leafTex.forEach(t => t.dispose()); leafTex.length = 0;
  if (L.leaves <= 0) return;
  gobo.updateMatrixWorld(true);
  const { U0, U1, V1 } = WINDOW, mid = gobo.localToWorld(new THREE.Vector3((U0 + U1) / 2, V1 / 2, 0));
  const toSun = new THREE.Vector3(-Math.cos(L.el * deg) * Math.cos(L.az * deg), Math.sin(L.el * deg), Math.cos(L.el * deg) * Math.sin(L.az * deg));
  [[8, 3], [9.5, 7]].forEach(([dist, seed]) => {
    const tex = leafCanvas(seed, L.leaves); leafTex.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide });   // 投影时按叶子的形状挖空
    m.position.copy(mid).addScaledVector(toSun, dist); m.lookAt(mid); m.castShadow = true; leaves.add(m);
  });
}
/* 百叶片是真的立体薄片（用户 2026-11-02，第 6 项）：窗框上开一个大窗洞（U0–U1 × 0–V1），洞里每隔 pitch 一片百叶，
   宽 CHORD（前沿到后沿）、厚 2.5 mm，绕自己的长边斜 tilt 度；再加一根竖拉绳（6 mm 见方）。
   这样每道光条的上、下两条边分别由前一片的后沿、后一片的前沿挡出来，两条边离墙远近不同，按"近硬远软"软硬就不一样；
   太阳高度变了，从缝里漏过来的光条宽度也跟着变——都由阴影自动算出来。
   窗框厚 4 mm（原来 3 cm：光斜着穿过时厚洞壁会挡掉一截）。 */
function buildGobo() {
  gobo.children.slice().forEach(m => { m.geometry.dispose(); gobo.remove(m); });
  gobo.rotation.set(0, L.turn * deg - Math.PI / 2, 0); gobo.position.set(-W, 0, 0);   // gobo 里的 x 轴 → 百叶片方向 (sin turn, 0, cos turn)，y 轴是高度
  const { U0, U1, V1, CORD, CORD_W, CHORD } = WINDOW;
  const sh = new THREE.Shape(); sh.moveTo(-3, -5); sh.lineTo(GOBO.Z1, -5); sh.lineTo(GOBO.Z1, GOBO.Y1); sh.lineTo(-3, GOBO.Y1); sh.lineTo(-3, -5);
  const hole = new THREE.Path(); hole.moveTo(U0, 0); hole.lineTo(U1, 0); hole.lineTo(U1, V1); hole.lineTo(U0, V1); hole.closePath(); sh.holes.push(hole);
  const add = (geo, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, goboMat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; gobo.add(m); return m; };
  add(new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false }), 0, 0, -0.002);
  // 叶片两头各比窗洞长 0.3 m（藏在窗框后面）：光斜着穿过窗，叶片和窗洞一样宽的话，靠窗洞两边的光会从叶片端头外面绕过去
  for (let v = L.pitch / 2; v < V1; v += L.pitch) add(new THREE.BoxGeometry(U1 - U0 + 0.6, 0.0025, CHORD), (U0 + U1) / 2, v, 0, -L.tilt * deg).userData.slat = true;   // 负号：tilt 越大，叶片越顺着光斜，越透光
  { const c = add(new THREE.BoxGeometry(CORD_W, V1, CORD_W), CORD, V1 / 2, 0); c.userData.slat = true; c.userData.cord = true; }
  buildLeaves();
}
buildGobo();

/* 光（同窗光页） */
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, L.sky); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, L.sun);
const tint = new THREE.Color(0.95, 0.99, 1.03);                          // 窗光页的冷调（原来的颜色）
function lightColors() {                                                  // sunK / skyK 为 0 时用原来的颜色：阳光纯白，天光 #e8eff3、地面 #dfe2e3，都乘冷调
  sun.color.copy(L.sunK ? kelvin(L.sunK) : new THREE.Color(0xffffff)); sun.intensity = L.sun;
  hemi.color.copy(L.skyK ? kelvin(L.skyK) : new THREE.Color(0xe8eff3).multiply(tint));
  hemi.groundColor.copy(L.skyK ? kelvin(L.skyK) : new THREE.Color(0xdfe2e3).multiply(tint)); hemi.intensity = L.sky;
  wallMat.lightMapIntensity = L.bounce;
}
lightColors();
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 40 });
sun.shadow.bias = -0.0001; sun.shadow.normalBias = 0.0015;
sun.target.position.set(0, 1.5, 0); scene.add(sun, sun.target);
const sunAz = () => L.az * deg, sunEl = () => L.el * deg;              // 太阳方位、高度（弧度）；光不再缓慢变化（2026-11-03 取消，见文件末尾）
const sunAt = (az, el) => sun.position.set(-Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(14).add(sun.target.position);

/* 物件：每个页面自己往里放 */
const objects = new THREE.Group(); scene.add(objects);
let PXM = 1;                                                              // 每米多少 CSS 像素（随窗口宽度变）

/* ── 墙：48 个太阳方向累积（线性），另存一份"只有阳光"的累积，用来让物件的影子只扣掉阳光 ── */
const quad = mat => { const q = new THREE.Scene(); q.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return q; };
const cam2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = "varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0., 1.); }";
let rtPass, rtAcc, rtSun, rtVis, rtGlowA, rtGlowB, rtMask, rtOpen, rtOpenA, rtOpenB;
/* 画布大小没变就接着用（光在缓慢变化时，墙每秒要重算十几次，每次都扔掉重建太浪费） */
const ensureRT = (rt, w, h, o = {}) => { if (rt && rt.width === w && rt.height === h) return rt; if (rt) rt.dispose(); return new THREE.WebGLRenderTarget(w, h, o); };
const addMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, w: { value: 1 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, vertexShader: VS,
  fragmentShader: "uniform sampler2D t; uniform float w; varying vec2 v; void main(){ gl_FragColor = vec4(texture2D(t, v).rgb * w, 1.); }" });
const outMat = new THREE.ShaderMaterial({ uniforms: { acc: { value: null }, sun: { value: null }, vis: { value: null }, glow: { value: null }, glowAmt: { value: 0 }, ao: { value: null }, aoAmt: { value: 0 }, open: { value: null }, tau: { value: 0 }, floorAmt: { value: 0 }, bleed: { value: null }, bleedAmt: { value: 0 } }, depthTest: false, depthWrite: false, toneMapped: true, vertexShader: VS,
  fragmentShader: `uniform sampler2D acc, sun, vis, glow, ao, open, bleed; uniform float glowAmt, aoAmt, tau, floorAmt, bleedAmt; varying vec2 v; void main(){
    vec3 s = texture2D(sun, v).rgb, amb = texture2D(acc, v).rgb - s;        // amb：天光 + 反射光（墙上除了阳光以外的光）
    amb += texture2D(glow, vec2(v.x, 0.03)).rgb * floorAmt * 0.5 * pow(1. - v.y, 2.);   // 地面反光：这一列墙脚有阳光 → 前面的地面亮 → 墙越往下越亮
    vec3 c = amb * (1. - aoAmt * texture2D(ao, v).r) + s * texture2D(vis, v).r;   // 闭塞：物件周围一圈 amb 变弱；阳光只被物件的影子挡
    c += texture2D(open, v).rgb * tau * texture2D(vis, v).r;                // 百叶片半透光：透过叶片的那一点光（物件的影子照样挡）
    c += texture2D(bleed, v).rgb * bleedAmt;                                 // 环境色：物件的颜色映到旁边的墙上
    c += texture2D(glow, v).rgb * glowAmt;                                   // 高光溢出：阳光层大范围模糊后叠回来，亮条边上也微微发亮
    gl_FragColor = vec4(max(c, vec3(0.)), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const addScene = quad(addMat), outScene = quad(outMat);
/* 高光溢出（第 5 点）：把"只有阳光"那层缩到 1/4 大小，横竖各模糊两遍（越来越宽），得到一圈柔和的光晕，合成墙时按 glow 叠回去。
   只在墙算好时做一次，不占每帧的时间。 */
const blurMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false, toneMapped: false, vertexShader: VS,
  fragmentShader: `uniform sampler2D t; uniform vec2 dir; varying vec2 v; void main(){
    float w[7]; w[0] = .1964; w[1] = .1748; w[2] = .1216; w[3] = .0660; w[4] = .0280; w[5] = .0093; w[6] = .0024;
    vec3 c = texture2D(t, v).rgb * w[0];
    for (int i = 1; i < 7; i++) { c += texture2D(t, v + dir * float(i)).rgb * w[i]; c += texture2D(t, v - dir * float(i)).rgb * w[i]; }
    gl_FragColor = vec4(c, 1.); }` });
const blurScene = quad(blurMat);
/* 闭塞阴影（用户 2026-11-02，素描五大调子里"投影贴着物体的根部最深"）：物件和墙挨得近的地方，天光和反射光也照不进去。
   每帧把物件的轮廓画成白色（1/4 大小），横竖模糊两遍，得到从物件边缘往外渐淡的一圈；合成墙时这一圈里的 amb 按 ao 减弱。 */
let rtAoA, rtAoB, rtObj;
const aoMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
function bakeAO() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, sz.x >> 2), h = Math.max(1, sz.y >> 2);
  if (!rtAoA || rtAoA.width !== w || rtAoA.height !== h) { [rtAoA, rtAoB, rtObj].forEach(r => r && r.dispose()); rtAoA = new THREE.WebGLRenderTarget(w, h); rtAoB = new THREE.WebGLRenderTarget(w, h); rtObj = new THREE.WebGLRenderTarget(w, h); }
  wall.visible = false; gobo.visible = false; leaves.visible = false; scene.overrideMaterial = aoMat;
  renderer.setRenderTarget(rtObj); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);   // 物件轮廓（不模糊）：光柱也用它，被物件挡住的像素不叠光柱
  scene.overrideMaterial = null; wall.visible = true; gobo.visible = true; leaves.visible = true;
  let first = true;
  for (const step of [0.75, 1.5]) {                                        // 只在贴着物件的窄窄一圈（约 50 px）；宽了会把物件周围一大片墙压暗，边缘发虚
    blurMat.uniforms.t.value = first ? rtObj.texture : rtAoA.texture; first = false; blurMat.uniforms.dir.value.set(step / w, 0); renderer.setRenderTarget(rtAoB); renderer.render(blurScene, cam2);
    blurMat.uniforms.t.value = rtAoB.texture; blurMat.uniforms.dir.value.set(0, step / h); renderer.setRenderTarget(rtAoA); renderer.render(blurScene, cam2);
  }
  outMat.uniforms.ao.value = rtAoA.texture; outMat.uniforms.aoAmt.value = L.ao;
}
/* 环境映像（第二轮第 3 项）：光滑的表面会隐约映出周围——左上方亮的窗、其余是暗的房间。
   用一张很小的全景图（左上一块亮、其余暗，纯中性色），预处理成 three.js 的环境贴图，只给物件的材质（强度 env，默认 0.3），
   主要出反光，不整体提亮；墙不用。 */
const ENV = (() => {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#3a3c3e"; g.fillRect(0, 0, 256, 128);                    // 房间：暗
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,.10)"); gr.addColorStop(1, "rgba(0,0,0,.15)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#f4f4f2"; g.fillRect(150, 22, 46, 40);                   // 窗：在物件的左前上方（全景图的经度约 210°–275°、纬度偏上）
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(t); pm.dispose(); t.dispose(); return rt.texture;
})();
/* 物体自身的闭塞阴影（第二轮第 1 项，屏幕空间 SSAO）：每帧把物件画一遍，存每个像素的表面朝向（法线）和离墙多远（z），
   再对每个物件像素，在它表面外侧半球里取 12 个点（半径 R = 3 cm），看有多少点被别的表面挡在前面（那个位置的表面 z 比点更靠前）；
   挡住的越多越暗。画在 1/2 大小、模糊一遍去噪点；物件着色时只乘在间接光上（天光、反射光），阳光不变。 */
let rtNZ, rtOaoA, rtOaoB, rtColA, rtColB;
/* 环境色（用户 2026-11-02）：物件被照亮后，会把自己的颜色反射到旁边的墙上（红色煤水车旁边的墙泛一点红）。
   每帧把物件按真实颜色和光照画成 1/4 大小的图（墙不画），横竖大范围模糊两遍，合成墙时按 bleed 叠上去。
   物件被阳光照到的地方亮度远超 1（阳光强度 10），bleed 要很小：0.25 时整面墙被冲白（实测），默认 0.04。 */
function bakeBleed() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, sz.x >> 2), h = Math.max(1, sz.y >> 2);
  rtColA = ensureRT(rtColA, w, h, { type: THREE.HalfFloatType }); rtColB = ensureRT(rtColB, w, h, { type: THREE.HalfFloatType });
  wall.visible = false; renderer.setRenderTarget(rtColA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera); wall.visible = true;
  for (const step of [2, 4]) {
    blurMat.uniforms.t.value = rtColA.texture; blurMat.uniforms.dir.value.set(step / w, 0); renderer.setRenderTarget(rtColB); renderer.render(blurScene, cam2);
    blurMat.uniforms.t.value = rtColB.texture; blurMat.uniforms.dir.value.set(0, step / h); renderer.setRenderTarget(rtColA); renderer.render(blurScene, cam2);
  }
  outMat.uniforms.bleed.value = rtColA.texture; outMat.uniforms.bleedAmt.value = L.bleed;
}
const nzMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
  vertexShader: "varying vec3 vN; varying float vZ; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vZ = w.z; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: "varying vec3 vN; varying float vZ; void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n.xy, vZ, 1.0); }" });
  // r、g = 法线的 x、y（z 由它们算出，看得见的面都朝镜头，z ≥ 0）；b = 离墙的深度 z（原值存，数小精度高：原来存 z + 1，半精度只到约 1 mm，布板上一片噪点）；a = 1 表示这里有物件
const oaoMat = new THREE.ShaderMaterial({ uniforms: { nz: { value: null }, vMin: { value: new THREE.Vector2() }, vSize: { value: new THREE.Vector2() }, R: { value: 0.03 } }, depthTest: false, depthWrite: false, toneMapped: false, vertexShader: VS,
  fragmentShader: `uniform sampler2D nz; uniform vec2 vMin, vSize; uniform float R; varying vec2 v;
    void main(){
      vec4 c = texture2D(nz, v); if (c.a <= 0.0) { gl_FragColor = vec4(0.); return; }
      vec3 n = vec3(c.xy, sqrt(max(0.0, 1.0 - dot(c.xy, c.xy)))), p = vec3(vMin + v * vSize, c.b);
      vec3 t = normalize(abs(n.y) < 0.9 ? cross(n, vec3(0., 1., 0.)) : cross(n, vec3(1., 0., 0.))), b = cross(n, t);
      float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2832, occ = 0.0;
      for (int i = 0; i < 12; i++) {
        float fi = float(i), r = R * (0.3 + 0.7 * fract(fi * 0.618 + 0.1)), a = fi * 2.39996 + rot, h = 0.15 + 0.85 * fract(fi * 0.381);
        vec3 q = p + (t * cos(a) * sqrt(1. - h * h) + b * sin(a) * sqrt(1. - h * h) + n * h) * r;   // 表面外侧半球里的一点
        vec4 s = texture2D(nz, (q.xy - vMin) / vSize);
        if (s.a > 0.0) { float dz = s.b - q.z; occ += step(0.003, dz) * (1.0 - smoothstep(R, 3.0 * R, dz)); }   // 那里的表面比这个点靠前（挡住了），太远的不算
      }
      gl_FragColor = vec4(vec3(occ / 12.0), 1.0);
    }` });
const oaoScene = quad(oaoMat);
function bakeObjAO() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, sz.x >> 1), h = Math.max(1, sz.y >> 1);
  if (!rtNZ || rtNZ.width !== w || rtNZ.height !== h) { [rtNZ, rtOaoA, rtOaoB].forEach(r => r && r.dispose());
    rtNZ = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    rtOaoA = new THREE.WebGLRenderTarget(w, h); rtOaoB = new THREE.WebGLRenderTarget(w, h); }
  wall.visible = false; gobo.visible = false; leaves.visible = false; scene.overrideMaterial = nzMat;
  renderer.setRenderTarget(rtNZ); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  scene.overrideMaterial = null; wall.visible = true; gobo.visible = true; leaves.visible = true; renderer.setClearColor(0x000000, 1);
  oaoMat.uniforms.nz.value = rtNZ.texture; oaoMat.uniforms.vMin.value.set(camera.left, camera.position.y + camera.bottom); oaoMat.uniforms.vSize.value.set(camera.right - camera.left, camera.top - camera.bottom);
  renderer.setRenderTarget(rtOaoA); renderer.render(oaoScene, cam2);
  blurMat.uniforms.t.value = rtOaoA.texture; blurMat.uniforms.dir.value.set(1 / w, 0); renderer.setRenderTarget(rtOaoB); renderer.render(blurScene, cam2);
  blurMat.uniforms.t.value = rtOaoB.texture; blurMat.uniforms.dir.value.set(0, 1 / h); renderer.setRenderTarget(rtOaoA); renderer.render(blurScene, cam2);
  LX.oao.value = rtOaoA.texture; LX.oaoAmt.value = L.aoObj;
}
/* 光柱（用户 2026-11-02，第 7 项，丁达尔效应）：空气里的浮尘被阳光照亮，窗和墙之间出现一道道光柱。
   每个像素沿视线从墙（z = 0）往前走到窗所在的那面墙为止（再往前是屋外，不算），等距取 24 个点，
   用阳光的阴影深度图查每个点在不在阳光里（百叶、窗框、物件挡住的点不算）；在阳光里的点占多少，就叠多少白色雾光（× haze）。
   纯白、叠加在最后，不改色调。画完物件之后再画，用的是那时的阴影图（含百叶和物件）。
   实测（2026-11-02）：正面看出不来一道道光柱，只是亮区蒙一层均匀的雾、反差被冲淡——要看出光柱，视线得顺着光片看过去，
   可窗转了 63°（为了让条纹落在物件上会弯折），每条视线穿过好几片光和影子，平均成了雾。用户要默认开启：0.12。 */
const hazeMat = new THREE.ShaderMaterial({
  uniforms: { sm: { value: null }, smat: { value: new THREE.Matrix4() }, vMin: { value: new THREE.Vector2() }, vSize: { value: new THREE.Vector2() }, amt: { value: 0 }, wallX: { value: 3 }, tanTurn: { value: 1 }, depth: { value: 1.6 }, obj: { value: null } },
  transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, vertexShader: VS,
  fragmentShader: `#include <packing>
    uniform sampler2D sm, obj; uniform mat4 smat; uniform vec2 vMin, vSize; uniform float amt, wallX, tanTurn, depth; varying vec2 v;
    void main(){
      vec2 xy = vMin + v * vSize;                                            // 这个像素在墙上的世界坐标
      float zEnd = tanTurn > 0.001 ? min(depth, (xy.x + wallX) / tanTurn) : depth;   // 只算墙前 depth 厚的一层空气，也不超过窗所在那面墙
      if (zEnd <= 0.0) discard;
      float rot = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      float lit = 0.0;
      for (int i = 0; i < 24; i++) {
        vec4 sc = smat * vec4(xy, (float(i) + rot) / 24.0 * zEnd, 1.0); sc.xyz /= sc.w;
        if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0) continue;
        lit += step(sc.z - 0.0005, unpackRGBAToDepth(texture2D(sm, sc.xy)));
      }
      gl_FragColor = vec4(vec3(lit / 24.0 * amt * (1.0 - texture2D(obj, v).r)), 1.0);   // 被物件挡住的像素不叠：视线先碰到物件，后面的空气看不见
    }` });
const hazeScene = quad(hazeMat);
/* 光柱和"条纹在物件上弯折"能共存（用户 2026-11-02："我觉得要求不矛盾"）：
   每片光（一条百叶缝漏下来的光，是一张斜着的薄片）上的点，离墙每往前 1 m，在画面上往下错开 shift（错开率）。
   · 条纹落在物件上：物件深 d，条纹错开 shift × d —— 要看得出弯折，shift 不能太小；
   · 光柱：视线穿过 D 厚的空气，这层里的光片在画面上被拖开 shift × D —— 不超过条纹间距的一半（pitch / 2），一道道光柱才分得开。
   所以光柱只算墙前 D = (pitch / 2) / shift 厚的一层空气（hazeD = 0 时自动算；以前算 1.6 m，糊成一层雾）。
   shift = |n.z / n.y|，n = 百叶片方向 × 阳光方向（光片的法线）。
   例：窗转 63°、太阳方位 18° → shift ≈ 0.79，D ≈ 9.5 cm（光柱只是贴着墙的一薄层）；窗转 28° → shift ≈ 0.3，D ≈ 25 cm。 */
function hazeAutoDepth() {
  const tr = L.turn * deg, s = new THREE.Vector3(Math.sin(tr), 0, Math.cos(tr));
  const d = new THREE.Vector3(Math.cos(L.el * deg) * Math.cos(L.az * deg), -Math.sin(L.el * deg), -Math.cos(L.el * deg) * Math.sin(L.az * deg));
  const n = s.clone().cross(d), shift = Math.abs(n.z / (Math.abs(n.y) > 1e-4 ? n.y : 1e-4));
  return Math.max(0.05, Math.min(1.6, (L.pitch / 2) / Math.max(shift, 1e-3)));
}
window.__hazeDepth = () => hazeAutoDepth();
function drawHaze() {
  if (L.haze <= 0 || !sun.shadow.map) return;
  hazeMat.uniforms.sm.value = sun.shadow.map.texture; hazeMat.uniforms.smat.value.copy(sun.shadow.matrix);
  hazeMat.uniforms.vMin.value.set(camera.left, camera.position.y + camera.bottom); hazeMat.uniforms.vSize.value.set(camera.right - camera.left, camera.top - camera.bottom);
  hazeMat.uniforms.amt.value = L.haze; hazeMat.uniforms.wallX.value = W; hazeMat.uniforms.tanTurn.value = Math.tan(L.turn * deg);
  hazeMat.uniforms.depth.value = L.hazeD > 0 ? L.hazeD : hazeAutoDepth(); hazeMat.uniforms.obj.value = rtObj ? rtObj.texture : null;
  renderer.autoClear = false; renderer.render(hazeScene, cam2); renderer.autoClear = true;
}
/* 反光（用户 2026-11-02，五大调子里的"反光"）：物件背光的一面会被旁边亮的墙照亮，暗面不是死黑，靠近亮墙的一侧更亮。
   高光溢出那张图（墙上的阳光大范围模糊）正好是"画面上每一处附近有多少亮墙"；物件的每个像素去这张图里查，补上这么多反光。
   光从墙那边来：朝墙的面（背面）全收，朝侧面的收一半，正对镜头的面不收（看的方向是 -z，所以权重 = 0.5 - 0.5 × 法线的 z）。 */
const REFL = { tex: { value: null }, res: { value: new THREE.Vector2(1, 1) }, amt: { value: 0 } };
/* 物件着色里另外加的几样（用户 2026-11-02，第二轮"还没做到的"1–4）：
   · 地面反光（floor）：阳光照在地板上（画面下面看不到）往上反，照物件朝下的面；强弱看这一列墙脚有没有阳光（高光溢出图最下面一行）。
   · 百叶片半透光（tau）：透过叶片的那一点光；用"只有窗框时墙上的阳光"那张图，和墙用同一个比例。
   · 物体自身的闭塞阴影（aoObj）：缝隙、凹处被周围的表面挡住，天光、反射光照不进去 → 只让间接光变暗，阳光不变（见 bakeObjAO）。 */
const LX = { open: { value: null }, tau: { value: 0 }, floor: { value: 0 }, oao: { value: null }, oaoAmt: { value: 0 } };
function addRefl(mat) {
  if (!mat || mat.userData.refl) return; mat.userData.refl = true;
  mat.onBeforeCompile = sh => {
    sh.uniforms.reflTex = REFL.tex; sh.uniforms.reflRes = REFL.res; sh.uniforms.reflAmt = REFL.amt;
    sh.uniforms.openTex = LX.open; sh.uniforms.tauAmt = LX.tau; sh.uniforms.floorAmt = LX.floor; sh.uniforms.oaoTex = LX.oao; sh.uniforms.oaoAmt = LX.oaoAmt;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D reflTex, openTex, oaoTex; uniform vec2 reflRes; uniform float reflAmt, tauAmt, floorAmt, oaoAmt;")
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
        vec2 suv = gl_FragCoord.xy / reflRes;
        reflectedLight.indirectDiffuse += diffuseColor.rgb * texture2D( reflTex, suv ).rgb * reflAmt * clamp( 0.5 - 0.5 * normal.z, 0.0, 1.0 );      // 反光：亮墙照朝墙、朝侧面的面
        reflectedLight.indirectDiffuse += diffuseColor.rgb * texture2D( reflTex, vec2( suv.x, 0.03 ) ).rgb * floorAmt * clamp( - normal.y, 0.0, 1.0 );   // 地面反光：照朝下的面
        reflectedLight.indirectDiffuse += diffuseColor.rgb * texture2D( openTex, suv ).rgb * tauAmt;                                             // 百叶片半透光
        float oao = 1.0 - oaoAmt * texture2D( oaoTex, suv ).r;                                                                                  // 自身闭塞：缝隙、凹处
        reflectedLight.indirectDiffuse *= oao; reflectedLight.indirectSpecular *= oao;`);
  };
  mat.customProgramCacheKey = () => "refl2"; mat.needsUpdate = true;
  if (mat.isMeshStandardMaterial && !mat.envMap) { mat.envMap = ENV; mat.envMapIntensity = L.env; }   // 环境映像（见 ENV）
}
function bakeGlow() {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, sz.x >> 2), h = Math.max(1, sz.y >> 2);
  rtGlowA = ensureRT(rtGlowA, w, h, { type: THREE.HalfFloatType }); rtGlowB = ensureRT(rtGlowB, w, h, { type: THREE.HalfFloatType });
  let src = rtSun.texture;
  for (const step of [2, 4]) {                                            // 两遍：先窄后宽，光晕边缘自然
    blurMat.uniforms.t.value = src; blurMat.uniforms.dir.value.set(step / w, 0); renderer.setRenderTarget(rtGlowA); renderer.render(blurScene, cam2);
    blurMat.uniforms.t.value = rtGlowA.texture; blurMat.uniforms.dir.value.set(0, step / h); renderer.setRenderTarget(rtGlowB); renderer.render(blurScene, cam2);
    src = rtGlowB.texture;
  }
  outMat.uniforms.glow.value = rtGlowB.texture; outMat.uniforms.glowAmt.value = L.glow; outMat.uniforms.floorAmt.value = L.floor;
  REFL.tex.value = rtGlowB.texture; REFL.res.value.copy(sz); REFL.amt.value = L.refl;
}
/* 浮尘（第 5 点）：亮区图缩到 1/8 读回来，浮尘只在亮的地方显示（亮条里看得见，暗条和没光的地方看不见）。 */
const maskMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, depthTest: false, depthWrite: false, toneMapped: false, vertexShader: VS,
  fragmentShader: "uniform sampler2D t; varying vec2 v; void main(){ vec3 c = texture2D(t, v).rgb; gl_FragColor = vec4(vec3(clamp(dot(c, vec3(.3, .6, .1)) * .25, 0., 1.)), 1.); }" });
const maskScene = quad(maskMat);
const DUST = { w: 0, h: 0, px: null, at: 0 };
function dustMask() {
  DUST.w = Math.max(1, Math.round(innerWidth / 8)); DUST.h = Math.max(1, Math.round(innerHeight / 8)); DUST.at = performance.now();
  rtMask = ensureRT(rtMask, DUST.w, DUST.h);
  maskMat.uniforms.t.value = rtSun.texture; renderer.setRenderTarget(rtMask); renderer.render(maskScene, cam2);
  if (!DUST.px || DUST.px.length !== DUST.w * DUST.h * 4) DUST.px = new Uint8Array(DUST.w * DUST.h * 4); renderer.readRenderTargetPixels(rtMask, 0, 0, DUST.w, DUST.h, DUST.px); renderer.setRenderTarget(null);
}
const visMat = new THREE.ShadowMaterial({ color: 0x000000, opacity: 1 });
function bakeWall(live = false) {                                         // 只有墙、窗和光：物件不在场（live 参数是原来光缓慢变化时用的，现在总是 false）
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const HF = { type: THREE.HalfFloatType };
  rtOpen = ensureRT(rtOpen, size.x, size.y, HF);                          // 只有窗框、没有百叶片时墙上的阳光（百叶片半透光用）
  rtPass = ensureRT(rtPass, size.x, size.y, { ...HF, samples: 4 });
  rtAcc = ensureRT(rtAcc, size.x, size.y, HF); rtSun = ensureRT(rtSun, size.x, size.y, HF); rtVis = ensureRT(rtVis, size.x, size.y, HF);
  outMat.uniforms.acc.value = rtAcc.texture; outMat.uniforms.sun.value = rtSun.texture; outMat.uniforms.vis.value = rtVis.texture; addMat.uniforms.t.value = rtPass.texture;
  objects.visible = false; const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  for (const [rt, sunOnly, open] of [[rtAcc, false, false], [rtSun, true, false], [rtOpen, true, true]]) {
    gobo.children.forEach(m => { if (m.userData.slat) m.visible = !open; });
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear();
    hemi.visible = !sunOnly; wallMat.lightMapIntensity = sunOnly ? 0 : L.bounce;
    for (let i = 0; i < NDIR; i++) {
      const a = i * 2.39996, r = NDIR > 1 ? L.ang * deg * Math.sqrt((i + 0.5) / NDIR) : 0;   // 只算一遍时就用太阳正中的方向
      sunAt(sunAz() + Math.cos(a) * r, sunEl() + Math.sin(a) * r); sun.shadow.needsUpdate = true;
      renderer.setRenderTarget(rtPass); renderer.render(scene, camera);
      addMat.uniforms.w.value = 1 / NDIR; renderer.autoClear = false; renderer.setRenderTarget(rt); renderer.render(addScene, cam2); renderer.autoClear = true;
    }
  }
  gobo.children.forEach(m => { m.visible = true; });
  hemi.visible = true; wallMat.lightMapIntensity = L.bounce; renderer.toneMapping = tm; objects.visible = true;
  outMat.uniforms.open.value = rtOpen.texture; outMat.uniforms.tau.value = L.tau; LX.tau.value = L.tau; LX.floor.value = L.floor;
  { // 物件用的透光图：缩到 1/4 再模糊一遍，去掉墙面拉毛的纹理（不然会被印到物件上，布板上一片颗粒），只留"哪里有光"
    const w = Math.max(1, size.x >> 2), h = Math.max(1, size.y >> 2);
    rtOpenA = ensureRT(rtOpenA, w, h, HF); rtOpenB = ensureRT(rtOpenB, w, h, HF);
    blurMat.uniforms.t.value = rtOpen.texture; blurMat.uniforms.dir.value.set(1 / w, 0); renderer.setRenderTarget(rtOpenA); renderer.render(blurScene, cam2);
    blurMat.uniforms.t.value = rtOpenA.texture; blurMat.uniforms.dir.value.set(0, 1 / h); renderer.setRenderTarget(rtOpenB); renderer.render(blurScene, cam2);
    LX.open.value = rtOpenB.texture;
  }
  sunAt(sunAz(), sunEl()); bakeGlow(); renderer.setRenderTarget(null); wallReady = true;
  if (!live || performance.now() - DUST.at > 500) dustMask();             // 浮尘用的亮区图要从显卡读回来，光在变化时半秒读一次就够
}

/* ── 每帧：① 物件投在墙上的影子（只有物件投影，窗不投）→ rtVis；② 墙 = 累积 − 阳光 ×（1 − 可见度）；③ 物件（窗影照在物件上） ── */
function render() {
  if (!wallReady) return;
  if (beforeRender) beforeRender();                                       // 页面先把自己的东西摆好（位置、转角）
  sunAt(sunAz(), sunEl()); sun.shadow.needsUpdate = true;
  // ①
  gobo.visible = false; leaves.visible = false; hemi.visible = false; scene.overrideMaterial = visMat;
  renderer.setRenderTarget(rtVis); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(scene, camera);
  scene.overrideMaterial = null; gobo.visible = true; leaves.visible = true; hemi.visible = true;
  bakeAO();                                                               // 闭塞阴影（物件动了就要重画）
  bakeObjAO();                                                            // 物体自身的闭塞阴影
  if (L.bleed > 0) bakeBleed(); else outMat.uniforms.bleedAmt.value = 0;  // 环境色
  // ②
  renderer.setRenderTarget(null); renderer.render(outScene, cam2);
  // ③
  wall.visible = false; renderer.autoClear = false; sun.shadow.needsUpdate = true; renderer.render(scene, camera); renderer.autoClear = true; wall.visible = true;
  drawHaze();                                                             // 光柱叠在最上面
}

function layout() {
  const w = innerWidth, h = innerHeight; PXM = w / VIEW_W;
  renderer.setSize(w, h, false);
  Object.assign(camera, { left: -VIEW_W / 2, right: VIEW_W / 2, top: h / 2 / PXM, bottom: -h / 2 / PXM }); camera.updateProjectionMatrix();
  if (onLayout) onLayout(); bakeWall(); render(); document.body.dataset.ready = "1";
}
let rz = 0; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(layout, 150); });

/* ── 阳光调节面板（用户 2026-11-02：给我一个阳光调整的 UI，自己调面积、角度、窗户位置）──
   地址后加 ?tune=1 才显示。拖滑块：数值马上变，松手后（或停 0.3 秒后）重算墙上的光（约 1 秒）。
   调过的值写回地址栏；"保存"存进这个浏览器（刷新、从别的页面回来都还在）；"复制参数"复制这些值；
   "恢复默认"回到 LIGHT_DEFAULT，并清掉保存的值。
   色温不放进面板（用户：不要改色调）。 */
function applyLight() {                                                   // 参数改了以后：重建窗、反射光贴图、灯光，重算墙
  usePCSS(); scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); visMat.needsUpdate = true;   // ang 变了：影子着色代码重新编译
  buildWindow(); buildGobo();
  const old = wallMat.lightMap; wallMat.lightMap = bounceTexture(); wallMat.needsUpdate = true; if (old) old.dispose();
  objects.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.envMap === ENV) m.envMapIntensity = L.env; }); });
  lightColors(); bakeWall(); render();
}

/* ── 浮尘（用户 2026-11-02："光中的浮尘，很漂亮的灰尘粒子"）──
   照着摄影里光束中浮尘的样子：
   · 只在光里看得见：每粒灰尘有离墙的深度 z，按它所在那片光的真实位置判断亮不亮（和光柱同一套：光片离墙每往前 1 m，
     在画面上错开 shift，所以 z 深的灰尘去墙上错开后的位置查亮区图）；飘出光片就消失，飘进去又亮。窗外（窗所在那面墙以外）不算。
   · 大小差别大：远处 110 粒很小的亮点、中间 30 粒清楚的亮点、近处 10 粒失焦的大光斑（半透明、边缘略亮）。
   · 会闪：翻滚时迎着光的那一下突然一亮（glint）。
   · 动得慢：没有方向的布朗漂移 + 一点往上的热气流 + 轻微打旋；近的看起来动得快（视差）。
   · 叠加方式是"变亮"：落在暗条前面清楚，落在亮墙前面不明显——和真实一样。
   数量和亮度 × dust（0 关）。系统要求减少动态效果时不画；页面切到后台时停。约 30 帧/秒。 */
if (dustCanvas) {
  const cv = dustCanvas, g = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mk = (kind, n, r0, r1, z0, z1) => Array.from({ length: n }, () => ({ kind, x: rnd(), y: rnd(), z: z0 + rnd() * (z1 - z0), r: r0 + rnd() * (r1 - r0),
    vx: 0, vy: 0, ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.2, gp: rnd() * 6.28, gs: 0.3 + rnd() * 0.9, b: 0.5 + rnd() * 0.5 }));
  // 第一版太小太淡（半径不到 1 px），黑底上都几乎看不见（实测）：放大、加光晕、加数量
  const motes = [...mk("far", 160, 0.6, 1.2, 0.0, 0.25), ...mk("mid", 40, 1.2, 2.2, 0.05, 0.4), ...mk("near", 12, 8, 18, 0.6, 1.4)];
  let last = 0, kz = 0, kAt = -1e9;
  const slabK = () => {                                                   // 光片离墙每往前 1 m，在墙上对应的点往上挪多少（m）
    const tr = L.turn * deg, s3 = new THREE.Vector3(Math.sin(tr), 0, Math.cos(tr));
    const d = new THREE.Vector3(Math.cos(sunEl()) * Math.cos(sunAz()), -Math.sin(sunEl()), -Math.cos(sunEl()) * Math.sin(sunAz()));
    const n = s3.cross(d); return Math.abs(n.y) > 1e-4 ? n.z / n.y : 0;
  };
  const litAt = (x, y, z) => {                                            // x、y：屏幕像素；z：离墙多远（m）
    if (!DUST.px) return 0;
    const wx = (x - innerWidth / 2) / PXM; if (Math.tan(L.turn * deg) > 1e-3 && z > (wx + W) / Math.tan(L.turn * deg)) return 0;   // 窗外
    const yw = y + kz * z * PXM;                                          // 去墙上对应的那一点查（屏幕 y 向下）
    const i = Math.floor(x / 8), j = DUST.h - 1 - Math.floor(yw / 8);
    if (i < 0 || j < 0 || i >= DUST.w || j >= DUST.h) return 0;
    return DUST.px[(j * DUST.w + i) * 4] / 255;
  };
  const glow = (() => {                                                   // 远处、中间的灰尘：一个亮核 + 一圈柔和的光晕（画成 6 倍半径）
    const c = document.createElement("canvas"); c.width = c.height = 64; const q = c.getContext("2d"), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.16, "rgba(255,255,255,.9)"); gr.addColorStop(0.3, "rgba(255,255,255,.25)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return c;
  })();
  const sprite = (() => {                                                 // 近处大光斑的样子：半透明、边缘略亮
    const c = document.createElement("canvas"); c.width = c.height = 64; const q = c.getContext("2d"), gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(0.75, "rgba(255,255,255,.6)"); gr.addColorStop(0.88, "rgba(255,255,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return c;
  })();
  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden || t - last < 33) return;
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    if (still || !(L.dust > 0)) return;
    if (t - kAt > 500) { kz = slabK(); kAt = t; }
    g.globalCompositeOperation = "lighter";
    const ts = t / 1000, count = Math.min(1, L.dust);
    motes.forEach((m, k) => {
      if (k / motes.length > count) return;                               // dust < 1：少画一些
      const par = 1 + m.z * 1.5;                                          // 视差：近的动得快
      m.vx += (rnd() - 0.5) * 0.010 * dt; m.vy += (rnd() - 0.5) * 0.010 * dt - 0.0012 * dt;   // 布朗漂移 + 往上的热气流
      m.vx *= 0.985; m.vy *= 0.985;
      m.x += (m.vx + 0.0015 * Math.sin(ts * 0.21 + m.ph)) * dt * par; m.y += (m.vy + 0.0012 * Math.cos(ts * 0.17 + m.ph)) * dt * par;   // 轻微打旋
      if (m.y < -0.05) { m.y = 1.05; m.x = rnd(); } if (m.y > 1.05) m.y = -0.05; if (m.x > 1.05) m.x = -0.05; if (m.x < -0.05) m.x = 1.05;
      const x = m.x * w, y = m.y * h, lit = Math.min(1, litAt(x, y, m.z) * 3); if (lit < 0.15) return;   // 在光里就足够亮
      const tw = 0.6 + 0.4 * Math.sin(ts * m.sp + m.ph), glint = Math.pow(Math.max(0, Math.sin(ts * m.gs + m.gp)), 40) * 1.6;   // 闪：偶尔突然一亮
      const a = Math.min(1, lit * m.b * (tw + glint) * Math.max(0.6, L.dust));
      if (m.kind === "near") { g.globalAlpha = a * 0.22; g.drawImage(sprite, x - m.r, y - m.r, m.r * 2, m.r * 2); }
      else { const R = m.r * 3; g.globalAlpha = a * (m.kind === "mid" ? 0.95 : 0.8); g.drawImage(glow, x - R, y - R, R * 2, R * 2); }
    });
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  }
  requestAnimationFrame(frame);
}

/* 光的缓慢变化（太阳漂移、百叶摆动、树叶晃，原来的 live 参数）2026-11-03 取消（用户："光照有呼吸微微放大缩小这个取消，所有光照都是"）：
   百叶片来回摆，条纹跟着一宽一窄，像在呼吸。现在光是静止的；浏览器里存过的 live 值不再起作用。 */
/* ── 胶片感（用户 2026-11-02，参考胶片那张：细颗粒、四角稍暗）──
   四角压暗：一层径向渐变；颗粒：4 张预先生成的 256×256 噪点图，每 80 ms 换一张、随机挪一点位置。
   强度 film（0 关）。系统要求减少动态效果时颗粒不动。 */
if (filmEl) {
  const el = filmEl, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tiles = Array.from({ length: 4 }, (_, k) => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const q = c.getContext("2d"), im = q.createImageData(256, 256);
    let sd = 101 + k * 977; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (rnd() + rnd() + rnd() - 1.5) * 120; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    q.putImageData(im, 0, 0); return `url(${c.toDataURL()})`;
  });
  let k = 0, lastG = 0;
  function grain(t) {
    requestAnimationFrame(grain);
    el.style.setProperty("--vig", Math.min(1, L.film * 1.4)); el.style.setProperty("--gr", L.film * 0.22);
    if (!(L.film > 0) || t - lastG < 80 || (still && lastG)) return; lastG = t;
    k = (k + 1) % tiles.length; el.style.setProperty("--grain", tiles[k]);
    el.style.setProperty("--gx", Math.round(Math.random() * 100) + "px"); el.style.setProperty("--gy", Math.round(Math.random() * 100) + "px");
  }
  requestAnimationFrame(grain);
}

  return {
    THREE, L, LIGHT_DEFAULT, scene, camera, renderer, objects, sun, hemi, wall, gobo,
    addRefl, render, layout, applyLight, bakeWall, ENV, VIEW_W, YC, W, deg,
    get PXM() { return PXM; }, get ready() { return wallReady; },
  };
}
