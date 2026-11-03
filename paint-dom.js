/* paint-dom.js：把一块网页（一张项目卡、一块板上的字）照网页排好的样子画到 canvas 上，给 3D 物体当贴图（2026-11-03）。
   为什么不用 html2canvas：试过，多行文字不换行（整行丢掉）、删除线和占位符画不出来、中文标点宽度不对、一张卡要 0.8 秒。
   这里的做法：位置全部向浏览器要，不自己排版——
   · 字：每个字用 Range.getClientRects() 问浏览器它在哪（换行、标点挤压、字距都和网页一样），再用同样的字体一个个画上；
     输入框、多行输入框里的字没有 DOM 文本，先做一个样式一样的隐形副本（镜像），在副本上问每个字的位置；
     空的输入框画占位符（颜色取 ::placeholder）；删除线、省略号（一行或两行截断）照网页的样式画。
   · 框：背景色、线性渐变、边框（实线、虚线，每条边各自的粗细和颜色）、圆角。
   · ::before / ::after：只画绝对定位的（勾选框里的对勾、图钉、分隔线）；位置按它在父元素里的 left/top/width/height 算，带旋转。
   · 图标（<svg>）：连同算好的颜色序列化成图片再画上去。
   · 透明度：一路乘上祖先的 opacity（到 root 为止）；带 x3d 这个类的元素自己的透明度不算（3D 开着时网页版被设成透明，画贴图时当它不透明）。
   · 背景的每一层：线性渐变、径向渐变（成片重复的小点）、url() 图片（SVG 噪点图做的木纹、软木纹），按各自的大小、位置、重复方式铺；clip-path 多边形（斜切角）。
   不画：阴影（3D 里有真影子）、filter、mix-blend-mode。
   用法：const canvas = await paintDOM(root, { scale, skip: el => 布尔, skipPseudo: (el, "::after") => 布尔, flatten: [要临时去掉变形的子元素], before, after, textOnly, noText, noUrl }) */

const px = v => parseFloat(v) || 0;
function parseColor(c) {
  const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
const rgba = (c, a = 1) => `rgba(${c.r},${c.g},${c.b},${c.a * a})`;

// 圆角矩形路径（每个角的半径各自；百分比按宽高算）
function radii(cs, w, h) {
  const one = v => { const p = String(v).split(" "); const f = (s, ref) => s.endsWith("%") ? px(s) / 100 * ref : px(s); return Math.min(f(p[0], w), w / 2, h / 2); };
  return [one(cs.borderTopLeftRadius), one(cs.borderTopRightRadius), one(cs.borderBottomRightRadius), one(cs.borderBottomLeftRadius)];
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  if (!r.some(v => v > 0)) { g.rect(x, y, w, h); return; }
  g.moveTo(x + r[0], y); g.lineTo(x + w - r[1], y); g.arcTo(x + w, y, x + w, y + r[1], r[1]);
  g.lineTo(x + w, y + h - r[2]); g.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
  g.lineTo(x + r[3], y + h); g.arcTo(x, y + h, x, y + h - r[3], r[3]);
  g.lineTo(x, y + r[0]); g.arcTo(x, y, x + r[0], y, r[0]); g.closePath();
}
// 按最外层逗号切开（括号里的逗号不切）
function splitTop(s) { const out = []; let d = 0, cur = ""; for (const ch of s) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
// linear-gradient(...) → canvas 渐变；只认角度（deg）和 to top/right/bottom/left
function linearGradient(g, src, x, y, w, h) {
  const m = /^linear-gradient\((.*)\)$/.exec(src.trim()); if (!m) return null;
  const parts = splitTop(m[1]); let ang = 180;
  if (/deg$/.test(parts[0])) ang = parseFloat(parts.shift());
  else if (/^to /.test(parts[0])) { const t = parts.shift(); ang = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270 }[t] ?? 180; }
  const a = ang * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), half = Math.abs(w / 2 * dx) + Math.abs(h / 2 * dy);
  const cx = x + w / 2, cy = y + h / 2, gr = g.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  const stops = parts.map(p => { const cm = /^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)\s*(.*)$/i.exec(p); return cm ? { c: cm[1], pos: cm[2] } : null; }).filter(Boolean);
  stops.forEach((s, i) => {
    let pos = s.pos.trim() ? s.pos.trim().split(/\s+/).map(v => v.endsWith("%") ? px(v) / 100 : px(v) / (2 * half)) : [i / Math.max(1, stops.length - 1)];
    pos.forEach(p => { try { gr.addColorStop(Math.max(0, Math.min(1, p)), s.c); } catch {} });
  });
  return gr;
}

