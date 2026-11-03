/*
 * 纸桌：手账书架上的实体卡册（2026-11-03）。手账页（journal.html）把这几本合上的活页夹插在 3D 书架上，书脊朝外；
 * 外壳就是这里打开时的那一本：同一份 createBinder（binder.ts）、同一套封面设定（booklets.ts 的材质、颜色、烫印）、
 * 同样的厚度（卡数 deskCount → 版式的页数 sheetCount）、同样的板子尺寸（版式的页面大小 segOf，和 scene.ts 一样传进去；
 * 不传的话板子按默认卡页的高度做，金属底座和环按版式的页高做，会从书的上下两头戳出来）。合上：pose(0)。
 * 单独构建成 dist/shelf.js（vite.shelf.config.ts），three.js 不打包进去，用手账页地址映射里的那一份。
 */
import { createBinder, type Binder } from "./book/binder";
import type { CoverSpec } from "./book/cover";
import { resolveLayout } from "./book/layout";
import { segOf } from "./book/sheet";
import { booklet } from "./app/booklets";
import { contentFor, deskCount } from "./desk/content";
import type { Tab } from "./app/types";

/** 册子的中文名（封面烫印、题签；同 i18n 里中文页面的册名） */
const TITLE: Record<Tab, string> = { proj: "项目卡册", note: "便签卡册", ticket: "车票卡册", postcard: "明信片卡册" };

/** 一本合上的卡册：group 是 three.js 物体（单位 m，同 binder 场景），sheets 是页数 */
export function closedBinder(tab: Tab, maxAniso = 8): { binder: Binder; sheets: number; count: number } {
  const b = booklet(tab);
  const content = contentFor(tab);
  const layout = resolveLayout(b.layout ?? content.layout);             // 车票册的版式写在它的内容里（LayoutSpec），要先换算
  const count = deskCount(tab);
  const sheets = layout.sheetCount(count);
  const title = TITLE[tab];
  const cover: CoverSpec = { material: b.material, color: b.color, foil: b.foil, window: null, title };
  const kase = b.material === "frost" ? undefined : { slip: { title: b.local, han: "zh-Hans" as const } };
  const binder = createBinder({ sheets, cover, title, windowCard: null, maxAniso, layout, seg: segOf(layout), ...(kase ? { case: kase } : {}) });
  binder.pose(0);
  return { binder, sheets, count };
}

/** 碎碎念（手账）那一本：没有对应的卡册页，用同样的活页夹，封面设定另给（沙色布面、金色烫印） */
export function closedJournal(months: number, maxAniso = 8): { binder: Binder; sheets: number } {
  const layout = resolveLayout("idCard2x4");
  const sheets = Math.max(1, months);
  const cover: CoverSpec = { material: "cloth", color: "sand", foil: "gold", window: null, title: "碎碎念" };
  const binder = createBinder({ sheets, cover, title: "碎碎念", windowCard: null, maxAniso, layout, seg: segOf(layout), case: { slip: { title: "碎碎念", han: "zh-Hans" } } });
  binder.pose(0);
  return { binder, sheets };
}
