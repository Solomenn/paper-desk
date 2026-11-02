import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const qs = s => document.querySelector(s);
const stage = qs("#stage");
const embedded = new URLSearchParams(location.search).get("embed") === "1";
if (embedded) document.body.classList.add("embed");
qs("#close").onclick = () => parent.postMessage({type:"paper-desk:radio-close"}, "*");

const stations = [
  {name:"雪声", freq:"88.1 FM", kind:"snow"},
  {name:"雨声", freq:"91.7 FM", kind:"rain"},
  {name:"白噪音", freq:"95.3 FM", kind:"white"},
  {name:"棕噪音", freq:"99.5 FM", kind:"brown"},
  {name:"炉火", freq:"103.2 FM", kind:"fire"},
  {name:"列车", freq:"107.1 FM", kind:"train"}
];
let station = +(localStorage.getItem("paper-desk.radio.station") || 0);
station = Math.max(0, Math.min(stations.length - 1, station));
let playing = localStorage.getItem("paper-desk.radio.playing") === "1";
let volume = +(localStorage.getItem("paper-desk.radio.volume") || 48);

const ticks = qs("#ticks");
stations.forEach((s,i) => {
  const b = document.createElement("button");
  b.title = s.name; b.onclick = () => setStation(i, true); ticks.appendChild(b);
});
qs("#volume").value = volume;

