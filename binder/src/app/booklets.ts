import { COVER_HEX } from "../book/cover-style";
import { COVER_MATERIALS, type CoverColor, type CoverFoil, type CoverMaterial } from "../book/cover";
import type { LayoutPreset } from "../book/layout";
import type { ItemKind, Profile } from "../profile/schema";
import type { Dict } from "./i18n";
import { deskCount } from "../desk/content";
import { MONTH } from "../desk/data";
import { TAB_IDS, type Tab } from "./types";

/*
 * 纸桌的四本册子（2026-11-02）。每本照作者的一种册子做（`kind`），封面颜色、烫印和默认材质也照那一种：
 *   项目卡册 proj     卡片册 cards        青磁 seiji、银烫、皮面；每页 2 × 4 张卡
 *   便签卡册 note     明信片册 postcards  銀鼠 ginnezu、素压、布面；每页 2 × 3 张明信片，正反两面
 *   车票卡册 ticket   车票 tickets        青磁、银烫、皮面（作者的卡片册封面）；每页 2 × 3 张 150 × 58 mm 的车票
 *   明信片卡册 postcard  明信片册 postcards  銀鼠、素压、布面
 * 名字、手册说明在 i18n.ts。作者原来的三本在 sasshi-original 分支。
 */

export type Booklet = {
  id: Tab;
  color: CoverColor;
  foil: CoverFoil;
  /** The material when the visitor has not picked one. */
  material: CoverMaterial;
  /** The Japanese local title (the English page's hashira and 題簽 slip); a Chinese page uses i18n's. */
  local: string;
  /** The albums' pocket grid (src/book/layout.ts); the ticket album brings its own (src/desk/tickets.ts). */
  layout?: LayoutPreset;
  /** Which of the author's albums it is drawn as: its faces, its handling line, its insets. */
  kind: "cards" | "postcards" | "tickets";
  /** 它属于哪个页面：左上角的返回箭头回到那里（和 album.html 的返回箭头一样；地址相对于 /binder/） */
  back: { href: string; label: string };
};

export const BOOKLETS: readonly Booklet[] = [
  { id: "proj", color: "seiji", foil: "silver", material: "leather", local: "项目卡册", layout: "idCard2x4", kind: "cards", back: { href: "../#board", label: "回到黑板" } },
  { id: "note", color: "ginnezu", foil: "blind", material: "cloth", local: "便签卡册", layout: "postcard2x3", kind: "postcards", back: { href: "../#notes", label: "回到软木板" } },
  { id: "ticket", color: "seiji", foil: "silver", material: "leather", local: "车票卡册", kind: "tickets", back: { href: "../focus.html", label: "回到站台" } },
  { id: "postcard", color: "ginnezu", foil: "blind", material: "cloth", local: "明信片卡册", layout: "postcard2x3", kind: "postcards", back: { href: "../receipt.html", label: "返回" } },
];

/** The local name of each pouch kind (the English page's; a Chinese page uses i18n's `held`). */
export const LOCAL_KIND: Record<ItemKind, string> = { card: "名刺", resume: "履歴書", ticket: "入場券", polaroid: "写真", note: "一筆箋" };

/** 返回箭头回哪里：从手账书架按月打开的回书架，否则回这本册子所属的页面 */
export const backOf = (id: Tab): { href: string; label: string } => (MONTH ? { href: "../journal.html", label: "回到书架" } : booklet(id).back);

export const booklet = (id: Tab): Booklet => BOOKLETS.find((b) => b.id === id) ?? BOOKLETS[0]!;

/** How many things a booklet holds (the count after its name). */
export function countOf(_profile: Profile, id: Tab): number {
  return deskCount(id);
}

/** The local title of a booklet (hashira, 題簽 slip): カード帖 / 絵葉書 / 履歴書, or 卡册 / 明信片 / 简历 for a Chinese page. */
export const localTitle = (t: Dict, id: Tab) => t.booklet[id].local;

export { COVER_MATERIALS as MATERIALS };
/** The swatch colours of a booklet's case: base (cloth, leather) and frost tint. The UI never invents its own. */
export const caseHex = (b: Booklet) => COVER_HEX[b.color];

const KEY = (id: Tab) => `sasshi:case:${id}`;

/** The visitor's material for each booklet (localStorage, every access in try/catch; defaults when blocked). */
export function readMaterials(): Record<Tab, CoverMaterial> {
  const out = {} as Record<Tab, CoverMaterial>;
  for (const id of TAB_IDS) {
    let m: CoverMaterial = booklet(id).material;
    try {
      const v = localStorage.getItem(KEY(id));
      if (v && (COVER_MATERIALS as readonly string[]).includes(v)) m = v as CoverMaterial;
    } catch {
      /* private window / blocked storage */
    }
    out[id] = m;
  }
  return out;
}

export function writeMaterial(id: Tab, m: CoverMaterial): void {
  try {
    localStorage.setItem(KEY(id), m);
  } catch {
    /* ignore */
  }
}
