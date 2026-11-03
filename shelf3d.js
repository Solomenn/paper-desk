/* shelf3d.js：手账页 3D 书架上的实体卡册（2026-11-03）。
   用户："每个页面对应的卡册，就是仿照 sasshi 做的卡册啊，有 3D 模型的"；摆法"书脊朝外插着"；碎碎念"也做成一本实体"。
   · 五本：项目卡册、便签卡册、明信片卡册、车票卡册、碎碎念。前四本就是 /binder/ 打开时的那一本——外壳由 /binder/ 自己的代码生成
     （binder/src/shelf.ts → 构建出的 shelf.js：同一份 createBinder、同一套封面材质和颜色、厚度按实际卡数算），合上（pose(0)）；
     碎碎念用同样的活页夹，封面另给（沙色布面、金色烫印）。
   · 书脊朝外插在书架上，靠左侧板从左往右，书脊离隔板前沿 1 cm。册子是真实尺寸：便签、明信片两本板子高 36 cm，比书架每层（约 33–34 cm）高，
     竖着插不进，就书脊朝外平放摞在右边；其他三本竖着插。放在第一层能竖着放下的那层。
   · 书脊标签：原版活页夹的书脊是纯色的，插在书架上只看得见书脊、分不出哪本，所以在书脊上加一张纸标签（像活页夹书脊的插卡口），
     竖排印册名，下面一行小字是卡数。这是这里加的，/binder/ 里打开的那本没有。
   · 鼠标指着一本：往外抽出 4 cm；点它：前四本打开 /binder/?kind=…，碎碎念打开手账（最近一个月那本，同原来点书脊）。
   · 书架每一层在哪：往模型里射线探测——从上往下找隔板的上表面，从中间往左右找侧板，从前往后找背板和隔板前沿。 */