// 长度：px、%、calc(100% - 14px) 这几种
function len(v, ref) {
  v = v.trim(); const c = /^calc\((.*)\)$/.exec(v);
  if (c) return c[1].split(/\s+(?=[+-]\s)/).reduce((acc, t) => { const m = /^([+-])?\s*(.*)$/.exec(t.trim()); const sgn = m[1] === "-" ? -1 : 1; return acc + sgn * len(m[2], ref); }, 0);
  return v.endsWith("%") ? px(v) / 100 * ref : px(v);
}
// clip-path: polygon(...)（木框四角的斜切）
function clipPolygon(g, cp, x, y, w, h) {
  const body = cp.slice(8, cp.lastIndexOf(")")), pts = splitTop(body).map(p => { const t = p.trim().split(/\s+(?![^(]*\))/); return [x + len(t[0], w), y + len(t[1], h)]; });
  g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.clip();
}
// radial-gradient(circle at X Y, 颜色 停靠点, ...)：画在一块 tw × th 的小图上
function radialGradient(g, src, w, h) {
  const m = /^radial-gradient\((.*)\)$/.exec(src.trim()); if (!m) return null;
  const parts = splitTop(m[1]); let cx = w / 2, cy = h / 2;
  if (!/^(rgba?|#)/.test(parts[0])) { const at = / at (.+)$/.exec(parts.shift()); if (at) { const t = at[1].trim().split(/\s+/); cx = len(t[0], w); cy = len(t[1] ?? t[0], h); } }
  const R = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy)) || 1;   // 最远的角
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  parts.forEach((p, i) => { const cm = /^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)\s*(.*)$/i.exec(p); if (!cm) return;
    const pos = cm[2].trim() ? cm[2].trim().split(/\s+/).map(v => v.endsWith("%") ? px(v) / 100 : px(v) / R) : [i / Math.max(1, parts.length - 1)];
    pos.forEach(q => { try { gr.addColorStop(Math.max(0, Math.min(1, q)), cm[1]); } catch {} }); });
  return gr;
}
// 背景的每一层：线性渐变、径向渐变、url() 图片；各自的大小、位置、重复方式（CSS 里第一层在最上面，所以倒着画）
const IMG = new Map();                                                   // url → 已经加载好的图片
function paintLayers(g, cs, x, y, w, h, r, opt) {
  const layers = splitTop(cs.backgroundImage), sizes = splitTop(cs.backgroundSize), poss = splitTop(cs.backgroundPosition), reps = splitTop(cs.backgroundRepeat);
  for (let i = layers.length - 1; i >= 0; i--) {
    const L = layers[i]; if (L === "none") continue;
    const url = /^url\("?(.*?)"?\)$/.exec(L), im = url ? IMG.get(url[1]) : null;
    if (url && (!im || opt.noUrl)) continue;
    const sz = (sizes[i % sizes.length] || "auto").split(/\s+/), ps = (poss[i % poss.length] || "0% 0%").split(/\s+/), rep = reps[i % reps.length] || "repeat";
    const iw = im ? im.naturalWidth || im.width : w, ih = im ? im.naturalHeight || im.height : h;
    let tw = sz[0] === "auto" ? (sz[1] && sz[1] !== "auto" ? len(sz[1], h) * iw / ih : iw) : sz[0] === "cover" || sz[0] === "contain" ? w : len(sz[0], w);
    let th = (sz[1] || "auto") === "auto" ? (sz[0] === "auto" ? ih : tw * ih / iw) : len(sz[1], h);
    if (!url && sz[0] === "auto") { tw = w; th = h; }
    tw = Math.max(0.5, tw); th = Math.max(0.5, th);
    const ox = x + len(ps[0] || "0%", w - tw), oy = y + len(ps[1] || "0%", h - th);
    // 先把一格画在小 canvas 上（按 3 倍画，免得放大后发虚），再按重复方式铺开
    const k = 3, tile = document.createElement("canvas"); tile.width = Math.max(1, Math.round(tw * k)); tile.height = Math.max(1, Math.round(th * k));
    const q = tile.getContext("2d"); q.scale(tile.width / tw, tile.height / th);
    if (im) q.drawImage(im, 0, 0, tw, th);
    else if (L.startsWith("linear-gradient")) { const gr = linearGradient(q, L, 0, 0, tw, th); if (!gr) continue; q.fillStyle = gr; q.fillRect(0, 0, tw, th); }
    else if (L.startsWith("radial-gradient")) { const gr = radialGradient(q, L, tw, th); if (!gr) continue; q.fillStyle = gr; q.fillRect(0, 0, tw, th); }
    else continue;
    g.save(); roundRect(g, x, y, w, h, r); g.clip();
    const rx = /repeat-x|^repeat$|^repeat repeat$/.test(rep), ry = /repeat-y|^repeat$|^repeat repeat$/.test(rep);
    if (!rx && !ry) g.drawImage(tile, ox, oy, tw, th);
    else {
      const pat = g.createPattern(tile, rx && ry ? "repeat" : rx ? "repeat-x" : "repeat-y");
      pat.setTransform(new DOMMatrix([tw / tile.width, 0, 0, th / tile.height, ox, oy]));
      g.fillStyle = pat;
      g.fillRect(rx ? x : ox, ry ? y : oy, rx ? w : tw, ry ? h : th);
    }
    g.restore();
  }
}
// 要用到的 url() 背景图（data: 的 SVG 噪点图等）：先列出来（同步），再加载
function urlsOf(els) {
  const urls = new Set();
  for (const el of els) for (const w of [null, "::before", "::after"]) { const bi = getComputedStyle(el, w).backgroundImage; if (bi && bi.includes("url(")) for (const L of splitTop(bi)) { const m = /^url\("?(.*?)"?\)$/.exec(L); if (m && !IMG.has(m[1])) urls.add(m[1]); } }
  return [...urls];
}
const loadUrls = urls => Promise.all(urls.map(u => new Promise(res => { const im = new Image(); im.onload = () => { IMG.set(u, im); res(); }; im.onerror = () => res(); im.src = u; })));
// 一个框：背景色、背景渐变、四条边
function paintBox(g, cs, x, y, w, h, alpha, opt = {}) {
  if (w <= 0 || h <= 0) return;
  const r = radii(cs, w, h);
  g.save(); g.globalAlpha = alpha;
  if (cs.clipPath && cs.clipPath.startsWith("polygon(")) clipPolygon(g, cs.clipPath, x, y, w, h);
  const bg = parseColor(cs.backgroundColor);
  if (bg && bg.a > 0) { g.fillStyle = rgba(bg); roundRect(g, x, y, w, h, r); g.fill(); }
  if (cs.backgroundImage && cs.backgroundImage !== "none") paintLayers(g, cs, x, y, w, h, r, opt);
  const sides = [["Top", x, y, w, 0], ["Right", x + w, y, 0, h], ["Bottom", x, y + h, w, 0], ["Left", x, y, 0, h]];
  const same = ["Top", "Right", "Bottom", "Left"].every(s => cs[`border${s}Width`] === cs.borderTopWidth && cs[`border${s}Style`] === cs.borderTopStyle && cs[`border${s}Color`] === cs.borderTopColor);
  if (same && px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") {
    const bw = px(cs.borderTopWidth), c = parseColor(cs.borderTopColor);
    if (c && c.a > 0) { g.strokeStyle = rgba(c); g.lineWidth = bw; g.setLineDash(cs.borderTopStyle === "dashed" ? [bw * 3, bw * 2] : cs.borderTopStyle === "dotted" ? [bw, bw] : []);
      roundRect(g, x + bw / 2, y + bw / 2, w - bw, h - bw, r.map(v => Math.max(0, v - bw / 2))); g.stroke(); g.setLineDash([]); }
  } else for (const [s] of sides) {
    const bw = px(cs[`border${s}Width`]), st = cs[`border${s}Style`], c = parseColor(cs[`border${s}Color`]);
    if (!bw || st === "none" || !c || !c.a) continue;
    g.fillStyle = rgba(c);
    if (st === "dashed" || st === "dotted") {                            // 虚线：一段一段画
      const L = s === "Top" || s === "Bottom" ? w : h, dash = st === "dashed" ? bw * 3 : bw, gap = st === "dashed" ? bw * 2 : bw;
      for (let t = 0; t < L; t += dash + gap) { const d = Math.min(dash, L - t);
        if (s === "Top") g.fillRect(x + t, y, d, bw); else if (s === "Bottom") g.fillRect(x + t, y + h - bw, d, bw); else if (s === "Left") g.fillRect(x, y + t, bw, d); else g.fillRect(x + w - bw, y + t, bw, d); }
    } else {
      if (s === "Top") g.fillRect(x, y, w, bw); else if (s === "Bottom") g.fillRect(x, y + h - bw, w, bw); else if (s === "Left") g.fillRect(x, y, bw, h); else g.fillRect(x + w - bw, y, bw, h);
    }
  }
  g.restore();
}

