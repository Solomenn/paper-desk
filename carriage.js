/* 雪国列车 · the carriage (focus.html, the ride): you stand at the door of a 1930s train compartment — leather seats either side, the
   table under the window with a camera, a journal and a pocket watch, and outside a snowy pine forest. The forest only goes by while
   the train is running: focus.html sets window.trainSpeed (0 standing … 1 cruising). By day the snow light fills the compartment; by night the ceiling lamp is lit.
   Only a scene — nothing to click; the view leans a touch with the mouse and the carriage sways a little.

   The daylight is a reproduction of the model's own Sketchfab scene (its environment "Gareoult", its three lights, AO, bloom,
   vignette, the blue lift in the shadows), checked frame against frame; to that come sun through the window and floor reflections.

   The compartment is "1930s Train Cabin" by thomas.rynne (CC BY 4.0, https://sketchfab.com/3d-models/2f109ba713fe455b959e4d79676b5c2d),
   its textures converted to WebP and the mesh compressed; the forest outside is "snowy_forest_path_01" from Poly Haven (CC0).
   three.js (MIT), bundled locally in vendor/. */
import * as THREE from "./vendor/three.bundle.min.js";
const { GLTFLoader, MeshoptDecoder, RGBELoader, EffectComposer, RenderPass, GTAOPass, SSRPass, UnrealBloomPass, ShaderPass, OutputPass } = THREE;

const A = "assets/3d/";
const night = () => document.documentElement.dataset.theme !== "day";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── the canvas, in the ride view (#car); the 2D carriage under it stays as the fallback ───────── */
const host = document.getElementById("car");
document.head.insertAdjacentHTML("beforeend", `<style>
  #car3d { position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 1.2s ease; }
  #car.car3d #car3d { opacity: 1; }
  #car.car3dDone #wall, #car.car3dDone #shot, #car.car3dDone #pane, #car.car3dDone #lampglow, #car.car3dDone #topshade { display: none; }
  #car.car3d #line, #car.car3d #hud, #car.car3d #book, #car.car3d #sndT, #car.car3d #off { z-index: 2; }
</style>`);
const canvas = document.createElement("canvas"); canvas.id = "car3d"; host.prepend(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(window.__CAR_LOW ? .75 : Math.min(devicePixelRatio, 1.25));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;   // as Sketchfab
renderer.shadowMap.enabled = !window.__CAR_LOW || !!window.__CAR_SHADOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // nothing that casts a shadow moves: draw the shadows once per change of light

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x130b0b);
scene.environmentRotation.set(0, 3.478, 0);
new RGBELoader().load(A + "sky_day.hdr", t => { t.mapping = THREE.EquirectangularReflectionMapping; scene.environment = t; });
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.002, 20);

/* ───────── where you stand: in the doorway, looking down the compartment to the window ───────── */
const EYE = new THREE.Vector3(.3235, .08, .024), AT = new THREE.Vector3(.3235, .074, -.078);   // close to the window, over the table
function look(dx = 0, dy = 0, roll = 0) {
  camera.position.set(EYE.x + dx, EYE.y + dy, EYE.z);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(AT.x + dx * .3, AT.y + dy * .3, AT.z);
}

