/* 雪国列车 · the carriage (index.html): you sit in a compartment of the snow-country train. The boards hang on its mahogany wall;
   to their right a window onto the snowy forest going by, curtains tied back with cord, a brass sconce with a frosted globe,
   the luggage rack and a carved cornice overhead, a polished fold-down table under the window. Only a scene — nothing to click;
   the carriage sways as it runs and the view leans a touch with the mouse.
   three.js (MIT) from jsDelivr; wood textures from Poly Haven (CC0). */
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
  /* one light over everything — the boards are lit by the same lamp as the carriage, not lit from nowhere */
  #car3dLit, #car3dLit2 { position: fixed; inset: 0; z-index: 6; pointer-events: none; transition: opacity .8s; }
  html:not([data-theme="day"]) #car3dLit { mix-blend-mode: multiply;
    background: radial-gradient(56% 90% at calc((100% - var(--sidew, 300px)) / 2) 4%, rgba(255, 246, 228, .95), rgba(255, 246, 228, 0) 100%),
                radial-gradient(70% 85% at var(--lx, 88%) var(--ly, 74%), #fff3e0 0%, #f2d9b0 32%, #cfb393 64%, #ad9884 100%); }
  html:not([data-theme="day"]) #car3dLit2 { mix-blend-mode: screen;
    background: radial-gradient(28% 34% at var(--lx, 88%) var(--ly, 74%), rgba(255, 170, 90, .12), transparent 70%),
                radial-gradient(34% 30% at calc((100% - var(--sidew, 300px)) / 2) 0%, rgba(255, 196, 120, .16), transparent 80%),
                linear-gradient(0deg, rgba(255, 140, 60, .06), transparent 30%); }
  html[data-theme="day"] #car3dLit { mix-blend-mode: soft-light;
    background: radial-gradient(90% 100% at 92% 45%, #f4f9ff 0%, #c9dbee 60%, #a9bfd8 100%); }
  html[data-theme="day"] #car3dLit2 { mix-blend-mode: screen;
    background: radial-gradient(60% 80% at 95% 45%, rgba(225, 238, 252, .30), rgba(205, 222, 240, .10) 70%); }
  html[data-theme="day"] #car3dVig { background: radial-gradient(130% 110% at 70% 45%, transparent 60%, rgba(120, 145, 175, .25) 100%); }