// 元素自己的透明度（带 x3d 类的不算）一路乘到 root
function alphaOf(el, root) {
  let a = 1;
  for (let e = el; e && e !== root; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === "none") return 0;
    if (!e.classList?.contains("x3d")) a *= +cs.opacity;
  }
  return a;
}
// 字被谁裁：最近的 overflow 不是 visible 的祖先（含自己），到 root 为止；返回它的内框（相对 root）
function clipOf(el, root, R) {
  for (let e = el; e && e !== root.parentElement; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
      const r = e.getBoundingClientRect(), bl = px(cs.borderLeftWidth), bt = px(cs.borderTopWidth);
      return { x: r.left - R.left + bl, y: r.top - R.top + bt, w: e.clientWidth || r.width, h: e.clientHeight || r.height, el: e, cs };
    }
  }
  return null;
}

// 一段字：chars = [{ ch, x, y, w, h }]（相对 root），按网页的位置一个个画
function paintChars(g, chars, cs, alpha, clip) {
  if (!chars.length) return;
  const col = parseColor(cs.color); if (!col || !col.a) return;
  g.save(); g.globalAlpha = alpha; g.font = cs.font; g.fillStyle = rgba(col); g.textBaseline = "alphabetic";
  if (clip) { g.beginPath(); g.rect(clip.x, clip.y, clip.w, clip.h); g.clip(); }
  // 省略号：一行截断（text-overflow: ellipsis）或几行截断（-webkit-line-clamp）
  let list = chars;
  if (clip && (clip.cs.textOverflow === "ellipsis" || (clip.cs.webkitLineClamp && clip.cs.webkitLineClamp !== "none"))) {
    const inside = c => c.x + c.w <= clip.x + clip.w + 0.5 && c.y + c.h <= clip.y + clip.h + 0.5;
    const cut = list.findIndex(c => !inside(c));
    if (cut >= 0) {                                                      // 从第一个出界的字截断，最后一行留出省略号的位置
      const ell = "…", ew = g.measureText(ell).width, kept = list.slice(0, cut);
      while (kept.length && kept.at(-1).x + kept.at(-1).w + ew > clip.x + clip.w + 0.5) kept.pop();
      const prev = kept.at(-1); list = kept;
      if (prev) list.push({ ch: ell, x: prev.x + prev.w, y: prev.y, w: ew, h: prev.h });
    }
  }
  const strike = /line-through/.test(cs.textDecorationLine), under = /underline/.test(cs.textDecorationLine);
  const dc = parseColor(cs.textDecorationColor) || col;
  const f0 = list[0], onFirst = c => f0 && c.y + c.h / 2 > f0.y && c.y + c.h / 2 < f0.y + f0.h;   // 第一行：字框中线落在第一个字的框里（不同字体的框顶边会差一两像素）
  for (const c of list) {
    if (!c.ch.trim()) continue;
    if (cs.firstLineFont) g.font = onFirst(c) ? cs.firstLineFont : cs.font;   // ::first-line 的字号（便签第一行大一号）
    const m = g.measureText(c.ch), asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent, desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    const base = c.y + (c.h - (asc + desc)) / 2 + asc;                // 字框里按字体的上下高度居中
    g.fillText(c.ch, c.x, base);
  }
  if (strike || under) {                                                 // 删除线 / 下划线：每一行一条
    g.fillStyle = rgba(dc); const lw = Math.max(1, px(cs.fontSize) / 14);
    const lines = new Map(); for (const c of list) { const k = Math.round(c.y); const l = lines.get(k) || { x0: 1e9, x1: -1e9, y: c.y, h: c.h }; l.x0 = Math.min(l.x0, c.x); l.x1 = Math.max(l.x1, c.x + c.w); lines.set(k, l); }
    for (const l of lines.values()) g.fillRect(l.x0, strike ? l.y + l.h * 0.52 : l.y + l.h * 0.92, l.x1 - l.x0, lw);
  }
  g.restore();
}
// 文本节点里每个字的位置
function charsOfText(node, R) {
  const out = [], rg = document.createRange(), s = node.textContent;
  for (let i = 0; i < s.length;) {
    const cp = s.codePointAt(i), n = cp > 0xffff ? 2 : 1;
    rg.setStart(node, i); rg.setEnd(node, i + n);
    const rs = rg.getClientRects();
    if (rs.length) { const r = rs[0]; if (r.width > 0) out.push({ ch: s.slice(i, i + n), x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height }); }
    i += n;
  }
  return out;
}
// 输入框 / 多行输入框：做一个样式一样的隐形副本，问副本上每个字在哪
const COPY = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "fontStretch", "fontVariantNumeric", "letterSpacing", "wordSpacing", "textTransform", "textIndent", "textAlign",
  "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "boxSizing", "wordBreak", "overflowWrap", "tabSize", "direction"];