export async function setupShelf(R, shelfModel, onChange) {
  const THREE = R.THREE;
  // /binder/ 构建出的 shelf.js：线上在 /binder/shelf.js，本地仓库里在 binder/dist/shelf.js
  let lib = null;
  for (const u of ["./binder/shelf.js", "./binder/dist/shelf.js"]) { try { lib = await import(u); break; } catch {} }
  if (!lib) { console.warn("shelf.js 没找到：书架先空着"); return () => {}; }
  const group = new THREE.Group(); shelfModel.add(group);
  const s0 = shelfModel.userData.fit.s0;

  /* ── 书架每一层：在模型自己的尺寸下（缩放 s0、放在原点）射线探测 ── */
  const keepP = shelfModel.position.clone(), keepS = shelfModel.scale.clone();
  shelfModel.position.set(0, 0, 0); shelfModel.scale.setScalar(s0); shelfModel.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(shelfModel), rc = new THREE.Raycaster();
  const meshes = []; shelfModel.traverse(o => { if (o.isMesh) meshes.push(o); });
  const hits = (from, dir) => { rc.set(from, dir); rc.far = 10; return rc.intersectObjects(meshes, false); };
  const cx = (box.min.x + box.max.x) / 2, zm = (box.min.z + box.max.z) / 2;   // 在进深正中打（隔板比前沿往里缩，靠前打会打空）
  const tops = hits(new THREE.Vector3(cx, box.max.y + 1, zm), new THREE.Vector3(0, -1, 0))
    .filter(h => h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.9).map(h => h.point.y);
  const levels = [...new Set(tops.map(y => +y.toFixed(4)))].sort((a, b) => b - a);
  const bays = [];
  for (const y of levels) {
    const up = hits(new THREE.Vector3(cx, y + 0.005, zm), new THREE.Vector3(0, 1, 0))[0];
    if (!up || up.point.y - y < 0.12) continue;
    const mid = (y + up.point.y) / 2;
    const L = hits(new THREE.Vector3(cx, mid, zm), new THREE.Vector3(-1, 0, 0))[0], Rr = hits(new THREE.Vector3(cx, mid, zm), new THREE.Vector3(1, 0, 0))[0];
    const back = hits(new THREE.Vector3(cx, mid, box.max.z + 0.5), new THREE.Vector3(0, 0, -1)).find(h => h.point.z < box.max.z - 0.05);
    const front = hits(new THREE.Vector3(cx, y - 0.004, box.max.z + 0.5), new THREE.Vector3(0, 0, -1))[0];   // 这块隔板的前沿
    bays.push({ y0: y, y1: up.point.y, x0: L ? L.point.x : box.min.x + 0.03, x1: Rr ? Rr.point.x : box.max.x - 0.03, zb: back ? back.point.z : box.min.z + 0.02, zf: front ? front.point.z : box.max.z });
  }
  shelfModel.position.copy(keepP); shelfModel.scale.copy(keepS); shelfModel.updateMatrixWorld(true);
  const L2 = v => v / s0;

  /* ── 五本卡册 ── */
  const BOOKS = [
    { tab: "proj", name: "项目卡册", href: "binder/?kind=proj" },
    { tab: "note", name: "便签卡册", href: "binder/?kind=note" },
    { tab: "postcard", name: "明信片卡册", href: "binder/?kind=postcard" },
    { tab: "ticket", name: "车票卡册", href: "binder/?kind=ticket" },
    { tab: "jot", name: "碎碎念", journal: true },
  ];
  const rows = window.__shelfRows || [], jot = rows.find(r => r.journal);
  const label = (name, sub, w, h, horiz) => {                            // 书脊标签：米白卡纸，册名竖排（平放的那几本横排），加一行小字卡数；尺寸 w × h（m）
    const k = 8, W = w * 1000, H = h * 1000, c = document.createElement("canvas"); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext("2d"); g.scale(k, k);                          // 下面的单位都是 mm
    g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(60,55,45,.35)"; g.lineWidth = 0.4; g.strokeRect(1.2, 1.2, W - 2.4, H - 2.4);
    g.fillStyle = "#2b2f33"; g.textAlign = "center"; g.textBaseline = "middle";
    const serif = `"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif`;
    if (horiz) {
      const fs = Math.min(H * 0.55, (W - 30) / Math.max(4, name.length) * 0.9);
      g.font = `600 ${fs}px ${serif}`; g.fillText(name, W / 2 - 6, H / 2);
      g.fillStyle = "rgba(43,47,51,.6)"; g.textAlign = "right"; g.font = `${Math.min(H * 0.32, 3.2)}px ui-monospace, Menlo, monospace`; g.fillText(sub, W - 4, H / 2);
    } else {
      const fs = Math.min(W * 0.55, (H - 18) / Math.max(4, name.length) * 0.82);
      g.font = `600 ${fs}px ${serif}`;
      [...name].forEach((ch, i) => g.fillText(ch, W / 2, 8 + fs * 0.6 + i * fs * 1.12));
      g.fillStyle = "rgba(43,47,51,.6)"; g.font = `${Math.min(W * 0.32, 3.2)}px ui-monospace, Menlo, monospace`; g.fillText(sub, W / 2, H - 5);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const items = [];
  for (const B of BOOKS) {
    let res;
    try { res = B.journal ? lib.closedJournal(Math.max(1, jot ? jot.items.length : 1)) : lib.closedBinder(B.tab); }
    catch (e) { console.error("卡册", B.tab, e); continue; }
    const g = res.binder.group;
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => R.addRefl(m)); } });
    g.scale.multiplyScalar(0.1);                                          // /binder/ 的长度单位是 10 cm（代码里 1 mm = 0.01）：换成米
    const holder = new THREE.Group(); holder.add(g); group.add(holder);
    /* 合上的活页夹在 /binder/ 里的朝向（看它的部件量的）：书脊沿 y（书高），厚度沿 z，板宽沿 x，金属环（steel 材质）靠书脊那一侧。
       竖着插进书架、书脊朝外：绕竖轴转 90°，让 x 方向书脊那一头转到 +z（朝外）。转的方向看环在 x 的哪一头。
       （原来按外框最长的边猜"书高"，长宽很接近的册子会猜成一次镜像翻转，外框塌成 0。） */
    g.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(g);
    const sb = new THREE.Box3(); g.traverse(o => { if (o.isMesh && o.material === res.binder.steel) sb.expandByObject(o); });
    const spinePlusX = sb.isEmpty() ? true : sb.getCenter(new THREE.Vector3()).x > bb.getCenter(new THREE.Vector3()).x;
    g.rotation.y = spinePlusX ? -Math.PI / 2 : Math.PI / 2;               // 转 -90°：+x → +z；转 +90°：-x → +z
    g.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(g);
    const size = bb.getSize(new THREE.Vector3());
    g.position.sub(new THREE.Vector3(bb.min.x, bb.min.y, bb.max.z));   // 让左、底、书脊面落在 holder 的原点
    items.push({ book: B, res, holder, g, thick: size.x, height: size.y, depth: size.z, count: res.count ?? 0, pull: 0, target: 0, base: 0 });
  }
  /* 选一层、怎么放：册子是按 /binder/ 的真实尺寸做的。便签卡册和明信片卡册的板子高 36 cm，书架每层只有约 33–34 cm 高，竖着插不进去
     （真的书架也是这样），所以这两本书脊朝外平放、摞在一起；其他几本竖着插。层：从上往下第一层放得下竖着那几本的；
     都放不下就最底下那层。 */
  const H = b => b.y1 - b.y0;
  for (const m of items) m.lie = !bays.some(b => H(b) > m.height + 0.01);
  const upTall = Math.max(0, ...items.filter(m => !m.lie).map(m => m.height));
  const bay = bays.find(b => H(b) > upTall + 0.01) || bays[bays.length - 1];

  let x = bay ? bay.x0 + 0.012 : 0, stackX = 0, stackY = 0;
  const addLabel = (m, w, h, px, py, horiz) => {
    const sub = m.book.journal ? `${jot ? jot.items.length : 0} 个月` : `${m.count} 张`;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: label(m.book.name, sub, w, h, horiz), roughness: 0.85 }));
    R.addRefl(lab.material); lab.receiveShadow = true; lab.position.set(px, py, 0.0006); m.holder.add(lab);
  };
  const zOf = m => Math.max(bay.zf - 0.01, bay.zb + m.depth + 0.002);   // 书脊离前沿 1 cm；册子比这层深的（车票册板宽 36 cm），往外挪到顶着背板为止
  for (const m of items.filter(m => !m.lie)) {                         // 竖着插：书脊标签宽 = 厚度的 62%，高 = 书高的 55%
    if (!bay) break;
    m.holder.position.set(L2(x), L2(bay.y0), L2(zOf(m))); m.holder.scale.setScalar(1 / s0); m.base = m.holder.position.z;
    addLabel(m, m.thick * 0.62, m.height * 0.55, m.thick / 2, m.height * 0.56, false);
    x += m.thick + 0.004;
  }
  stackX = x + 0.02;
  for (const m of items.filter(m => m.lie)) {                          // 平放：绕书脊的方向（z）转 90°，书底朝左；一本摞一本
    if (!bay) break;
    const lay = new THREE.Group(); lay.add(m.g); m.holder.add(lay);
    lay.rotation.z = -Math.PI / 2; lay.position.y = m.thick;            // 竖放时 x∈[0,厚] y∈[0,高] → 平放 x∈[0,高] y∈[0,厚]
    m.holder.position.set(L2(stackX), L2(bay.y0 + stackY), L2(zOf(m))); m.holder.scale.setScalar(1 / s0); m.base = m.holder.position.z;
    addLabel(m, m.height * 0.55, m.thick * 0.62, m.height / 2, m.thick / 2, true);
    stackY += m.thick + 0.001;
  }
  onChange();

  /* ── 鼠标：指着哪本（射线），抽出来；点它打开 ── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, anim = 0;
  const reader = document.getElementById("reader");
  const busy = () => reader && reader.classList.contains("on");          // 手账打开着：不响应
  const pick = e => {
    if (busy() || !items.length) return null;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, R.camera);
    const h = ray.intersectObjects(items.map(m => m.holder), true)[0];
    if (!h) return null;
    let o = h.object; while (o && !items.some(m => m.holder === o)) o = o.parent;
    return items.find(m => m.holder === o) || null;
  };
  const onPage = e => !e.target.closest("a, button, input, textarea, #reader, .ibtn, .back");
  addEventListener("pointermove", e => {
    const m = onPage(e) ? pick(e) : null;
    if (m !== hover) { if (hover) hover.target = 0; hover = m; if (m) m.target = 1; document.body.style.cursor = m ? "pointer" : ""; kick(); }
  });
  addEventListener("click", e => {
    if (!onPage(e)) return; const m = pick(e); if (!m) return;
    if (m.book.journal) { const it = jot && jot.items[jot.items.length - 1]; if (it) it.sp.click(); }
    else location.href = m.book.href;
  });
  function kick() { if (!anim) anim = requestAnimationFrame(step); }
  let last = 0;
  function step(t) {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t; anim = 0; let moving = false;
    for (const m of items) {
      const v = m.target - m.pull; if (Math.abs(v) > 0.002) { m.pull += Math.sign(v) * Math.min(Math.abs(v), dt / 0.18); moving = true; } else m.pull = m.target;
      m.holder.position.z = m.base + L2(0.04) * m.pull * m.pull * (3 - 2 * m.pull);
    }
    onChange();
    if (moving) anim = requestAnimationFrame(step); else last = 0;
  }
  return () => {};
}