// ── audio: generated locally, no streaming files ──
let ac, master, active = [], crackTimer = 0, trainTimer = 0;
function audioCtx() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
    master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume().catch(()=>{});
  return ac;
}
function noiseBuffer(seconds=4, brown=false) {
  const c = audioCtx(), b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i=0;i<d.length;i++) {
    const w = Math.random()*2-1;
    if (brown) { last = (last + .025*w)/1.025; d[i] = last*3.4; }
    else d[i] = w;
  }
  return b;
}
function addNoise({brown=false, gain=.2, low=0, high=0, band=0, q=.7}) {
  const c = audioCtx(), src = c.createBufferSource(), g = c.createGain();
  src.buffer = noiseBuffer(5,brown); src.loop = true;
  let node = src;
  if (low) { const f=c.createBiquadFilter(); f.type="lowpass"; f.frequency.value=low; node.connect(f); node=f; }
  if (high) { const f=c.createBiquadFilter(); f.type="highpass"; f.frequency.value=high; node.connect(f); node=f; }
  if (band) { const f=c.createBiquadFilter(); f.type="bandpass"; f.frequency.value=band; f.Q.value=q; node.connect(f); node=f; }
  g.gain.value=gain; node.connect(g).connect(master); src.start(0, Math.random()*3);
  active.push(src); return {src,g};
}
function clickSound(v=.05) {
  if (!playing || !ac) return;
  const len=.018, b=ac.createBuffer(1,Math.ceil(ac.sampleRate*len),ac.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
  const s=ac.createBufferSource(), f=ac.createBiquadFilter(), g=ac.createGain();
  s.buffer=b; f.type="highpass"; f.frequency.value=1300; g.gain.value=v;
  s.connect(f).connect(g).connect(master); s.start();
}
function tuneBurst() {
  if (!playing || !ac || volume===0) return;
  const length=Math.max(1,Math.floor(ac.sampleRate*.085));
  const buffer=ac.createBuffer(1,length,ac.sampleRate), data=buffer.getChannelData(0);
  for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(.72+Math.random()*.28);
  const source=ac.createBufferSource(), filter=ac.createBiquadFilter(), gain=ac.createGain();
  const now=ac.currentTime;
  source.buffer=buffer; filter.type="bandpass"; filter.frequency.value=1850; filter.Q.value=.65;
  gain.gain.setValueAtTime(.0001,now);
  gain.gain.linearRampToValueAtTime(.055*(volume/100),now+.009);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.085);
  source.connect(filter).connect(gain).connect(master);
  source.start(now); source.stop(now+.09);
}
function stopBed() {
  clearTimeout(crackTimer); clearTimeout(trainTimer);
  active.forEach(s=>{ try{s.stop();}catch{} }); active=[];
}
function startBed() {
  stopBed();
  if (!playing) return;
  const c=audioCtx(); if (!c) return;
  const k=stations[station].kind;
  if (k==="white") addNoise({gain:.19,low:12000,high:80});
  if (k==="brown") addNoise({brown:true,gain:.36,low:1500,high:28});
  if (k==="snow") {
    const a=addNoise({brown:true,gain:.18,low:520,high:35});
    const b=addNoise({gain:.045,band:850,q:.45});
    const gust=()=>{ if(!playing||stations[station].kind!=="snow") return; const t=c.currentTime;
      b.g.gain.linearRampToValueAtTime(.025+Math.random()*.055,t+1.4+Math.random()*2);
      crackTimer=setTimeout(gust,2200+Math.random()*3200); }; gust();
  }
  if (k==="rain") {
    addNoise({gain:.12,low:7800,high:900});
    addNoise({brown:true,gain:.09,low:650,high:50});
  }
  if (k==="fire") {
    addNoise({brown:true,gain:.15,low:420,high:35});
    const crack=()=>{ if(!playing||stations[station].kind!=="fire") return; clickSound(.025+Math.random()*.09);
      crackTimer=setTimeout(crack,70+Math.random()*900); }; crack();
  }
  if (k==="train") {
    addNoise({brown:true,gain:.30,low:260,high:24});
    addNoise({gain:.025,band:980,q:1.2});
    const clack=()=>{ if(!playing||stations[station].kind!=="train") return; clickSound(.09);
      setTimeout(()=>clickSound(.06),120); trainTimer=setTimeout(clack,900+Math.random()*380); }; clack();
  }
  const target=(volume/100)*.62;
  master.gain.cancelScheduledValues(c.currentTime); master.gain.setTargetAtTime(target,c.currentTime,.08);
}
function setPlaying(v) {
  playing=!!v; localStorage.setItem("paper-desk.radio.playing",playing?"1":"0");
  const c=audioCtx(); if (!c) return;
  qs("#power").classList.toggle("on",playing);
  if (playing) startBed(); else {
    master.gain.setTargetAtTime(0,c.currentTime,.05);
    setTimeout(stopBed,300);
  }
}
function setStation(i, user=false) {
  station=(i+stations.length)%stations.length;
  localStorage.setItem("paper-desk.radio.station",station);
  qs("#stationName").textContent=stations[station].name;
  qs("#stationFreq").textContent=stations[station].freq;
  [...ticks.children].forEach((b,n)=>b.classList.toggle("on",n===station));
  updateDial();
  if (playing) startBed();
  if (user) { tuneBurst(); clickSound(.025); qs("#hint").classList.add("hide"); }
}
qs("#power").onclick=()=>setPlaying(!playing);
qs("#volume").oninput=e=>{
  volume=+e.target.value; localStorage.setItem("paper-desk.radio.volume",volume);
  if (master&&ac) master.gain.setTargetAtTime((volume/100)*.62,ac.currentTime,.05);
};
addEventListener("pointerdown",()=>{ audioCtx(); if (playing && !active.length) startBed(); },{once:true});
setStation(station);
qs("#power").classList.toggle("on",playing);

// ── scene ──
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.05,100);
camera.position.set(0,1.0,7.2);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.07;
controls.enablePan=false; controls.minDistance=4.2; controls.maxDistance=10;
controls.minPolarAngle=.65; controls.maxPolarAngle=2.15;
controls.target.set(0,.45,0);

scene.add(new THREE.HemisphereLight(0xffffff,0xc8bda9,2.1));
const key=new THREE.DirectionalLight(0xffffff,3.1); key.position.set(-3,5,5); key.castShadow=true; scene.add(key);
const rim=new THREE.DirectionalLight(0xfff0d8,1.2); rim.position.set(4,2,-3); scene.add(rim);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({color:0x453f36,opacity:.12}));
ground.rotation.x=-Math.PI/2; ground.position.y=-1.18; ground.receiveShadow=true; scene.add(ground);