</style>`);
document.body.classList.add("car3d");
const canvas = document.createElement("canvas"); canvas.id = "car3d"; document.body.prepend(canvas);
const vig = document.createElement("i"); vig.id = "car3dVig"; canvas.after(vig);
const lit = document.createElement("i"); lit.id = "car3dLit"; document.body.appendChild(lit);
const lit2 = document.createElement("i"); lit2.id = "car3dLit2"; document.body.appendChild(lit2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(window.__CAR_LOW ? .75 : Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = !window.__CAR_LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
// mahogany tongue-and-groove: narrow vertical boards, each a little different, fine grain, a dark groove and a lit edge between them
function plankTexture() {
  const W = 1024, H = 1024, N = 8, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  let sd = 7; const r = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < N; i++) {
    const x0 = i * W / N, bw = W / N, k = .85 + r() * .3;
    g.fillStyle = `rgb(${78 * k | 0},${38 * k | 0},${26 * k | 0})`; g.fillRect(x0, 0, bw, H);
    for (let j = 0; j < 70; j++) {                       // grain: long wavy streaks
      const gx = x0 + r() * bw, a = .04 + r() * .09, dark = r() < .6;
      g.strokeStyle = dark ? `rgba(30,10,4,${a})` : `rgba(160,80,50,${a * .8})`; g.lineWidth = .6 + r() * 1.8; g.beginPath(); g.moveTo(gx, 0);
      for (let y = 0; y <= H; y += 32) g.lineTo(gx + Math.sin(y * .006 + j) * (2 + r() * 2), y); g.stroke();
    }
    const sh = g.createLinearGradient(x0, 0, x0 + bw, 0); sh.addColorStop(0, "rgba(255,200,160,.06)"); sh.addColorStop(.5, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.18)");
    g.fillStyle = sh; g.fillRect(x0, 0, bw, H);
    g.fillStyle = "rgba(12,4,2,.9)"; g.fillRect(x0, 0, 3, H); g.fillStyle = "rgba(220,150,110,.25)"; g.fillRect(x0 + 3, 0, 1.5, H);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / .56, 1 / .56); t.anisotropy = 8; return t;
}
// the carved cornice: scrolls and leaves in old gilt on dark wood
function corniceTexture() {
  const W = 512, H = 128, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "#2a120a"; g.fillRect(0, 0, W, H);
  const gold = (a) => `rgba(150,112,64,${a * .6})`;
  g.fillStyle = gold(.55); g.fillRect(0, 8, W, 4); g.fillRect(0, H - 12, W, 4);
  g.lineCap = "round";
  for (const [x, f] of [[128, 1], [384, -1]]) {
    for (const [lw, col, dy] of [[9, "rgba(0,0,0,.55)", 3], [7, gold(.85), 0], [2, "rgba(255,226,170,.5)", -2]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
      g.moveTo(x - 120, 64 + dy); g.bezierCurveTo(x - 80, 18 + dy, x - 20, 30 + dy, x - 30 * f, 64 + dy);
      g.arc(x - 12 * f, 64 + dy, 18, Math.PI, Math.PI * (f > 0 ? 2.6 : -.6), f < 0);
      g.moveTo(x + 120, 64 + dy); g.bezierCurveTo(x + 80, 110 + dy, x + 20, 98 + dy, x + 30 * f, 64 + dy);
      g.stroke();
    }
    g.fillStyle = gold(.8); g.beginPath(); g.ellipse(x, 64, 10, 14, 0, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const wood = (name, rep, extra = {}) => new THREE.MeshStandardMaterial({ map: tex(name, "diff", rep, true), normalMap: tex(name, "nor", rep), roughnessMap: tex(name, "rough", rep), fog: false, ...extra });
const M = {
  panel: new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: .36, envMapIntensity: .6, fog: false }),
  cornice: new THREE.MeshStandardMaterial({ map: corniceTexture(), roughness: .5, metalness: .15, fog: false }),
  mould: wood("lacquered_cherry_wood", [3, 3], { color: 0x6e4228, roughness: .4 }),
  walnut: wood("american_walnut_veneer", [1.5, 1.5], { color: 0x8a6448 }),
  cherry: wood("lacquered_cherry_wood", [2, 2], { color: 0x9a6a4a, roughness: .5 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 1, roughness: .32, fog: false }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, metalness: .6, roughness: .55, fog: false }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xe9dfc9, roughness: .9, fog: false }),
  velvet: new THREE.MeshPhysicalMaterial({ color: 0x3e2a1e, roughness: .9, sheen: .4, sheenColor: new THREE.Color(0xb08a68), sheenRoughness: .7, envMapIntensity: .2, side: THREE.DoubleSide, fog: false }),
  tabletop: new THREE.MeshStandardMaterial({ map: tex("lacquered_cherry_wood", "diff", [1.5, 1.5], true), color: 0x8a4a30, roughness: .2, envMapIntensity: .9, fog: false }),
  cord: new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: .8, fog: false }),
  globe: new THREE.MeshStandardMaterial({ color: 0xfff3e2, emissive: 0xffc890, emissiveIntensity: 1.6, roughness: .55, fog: false }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb4c8, roughness: .05, metalness: 0, transparent: true, opacity: .05, envMapIntensity: .15, fog: false, depthWrite: false }),
};

/* ───────── the carriage's side wall, with the window cut in it ───────── */
const room = new THREE.Group(); scene.add(room);
let win = { x: 1.3, y0: 1.0, y1: 1.85, w: .7 };   // set from the viewport in layout()
const outside = new THREE.Group(); scene.add(outside);
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
  const bx = (w, h, x, y, z, d, m = M.mould) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.receiveShadow = true; room.add(b); return b; };
  // the chair rail over the wainscot, and the carved cornice up under the ceiling
  bx(R - L, .06, 0, .9, .014, .03);
  const cor = bx(R - L, .1, 0, 2.31, .03, .06, M.cornice); M.cornice.map.repeat.set((R - L) / .2, 1);
  bx(R - L, .025, 0, 2.225, .05, .09); bx(R - L, .03, 0, H - .015, .04, .08);
  // the wainscot below the chair rail: walnut, then a brass rail
  const ws = new THREE.Shape(); ws.moveTo(L, -.5); ws.lineTo(R, -.5); ws.lineTo(R, .86); ws.lineTo(L, .86); ws.lineTo(L, -.5);
  const wain = new THREE.Mesh(new THREE.ExtrudeGeometry(ws, { depth: .015, bevelEnabled: false }), M.mould); wain.receiveShadow = true; room.add(wain);
  for (let x = L; x < R; x += .5) { bx(.05, .8, x, .45, .02, .012); bx(.36, .012, x + .25, .74, .02, .01); bx(.36, .012, x + .25, .16, .02, .01); bx(.012, .58, x + .07, .45, .02, .01); bx(.012, .58, x + .43, .45, .02, .01); }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, R - L, 12), M.brass); rail.rotation.z = Math.PI / 2; rail.position.set(0, .875, .03); room.add(rail);
  // the window frame (walnut, rounded), its sill and the glass
  const fs = new THREE.Shape(); rrect(fs, wx - .07, win.y0 - .07, win.w + .14, wh + .14, .14);
  const fh = new THREE.Path(); rrect(fh, wx, win.y0, win.w, wh, .09); fs.holes.push(fh);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: .05, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 3 }), M.cherry);
  frame.castShadow = frame.receiveShadow = true; room.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(win.w, wh), M.glass); glass.position.set(win.x, (win.y0 + win.y1) / 2, -.03); room.add(glass);
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
  const tw = win.w + .1, ts = new THREE.Shape(); ts.moveTo(-tw / 2, 0); ts.lineTo(tw / 2, 0); ts.absellipse(0, 0, tw / 2, .26, 0, Math.PI, false);
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(ts, { depth: .03, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 4, curveSegments: 40 }), M.tabletop);
  top.rotation.x = Math.PI / 2; top.position.set(win.x, .8, .01); top.castShadow = top.receiveShadow = true; room.add(top);
  const col = new THREE.Mesh(new THREE.LatheGeometry([[.07, 0], [.07, .02], [.03, .05], [.022, .12], [.03, .3], [.02, .5], [.026, .7], [.05, .77], [.05, .785]].map(([r, y]) => new THREE.Vector2(r, y)), 24), M.tabletop);
  col.position.set(win.x, 0, .14); col.castShadow = col.receiveShadow = true; room.add(col);
  buildSconce();
}
function curtain(side) {
  const w = .26, h = win.y1 - win.y0 + .62, g = new THREE.PlaneGeometry(w, h, 36, 40), p = g.attributes.position, tieY = .38;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), u = (x / w + .5), v = (y / h + .5);       // v: 0 bottom … 1 top
    const gather = 1 - .62 * Math.exp(-Math.pow((v - tieY) / .16, 2));                 // pinched at the tie-back
    const inner = side < 0 ? u : 1 - u;                                                // the inner edge swings toward the wall's edge
    const nx = (x * gather) - side * (1 - gather) * w * .25 * inner;
    p.setXYZ(i, nx, y, Math.sin(u * Math.PI * 9) * .022 * (.6 + .4 * gather) + .04 * (1 - gather));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.velvet); m.castShadow = true; m.receiveShadow = true;
  m.position.set(win.x + side * (win.w / 2 + .06), win.y1 + .14 - h / 2, .1);
  const grp = new THREE.Group(); grp.add(m);
  const ty = m.position.y - h / 2 + tieY * h, tx = m.position.x - side * .03;
  const cord = new THREE.Mesh(new THREE.TorusGeometry(.05, .007, 8, 24), M.cord); cord.rotation.x = Math.PI / 2; cord.scale.set(1, .55, 1); cord.position.set(tx, ty, .13); grp.add(cord);
  const tas = new THREE.Mesh(new THREE.ConeGeometry(.016, .07, 10), M.cord); tas.position.set(tx + side * .045, ty - .05, .17); grp.add(tas);
  return grp;
}

// the sconce on the pier between the boards and the window: a brass back-plate, a curled arm, a frosted globe
let globe = null, boardEdge = .97;
function buildSconce() {
  const g = new THREE.Group(), x = Math.max(boardEdge + .09, win.x - win.w / 2 - .2);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .012, 24), M.brass); plate.rotation.x = Math.PI / 2; plate.scale.set(1, 1, 1.9); plate.position.set(0, -.02, .006); g.add(plate);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -.04, .01), new THREE.Vector3(0, -.09, .13), new THREE.Vector3(0, .02, .14)), 20, .006, 8), M.brass); g.add(arm);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.03, .016, .03, 20), M.brass); cup.position.set(0, .035, .14); g.add(cup);
  globe = new THREE.Mesh(new THREE.SphereGeometry(.062, 32, 24), M.globe); globe.position.set(0, .1, .14); g.add(globe);
  g.position.set(x, 1.55, .0); room.add(g);
  wallLamp.position.set(x, 1.65, .2);
}

/* ───────── outside: the snowy forest going by ───────── */
const SPEED = 9;   // m/s past the window
let trees = [], caps = null, treeData = [], snow = null, ground = null;
function buildOutside() {
  outside.clear();
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 80), new THREE.ShaderMaterial({ uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } }, depthWrite: false,
    vertexShader: "varying float vy; void main(){ vy = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform vec3 top; uniform vec3 bot; varying float vy; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(.35,.9,vy)), 1.); }" }));
  sky.position.set(win.x, 10, -140); outside.add(sky); outside.userData.sky = sky;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), new THREE.MeshStandardMaterial({ color: 0xdfe7f0, roughness: .95, emissive: 0x1c2840, emissiveIntensity: .7 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(win.x, -2.2, -100); outside.add(ground);
  // pines: painted once into textures (drooping tiers, ragged edges, snow lying on each tier), stood up as cards facing the window
  const N = 260; trees = []; treeData = [];
  const texs = [0, 1, 2, 3].map(pineTexture);
  texs.forEach((tx, v) => { const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tx, alphaTest: .45, color: 0xffffff }), N / 4); m.frustumCulled = false; trees.push(m); outside.add(m); });
  for (let i = 0; i < N; i++) { const z = -38 - Math.pow(Math.random(), 1.1) * 80, h = 5 + Math.random() * 5; treeData.push({ x: (Math.random() - .5) * 90, z, h, w: h * (.48 + Math.random() * .14), v: i % 4, k: Math.floor(i / 4) }); }
  caps = null;
  // the snow outside, blown back by the train
  const SN = 2600, pos = new Float32Array(SN * 3), seed = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { pos[i * 3] = (Math.random() - .5) * 16; pos[i * 3 + 1] = Math.random() * 7 - 1; pos[i * 3 + 2] = -.4 - Math.random() * 14; seed[i] = Math.random(); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sg.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  snow = new THREE.Points(sg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, cx: { value: win.x }, bright: { value: 1 }, warm: { value: 0 } },
    vertexShader: `uniform float t; uniform float cx; attribute float seed; varying float a; varying float near;
      void main(){ vec3 p = position; float sp = ${SPEED.toFixed(1)} * (.6 + .4 * seed);
        p.x = cx + mod(p.x - t * sp + 8., 16.) - 8.; p.y = mod(p.y - t * (.8 + seed * .9) + 1., 7.) - 1. + sin(t * 1.3 + seed * 40.) * .15;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (14. + 26. * seed) / -mv.z; a = smoothstep(16., 2., -mv.z); near = smoothstep(5.5, 3.2, -mv.z); }`,
    fragmentShader: `uniform float bright; uniform float warm; varying float a; varying float near; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
      vec3 c = mix(vec3(.82,.9,1.), vec3(1.,.78,.5), near * warm); gl_FragColor = vec4(c * bright * (1. + near * warm * .6), (1. - d * 2.) * .85 * a); }` }));
  snow.frustumCulled = false; outside.add(snow);
}
function placeTrees(t) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  treeData.forEach(d => {
    let x = d.x - t * SPEED; x = ((x % 90) + 135) % 90 - 45 + win.x;
    m.compose(p.set(x, -2.2 + d.h / 2, d.z), q, sc.set(d.w, d.h, 1)); trees[d.v].setMatrixAt(d.k, m);
  });
  trees.forEach(tm => tm.instanceMatrix.needsUpdate = true);
}
// a pine, painted: a thin trunk, tiers of drooping needle-mass with ragged undersides, snow heaped on each tier's top
function pineTexture(seed) {
  const W = 256, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  g.fillStyle = "#2a2018"; g.fillRect(W / 2 - 5, H * .84, 10, H * .16);
  const tiers = 7 + Math.floor(r() * 3);
  for (let k = 0; k < tiers; k++) {
    const f = k / (tiers - 1), y = H * (.06 + f * .78), w = W * (.08 + f * .42) * (.9 + r() * .2), drop = H * (.07 + f * .05);
    // the needle mass of this tier
    g.beginPath(); g.moveTo(W / 2, y - drop * .9);
    const n = 14;
    for (let i = 0; i <= n; i++) { const u = i / n, x = W / 2 + w * (u * 2 - 1) * (u < .5 ? 1 : 1), yy = y + drop * .4 * Math.sin(u * Math.PI) + (i % 2 ? drop * (.25 + r() * .35) : 0); g.lineTo(x, yy); }
    g.closePath();
    const gr = g.createLinearGradient(0, y - drop, 0, y + drop); gr.addColorStop(0, "#2c4a42"); gr.addColorStop(1, "#0f211e"); g.fillStyle = gr; g.fill();
    // snow heaped on top, in lumps
    g.fillStyle = "#eef3f8";
    for (let i = 0; i < 9; i++) { const u = .12 + r() * .76, x = W / 2 + w * (u * 2 - 1) * .92, yy = y - drop * .55 + Math.abs(u - .5) * drop * .5;
      g.beginPath(); g.ellipse(x, yy, w * (.1 + r() * .12), drop * (.09 + r() * .08), 0, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.ellipse(W / 2, y - drop * .8, w * .22, drop * .12, 0, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ───────── lights ───────── */
const hemi = new THREE.HemisphereLight(0xffe6c4, 0x2a1c12, .25); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9db6dd, .5); moon.position.set(-6, 10, -14); scene.add(moon);
const ceilLight = new THREE.RectAreaLight(0xffd9a0, 1.6, 5, .5); ceilLight.position.set(-.6, 2.3, 1.4); ceilLight.lookAt(-.6, 0, .4); scene.add(ceilLight);
const winLight = new THREE.RectAreaLight(0x8fb0e0, 2, 1, 1); scene.add(winLight);
const sconce = new THREE.SpotLight(0xffd6a8, 6, 4, .55, .9, 1.6); scene.add(sconce); scene.add(sconce.target);
const wallLamp = new THREE.PointLight(0xffcf9c, 3, 3.2, 1.8); wallLamp.castShadow = true; wallLamp.shadow.mapSize.set(512, 512); wallLamp.shadow.bias = -.002; wallLamp.shadow.radius = 6; scene.add(wallLamp);

/* ───────── fit the window to the strip right of the boards ───────── */
function layout() {
  const W = innerWidth, H = innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); composer.setSize(W, H);
  const halfW = EYE.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const side = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sidew")) || 300;
  const fx = 1 - side / 2 / W;                               // the strip's middle
  boardEdge = ((1 - (side + 4) / W) * 2 - 1) * halfW;
  const strip = halfW - boardEdge;                           // the wall showing right of the boards
  win.w = Math.max(.36, strip * .5); win.x = boardEdge + strip * .55;
  buildRoom(); buildOutside();
  layoutLights();
}
function layoutLights() {
  winLight.position.set(win.x, (win.y0 + win.y1) / 2, -.02); winLight.width = win.w; winLight.height = win.y1 - win.y0; winLight.lookAt(win.x, (win.y0 + win.y1) / 2, 3);
  sconce.position.set(win.x - .1, 2.35, 1.1); sconce.target.position.set(win.x, .8, .25);

  layout.lastX = win.x;
}

/* ───────── day and night ───────── */
function applyTheme() {
  const n = night(), sky = outside.userData.sky;
  // night: the carriage is lit only by the flames; outside it is cold blue snow.  day: high-key, white and pale blue, soft blue shadows
  if (sky) { sky.material.uniforms.top.value.set(n ? 0x03070f : 0x98b6d8); sky.material.uniforms.bot.value.set(n ? 0x1a2c4c : 0xe8f0f8); }
  scene.background = new THREE.Color(n ? 0x03060c : 0xe6eef6);
  scene.fog = n ? new THREE.FogExp2(0x122140, .011) : null;
  M.velvet.color.set(n ? 0x30221a : 0x2a1e16); M.velvet.sheenColor.set(n ? 0x7a6048 : 0x6a5a4a); M.cornice.color.set(n ? 0xffffff : 0x8a8480);
  if (ground) { ground.material.color.set(n ? 0x9fb4d4 : 0xb4c3d4); ground.material.emissive.set(n ? 0x16264a : 0x9fb2c8); ground.material.emissiveIntensity = n ? .75 : .3; }
  hemi.intensity = n ? .05 : 2.1; hemi.color.set(n ? 0xffe6c4 : 0xe4eefa); hemi.groundColor.set(n ? 0x1a120c : 0x9c8a78);
  moon.intensity = n ? .9 : 2.2; moon.color.set(n ? 0x7d9ccc : 0xfff6e8);
  ceilLight.intensity = n ? .18 : .5; ceilLight.color.set(n ? 0xffc890 : 0xf2f6ff);
  winLight.intensity = n ? .9 : 16; winLight.color.set(n ? 0x5a80c0 : 0xeaf3ff);
  sconce.intensity = n ? 3 : 0; wallLamp.intensity = n ? 3.2 : 0; M.globe.emissiveIntensity = n ? 1.6 : .04; M.globe.color.set(n ? 0xfff3e2 : 0xe8e4dc);
  renderer.toneMappingExposure = n ? .95 : 1.35;
  trees.forEach(tm => tm.material.color.set(n ? 0x8aa2c8 : 0xd6e2ee)); if (snow) { snow.material.uniforms.bright.value = n ? .9 : 1; snow.material.uniforms.warm.value = n ? 1 : 0; }
  bloom.strength = n ? .5 : .18; bloom.threshold = n ? .82 : .95; bloom.radius = n ? .7 : .9;
  placeLit();
}
// where the lamp is on screen: the board's light falls off from there
function placeLit() {
  if (!globe) return;
  const v = globe.getWorldPosition(new THREE.Vector3()).project(camera);
  document.documentElement.style.setProperty("--lx", ((v.x + 1) / 2 * 100).toFixed(1) + "%");
  document.documentElement.style.setProperty("--ly", ((1 - v.y) / 2 * 100).toFixed(1) + "%");
}
addEventListener("deskTheme", applyTheme);

/* ───────── post: a little bloom on the flames and windows ───────── */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .45, .6, .82); composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ───────── the view leans a touch with the mouse ───────── */
const lean = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", e => { lean.tx = e.clientX / innerWidth * 2 - 1; lean.ty = -(e.clientY / innerHeight) * 2 + 1; });

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
  composer.render();
  requestAnimationFrame(frame);
}

layout(); applyTheme();
addEventListener("resize", () => { layout(); applyTheme(); });
let loaded = false; THREE.DefaultLoadingManager.onLoad = () => { loaded = true; };
// ?still: no loop — render on demand (for checking frames without a GPU)
window.__carDbg = () => ({ win, boardEdge, cam: camera.position.toArray() });
if (window.__CAR_STILL || /still/.test(location.search)) { window.__car = { frame: t => { t0 = performance.now() - t * 1000; const keep = requestAnimationFrame; window.requestAnimationFrame = () => 0; frame(performance.now()); window.requestAnimationFrame = keep; }, ready: () => loaded }; }
else requestAnimationFrame(frame);
