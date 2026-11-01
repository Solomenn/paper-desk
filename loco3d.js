/* 雪国线 · the engine on the setting-off card, in 3D: "4920 Dumbleton Hall" by ThomasBeerens (CC BY-NC 4.0), repainted in the
   line's deep blue (tools: /tmp build, see NOTICE.md). It stands on the cable where the typewriter head stood and follows the
   caret like the head did; drag it to turn it round, let go and it settles back side-on. Loaded after the page is up; until it
   arrives (or if WebGL is missing) the old head stays. */
import * as THREE from "./vendor/three.bundle.min.js";
const { GLTFLoader, MeshoptDecoder } = THREE;
const mech = document.querySelector(".mechanism"), head = document.getElementById("head");
if (mech && head) setTimeout(start, 300);
function start() {
  const W = 320, H = 130, D = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement("canvas"); cv.id = "loco3d"; cv.width = W * D; cv.height = H * D;
  cv.style.cssText = `pointer-events:auto;position:absolute;top:${22 + 6 - H}px;width:${W}px;height:${H}px;transform:translateX(-50%);cursor:grab;touch-action:none;z-index:3;opacity:0;transition:opacity .6s`;
  let r; try { r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); } catch { return; }
  r.setPixelRatio(D); r.setSize(W, H, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(18, W / H, .1, 200);
  scene.add(new THREE.HemisphereLight(0xeef4ff, 0x6b7380, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-4, 8, 6); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xdfe9ff, 1.2); rim.position.set(6, 3, -6); scene.add(rim);
  const pivot = new THREE.Group(); scene.add(pivot);
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load("assets/3d/loco-4920.glb", g => {
    const m = g.scene, box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    m.position.set(-c.x, -box.min.y, -c.z); pivot.add(m);
    const len = Math.max(s.x, s.z); pivot.scale.setScalar(10 / len);
    cam.position.set(0, 2.6, 17); cam.lookAt(0, 2.25, 0);
    mech.appendChild(cv); requestAnimationFrame(() => { cv.style.opacity = 1; head.style.visibility = "hidden"; });
    loop();
  }, undefined, () => {});
  // turning it round: drag to spin, it settles back side-on (facing the way it runs)
  let yaw = 0, vy = 0, drag = null, back = 0;
  cv.addEventListener("pointerdown", e => { drag = { x: e.clientX }; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; vy = 0; });
  cv.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x; drag.x = e.clientX; yaw += dx * .012; vy = dx * .012 * 60; });
  const up = () => { if (!drag) return; drag = null; cv.style.cursor = "grab"; back = 1.2; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  let last = performance.now();
  function loop(now = performance.now()) {
    requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now;
    // the front of the engine (its lamp) stands where the head stood, under the caret; the tender trails behind, inside the card
    const hx = parseFloat(head.style.left || getComputedStyle(head).left) || 0;
    cv.style.left = Math.max(W / 2 - 30, hx - W * .34) + "px";
    if (!drag) { yaw += vy * dt; vy *= Math.exp(-dt * 3); if ((back -= dt) < 0) { const tgt = Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI; yaw += (tgt - yaw) * Math.min(1, dt * 3); } }
    pivot.rotation.y = yaw + Math.sin(now / 1600) * .04;      // a breath of movement at rest
    r.render(scene, cam);
  }
}