let radioRoot=new THREE.Group(), tuneDisc=null, needle=null;
let dialRotor=null, usingRealModel=false;
let dialCenter=new THREE.Vector3(1.1191,-.2879,.5653), dialRadius=.6335, dialPlaneZ=.5903;
scene.add(radioRoot);

const cream=new THREE.MeshStandardMaterial({color:0xedece5,roughness:.62,metalness:.02});
const dark=new THREE.MeshStandardMaterial({color:0x262625,roughness:.5});
const lineMat=new THREE.MeshStandardMaterial({color:0x585752,roughness:.55});
function buildFallback() {
  const root=new THREE.Group();
  const body=new THREE.Mesh(new RoundedBoxGeometry(5.15,2.8,.72,8,.10),cream);
  body.castShadow=body.receiveShadow=true; root.add(body);
  // recessed speaker plate
  const speaker=new THREE.Group();
  const rows=10, cols=11, r=.075;
  const geo=new THREE.CylinderGeometry(r,r,.032,18); geo.rotateX(Math.PI/2);
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) {
    const m=new THREE.Mesh(geo,dark);
    m.position.set(-2.05+x*.235,.92-y*.235,.376); speaker.add(m);
  }
  root.add(speaker);
  // tuning dial
  tuneDisc=new THREE.Mesh(new THREE.CylinderGeometry(.79,.79,.038,96),new THREE.MeshStandardMaterial({color:0xe9e8e1,roughness:.48}));
  tuneDisc.geometry.rotateX(Math.PI/2); tuneDisc.position.set(1.35,.28,.39); tuneDisc.name="tuner"; root.add(tuneDisc);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.79,.012,12,96),lineMat); ring.position.copy(tuneDisc.position); root.add(ring);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.055,64),cream); hub.geometry.rotateX(Math.PI/2); hub.position.set(1.35,.28,.43); root.add(hub);
  dialCenter.set(1.35,.53,.39); dialRadius=.79; dialPlaneZ=.43;
  // scale ticks
  for(let i=0;i<12;i++) {
    const a=(i/12)*Math.PI*2, len=i%3===0?.16:.10;
    const g=new THREE.BoxGeometry(.018,len,.012), m=new THREE.Mesh(g,lineMat);
    m.position.set(1.35+Math.sin(a)*.66,.28+Math.cos(a)*.66,.425); m.rotation.z=-a; root.add(m);
  }
  needle=new THREE.Mesh(new THREE.ConeGeometry(.07,.18,3),dark);
  needle.position.set(1.35,.91,.45); needle.rotation.z=Math.PI; root.add(needle);
  // little center mark
  const dot=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.02,20),dark); dot.geometry.rotateX(Math.PI/2); dot.position.set(1.35,.28,.47); root.add(dot);
  root.position.y=.25;
  return root;
}
function centerAndFit(obj) {
  const box=new THREE.Box3().setFromObject(obj), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  const s=5.2/Math.max(size.x,size.y*1.7,size.z*1.3);
  obj.scale.setScalar(s);
  obj.position.y=.18;
  obj.traverse(o=>{ if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });
}
async function loadModel() {
  const loader=new GLTFLoader();
  try {
    const gltf=await loader.loadAsync("assets/radio/t3.glb");
    radioRoot.clear(); const m=gltf.scene;
    const edgeMat=new THREE.LineBasicMaterial({color:0x5f5e59,transparent:true,opacity:.18,depthWrite:false});
    m.traverse(o=>{
      if(!o.isMesh) return;
      o.material=cream;
      const edgeGeo=new THREE.EdgesGeometry(o.geometry,55);
      const edges=new THREE.LineSegments(edgeGeo,edgeMat);
      edges.renderOrder=2; o.add(edges);
    });
    centerAndFit(m); radioRoot.add(m);
    dialCenter.set(1.1191,-.2879,.5653); dialRadius=.6335; dialPlaneZ=.5903;
    usingRealModel=true;
    document.body.classList.add("model-loaded");
  } catch {
    const m=buildFallback(); radioRoot.add(m);
  }
}
await loadModel();

