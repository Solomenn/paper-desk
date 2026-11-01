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
const lowPower = !!window.__CAR_LOW ||
  (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
  matchMedia("(max-width: 760px)").matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(lowPower ? .85 : Math.min(devicePixelRatio, 1.25));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;   // as Sketchfab
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // static cabin shadows are rendered once, not every frame

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
cool.castShadow = false;   // the cool fill light does not need its own shadow map
const bulbLight = sfLight("POINT", [1, .8784, .7098], .9761, [1,0,0,0,0,1,0,0,0,0,1,0,.3271,.0116,.1012,1]);
// the sun through the window: a few slightly different directions together give the patch on the floor a soft edge
const SUN = new THREE.Vector3(-.25, .3, -.8).normalize(), suns = [];
for (let k = 0; k < 3; k++) {
  const a = k / 3 * Math.PI * 2, d = SUN.clone().add(new THREE.Vector3(Math.cos(a) * .08, Math.sin(a) * .08, 0)).normalize().multiplyScalar(1.2);
  const s = new THREE.DirectionalLight(new THREE.Color(1, .92, .78), 2); s.position.set(.3235 + d.x, d.y, d.z); s.target.position.set(.3235, 0, 0); scene.add(s.target);
  s.castShadow = k === 0;   // one sun shadow map is enough; the other two lights only soften the fill
  if (s.castShadow) {
    const shadowSize = lowPower ? 512 : 1024;
    s.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(s.shadow.camera, { left: -.3, right: .3, top: .3, bottom: -.3, near: .2, far: 3 });
    s.shadow.bias = -.0004; s.shadow.normalBias = .002;
  }
  scene.add(s); suns.push(s);
}
let bulb = null, floor = [];
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(A + "cabin.glb", gltf => {
  const g = gltf.scene;
  g.traverse(o => {
    if (!o.isMesh) return;
    const materialName = Array.isArray(o.material) ? o.material.map(m => m && m.name).join(" ") : (o.material && o.material.name) || "";
    const objectLabel = `${o.name || ""} ${materialName}`;
    o.castShadow = !/window|glass|curtain|bulb|lamp/i.test(objectLabel); o.receiveShadow = true;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    materials.forEach(patchFoliageShadow);
    if (/StingrayPBS17/.test(materialName)) floor.push(o);
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
// the near trees: trunks just outside the glass, flashing past with motion blur — this is what makes it a train.
// Drawn in the shader: one trunk (or a gap) per cell, its edges softened by how far it moves in a frame.
const near = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .5), new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
  uniforms: { pos: { value: 0 }, blur: { value: 0 }, night: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: `uniform float pos; uniform float blur; uniform float night; varying vec2 vUv;
    float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
    void main(){
      float u = vUv.x * 12. + pos, cell = floor(u), f = fract(u);
      float on = step(h(cell), .72), cx = .25 + .5 * h(cell + 7.), w = .16 + .3 * h(cell + 13.);
      float d = abs(f - cx) - w * .5, e = .015 + blur;
      float m = on * (1. - smoothstep(-e, e, d));
      float shade = .75 + .25 * smoothstep(-w * .5, w * .5, f - cx);            // lit on one side
      float snow = step(.82, h(floor(vUv.y * 40.) + cell * 3.1)) * (1. - smoothstep(0., .05, f - cx + w * .5));   // snow caught on the bark
      vec3 col = mix(vec3(.06, .05, .04) * shade, vec3(.92, .95, 1.), snow * .8);
      col *= mix(1., .2, night);
      gl_FragColor = vec4(col, m);
      #include <colorspace_fragment>
    }` }));
near.position.set(.3235, .07, -.22); scene.add(near);

// ───────── procedural foliage shadow: a soft, moving tree canopy projected into the cabin ─────────
// The texture is generated once. Its offset follows the same distance accumulator as the trees outside,
// so the shadows slow down while braking and stop when the train stops.
function createFoliageShadowTexture() {
  const size = 512, canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rand = n => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
  function pine(x, base, height, spread, seed) {
    ctx.save(); ctx.translate(x, base);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,.38)"; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -height); ctx.stroke();
    for (let row = 0; row < 10; row++) {
      const y = -height * (.08 + row * .085);
      const reach = spread * (.2 + row * .082);
      for (const side of [-1, 1]) {
        const id = seed + row * 23 + (side + 1) * 7;
        const len = reach * (.72 + rand(id) * .5);
        ctx.strokeStyle = `rgba(0,0,0,${.2 + rand(id + 1) * .22})`;
        ctx.lineWidth = Math.max(.9, 3.7 - row * .25);
        ctx.beginPath(); ctx.moveTo(0, y);
        ctx.quadraticCurveTo(side * len * .42, y - height * .025, side * len, y + height * .05);
        ctx.stroke();
        for (let twig = 1; twig <= 5; twig++) {
          const tx = side * len * twig / 5, ty = y + height * .05 * twig / 5;
          ctx.strokeStyle = `rgba(0,0,0,${.14 + rand(id + twig * 3) * .22})`;
          ctx.lineWidth = Math.max(.55, 1.8 - row * .1);
          ctx.beginPath(); ctx.moveTo(tx * .7, ty);
          ctx.lineTo(tx * 1.08, ty + height * (.024 + rand(id + twig * 5) * .02));
          ctx.stroke();
          for (let leaf = 0; leaf < 3; leaf++) {
            const n = id + twig * 11 + leaf * 17;
            ctx.fillStyle = `rgba(0,0,0,${.12 + rand(n) * .24})`;
            ctx.beginPath();
            ctx.ellipse(tx * (.68 + rand(n + 1) * .5), ty + height * (.018 + rand(n + 2) * .035),
              3.5 + rand(n + 3) * 5.5, 1.8 + rand(n + 4) * 2.8, side * .25, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }
  // Repeat the edge trees across the seam so the shadow pattern tiles without a visible jump.
  for (let i = 0; i < 4; i++) {
    const x = 64 + i * 128, h = 340 + rand(i * 11) * 110, w = 90 + rand(i * 7) * 45;
    for (const shift of [-size, 0, size]) pine(x + shift, size * 1.08, h, w, i * 31 + 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
const foliageShadowTexture = createFoliageShadowTexture();
const foliageShadowUniforms = [];
let foliageShadowStrength = .28;
function patchFoliageShadow(material) {
  if (!material || !material.isMeshStandardMaterial || material.transparent || material.userData.paperDeskFoliageShadow) return;
  if (/window|glass|curtain|bulb|lamp/i.test(material.name || "")) return;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    if (previous) previous(shader, renderer);
    shader.uniforms.uFoliageShadow = { value: foliageShadowTexture };
    shader.uniforms.uFoliageOffset = { value: 0 };
    shader.uniforms.uFoliageStrength = { value: foliageShadowStrength };
    foliageShadowUniforms.push(shader.uniforms);
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>", "#include <common>\nvarying vec2 vFoliageShadowUv;"
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      "#include <project_vertex>\nvFoliageShadowUv = (modelMatrix * vec4(transformed, 1.0)).xy * vec2(3.4, 2.5) + vec2(0.0, 0.5);"
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      "#include <common>\nuniform sampler2D uFoliageShadow;\nuniform float uFoliageOffset;\nuniform float uFoliageStrength;\nvarying vec2 vFoliageShadowUv;"
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 foliageUv = vFoliageShadowUv + vec2(uFoliageOffset, 0.0);
      float foliageMask = texture2D(uFoliageShadow, foliageUv).a;
      foliageMask = smoothstep(0.06, 0.48, foliageMask);
      diffuseColor.rgb *= 1.0 - foliageMask * uFoliageStrength;
      `
    );
  };
  material.customProgramCacheKey = () => "paperdesk-foliage-shadow-v1";
  material.userData.paperDeskFoliageShadow = true;
  material.needsUpdate = true;
}

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
const ssr = lowPower ? null : new SSRPass({ renderer, scene, camera, width: innerWidth, height: innerHeight, groundReflector: null, selects: [] });
if (ssr) { Object.assign(ssr, { maxDistance: .12, thickness: .003, opacity: .22, blur: true, distanceAttenuation: true, fresnel: true, infiniteThick: false }); composer.addPass(ssr); }
else composer.addPass(new RenderPass(scene, camera));
const gtao = lowPower ? null : new GTAOPass(scene, camera, innerWidth, innerHeight);
if (gtao) { gtao.updateGtaoMaterial({ radius: .053, distanceExponent: 1, thickness: .02, scale: 1 }); gtao.blendIntensity = .588; composer.addPass(gtao); }
const bloom = lowPower ? null : new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .444, .455, .585);
if (bloom) composer.addPass(bloom);
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, amt: { value: .533 }, hard: { value: .725 }, blue: { value: .045 }, sat: { value: .82 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amt; uniform float hard; uniform float blue; uniform float sat; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float lum = dot(c.rgb, vec3(.3, .59, .11)); c.rgb = mix(vec3(lum), c.rgb, sat); c.b += blue * (1. - smoothstep(0., .5, lum));
      vec2 d = vUv - .5; float v = smoothstep(.75 * (1. - hard * .5), .75 + (1. - hard) * .5, length(d) * 1.4142 * (.5 + amt * .5) * 1.414); c.rgb *= 1. - amt * v; gl_FragColor = c; }` });
composer.addPass(grade);
composer.addPass(new OutputPass());

/* ───────── day and night ───────── */
function applyTheme() {
  const n = night();
  scene.environmentIntensity = n ? .05 : 2.2;
  warm.intensity = n ? warm.userData.base * .15 : warm.userData.base;
  cool.intensity = n ? 0 : cool.userData.base;
  bulbLight.intensity = n ? bulbLight.userData.base * 1.4 : bulbLight.userData.base;
  suns.forEach(s => s.intensity = n ? 0 : 1.2);
  if (bulb) { bulb.emissive = new THREE.Color(0xffd9a0); bulb.emissiveIntensity = n ? 4 : 1.5; }
  forest.material.uniforms.night.value = n ? 1 : 0; near.material.uniforms.night.value = n ? 1 : 0;
  snow.material.uniforms.bright.value = n ? .5 : 1;
  renderer.toneMappingExposure = n ? .6 : .65;
  foliageShadowStrength = n ? .18 : .34;
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
let raf = 0;
const arrival = document.getElementById("arrive");
function shouldRender() {
  return !!window.__car || (!document.hidden && host.classList.contains("on") && !arrival.classList.contains("on"));
}
function frame(now) {
  raf = 0;
  if (!shouldRender()) { last = now; return; }
  const t = (now - t0) / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
  const goal = Math.min(1, (+window.trainSpeed || 0) * 6);   // under way → full speed; only the last of the braking slows it
  vel += (goal - vel) * Math.min(1, dt * 1.6); const v = vel, m = reduce ? 0 : v;
  if (!window.__carHold) run += dt * v;
  forest.material.uniforms.off.value = (run * .12) % 1;          // the far wood drifts back…
  near.material.uniforms.pos.value = run * 8.;            // …the near trunks flash past
  near.material.uniforms.blur.value = v * .07;   // about one frame of travel
  for (const uniforms of foliageShadowUniforms) {
    uniforms.uFoliageOffset.value = run * 1.3;
    uniforms.uFoliageStrength.value = foliageShadowStrength;
  }
  snow.material.uniforms.t.value = t; snow.material.uniforms.run.value = run;
  if (t > nextJolt) { jolt = v; nextJolt = t + 5 + Math.random() * 7; }
  jolt *= .93;
  lean.x += (lean.tx - lean.x) * .05; lean.y += (lean.ty - lean.y) * .05;
  const sy = (Math.sin(t * 1.9) * .00025 + Math.sin(t * .63) * .0003 + jolt * Math.sin(t * 38) * .0004) * m;
  const roll = (Math.sin(t * 1.1) * .0012 + jolt * .002 * Math.sin(t * 31)) * m;
  look(lean.x * .003, lean.y * .002 + sy, roll);
  composer.render();
  if (!shown && loaded && forest.visible) { shown = true; host.classList.add("car3d"); setTimeout(() => host.classList.add("car3dDone"), 1300); }
  raf = requestAnimationFrame(frame);
}
function syncRenderLoop() {
  const active = shouldRender();
  if (active && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  else if (!active && raf) { cancelAnimationFrame(raf); raf = 0; last = performance.now(); }
}
const stateObserver = new MutationObserver(syncRenderLoop);
stateObserver.observe(host, { attributes: true, attributeFilter: ["class"] });
stateObserver.observe(arrival, { attributes: true, attributeFilter: ["class"] });
document.addEventListener("visibilitychange", syncRenderLoop);
// test hooks: render on demand without a GPU
window.__carDbg = () => ({ cam: camera.position.toArray() });
if (window.__CAR_STILL || /still/.test(location.search)) {
  window.__car = {
    frame: t => { t0 = performance.now() - t * 1000; const keep = requestAnimationFrame; window.requestAnimationFrame = () => 0; frame(performance.now()); window.requestAnimationFrame = keep; },
    ready: () => loaded && forest.visible,
    setRun: r => { run = r; vel = 1; }
  };
} else syncRenderLoop();
