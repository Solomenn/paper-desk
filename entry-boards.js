/* entry-boards.js：入口页（lab/entry.html）两块板上的项目卡和便签（用户 2026-11-04："把两个板子上的便签和卡片……一起可以显示在 entry 里面"）。
   数据和首页同一份（这个浏览器里存的）：
   · 项目：paper-desk.desk-tasks.v1 里的 projects，按栏（在做 / 待做 / 做完，从左到右，同首页）竖着排在 Silk Wall 的玻璃上；
   · 便签：paper-desk.memos.v1，按首页便签板上的位置、角度摆在 Textile Noticeboard 的布面上；收进抽屉的、放在底栏的不摆。
   东西都是真的 3D 薄片，和板子在同一束光里（影子、反射光同入口页其它物件）；纸面上的字是画上去的贴图。
   入口页只看不改：点板子照旧是进首页那一页。

   大小怎么对应：
   · 项目板：把玻璃（模型 2.0 × 1.0 m）当成 1200 × 600 的网页像素来排，1 px = 2.0 / 1200 m ≈ 1.7 mm。小卡宽 300 px（约 0.5 m），
     字号、内边距、磁铁大小照首页的小卡（.mini）；一栏放不下的卡不画（首页那栏是滚动的）。
   · 便签板：首页每次存便签时顺便存下便签板当时的大小（paper-desk.memos.size.v1，网页像素）；入口页把那块板按比例缩进布面（模型 2.5 × 1.2 m，
     四周各留 2%），便签的位置、大小（196 px 见方，字多会变长）、角度、图钉都照这个比例。没存过大小（首页还没存过便签）就按所有便签占的范围算。
   · 厚度、翘起同首页的 3D（board3d.js）：卡 0.5 mm、底边离玻璃 3 mm；便签 0.1 mm、上面 25% 贴平、底边离布面 4 mm。 */
const HAND = '"LXGW WenKai", "霞鹜文楷", "LXGW WenKai Screen", "Klee One", "KaiTi", "STKaiti", serif';
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };

function sheetGeo(THREE, thick, lift, flat) {                              // 1 × 1 薄片：顶边往下 flat 这段平，再往下二次曲线翘起，底边离板 lift（同 board3d.js）
  const g = new THREE.BoxGeometry(1, 1, thick, 1, 16, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = Math.max(0, (0.5 - p.getY(i) - flat) / (1 - flat)); p.setZ(i, p.getZ(i) + lift * k * k); }
  g.computeVertexNormals(); return g;
}
// 中文按字断行，英文单词尽量不拆；超过 maxLines 行的最后一行加省略号
function wrap(q, text, w, maxLines = 99) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    const toks = para.match(/[A-Za-z0-9'’.,!?:;-]+|\s|./gu) || [""];
    for (const t of toks) {
      if (q.measureText(line + t).width <= w || !line) { line += t; continue; }
      out.push(line.trimEnd()); line = t.trimStart();
    }
    out.push(line);
  }
  if (out.length > maxLines) { out.length = maxLines; let l = out[maxLines - 1]; while (l && q.measureText(l + "…").width > w) l = l.slice(0, -1); out[maxLines - 1] = l + "…"; }
  return out;
}
const texOf = (THREE, cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const DPR = 3;                                                             // 贴图每网页像素画 3 个点（入口页上板子缩得很小，放大看时不糊）

/* ════════ 项目板 ════════ */
export function dressSilk(R, model) {
  const THREE = R.THREE, f = model.userData.fit, s0 = f.s0;
  const S = load("paper-desk.desk-tasks.v1", {}), projects = (S && S.projects) || [];
  const BW = 1200, BH = 600, PX = f.size.x / BW;                         // 玻璃当成 1200 × 600 网页像素
  const group = new THREE.Group(); group.scale.setScalar(1 / s0); model.add(group);
  const x0 = f.c.x - f.size.x / 2, y1 = f.c.y + f.size.y / 2, zf = f.zmin + f.size.z;   // 玻璃正面
  const at = (px, py) => [x0 + px * PX, y1 - py * PX];
  const COLS = ["doing", "todo", "done"], NAME = { doing: "Doing", todo: "To do", done: "Done" };
  const MAG = { todo: "#c9a24a", doing: "#c9573f", done: "#4f7a5a" };
  const PAD = 48, GAP = 40, LANE = (BW - PAD * 2 - GAP * 2) / 3, CW = 300, TOP = 96;

  // 玻璃上印的字：栏名、栏名后面一道细线（同首页 .lane h3）
  const pc = Object.assign(document.createElement("canvas"), { width: BW * 2, height: 80 * 2 }), pq = pc.getContext("2d");
  pq.scale(2, 2); pq.font = `400 24px ${HAND}`; pq.textBaseline = "alphabetic";
  COLS.forEach((c, i) => {
    const lx = PAD + i * (LANE + GAP);
    pq.fillStyle = "rgba(244,240,228,.88)"; pq.letterSpacing = "4.8px"; pq.fillText(NAME[c], lx, 62);
    const tw = pq.measureText(NAME[c]).width + 16;
    pq.fillStyle = "rgba(244,240,228,.25)"; pq.fillRect(lx + tw, 54, LANE - tw, 2);
  });
  const printMat = new THREE.MeshStandardMaterial({ map: texOf(THREE, pc), transparent: true, roughness: 0.6, depthWrite: false }); R.addRefl(printMat);
  const print = new THREE.Mesh(new THREE.PlaneGeometry(BW * PX, 80 * PX), printMat);
  print.receiveShadow = true; print.position.set(f.c.x, y1 - 40 * PX, zf + 0.0002); group.add(print);

  const geo = sheetGeo(THREE, 0.0005, 0.003, 0), sphere = new THREE.SphereGeometry(1, 24, 16);
  const tilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return ((Math.abs(h) % 9) - 4) * .35; };
  for (const [ci, col] of COLS.entries()) {
    let y = TOP;
    for (const p of projects.filter(p => p.col === col && !p.bar)) {
      // 画一张小卡（同首页 .mini：内边距 14、标题 15 px 粗体、目标 12.5 px 最多两行、进度条和"几/几"）
      const steps = (p.conds || []).filter(c => c.t && c.t.trim() && !c.sub), k = steps.filter(c => c.done).length;
      const cv = document.createElement("canvas"), q = cv.getContext("2d");
      q.font = `700 15px ${HAND}`; const tl = wrap(q, p.title || "未命名", CW - 28, 2);
      q.font = `12.5px ${HAND}`; const gl = p.goal ? wrap(q, p.goal, CW - 28, 2) : [];
      const row = steps.length ? 22 : 0, H = Math.ceil(14 + tl.length * 21 + (gl.length ? 4 + gl.length * 19.4 : 0) + row + 12);
      if (y + H > BH - 24) break;                                          // 这一栏放不下了
      cv.width = CW * DPR; cv.height = H * DPR; q.scale(DPR, DPR);
      q.fillStyle = "#f9f8f4"; q.fillRect(0, 0, CW, H);
      q.fillStyle = "#2a323a"; q.font = `700 15px ${HAND}`; q.textBaseline = "top";
      tl.forEach((l, i) => q.fillText(l, 14, 14 + i * 21 + 2));
      q.fillStyle = "#4f5d69"; q.font = `12.5px ${HAND}`;
      gl.forEach((l, i) => q.fillText(l, 14, 14 + tl.length * 21 + 4 + i * 19.4 + 3));
      if (steps.length) {
        const by = H - 12 - 8, bw = CW - 28 - 44;
        q.fillStyle = "rgba(42,50,58,.12)"; q.beginPath(); q.roundRect(14, by + 2, bw, 4, 2); q.fill();
        q.fillStyle = MAG[col]; q.beginPath(); q.roundRect(14, by + 2, bw * k / steps.length, 4, 2); q.fill();
        q.fillStyle = "#4f5d69"; q.font = `12px ${HAND}`; q.textAlign = "right"; q.fillText(`${k}/${steps.length}`, CW - 14, by - 2);
      }
      const front = new THREE.MeshStandardMaterial({ map: texOf(THREE, cv), roughness: 0.92 }), side = new THREE.MeshStandardMaterial({ color: "#f6f4ee", roughness: 0.92 });
      R.addRefl(front); R.addRefl(side);
      const m = new THREE.Mesh(geo, [side, side, side, side, front, side]); m.castShadow = m.receiveShadow = true;
      const lx = PAD + ci * (LANE + GAP) + (LANE - CW) / 2, [cx, cy] = at(lx + CW / 2, y + H / 2);
      const holder = new THREE.Group(); holder.position.set(cx, cy, zf + 0.00026); holder.rotation.z = -tilt(p.id || p.title || "") * Math.PI / 180; group.add(holder);
      m.scale.set(CW * PX, H * PX, 1); holder.add(m);
      // 磁铁：顶边正中往上 6 px 起的 16 px 小球，压扁 0.7，颜色是这一栏的
      const mag = new THREE.Mesh(sphere, new THREE.MeshPhysicalMaterial({ color: MAG[col], roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 })); R.addRefl(mag.material);
      const r = 8 * PX; mag.scale.set(r, r, r * 0.7); mag.position.set(0, H * PX / 2 - 2 * PX, 0.00025 + r * 0.7 * 0.6); mag.castShadow = mag.receiveShadow = true; holder.add(mag);
      y += H + 14;
    }
  }
}