/* ───────── the compartment, lit as on Sketchfab ───────── */
// Sketchfab's light matrices are Z-up; the glTF is Y-up: (x, y, z) → (x, z, −y). Its intensities are ×π in three.js units.
const g2 = v => new THREE.Vector3(v[0], v[2], -v[1]);
function sfLight(type, color, int, m, angle, hard) {
  const pos = g2(m.slice(12, 15)), z = g2(m.slice(8, 11)).normalize(); let l;
  if (type === "SPOT") { l = new THREE.SpotLight(new THREE.Color(...color), int * Math.PI, 0, THREE.MathUtils.degToRad(angle / 2), 1 - hard, 0); l.target.position.copy(pos.clone().sub(z)); scene.add(l.target); }
  else l = new THREE.PointLight(new THREE.Color(...color), int * Math.PI, 0, 0);
  l.position.copy(pos); l.userData.base = int * Math.PI; scene.add(l); return l;
}
const warm = sfLight("SPOT", [1, .8118, .7804], 8.151, [.9986,.0486,-.0196,0,.0118,.1574,.9875,0,.0511,-.9863,.1566,0,.3119,.0857,.1549,1], 79.8, .5);
const cool = sfLight("SPOT", [.5216, .6941, .8431], 10, [.0517,-.4692,.8816,0,.9953,.0971,-.0066,0,-.0825,.8777,.472,0,.2848,.2022,.2173,1], 68.8, .4687);
cool.castShadow = true; cool.shadow.mapSize.set(1024, 1024); cool.shadow.bias = -.0003; cool.shadow.camera.near = .01; cool.shadow.camera.far = 2;
const bulbLight = sfLight("POINT", [1, .8784, .7098], .9761, [1,0,0,0,0,1,0,0,0,0,1,0,.3271,.0116,.1012,1]);
// the sun through the window: a few slightly different directions together give the patch on the floor a soft edge
const SUN = new THREE.Vector3(-.25, .3, -.8).normalize(), suns = [];
for (let k = 0; k < 3; k++) {
  const a = k / 3 * Math.PI * 2, d = SUN.clone().add(new THREE.Vector3(Math.cos(a) * .08, Math.sin(a) * .08, 0)).normalize().multiplyScalar(1.2);
  const s = new THREE.DirectionalLight(new THREE.Color(1, .92, .78), 2); s.position.set(.3235 + d.x, d.y, d.z); s.target.position.set(.3235, 0, 0); scene.add(s.target);
  s.castShadow = true; s.shadow.mapSize.set(1024, 1024); Object.assign(s.shadow.camera, { left: -.3, right: .3, top: .3, bottom: -.3, near: .2, far: 3 }); s.shadow.bias = -.0004; s.shadow.normalBias = .002;
  scene.add(s); suns.push(s);
}
let bulb = null, floor = [];
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(A + "cabin.glb", gltf => {
  const g = gltf.scene;
  g.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = !/^(windows|curtain1|curtain2)$/.test(o.material.name); o.receiveShadow = true;   // glass and thin curtains let the sun through
    if (/StingrayPBS17/.test(o.material.name)) floor.push(o);
    if (/lightBulb/.test(o.material.name)) bulb = o.material;
  });
  scene.add(g); if (ssr) ssr.selects = floor; applyTheme();
});

/* ───────── outside: the snowy forest going by — a real panorama, sliding past, with snow falling in front of it ───────── */
const PANO_W = 7, PANO_Z = -1.4;
const forest = new THREE.Mesh(new THREE.PlaneGeometry(PANO_W, 1), new THREE.ShaderMaterial({
  uniforms: { map: { value: null }, off: { value: 0 }, night: { value: 0 }, gain: { value: 1.6 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: `uniform sampler2D map; uniform float off; uniform float night; uniform float gain; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(map, vec2(vUv.x + off, vUv.y)).rgb;
      vec3 n = c * vec3(.07, .09, .15); n = mix(n, vec3(dot(n, vec3(.3, .5, .2))) * vec3(.6, .75, 1.1), .35);   // the same forest under a snowy night sky
      gl_FragColor = vec4(mix(c * gain, n, night), 1.);
      #include <colorspace_fragment>
    }`,
  depthWrite: false }));
forest.visible = false; scene.add(forest);
new THREE.TextureLoader().load(A + "snow_forest.jpg", t => {
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
  const H = PANO_W / (t.image.width / t.image.height), eye = 0.06;
  forest.scale.y = H; forest.position.set(0.3235, eye + H * .667 - H / 2, PANO_Z);   // the band's horizon at eye height
  forest.material.uniforms.map.value = t; forest.visible = true;
});
const SN = 900, sp = new Float32Array(SN * 3), ss = new Float32Array(SN);
for (let i = 0; i < SN; i++) { sp[i * 3] = Math.random(); sp[i * 3 + 1] = Math.random(); sp[i * 3 + 2] = Math.random(); ss[i] = Math.random(); }
const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3)); sg.setAttribute("seed", new THREE.BufferAttribute(ss, 1));
const snow = new THREE.Points(sg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
  uniforms: { t: { value: 0 }, run: { value: 0 }, bright: { value: 1 } },
  vertexShader: `uniform float t; uniform float run; attribute float seed; varying float a;
    void main(){
      // a box of snow outside the window: x across the glass, y up, z away; it drifts down and streams back past the train
      vec3 p = vec3(fract(position.x - run * (.35 + .35 * seed) - t * .004) * .5 + .08, fract(position.y - t * (.012 + .012 * seed)) * .22 - .02, -.09 - position.z * .5);
      p.x += sin(t * 1.3 + seed * 40.) * .003;
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
      gl_PointSize = (.8 + 1.4 * seed) * (.12 / -mv.z) * 4.; a = .55 + .45 * seed; }`,
  fragmentShader: `uniform float bright; varying float a; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.93, .96, 1.) * bright, (1. - d * 2.) * a * .8); }` }));
snow.frustumCulled = false; scene.add(snow);