function charsOfField(el, cs, text, R) {
  const r = el.getBoundingClientRect(), m = document.createElement("div"), st = m.style;
  COPY.forEach(k => st[k] = cs[k]);
  Object.assign(st, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", margin: "0", borderStyle: "solid", borderColor: "transparent",
    visibility: "hidden", pointerEvents: "none", overflow: "hidden", boxSizing: "border-box" });
  st.textSpacingTrim = "space-all";                                    // 输入框里浏览器不压缩中文标点的间距，普通 div 里会压（"？提"会挤在一起），副本也不压
  if (el.tagName === "TEXTAREA") { st.whiteSpace = "pre-wrap"; if (cs.overflowWrap === "normal") st.overflowWrap = "break-word"; }
  else { st.whiteSpace = "pre"; const ch = r.height - px(cs.paddingTop) - px(cs.paddingBottom) - px(cs.borderTopWidth) - px(cs.borderBottomWidth); st.lineHeight = ch + "px"; }   // 单行输入框：字在内框里上下居中
  const t = document.createTextNode(text); m.appendChild(t); document.body.appendChild(m);
  const out = charsOfText(t, R); m.remove();
  const sy = el.scrollTop || 0, sx = el.scrollLeft || 0; out.forEach(c => { c.y -= sy; c.x -= sx; });
  return out;
}

