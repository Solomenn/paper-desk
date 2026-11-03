/*
 * 纸桌：手账书架上的实体卡册（2026-11-03）。手账页（journal.html）把这几本合上的活页夹插在 3D 书架上，书脊朝外；
 * 外壳就是这里打开时的那一本：同一份 createBinder（binder.ts）、同一套封面设定（booklets.ts 的颜色、烫印；材质用访客在这里选过的，
 * 没选过用默认）、同样的厚度（卡数 deskCount → 版式的页数 sheetCount）、同样的板子尺寸（版式的页面大小 segOf，和 scene.ts 一样传进去；
 * 不传的话板子按默认卡页的高度做，金属底座和环按版式的页高做，会从书的上下两头戳出来）。合上：pose(0)。
 * 书脊上的烫印（spineFoil）是这里加的：原版的书脊是素的，插在书架上只看得见书脊；用的是封面烫印同一种材质（金、银或压印），竖排册名。
 * 单独构建成 dist/shelf.js（vite.shelf.config.ts），three.js 不打包进去，用手账页地址映射里的那一份。
 */
import * as THREE from "three";
import { caseFontRuns, createBinder, type Binder, type CaseSpec } from "./book/binder";
import type { CoverSpec } from "./book/cover";
import { resolveLayout } from "./book/layout";
import { segOf } from "./book/sheet";
import { boxBlur, heightToNormal } from "./book/textures";
import { booklet, readMaterials } from "./app/booklets";
import { contentFor, deskCount } from "./desk/content";
import { ensureFonts, stack, type FontRun } from "./fonts";
import type { Tab } from "./app/types";

/** 册子的中文名（封面烫印、题签；同 i18n 里中文页面的册名） */
const TITLE: Record<Tab, string> = { proj: "项目卡册", note: "便签卡册", ticket: "车票卡册", postcard: "明信片卡册" };

export type Closed = { binder: Binder; sheets: number; count: number; title: string; kase: CaseSpec };

/** 一本合上的卡册：group 是 three.js 物体（单位同 binder 场景：0.01 = 1 mm），sheets 是页数 */
export function closedBinder(tab: Tab, maxAniso = 8): Closed {
  const b = booklet(tab);
  const content = contentFor(tab);
  const layout = resolveLayout(b.layout ?? content.layout);             // 车票册的版式写在它的内容里（LayoutSpec），要先换算
  const count = deskCount(tab);
  const sheets = layout.sheetCount(count);
  const title = TITLE[tab];
  const material = readMaterials()[tab];
  const cover: CoverSpec = { material, color: b.color, foil: b.foil, window: null, title };
  const kase: CaseSpec = material === "frost" ? {} : { slip: { title: b.local, han: "zh-Hans" } };
  const binder = createBinder({ sheets, cover, title, windowCard: null, maxAniso, layout, seg: segOf(layout), case: kase });
  binder.pose(0);
  return { binder, sheets, count, title, kase };
}

/** 碎碎念（手账）那一本：没有对应的卡册页，用同样的活页夹，封面设定另给（沙色布面、金色烫印） */
export function closedJournal(months: number, maxAniso = 8): Closed {
  const layout = resolveLayout("idCard2x4");
  const sheets = Math.max(1, months);
  const title = "碎碎念";
  const cover: CoverSpec = { material: "cloth", color: "sand", foil: "gold", window: null, title };
  const kase: CaseSpec = { slip: { title, han: "zh-Hans" } };
  const binder = createBinder({ sheets, cover, title, windowCard: null, maxAniso, layout, seg: segOf(layout), case: kase });
  binder.pose(0);
  return { binder, sheets, count: months, title, kase };
}

const SPINE_FONT = () => stack("serif", "zh-Hans");
/** 书脊烫印要用的字：先等网页字体到了再画（canvas 画字不会自己去下载字体；没到时画出来是系统字体） */
export async function fontsFor(c: Closed, spineTexts: string[]): Promise<void> {
  const runs: FontRun[] = [...caseFontRuns(c.title, c.kase), { role: "serif", weight: 500, text: spineTexts.join(""), han: "zh-Hans" }];
  await ensureFonts(runs);
  c.binder.repaint();                                                    // 封面烫印、题签按到了的字体重画
}

/**
 * 书脊烫印：w × h（m）的一块，竖排册名（horiz 为真时横排，给平放的书），上下各一道细线，最下面一行小字。
 * 材质是这本封面烫印那一份（找封面上烫印的那块网格，复制它的材质，换上这里画的字形和压痕法线图）：金、银、或者压印（blind）。
 */
export function spineFoil(c: Closed, title: string, sub: string, w: number, h: number, horiz = false): THREE.Mesh | null {
  let src: THREE.MeshPhysicalMaterial | null = null;
  c.binder.group.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
    if (!src && m && m.isMeshPhysicalMaterial && m.alphaMap && m.normalMap && m.depthWrite === false) src = m;
  });
  if (!src) return null;
  const k = 10;                                                           // 每 mm 10 个像素
  const W = Math.round(w * 1000 * k), H = Math.round(h * 1000 * k);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.scale(k, k);
  const wm = W / k, hm = H / k;                                           // 下面的单位都是 mm
  const font = SPINE_FONT();
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (!horiz) {
    const fs = Math.min(wm * 0.5, (hm - 30) / Math.max(4, title.length) / 1.18);
    g.fillRect(wm * 0.2, 4, wm * 0.6, 0.45);                              // 上面一道细线
    g.font = `500 ${fs}px ${font}`;
    const top = 14, step = fs * 1.18;
    [...title].forEach((ch, i) => g.fillText(ch, wm / 2, top + fs / 2 + i * step));
    g.font = `500 ${Math.min(3.4, wm * 0.22)}px ${font}`;
    g.fillText(sub, wm / 2, hm - 10);
    g.fillRect(wm * 0.2, hm - 4.45, wm * 0.6, 0.45);                      // 下面一道细线
  } else {
    const fs = Math.min(hm * 0.42, (wm - 50) / Math.max(4, title.length) / 1.05);
    g.fillRect(4, hm * 0.2, 0.45, hm * 0.6);
    g.font = `500 ${fs}px ${font}`;
    g.fillText(title, wm / 2, hm / 2);
    g.textAlign = "right";
    g.font = `500 ${Math.min(3.4, hm * 0.22)}px ${font}`;
    g.fillText(sub, wm - 10, hm / 2);
    g.fillRect(wm - 4.45, hm * 0.2, 0.45, hm * 0.6);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  // 压痕：字略低于布面、边缘稍软（同封面烫印的做法：字形当高度图，模糊一点，再算法线）
  const data = g.getImageData(0, 0, W, H).data;
  let hf = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) hf[i] = 1 - data[i * 4 + 3]! / 255;
  hf = boxBlur(hf, W, H, Math.max(1, Math.round(k * 0.12)));
  const alpha = new THREE.CanvasTexture(cv);
  const normal = new THREE.CanvasTexture(heightToNormal(hf, W, H, 3, false));
  alpha.anisotropy = normal.anisotropy = 8;
  const mat = (src as THREE.MeshPhysicalMaterial).clone();
  mat.alphaMap = alpha;
  mat.normalMap = normal;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}
