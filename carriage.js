/* 雪国列车 · the carriage (index.html, visual-lab): you are sitting in a compartment of the snow-country train. The boards hang on
   its panelled wall; to their right a window onto the snowy forest going by, velvet curtains tied back, a brass sconce, the luggage
   rack overhead with a suitcase on it, and a little fold-down table under the window with an oil lamp, a mantel clock, books and a
   magnifying glass. The things are Poly Haven photo-scanned models (CC0); they can be picked up with the eye — the view leans a
   little with the mouse — and clicked: each one opens a part of the desk. The carriage sways as it runs.
   three.js (MIT) from jsDelivr. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const A = "assets/3d/";
const night = () => document.documentElement.dataset.theme !== "day";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── the canvas, behind the boards ───────── */
document.head.insertAdjacentHTML("beforeend", `<style>
  body.car3d #room, body.car3d .cast, body.car3d #side { display: none !important; }
  #car3d { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; display: block; }
  #car3dVig { position: fixed; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(120% 100% at 62% 42%, transparent 55%, rgba(8, 6, 4, .55) 100%); }
  #car3dTip { position: fixed; z-index: 50000; pointer-events: none; padding: 5px 10px; border-radius: 4px; font: 12.5px var(--sans, sans-serif); letter-spacing: .08em;
    color: #f3e7cf; background: rgba(20, 14, 9, .82); box-shadow: 0 0 0 1px rgba(214, 178, 110, .35); opacity: 0; transform: translate(-50%, -140%); transition: opacity .15s; white-space: nowrap; }
  #car3dTip.on { opacity: 1; }
</style>`);
document.body.classList.add("car3d");
const canvas = document.createElement("canvas"); canvas.id = "car3d"; document.body.prepend(canvas);
const vig = document.createElement("i"); vig.id = "car3dVig"; canvas.after(vig);
const tip = document.createElement("div"); tip.id = "car3dTip"; document.body.appendChild(tip);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // soft reflections for brass and glass
scene.environmentIntensity = .35;
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 120);
const EYE = new THREE.Vector3(0, 1.35, 3.0), LOOK = new THREE.Vector3(0, 1.35, 0);