// ::before / ::after（只画绝对定位的）
function paintPseudo(g, el, which, R, alpha, o = {}) {
  const cs = getComputedStyle(el, which);
  if (!cs.content || cs.content === "none" || cs.content === "normal" || cs.display === "none") return;
  if (o.skipPseudo && o.skipPseudo(el, which)) return;
  const a = alpha * (el.classList.contains("x3d") || el.classList.contains("x3dp") ? 1 : +cs.opacity); if (a < 0.01) return;   // 3D 开着时网页版的伪元素被设成透明，画贴图时当它不透明
  const er = el.getBoundingClientRect(), ecs = getComputedStyle(el);
  if (cs.position !== "absolute") {
    /* 横排弹性布局里的伪元素（栏标题两侧的细线：flex: 1）：::before 从内框左边到第一个内容的左边，::after 从最后一个内容的右边到内框右边，
       竖直方向按 align-self: center 放在内框正中。别的非绝对定位伪元素不画。 */
    if (!/flex/.test(ecs.display) || /column/.test(ecs.flexDirection)) return;
    const boxes = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width) boxes.push(r); }
      else if (n.nodeType === 1 && getComputedStyle(n).display !== "none") { const r = n.getBoundingClientRect(); if (r.width) boxes.push(r); }
    }
    if (!boxes.length) return;
    const cl = er.left + px(ecs.borderLeftWidth) + px(ecs.paddingLeft), cr = er.right - px(ecs.borderRightWidth) - px(ecs.paddingRight);
    const ct = er.top + px(ecs.borderTopWidth) + px(ecs.paddingTop), cb = er.bottom - px(ecs.borderBottomWidth) - px(ecs.paddingBottom);
    const gap = px(ecs.columnGap), h = px(cs.height) || 1;
    const x0 = which === "::before" ? cl + px(cs.marginLeft) : Math.max(...boxes.map(r => r.right)) + gap + px(cs.marginLeft);
    const x1 = which === "::before" ? Math.min(...boxes.map(r => r.left)) - gap - px(cs.marginRight) : cr - px(cs.marginRight);
    if (x1 - x0 < 1) return;
    paintBox(g, cs, x0 - R.left, ct + (cb - ct - h) / 2 - R.top, x1 - x0, h, a, o);
    return;
  }
  const pw = el.clientWidth || er.width, ph = el.clientHeight || er.height;  // 父元素的内框（含内边距）
  const ox = er.left - R.left + px(ecs.borderLeftWidth), oy = er.top - R.top + px(ecs.borderTopWidth);
  let w = cs.width.endsWith("px") ? px(cs.width) : NaN, h = cs.height.endsWith("px") ? px(cs.height) : NaN;
  const L = cs.left.endsWith("px") ? px(cs.left) : NaN, T = cs.top.endsWith("px") ? px(cs.top) : NaN, Rt = cs.right.endsWith("px") ? px(cs.right) : NaN, B = cs.bottom.endsWith("px") ? px(cs.bottom) : NaN;
  if (isNaN(w)) w = pw - (L || 0) - (Rt || 0); if (isNaN(h)) h = ph - (T || 0) - (B || 0);
  let x = !isNaN(L) ? L : !isNaN(Rt) ? pw - Rt - w : 0, y = !isNaN(T) ? T : !isNaN(B) ? ph - B - h : 0;
  x += ox + px(cs.marginLeft); y += oy + px(cs.marginTop);
  g.save();
  if (cs.transform && cs.transform !== "none") {                        // 绕自己的中心转（transform-origin 默认是中心）
    const m = /matrix\(([^)]+)\)/.exec(cs.transform);
    if (m) { const [a1, b1, c1, d1, e1, f1] = m[1].split(",").map(Number); const cx = x + w / 2, cy = y + h / 2; g.translate(cx + e1, cy + f1); g.transform(a1, b1, c1, d1, 0, 0); g.translate(-cx, -cy); }
  }
  paintBox(g, cs, x, y, w, h, a, o);
  g.restore();
}