/* ───────── post, as on Sketchfab: AO, reflections on the floor, then tone mapping, then bloom, vignette and grade ───────── */
const composer = new EffectComposer(renderer);
const ssr = window.__CAR_LOW && !window.__CAR_SHADOW ? null : new SSRPass({ renderer, scene, camera, width: innerWidth, height: innerHeight, groundReflector: null, selects: [] });
if (ssr) { Object.assign(ssr, { maxDistance: .12, thickness: .003, opacity: .22, blur: true, distanceAttenuation: true, fresnel: true, infiniteThick: false }); composer.addPass(ssr); }
else composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight); gtao.updateGtaoMaterial({ radius: .053, distanceExponent: 1, thickness: .02, scale: 1 }); gtao.blendIntensity = .588; composer.addPass(gtao);
composer.addPass(new OutputPass());
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .444, .455, .585); composer.addPass(bloom);
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, amt: { value: .533 }, hard: { value: .725 }, blue: { value: .045 }, sat: { value: .82 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amt; uniform float hard; uniform float blue; uniform float sat; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float lum = dot(c.rgb, vec3(.3, .59, .11)); c.rgb = mix(vec3(lum), c.rgb, sat); c.b += blue * (1. - smoothstep(0., .5, lum));
      vec2 d = vUv - .5; float v = smoothstep(.75 * (1. - hard * .5), .75 + (1. - hard) * .5, length(d) * 1.4142 * (.5 + amt * .5) * 1.414); c.rgb *= 1. - amt * v; gl_FragColor = c; }` });
composer.addPass(grade);

/* ───────── day and night ───────── */
function applyTheme() {
  const n = night();
  scene.environmentIntensity = n ? .05 : 2.2;
  warm.intensity = n ? warm.userData.base * .15 : warm.userData.base;
  cool.intensity = n ? 0 : cool.userData.base;
  bulbLight.intensity = n ? bulbLight.userData.base * 1.4 : bulbLight.userData.base;
  suns.forEach(s => s.intensity = n ? 0 : 1.2);
  if (bulb) { bulb.emissive = new THREE.Color(0xffd9a0); bulb.emissiveIntensity = n ? 4 : 1.5; }
  forest.material.uniforms.night.value = n ? 1 : 0;
  snow.material.uniforms.bright.value = n ? .5 : 1;
  renderer.toneMappingExposure = n ? .6 : .65;
  grade.uniforms.sat.value = n ? .9 : .82;
  renderer.shadowMap.needsUpdate = true;
}
addEventListener("deskTheme", applyTheme);

/* ───────── layout ───────── */
function layout() {
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  look();
}
layout(); applyTheme();
addEventListener("resize", layout);

/* ───────── the loop: the forest goes by, the carriage sways ───────── */
const lean = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", e => { lean.tx = e.clientX / innerWidth * 2 - 1; lean.ty = -(e.clientY / innerHeight) * 2 + 1; });
let t0 = performance.now(), last = t0, run = 0, vel = 0, jolt = 0, nextJolt = 4, shown = false, loaded = false;
THREE.DefaultLoadingManager.onLoad = () => { loaded = true; renderer.shadowMap.needsUpdate = true; };
function frame(now) {
  requestAnimationFrame(frame);
  if (!host.classList.contains("on") && shown && !window.__car) { last = now; return; }   // nothing to draw while the ride view is closed
  const t = (now - t0) / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
  const goal = Math.min(1, (+window.trainSpeed || 0) * 6);   // under way → full speed; only the last of the braking slows it
  vel += (goal - vel) * Math.min(1, dt * 1.6); const v = vel, m = reduce ? 0 : v;
  run += dt * v;
  forest.material.uniforms.off.value = (run * .045) % 1;   // the forest slides back past the window, as fast as the train runs
  snow.material.uniforms.t.value = t; snow.material.uniforms.run.value = run;
  if (t > nextJolt) { jolt = v; nextJolt = t + 5 + Math.random() * 7; }
  jolt *= .93;
  lean.x += (lean.tx - lean.x) * .05; lean.y += (lean.ty - lean.y) * .05;
  const sy = (Math.sin(t * 1.9) * .00025 + Math.sin(t * .63) * .0003 + jolt * Math.sin(t * 38) * .0004) * m;
  const roll = (Math.sin(t * 1.1) * .0012 + jolt * .002 * Math.sin(t * 31)) * m;
  look(lean.x * .003, lean.y * .002 + sy, roll);
  composer.render();
  if (!shown && loaded && forest.visible) { shown = true; host.classList.add("car3d"); setTimeout(() => host.classList.add("car3dDone"), 1300); }
}
// test hooks: render on demand without a GPU
window.__carDbg = () => ({ cam: camera.position.toArray() });
if (window.__CAR_STILL || /still/.test(location.search)) { window.__car = { frame: t => { t0 = performance.now() - t * 1000; const keep = requestAnimationFrame; window.requestAnimationFrame = () => 0; frame(performance.now()); window.requestAnimationFrame = keep; }, ready: () => loaded && forest.visible }; }
else requestAnimationFrame(frame);