/* ════════ 便签板 ════════ */
export function dressTextile(R, model) {
  const THREE = R.THREE, f = model.userData.fit, s0 = f.s0;
  const CATS = { work: "#f3e2a1", life: "#cfe4cf", idea: "#f3cabb", study: "#cddbe9" };
  const NW = 196, NH = 196, NH_MAX = 540, FH = 40;
  const notes = (load("paper-desk.memos.v1", null) || load("paper-desk.desk.v1", []) || []).filter(n => n && !n.bar && !n.docked).sort((a, b) => (a.z || 0) - (b.z || 0));
  if (!notes.length) return;
  // 每张的高：同首页 fitHeight——字多了往下长，最少 196、最多 540；折起来的 40
  const mc = document.createElement("canvas").getContext("2d");
  const lay = n => {
    mc.font = `600 19px ${HAND}`; const [first = "", ...rest] = String(n.text || "").split("\n");
    const l1 = wrap(mc, first, NW - 40); mc.font = `16px ${HAND}`; const lr = rest.length ? wrap(mc, rest.join("\n"), NW - 40) : [];
    const h = n.folded ? FH : Math.max(NH, Math.min(NH_MAX, Math.ceil(26 + 18 + l1.length * 29.5 + lr.length * 24.8)));
    return { l1, lr, h };
  };
  const L = notes.map(lay);
  const size = load("paper-desk.memos.size.v1", null);
  let bx0 = 0, by0 = 0, bw = size && size.w, bh = size && size.h;
  if (!bw || !bh) {                                                        // 没存过便签板大小：按便签占的范围
    const xs = notes.map(n => n.x), ys = notes.map(n => n.y);
    bx0 = Math.min(...xs) - NW; by0 = Math.min(...ys) - NH; bw = Math.max(...xs) + NW - bx0; bh = Math.max(...ys) + NH - by0;
  }
  const k = Math.min(f.size.x * 0.96 / bw, f.size.y * 0.96 / bh);         // 每网页像素多少米
  const group = new THREE.Group(); group.scale.setScalar(1 / s0); model.add(group);
  const zf = f.zmin + f.size.z;
  const at = (px, py) => [f.c.x + (px - bx0 - bw / 2) * k, f.c.y - (py - by0 - bh / 2) * k];
  const geo = sheetGeo(THREE, 0.0001, 0.004, 0.25), sphere = new THREE.SphereGeometry(1, 20, 14);
  notes.forEach((n, i) => {
    const { l1, lr, h } = L[i], c = CATS[n.cat] || CATS.work;
    const cv = Object.assign(document.createElement("canvas"), { width: NW * DPR, height: h * DPR }), q = cv.getContext("2d");
    q.scale(DPR, DPR); q.fillStyle = c; q.fillRect(0, 0, NW, h);
    const g = q.createLinearGradient(0, 0, 0, h);                          // 背胶那一段稍亮（同首页 .sheet::before）
    g.addColorStop(0, "rgba(255,255,255,.22)"); g.addColorStop(.2, "rgba(255,255,255,0)"); q.fillStyle = g; q.fillRect(0, 0, NW, h);
    q.fillStyle = "rgba(46,40,30,.88)"; q.textBaseline = "top";
    q.save(); q.beginPath(); q.rect(0, 0, NW, h); q.clip();
    q.font = `600 19px ${HAND}`; l1.forEach((l, j) => q.fillText(l, 20, 26 + j * 29.5 + 5));
    q.font = `16px ${HAND}`; lr.forEach((l, j) => q.fillText(l, 20, 26 + l1.length * 29.5 + j * 24.8 + 4));
    q.restore();
    const front = new THREE.MeshStandardMaterial({ map: texOf(THREE, cv), roughness: 0.92 }), side = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 });
    R.addRefl(front); R.addRefl(side);
    const m = new THREE.Mesh(geo, [side, side, side, side, front, side]); m.castShadow = m.receiveShadow = true;
    const [cx, cy] = at(n.x, n.y), holder = new THREE.Group();
    holder.position.set(cx, cy, zf + 0.00006 + i * 0.00002); holder.rotation.z = -(n.a || 0); group.add(holder);  // 后贴的盖在上面
    m.scale.set(NW * k, h * k, 1); holder.add(m);
    if (n.pin) {                                                           // 图钉：首页里钉在便签中心偏 (u, v) 的地方
      const p = new THREE.Mesh(sphere, new THREE.MeshPhysicalMaterial({ color: 0xcc5c42, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 })); R.addRefl(p.material);
      const r = 7 * k; p.scale.setScalar(r); p.position.set((n.pin.u || 0) * k, -(n.pin.v || 0) * k, r * 0.8); p.castShadow = p.receiveShadow = true; holder.add(p);
    }
  });
}