// <svg> 图标：把算好的颜色写进去，变成图片再画
function svgImage(svg, cs) {
  const c = svg.cloneNode(true), r = svg.getBoundingClientRect();
  c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", r.width); c.setAttribute("height", r.height);
  c.setAttribute("style", `color:${cs.color}`);
  // 用到 currentColor 以外的继承颜色：把每个子元素算好的 fill / stroke 写成属性
  const src = svg.querySelectorAll("*"), dst = c.querySelectorAll("*");
  src.forEach((e, i) => { const s = getComputedStyle(e); dst[i].setAttribute("fill", s.fill); dst[i].setAttribute("stroke", s.stroke); if (s.strokeWidth) dst[i].setAttribute("stroke-width", s.strokeWidth); if (s.opacity !== "1") dst[i].setAttribute("opacity", s.opacity); });
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(c)], { type: "image/svg+xml" }));
  return new Promise(res => { const im = new Image(); im.onload = () => { URL.revokeObjectURL(url); res(im); }; im.onerror = () => { URL.revokeObjectURL(url); res(null); }; im.src = url; });
}

export async function paintDOM(root, o = {}) {
  const scale = o.scale || Math.min(2, devicePixelRatio || 1);
  // 量的时候先把 root 自己的旋转、位移去掉（小卡是斜着的；转角由 3D 物体自己转）
  // 量的时候先把 root 和 o.flatten 里各元素的变形（旋转、抬起时的透视倾斜）去掉；3D 物体自己会转、会弯
  const flat = [root, ...(o.flatten || [])].filter(Boolean), keep = flat.map(e => [e.style.transform, e.style.transition]);
  flat.forEach(e => { e.style.transition = "none"; e.style.transform = "none"; });
  const R0 = root.getBoundingClientRect().toJSON(), R = R0;
  const W = Math.max(1, Math.round(R.width * scale)), H = Math.max(1, Math.round(R.height * scale));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"); g.scale(scale, scale);
  const els = [root, ...root.querySelectorAll("*")], skipped = [];
  /* 用到的 url() 背景图要先加载。分三步，量和画那一段一口气做完、中间不让出（2026-11-03 修：原来在"临时恢复网页版样子"之后才去等图片，
     等的时候别的贴图画完把样子改了回去，便签页的软木板（当时还是软木）量到的是透明背景，贴图是空的）：
     ① 恢复网页版样子 → 记下要哪些图 → 马上还原（同步）；② 等图片加载（这时页面是平常的样子）；③ 再恢复样子，量、画，最后还原。 */
  if (!o.noUrl) {
    if (o.before) o.before();
    const urls = urlsOf(els);
    if (o.after) o.after();
    if (urls.length) {
      flat.forEach((e, i) => { e.style.transform = keep[i][0]; });
      await loadUrls(urls);
      flat.forEach(e => { e.style.transform = "none"; }); Object.assign(R0, root.getBoundingClientRect().toJSON());
    }
  }
  if (o.before) o.before();                                              // 量之前：调用方临时恢复网页版的样子（同步做完再还原，中间不刷新画面，所以不闪）
  const jobs = [];
  for (const el of els) {
    if (skipped.some(s => s.contains(el))) continue;
    if (el !== root && o.skip && o.skip(el)) { skipped.push(el); continue; }
    if (el instanceof SVGElement && el.ownerSVGElement) continue;        // svg 里面的东西跟着 svg 一起画
    const cs = getComputedStyle(el);
    if (cs.display === "none") { skipped.push(el); continue; }
    const a = alphaOf(el, root); if (a < 0.01) continue;
    const r = el.getBoundingClientRect(), x = r.left - R.left, y = r.top - R.top;
    if (el.tagName === "svg") { if (!o.noText && cs.visibility !== "hidden" && r.width > 0) jobs.push(svgImage(el, cs).then(im => im && (g.save(), g.globalAlpha = a, g.drawImage(im, x, y, r.width, r.height), g.restore()))); continue; }
    if (cs.visibility !== "hidden" && !(o.textOnly && el === root)) paintBox(g, cs, x, y, r.width, r.height, a, o);
    if (o.noText) continue;
    if (!o.textOnly || el !== root) { paintPseudo(g, el, "::before", R, a, o); paintPseudo(g, el, "::after", R, a, o); }
    if (cs.visibility === "hidden") continue;
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|search|url|email|tel|number|)$/.test(el.type))) {
      const empty = !el.value, pcs = empty ? getComputedStyle(el, "::placeholder") : cs, text = empty ? el.placeholder || "" : el.value;
      if (text) paintChars(g, charsOfField(el, cs, text, R), { font: cs.font, color: pcs.color, textDecorationLine: empty ? "none" : cs.textDecorationLine, textDecorationColor: cs.textDecorationColor, fontSize: cs.fontSize }, a, clipOf(el, root, R) || { x, y, w: r.width, h: r.height, cs });
      continue;
    }
    let tcs = cs;
    if (el.childNodes.length) {    // ::first-line 字号不同：画第一行时换字体
      const fl = getComputedStyle(el, "::first-line"); if (fl.font && fl.font !== cs.font) tcs = { font: cs.font, firstLineFont: fl.font, color: cs.color, textDecorationLine: cs.textDecorationLine, textDecorationColor: cs.textDecorationColor, fontSize: cs.fontSize };
    }
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) paintChars(g, charsOfText(n, R), tcs, a, clipOf(el, root, R));
  }
  if (o.after) o.after();
  flat.forEach((e, i) => { e.style.transform = keep[i][0]; }); root.getBoundingClientRect(); flat.forEach((e, i) => { e.style.transition = keep[i][1]; });   // 先恢复变形、让浏览器算一遍，再恢复过渡（免得触发一次动画）
  await Promise.all(jobs);
  return cv;
}