function stationAngle(i) {
  return -Math.PI + (i / stations.length) * Math.PI * 2;
}
function stationFromAngle(a) {
  const raw=Math.round(((a+Math.PI)/(Math.PI*2))*stations.length);
  return ((raw%stations.length)+stations.length)%stations.length;
}
function buildDialMarker() {
  if (!usingRealModel) return;
  dialRotor=new THREE.Group();
  dialRotor.position.set(dialCenter.x,dialCenter.y,dialPlaneZ);
  const ink=new THREE.LineBasicMaterial({color:0x666257,transparent:true,opacity:.82,depthTest:false});
  const lineGeometry=new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,.19,.002), new THREE.Vector3(0,.545,.002)
  ]);
  dialRotor.add(new THREE.Line(lineGeometry,ink));
  const tip=new THREE.Mesh(
    new THREE.SphereGeometry(.026,16,12),
    new THREE.MeshBasicMaterial({color:0x9b8962,depthTest:false})
  );
  tip.position.set(0,.555,.006);
  dialRotor.add(tip);
  radioRoot.add(dialRotor);
}
function updateDial() {
  const a=stationAngle(station);
  if (tuneDisc && tuneDisc.parent===radioRoot.children[0]) tuneDisc.rotation.z=a;
  if (needle) {
    const cx=1.35, cy=.28, rr=.64;
    needle.position.x=cx+Math.cos(a)*rr;
    needle.position.y=cy+Math.sin(a)*rr;
    needle.rotation.z=a-Math.PI/2;
  }
  if (dialRotor) dialRotor.rotation.z=a-Math.PI/2;
}
buildDialMarker();
updateDial();

// The real T3 dial sits on the front face. Its hit plane is invisible;
// OrbitControls only receives pointer gestures that begin outside this circle.
const ray=new THREE.Raycaster(), pointer=new THREE.Vector2();
const dialPlane=new THREE.Plane(), hitPoint=new THREE.Vector3(), planeNormal=new THREE.Vector3(0,0,1);
let tuning=false, tuningPointer=null;
function dialAngleAt(e, requireInside=false) {
  const r=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-r.left)/r.width)*2-1;
  pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  ray.setFromCamera(pointer,camera);
  dialPlane.setFromNormalAndCoplanarPoint(planeNormal,new THREE.Vector3(0,0,dialPlaneZ));
  const p=ray.ray.intersectPlane(dialPlane,hitPoint);
  if (!p) return null;
  const dx=p.x-dialCenter.x, dy=p.y-dialCenter.y, distance=Math.hypot(dx,dy);
  if (requireInside && (distance>dialRadius || distance<.075)) return null;
  return Math.atan2(dy,dx);
}
renderer.domElement.addEventListener("pointerdown",e=>{
  const a=dialAngleAt(e,true);
  if(a===null) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  tuning=true; tuningPointer=e.pointerId; controls.enabled=false;
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch {}
  const next=stationFromAngle(a);
  if(next!==station) setStation(next,true);
  qs("#hint").classList.add("hide");
},true);
renderer.domElement.addEventListener("pointermove",e=>{
  if(!tuning || e.pointerId!==tuningPointer) return;
  const a=dialAngleAt(e,false);
  if(a===null) return;
  const next=stationFromAngle(a);
  if(next!==station) setStation(next,true);
},true);
function endTune(e) {
  if(!tuning || (e && e.pointerId!==tuningPointer)) return;
  tuning=false; tuningPointer=null; controls.enabled=true;
}
renderer.domElement.addEventListener("pointerup",endTune,true);
renderer.domElement.addEventListener("pointercancel",endTune,true);
renderer.domElement.addEventListener("lostpointercapture",endTune,true);

function resize(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); }
addEventListener("resize",resize);
let firstMove=true;
controls.addEventListener("start",()=>{ if(firstMove){qs("#hint").classList.add("hide"); firstMove=false;} });
function frame(){ controls.update(); renderer.render(scene,camera); requestAnimationFrame(frame); }
frame();