/* ════════ 手账：一叠卡册（用户 2026-11-03："书架之后直接换成卡册实体（叠一起的那种），书架点进去才能看到当容器"） ════════
   五本合上的卡册平放摞成一叠，书脊朝外：项目、便签、明信片、车票四本和碎碎念。外壳和手账页书架上那五本是同一份代码
   （/binder/ 构建出的 shelf.js：同样的封面颜色、材质、烫印、按卡数算的厚度、真实的板子尺寸），书脊烫印册名和卡数（同手账页）。
   大的压在下面；每本左右错开几毫米、转一两度，像随手摞的。单位是米（真实尺寸），入口页按桌上一组的比例缩放。
   点它照旧进手账页（书架在那里）。 */
export async function binderStack(R) {
  const THREE = R.THREE;
  let lib = null;
  for (const u of ["./binder/shelf.js", "./binder/dist/shelf.js"]) { try { lib = await import(u); break; } catch {} }
  if (!lib) throw new Error("shelf.js 没找到");
  const months = jotMonths();
  const BOOKS = [
    { tab: "proj", name: "项目卡册" }, { tab: "note", name: "便签卡册" }, { tab: "postcard", name: "明信片卡册" },
    { tab: "ticket", name: "车票卡册" }, { tab: "jot", name: "碎碎念", journal: true },
  ];
  const stack = new THREE.Group(), items = [];
  for (const B of BOOKS) {
    let res; try { res = B.journal ? lib.closedJournal(Math.max(1, months)) : lib.closedBinder(B.tab); } catch (e) { console.error("卡册", B.tab, e); continue; }
    const g = res.binder.group;
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => R.addRefl(m)); } });
    g.scale.multiplyScalar(0.1);                                          // /binder/ 的单位是 10 cm：换成米
    // 书脊转到朝外（+z）：看金属环在板宽（x）的哪一头（同 shelf3d.js）
    g.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(g);
    const sb = new THREE.Box3(); g.traverse(o => { if (o.isMesh && o.material === res.binder.steel) sb.expandByObject(o); });
    const spinePlusX = sb.isEmpty() ? true : sb.getCenter(new THREE.Vector3()).x > bb.getCenter(new THREE.Vector3()).x;
    g.rotation.y = spinePlusX ? -Math.PI / 2 : Math.PI / 2; g.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(g); const size = bb.getSize(new THREE.Vector3());
    g.position.sub(new THREE.Vector3(bb.min.x, bb.min.y, bb.max.z));   // 左、底、书脊面落在原点
    const lay = new THREE.Group(); lay.add(g); lay.rotation.z = -Math.PI / 2; lay.position.y = size.x;   // 平放：竖放时 x∈[0,厚] y∈[0,高] → x∈[0,高] y∈[0,厚]
    const holder = new THREE.Group(); holder.add(lay);
    items.push({ B, res, holder, thick: size.x, height: size.y, depth: size.z, count: res.count ?? 0 });
  }
  items.sort((a, b) => b.height * b.depth - a.height * a.depth);       // 大的在下面
  let y = 0, sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647 - 0.5;
  for (const m of items) {
    m.holder.position.set(-m.height / 2 + rnd() * 0.012, y, m.depth / 2); m.holder.rotation.y = rnd() * 0.05;   // 错开 ±6 mm、转 ±1.4°
    stack.add(m.holder); y += m.thick + 0.0005;
  }
  // 书脊烫印：等字体到了再画（同手账页）
  (async () => {
    for (const m of items) {
      const sub = m.B.journal ? `${months} 个月` : `${m.count} 张`;
      try { await lib.fontsFor(m.res, [m.B.name, sub]); } catch (e) { console.warn("字体", e); }
      const mesh = lib.spineFoil(m.res, m.B.name, sub, m.height * 0.8, m.thick * 0.7, true); if (!mesh) continue;
      R.addRefl(mesh.material); mesh.position.set(m.height / 2, m.thick / 2, 0.0004); m.holder.add(mesh);
      R.render();
    }
  })();
  return stack;
}

/* 碎碎念有几个月（同手账页 journal.html：今年到这个月的每个月，加上更早有东西的月份）：那本的厚度和书脊上的"几个月" */
export function jotMonths() {
  const ks = new Set(), now = new Date();
  for (let m = 1; m <= now.getMonth() + 1; m++) ks.add(`${now.getFullYear()}-${m}`);
  const add = t => { if (!t) return; const d = new Date(t); if (!isNaN(d)) ks.add(`${d.getFullYear()}-${d.getMonth() + 1}`); };
  (load("paper-desk.today.v1", []) || []).forEach(i => i && i.text && i.text.trim() && i.done && add(i.doneAt));
  ((load("paper-desk.desk-tasks.v1", {}) || {}).done || []).forEach(t => add(t.doneAt));
  (load("paper-desk.memos.v1", []) || []).concat(load("paper-desk.notes-archive.v1", []) || []).forEach(n => n && n.text && n.text.trim() && add(n.createdAt));
  Object.keys(load("paper-desk.todaymemo.v1", {}) || {}).forEach(k => { const [y, m] = k.split("-").map(Number); if (y && m) ks.add(`${y}-${m}`); });
  return ks.size;
}