/* ───────── materials ───────── */
const tl = new THREE.TextureLoader();
function tex(name, kind, rep, srgb) {
  const t = tl.load(`${A}tex/${name}/${kind}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const wood = (name, rep, extra = {}) => new THREE.MeshStandardMaterial({ map: tex(name, "diff", rep, true), normalMap: tex(name, "nor", rep), roughnessMap: tex(name, "rough", rep), fog: false, ...extra });
const M = {
  panel: wood("dark_paneled_wood", [1 / 1.6, 1 / 1.6], { color: 0xb08a6a }),
  walnut: wood("american_walnut_veneer", [1.5, 1.5], { color: 0x8a6448 }),
  cherry: wood("lacquered_cherry_wood", [2, 2], { color: 0x9a6a4a, roughness: .5 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 1, roughness: .32, fog: false }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, metalness: .6, roughness: .55, fog: false }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xe9dfc9, roughness: .9, fog: false }),
  velvet: new THREE.MeshPhysicalMaterial({ color: 0x3e0f16, roughness: .9, sheen: .6, sheenColor: new THREE.Color(0x7a2a36), sheenRoughness: .6, side: THREE.DoubleSide, fog: false }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb4c8, roughness: .08, metalness: 0, transparent: true, opacity: .12, fog: false, depthWrite: false }),
};

/* ───────── the carriage's side wall, with the window cut in it ───────── */
const room = new THREE.Group(); scene.add(room);
let win = { x: 1.3, y0: 1.0, y1: 1.85, w: .7 };   // set from the viewport in layout()
const outside = new THREE.Group(); scene.add(outside);
const props = new THREE.Group(); scene.add(props);
function rrect(s, x, y, w, h, r) { s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); }
function buildRoom() {
  room.clear();
  const L = -8, R = 8, H = 2.42, wx = win.x - win.w / 2, wh = win.y1 - win.y0;
  // the wall itself
  const s = new THREE.Shape(); s.moveTo(L, -.5); s.lineTo(R, -.5); s.lineTo(R, H); s.lineTo(L, H); s.lineTo(L, -.5);
  const hole = new THREE.Path(); rrect(hole, wx, win.y0, win.w, wh, .09); s.holes.push(hole);
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .06, bevelEnabled: false }), M.panel);
  wall.position.z = -.06; wall.receiveShadow = true; room.add(wall);
  // the wainscot below the chair rail: walnut, then a brass rail
  const ws = new THREE.Shape(); ws.moveTo(L, -.5); ws.lineTo(R, -.5); ws.lineTo(R, .86); ws.lineTo(L, .86); ws.lineTo(L, -.5);
  const wain = new THREE.Mesh(new THREE.ExtrudeGeometry(ws, { depth: .015, bevelEnabled: false }), M.walnut); wain.receiveShadow = true; room.add(wain);
  for (let x = L; x < R; x += .62) { const g = new THREE.Mesh(new THREE.BoxGeometry(.012, .62, .006), M.iron); g.position.set(x, .45, .018); room.add(g); }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, R - L, 12), M.brass); rail.rotation.z = Math.PI / 2; rail.position.set(0, .875, .03); room.add(rail);
  // the window frame (walnut, rounded), its sill and the glass
  const fs = new THREE.Shape(); rrect(fs, wx - .07, win.y0 - .07, win.w + .14, wh + .14, .14);
  const fh = new THREE.Path(); rrect(fh, wx, win.y0, win.w, wh, .09); fs.holes.push(fh);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: .05, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 3 }), M.cherry);
  frame.castShadow = frame.receiveShadow = true; room.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(win.w, wh), M.glass); glass.position.set(win.x, (win.y0 + win.y1) / 2, -.03); room.add(glass);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(win.w, .025, .03), M.cherry); bar.position.set(win.x, win.y0 + wh * .62, -.02); room.add(bar);
  // the ceiling: a cream curve over the top, a brass luggage rack along under it
  const ceil = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, R - L, 32, 1, true, Math.PI * .5, Math.PI * .32), M.ceiling);
  ceil.rotation.z = Math.PI / 2; ceil.position.set(0, H - 1.38, 1.4); room.add(ceil);
  const rackY = 2.12;
  for (const z of [.08, .22, .36]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, R - L, 10), M.brass); r.rotation.z = Math.PI / 2; r.position.set(0, rackY, z); room.add(r); }
  for (let x = L + .4; x < R; x += 1.1) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(.012, .012, .42), M.brass); br.position.set(x, rackY, .2); room.add(br);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .2, 8), M.brass); up.position.set(x, rackY + .1, .01); room.add(up);
  }
  // velvet curtains, tied back, on a brass rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, win.w + .7, 12), M.brass); rod.rotation.z = Math.PI / 2; rod.position.set(win.x, win.y1 + .14, .09); room.add(rod);
  for (const side of [-1, 1]) room.add(curtain(side));
  // the fold-down table under the window, on two brass brackets
  const top = new THREE.Mesh(new THREE.BoxGeometry(win.w + .2, .035, .42), M.cherry); top.position.set(win.x, .78, .21); top.castShadow = top.receiveShadow = true; room.add(top);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.02, .22, .02), M.brass); b.position.set(win.x + sx * (win.w / 2 - .04), .67, .12); b.rotation.x = .75; room.add(b); }
}
function curtain(side) {
  const w = .34, h = win.y1 - win.y0 + .62, g = new THREE.PlaneGeometry(w, h, 36, 40), p = g.attributes.position, tieY = .38;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), u = (x / w + .5), v = (y / h + .5);       // v: 0 bottom … 1 top
    const gather = 1 - .62 * Math.exp(-Math.pow((v - tieY) / .16, 2));                 // pinched at the tie-back
    const inner = side < 0 ? u : 1 - u;                                                // the inner edge swings toward the wall's edge
    const nx = (x * gather) - side * (1 - gather) * w * .25 * inner;
    p.setXYZ(i, nx, y, Math.sin(u * Math.PI * 9) * .022 * (.6 + .4 * gather) + .04 * (1 - gather));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.velvet); m.castShadow = true; m.receiveShadow = true;
  m.position.set(win.x + side * (win.w / 2 + .1), win.y1 + .14 - h / 2, .1);
  const grp = new THREE.Group(); grp.add(m); return grp;
}

/* ───────── outside: the snowy forest going by ───────── */
const SPEED = 9;   // m/s past the window
let trees = null, caps = null, treeData = [], snow = null;
function buildOutside() {
  outside.clear();
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 80), new THREE.ShaderMaterial({ uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } }, depthWrite: false,
    vertexShader: "varying float vy; void main(){ vy = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform vec3 top; uniform vec3 bot; varying float vy; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(.35,.9,vy)), 1.); }" }));
  sky.position.set(win.x, 6, -60); outside.add(sky); outside.userData.sky = sky;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 80), new THREE.MeshStandardMaterial({ color: 0xdfe7f0, roughness: .95 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(win.x, -1.1, -40); outside.add(ground);
  // pines: a trunk and three tiers of needles, the tops dusted with snow
  const N = 260, cone = new THREE.ConeGeometry(1, 1, 9, 1), tier = [];
  const needles = new THREE.MeshStandardMaterial({ color: 0x1d3330, roughness: .9, flatShading: true }), snowM = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: .8, flatShading: true });
  trees = new THREE.InstancedMesh(cone, needles, N * 3); caps = new THREE.InstancedMesh(cone, snowM, N * 3);
  treeData = [];
  for (let i = 0; i < N; i++) { const h = 3 + Math.random() * 7, w = h * (.26 + Math.random() * .08), z = -2.5 - w - Math.pow(Math.random(), 1.6) * 36; treeData.push({ x: (Math.random() - .5) * 60, z, h, w }); }
  outside.add(trees, caps);
  // the snow outside, blown back by the train
  const SN = 2600, pos = new Float32Array(SN * 3), seed = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { pos[i * 3] = (Math.random() - .5) * 16; pos[i * 3 + 1] = Math.random() * 7 - 1; pos[i * 3 + 2] = -.4 - Math.random() * 14; seed[i] = Math.random(); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sg.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  snow = new THREE.Points(sg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, cx: { value: win.x }, bright: { value: 1 } },
    vertexShader: `uniform float t; uniform float cx; attribute float seed; varying float a;
      void main(){ vec3 p = position; float sp = ${SPEED.toFixed(1)} * (.6 + .4 * seed);
        p.x = cx + mod(p.x - t * sp + 8., 16.) - 8.; p.y = mod(p.y - t * (.8 + seed * .9) + 1., 7.) - 1. + sin(t * 1.3 + seed * 40.) * .15;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (14. + 26. * seed) / -mv.z; a = smoothstep(16., 2., -mv.z); }`,
    fragmentShader: `uniform float bright; varying float a; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.92,.95,1.) * bright, (1. - d * 2.) * .85 * a); }` }));
  snow.frustumCulled = false; outside.add(snow);
}
function placeTrees(t) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  treeData.forEach((d, i) => {
    let x = d.x - t * SPEED * 1.0; x = ((x % 60) + 90) % 60 - 30 + win.x;
    for (let k = 0; k < 3; k++) {
      const hh = d.h * (.5 - k * .1), ww = d.w * (1 - k * .26), y = -1.1 + d.h * (.22 + k * .24) + hh / 2;
      m.compose(p.set(x, y, d.z), q, s.set(ww, hh, ww)); trees.setMatrixAt(i * 3 + k, m);
      m.compose(p.set(x, y + hh * .18, d.z), q, s.set(ww * .62, hh * .66, ww * .62)); caps.setMatrixAt(i * 3 + k, m);
    }
  });
  trees.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true;
}

/* ───────── lights ───────── */
const hemi = new THREE.HemisphereLight(0xffe6c4, 0x2a1c12, .25); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9db6dd, .5); moon.position.set(-6, 10, -14); scene.add(moon);
const ceilLight = new THREE.RectAreaLight(0xffd9a0, 1.6, 5, .5); ceilLight.position.set(-.6, 2.3, 1.4); ceilLight.lookAt(-.6, 0, .4); scene.add(ceilLight);
const winLight = new THREE.RectAreaLight(0x8fb0e0, 2, 1, 1); scene.add(winLight);
const sconce = new THREE.PointLight(0xffb867, 3.2, 3.2, 1.6); scene.add(sconce);
const flame = new THREE.PointLight(0xffa850, 1.8, 2.2, 1.4); flame.castShadow = true; flame.shadow.mapSize.set(512, 512); flame.shadow.bias = -.002; flame.shadow.radius = 6; scene.add(flame);

/* ───────── the things on the table, and the suitcase on the rack ───────── */
const loader = new GLTFLoader(), things = [];
const ACTIONS = {
  lamp: { tip: "油灯 · 点灯 / 熄灯（日夜）", go: () => window.Theme && Theme.toggle() },
  clock: { tip: "座钟 · 上车，开始专注", go: () => (location.href = "focus.html") },
  books: { tip: "精装书 · 手账书架", go: () => (location.href = "journal.html") },
  glass: { tip: "放大镜 · 快捷键与说明", go: () => document.getElementById("help")?.classList.toggle("show") },
  suitcase: { tip: "旅行箱 · 卡册", go: () => (location.href = document.getElementById("albumBtn")?.getAttribute("href") || "album.html") },
  lantern: { tip: "壁灯 · 炉火与风雪声", go: () => window.Sound && (Sound.on || Sound.setOn(true), Sound.setAmb(!Sound.amb)) },
};
async function thing(key, file, place, keep) {
  const g = (await loader.loadAsync(`${A}models/${file}/${file}.gltf`)).scene;
  if (keep) g.traverse(o => { if (o.isMesh && !keep(o)) o.visible = false; });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material = o.material.clone(); o.material.fog = false; } } });
  const holder = new THREE.Group(); holder.add(g); holder.userData = { key, base: new THREE.Vector3(), lift: 0 }; place(holder, g);
  holder.userData.base.copy(holder.position); props.add(holder); things.push(holder); return holder;
}
let lampFlame = null;
async function loadThings() {
  const tableY = .7975;
  await Promise.all([
    thing("lamp", "vintage_oil_lamp", h => { h.scale.setScalar(.62); h.position.set(win.x - win.w / 2 + .12, tableY, .18); }).then(h => h.traverse(o => { if (o.isMesh && /flame/.test(o.name)) { lampFlame = o; o.material.emissive = new THREE.Color(0xffa040); o.material.emissiveIntensity = 3; } })),
    thing("clock", "mantel_clock_01", h => { h.position.set(win.x + .05, tableY, .12); h.rotation.y = -.12; }),
    thing("books", "book_encyclopedia_set_01", h => { h.position.set(win.x + win.w / 2 - .22, tableY, .26); h.rotation.y = .35; h.scale.setScalar(.82); },
      o => { const n = parseInt((o.name.match(/Cube0(\d+)/) || [])[1] || "0", 10); return n === 4 || (n >= 49 && n <= 53); }),
    thing("glass", "magnifying_glass_01", h => { h.position.set(win.x - .1, tableY + .007, .33); h.rotation.set(-Math.PI / 2, 0, .5); }),
    thing("suitcase", "vintage_suitcase", h => { h.scale.setScalar(.62); h.rotation.set(-Math.PI / 2, 0, .05); h.position.set(win.x + .25, 2.13, .3); }, o => /suitcase_01/.test(o.name)),
    thing("lantern", "Lantern_01", h => { h.position.set(win.x - win.w / 2 - .28, 1.42, .1); h.scale.setScalar(1.15); }),
  ]);
  layoutLights();
}

/* ───────── fit the window to the strip right of the boards ───────── */
function layout() {
  const W = innerWidth, H = innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); composer.setSize(W, H);
  const halfW = EYE.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const side = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sidew")) || 300;
  const fx = 1 - side / 2 / W;                               // the strip's middle
  win.x = (fx * 2 - 1) * halfW; win.w = Math.max(.42, side / W * 2 * halfW * .8);
  buildRoom(); buildOutside();
  if (things.length) relayoutThings();
}
function relayoutThings() { /* the things follow the window when the viewport changes */
  const dx = win.x - (layout.lastX ?? win.x); layout.lastX = win.x;
  things.forEach(h => { h.position.x += dx; h.userData.base.x += dx; });
  layoutLights();
}
function layoutLights() {
  winLight.position.set(win.x, (win.y0 + win.y1) / 2, -.02); winLight.width = win.w; winLight.height = win.y1 - win.y0; winLight.lookAt(win.x, (win.y0 + win.y1) / 2, 3);
  const ln = things.find(h => h.userData.key === "lantern"); if (ln) sconce.position.set(ln.position.x, ln.position.y + .15, .25);
  const lp = things.find(h => h.userData.key === "lamp"); if (lp) flame.position.set(lp.position.x, lp.position.y + .38, lp.position.z + .02);
  layout.lastX = win.x;
}

/* ───────── day and night ───────── */
function applyTheme() {
  const n = night(), sky = outside.userData.sky;
  if (sky) { sky.material.uniforms.top.value.set(n ? 0x050a14 : 0x9fb0c2); sky.material.uniforms.bot.value.set(n ? 0x1a2a40 : 0xe4eaef); }
  scene.background = new THREE.Color(n ? 0x070b12 : 0xc9d3dc);
  scene.fog = new THREE.FogExp2(n ? 0x0b1424 : 0xd5dde5, n ? .055 : .045);
  hemi.intensity = n ? .22 : .9; moon.intensity = n ? .45 : 1.6; moon.color.set(n ? 0x9db6dd : 0xf2f5f8);
  ceilLight.intensity = n ? 1.6 : .4; winLight.intensity = n ? 1.2 : 7; winLight.color.set(n ? 0x7f9fd0 : 0xe8f0f8);
  sconce.intensity = n ? 3.2 : .3; flame.intensity = n ? 1.8 : 0; if (lampFlame) lampFlame.visible = n;
  renderer.toneMappingExposure = n ? 1.0 : 1.15; if (snow) snow.material.uniforms.bright.value = n ? .75 : 1;
  bloom.strength = n ? .45 : .15;
}
addEventListener("deskTheme", applyTheme);

/* ───────── post: a little bloom on the flames and windows ───────── */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .45, .6, .82); composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ───────── hover, click, and the view leaning with the mouse ───────── */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(9, 9), lean = { x: 0, y: 0, tx: 0, ty: 0 };
let hot = null;
addEventListener("pointermove", e => {
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  lean.tx = mouse.x; lean.ty = mouse.y;
  tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px";
});
function pick() {
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(things, true)[0];
  let h = hit && hit.object; while (h && !things.includes(h)) h = h.parent;
  // only when nothing of the page is over that spot
  if (h && document.elementFromPoint((mouse.x + 1) / 2 * innerWidth, (1 - mouse.y) / 2 * innerHeight) !== canvas) h = null;
  if (h !== hot) {
    hot = h; canvas.style.cursor = h ? "pointer" : "";
    tip.textContent = h ? ACTIONS[h.userData.key].tip : ""; tip.classList.toggle("on", !!h);
  }
}
canvas.addEventListener("click", () => { if (hot) { window.Sound && Sound.play("pickUp", { vol: .5 }); ACTIONS[hot.userData.key].go(); } });

/* ───────── the loop: the forest goes by, the carriage sways ───────── */
let t0 = performance.now(), jolt = 0, nextJolt = 4;
function frame(now) {
  const t = (now - t0) / 1000;
  placeTrees(t); if (snow) snow.material.uniforms.t.value = t;
  // sway: a slow rock, a quicker shiver, now and then a jolt over a rail joint
  if (t > nextJolt) { jolt = 1; nextJolt = t + 5 + Math.random() * 7; }
  jolt *= .93;
  const sway = reduce ? 0 : 1, sy = (Math.sin(t * 1.9) * .003 + Math.sin(t * .63) * .004 + jolt * Math.sin(t * 38) * .006) * sway, roll = (Math.sin(t * 1.1) * .0012 + jolt * .002 * Math.sin(t * 31)) * sway;
  lean.x += (lean.tx - lean.x) * .05; lean.y += (lean.ty - lean.y) * .05;
  camera.position.set(EYE.x + lean.x * .07, EYE.y + lean.y * .04 + sy, EYE.z);
  camera.lookAt(LOOK); camera.rotation.z += roll;
  // the hovered thing rises a little
  things.forEach(h => { const u = h.userData; u.lift += ((h === hot ? 1 : 0) - u.lift) * .15; h.position.y = u.base.y + u.lift * .015; });
  if (lampFlame && night()) { const f = .85 + Math.sin(t * 13) * .06 + Math.sin(t * 7.3) * .05; flame.intensity = 1.8 * f; lampFlame.scale.y = f; }
  pick();
  composer.render();
  requestAnimationFrame(frame);
}

layout(); applyTheme();
addEventListener("resize", () => { layout(); applyTheme(); });
loadThings().then(() => { applyTheme(); }).catch(e => console.error("carriage things", e));
// ?still: no loop — render on demand (for checking frames without a GPU)
if (window.__CAR_STILL || /still/.test(location.search)) { window.__car = { frame: t => { t0 = performance.now() - t * 1000; const keep = requestAnimationFrame; window.requestAnimationFrame = () => 0; frame(performance.now()); window.requestAnimationFrame = keep; }, ready: () => things.length >= 6 }; }
else requestAnimationFrame(frame);
