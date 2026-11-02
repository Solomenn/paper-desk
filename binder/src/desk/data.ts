/*
 * 纸桌的四本册子读什么数据：和 album.html 读的是同一份（同一个网站，浏览器里的数据共用）。
 *   项目卡册 proj     paper-desk.desk-tasks.v1 里的 done：黑板上做完的项目卡
 *   便签卡册 note     paper-desk.notes-archive.v1：软木板上归档的便签
 *   车票卡册 ticket   paper-desk.tickets.v1：雪国线坐完的车票
 *   小票卡册 receipt  paper-desk.receipts.v1：receipt.html 打印后收进来的小票，一天一张
 * 每张都补一个 doneAt（完成、归档、到站、打印的时刻），按它从早到晚排。
 * 项目卡册和便签卡册没有数据时，用 album.html 里同样的示例；车票卡册和小票卡册没有数据就是空册子。
 * 页面打开时读一次（DESK），之后不再读。
 */

export type DeskTab = "proj" | "note" | "ticket" | "receipt";

export type ProjCard = { id: string; cat?: string; title?: string; goal?: string; minutes?: number; doneAt: number };
export type NoteCard = { id: string; cat?: string; text?: string; doneAt: number };
export type TicketCard = {
  id: string; name?: string; stops?: string[]; minutes: number; start?: number; endAt?: number; seat?: string; no?: string; km?: number; doneAt: number;
};
export type ReceiptCard = { id: string; date?: string; img: string; store?: string; done?: number; total?: number; doneAt: number };

export type Desk = { proj: ProjCard[]; note: NoteCard[]; ticket: TicketCard[]; receipt: ReceiptCard[] };

function getJ(k: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "null");
  } catch {
    return null;
  }
}
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : []);
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
const byTime = <T extends { doneAt: number }>(a: T[]) => a.sort((x, y) => x.doneAt - y.doneAt);

function read(): Desk {
  const tasks = getJ("paper-desk.desk-tasks.v1") as { done?: unknown } | null;
  let proj = list(tasks?.done).map((c, i) => ({ ...c, id: String(c.id ?? `p${i}`), doneAt: num(c.doneAt) }) as ProjCard);
  let note = list(getJ("paper-desk.notes-archive.v1")).map((n, i) => ({ ...n, id: String(n.id ?? `n${i}`), doneAt: num(n.archivedAt ?? n.createdAt) }) as NoteCard);
  const ticket = list(getJ("paper-desk.tickets.v1")).map((t, i) => ({ ...t, id: String(t.id ?? t.no ?? `t${i}`), minutes: num(t.minutes), doneAt: num(t.endAt ?? t.end) }) as TicketCard);
  const receipt = list(getJ("paper-desk.receipts.v1"))
    .filter((r) => typeof r.img === "string")
    .map((r, i) => ({ ...r, id: String(r.date ?? `r${i}`), doneAt: num(r.at) }) as ReceiptCard);
  if (!proj.length) proj = demoProj();
  if (!note.length) note = demoNotes();
  return { proj: byTime(proj), note: byTime(note), ticket: byTime(ticket), receipt: byTime(receipt) };
}

/* 示例：和 album.html 的 demoCards / demoNotes 一样 */
function demoNotes(): NoteCard[] {
  const day = 864e5, now = Date.now();
  const rows: [string, string][] = [
    ["work", "周五前交稿\n先搭结构，再填内容。"], ["life", "买猫粮\n灯泡 3000K · 胶带"], ["idea", "便签收进右边缘\n像本子侧面的索引贴。"],
    ["study", "《深度工作》第 3 章\n记下三个可执行的点"], ["life", "周末去植物园\n下雨就改拼图"], ["work", "会议纪要 10/26\n结论：先做性能基线"],
  ];
  return rows.map(([cat, text], i) => ({ id: `dn${i}`, cat, text, doneAt: now - (6 - i) * day }));
}
function demoProj(): ProjCard[] {
  const day = 864e5, now = Date.now();
  const rows: [string, string, string][] = [
    ["work", "回三封邮件", "清空收件箱里需要回复的。"], ["work", "会议纪要 10/26", "结论和负责人写清楚。"],
    ["study", "《深度工作》第 3 章", "记下三个能马上用的点。"], ["life", "周末去植物园", "看温室，下雨就改拼图。"],
    ["idea", "任务卡做成正反面", "正面目标，背面条件。"], ["work", "周报", "写清楚推进了什么、卡在哪。"],
    ["life", "买猫粮", "灯泡 3000K · 胶带"], ["study", "研究生产力爆款笔记", "找出它的开头为什么能吸引读者继续看。"],
    ["idea", "便签收进右边缘", "像本子侧面的索引贴。"],
  ];
  return rows.map(([cat, title, goal], i) => ({ id: `demo${i}`, cat, title, goal, minutes: 25, doneAt: now - (9 - i) * day }));
}

export const DESK: Desk = typeof localStorage === "undefined" ? { proj: [], note: [], ticket: [], receipt: [] } : read();
