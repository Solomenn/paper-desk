import type { ContentSource } from "../book/content/grid";
import { createCardContent } from "../book/content/cards";
import { createPostcardContent, type PostcardItem } from "../book/content/postcards";
import type { AlbumCard } from "../profile/schema";
import { DESK, type DeskTab } from "./data";
import { createTicketContent } from "./tickets";

/*
 * 把纸桌的数据交给作者原来的卡面画法（用户 2026-11-02 定）：
 *   项目卡册 → 卡片册的色卡（2 × 4）：底色 = 类别色，左下 = 项目名，右上 = 编号
 *   便签卡册 → 明信片册（2 × 3，正反两面）：正面 = 类别色的风景画，背面手写 = 便签文字，邮戳 = 类别和归档日期
 *   车票卡册 → 车票原尺寸 150 × 58 mm 的卡袋（2 × 3），卡面 = 作者拉链袋里入场券的画法（tickets.ts）
 *   明信片卡册 → 明信片册：正面 = 着色的风景画，背面 = 当天完成几件，邮戳 = 店名和日期
 */

/** 类别色（album.html 的 CAT_C）和类别名 */
const CAT_C: Record<string, string> = { work: "#f3e2a1", life: "#cfe4cf", idea: "#f3cabb", study: "#cddbe9" };
const CAT_NAME: Record<string, string> = { work: "工作", life: "生活", idea: "想法", study: "学习" };
const FROM = "纸桌";
/** 时间戳 → "2026-11-02"（明信片邮戳读这个格式） */
const ymd = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** 项目卡册的色卡 */
export const projCards: AlbumCard[] = DESK.proj.map((p) => ({ id: p.id, label: p.title?.trim() || "（未命名）", color: CAT_C[p.cat ?? ""] ?? CAT_C.work, ...(p.goal ? { note: p.goal } : {}) }));

/** 便签卡册的明信片 */
export const notePostcards: PostcardItem[] = DESK.note.map((n) => {
  const cat = CAT_NAME[n.cat ?? ""] ?? CAT_NAME.work!;
  const first = (n.text ?? "").split("\n")[0]?.trim() || cat;
  return { id: n.id, label: cat, color: CAT_C[n.cat ?? ""] ?? CAT_C.work, message: (n.text ?? "").trim() || first, from: FROM, place: cat, date: ymd(n.doneAt) };
});

/** 明信片卡册的明信片：正面风景画的颜色按四个类别色轮流 */
const DAY_TINTS = [CAT_C.study!, CAT_C.life!, CAT_C.work!, CAT_C.idea!];
export const dayPostcards: PostcardItem[] = DESK.postcard.map((r, i) => {
  const store = r.store?.trim() || "今天便利店";
  const message = r.total ? `今天完成 ${r.done ?? 0} / ${r.total} 件。` : "今天的明信片。";
  return { id: r.id, label: store, color: DAY_TINTS[i % DAY_TINTS.length], message, from: FROM, place: store, date: r.date ?? ymd(r.doneAt) };
});

/** 每本册子的卡数（目录里名字后面的数字） */
export const deskCount = (tab: DeskTab): number => DESK[tab].length;

/** 每本册子的卡面内容：只做一次 */
const made = new Map<DeskTab, ContentSource>();
export function contentFor(tab: DeskTab): ContentSource {
  let c = made.get(tab);
  if (!c) {
    c =
      tab === "proj"
        ? createCardContent(projCards, "idCard2x4")
        : tab === "note"
          ? createPostcardContent(notePostcards, "postcard2x3")
          : tab === "postcard"
            ? createPostcardContent(dayPostcards, "postcard2x3")
            : createTicketContent(DESK.ticket);
    made.set(tab, c);
  }
  return c;
}

/** 当前这本册子的卡交给作者的"取出细看"（AlbumDetail 读 profile.albums）：项目卡册放进 cards，便签和明信片放进 postcards；车票不取出 */
export function albumsFor(tab: DeskTab): { cards: AlbumCard[]; postcards: PostcardItem[] } {
  return { cards: tab === "proj" ? projCards : [], postcards: tab === "note" ? notePostcards : tab === "postcard" ? dayPostcards : [] };
}
