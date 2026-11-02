import { createPocketGrid, type ContentSource, type PaintEnv, type SlotCell } from "../book/content/grid";
import { printWebOn } from "../book/content/paint";
import { HOLE_R, HOLE_X, MARGIN, POCKET_H, POCKET_W, CARD_H, CARD_W, RING_R, RING_WIRE, SEAM, type LayoutSpec } from "../book/layout";
import { caps, drawText, hashStr, inkTooth, makeCanvas, measure, mixHex, paintStock, PRINT, rng, runsOf, usePrintWeb, wrapText } from "../bag/objects/shared";
import type { FontRun } from "../fonts";
import type { TicketCard } from "./data";

/*
 * 车票卡册的卡面：作者拉链袋里那张入场券（src/bag/objects/ticket.ts 的 buildTicket）的正面画法，原样搬到卡袋里。
 * 150 × 58 mm 冷白卡纸；左边是正文，右边 34 mm 是藍色票根，中间一道打孔线（上下两个半圆缺口、一排真孔、顶上一小段撕口），
 * 票根外缘是从票本上撕下来的毛边；检票孔打穿。
 * 只换了内容：
 *   左上小字   雪国线 · 乘车券（作者：Ticket）           右上小字  2026 年 10 月
 *   大字       任务名（作者：活动名）                       大数字    日（作者也是日）
 *   引号里     起点 → 终点（作者：演讲题目）                大数字下  星期
 *   三栏       日期 / 发车 / 座位（作者：日期 / 入场 / 座位）
 *   底行       雪国线 · 12.5 km（作者：场馆 · 城市）
 *   票根       乘车凭证（作者：凭票入场），票号 No. 4821
 * 画法和尺寸一个数都没改（数字照 ticket.ts）。卡袋：每页 2 列 × 3 行，每个卡袋比票大一圈的余量和作者卡片册一样。
 */

const W = 150;
const H = 58;
/** 打孔线离左边的距离（mm） */
const PERF_X = 116;
const NOTCH = 2.4;
const BOARD = "#eef0ed";
/** 检票孔：圆心和半径（mm） */
const PUNCH = { x: 103, y: 47.5, r: 2.3 };
/** 画票时每毫米多少像素：卡袋那一页的贴图约 5.7 px/mm，8 够用 */
const PPM = 8;
const DAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const WORDS = { label: "雪国线 · 乘车券", date: "日期", time: "发车", seat: "座位", admit: "乘车凭证" };
const TORN_N = 116;

/** 车票卡册的卡袋：150 × 58 的票，每页 2 列 × 3 行；余量、缝、页边、打孔、金属环都照作者的卡片册 */
const pocket = { w: W + (POCKET_W - CARD_W), h: H + (POCKET_H - CARD_H) };
const pageH = MARGIN.top + 3 * pocket.h + 2 * SEAM + MARGIN.bottom;
const outer = pageH / 2 - 15.2;
export const TICKET_LAYOUT: LayoutSpec = {
  id: "deskTicket2x3",
  rows: 3,
  item: { w: W, h: H, r: 0.6 },
  itemMass: 0.0042,
  pocket,
  seam: SEAM,
  margin: MARGIN,
  hole: { x: HOLE_X, r: HOLE_R },
  rings: [-outer, -outer / 3, outer / 3, outer].map((y) => Math.round(y * 10) / 10),
  ring: { r: RING_R, wire: RING_WIRE },
  doubleSided: false,
  // 和作者的明信片册一样宽的页，用明信片册的贴图宽度
  texture: { width: [1920, 1280], window: 1 },
};

/** 一张票上印的字，换成作者入场券的字段 */
type Print = { id: string; event: string; talk: string; y: string; mo: number; d: string; wd: number; dateText: string; time: string; seat: string; where: string; serial: string };
const pad = (n: number) => String(n).padStart(2, "0");
function printOf(t: TicketCard): Print {
  const d = new Date(t.start || t.doneAt || Date.now());
  const stops = t.stops ?? [];
  return {
    id: t.id,
    event: t.name?.trim() || "先上车，再想",
    talk: stops.length ? `${stops[0]} → ${stops[stops.length - 1]}` : "",
    y: String(d.getFullYear()),
    mo: d.getMonth() + 1,
    d: String(d.getDate()),
    wd: d.getDay(),
    dateText: `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    seat: t.seat ?? "",
    where: ["雪国线", t.km != null ? `${t.km} km` : ""].filter(Boolean).join(" · "),
    serial: `No. ${t.no ?? String(Math.floor(rng(hashStr(t.id))() * 9999)).padStart(4, "0")}`,
  };
}

/** 每张票要用到的字（等字体下载好再画一遍） */
function runsFor(ps: Print[]): FontRun[] {
  const lang = "zh-CN";
  return ps.flatMap((p) => [
    ...runsOf("serif", 500, [p.event, p.d], lang),
    ...runsOf("serif", 400, [`「${p.talk}」`], lang),
    ...runsOf("sans", 500, [WORDS.label, WORDS.date, WORDS.time, WORDS.seat, WORDS.admit, `${p.y} 年 ${p.mo} 月`, DAYS_ZH[p.wd]], lang),
    ...runsOf("sans", 400, [p.dateText, p.time, p.seat, p.where, p.serial], lang),
  ]);
}

/** 票根外缘的毛边：照 ticket.ts 的 tornProfile（x 是离左边的毫米数，第 i 个点在离底边 0.5 + (H − 1)·i/TORN_N 毫米处） */
function tornProfile(seed: number): number[] {
  const r = rng(seed);
  const l1 = 4.2 + r() * 1.8;
  const l2 = 2.9 + r() * 0.7;
  const p1 = r() * Math.PI * 2;
  const p2 = r() * Math.PI * 2;
  const xs: number[] = [];
  let n = 0;
  for (let i = 0; i <= TORN_N; i++) {
    const y = 0.5 + ((H - 1) * i) / TORN_N;
    n = n * 0.7 + (r() - 0.5) * 0.12;
    xs.push(W - 0.62 + 0.28 * Math.sin((2 * Math.PI * y) / l1 + p1) + 0.16 * Math.sin((2 * Math.PI * y) / l2 + p2) + n);
  }
  return xs;
}

/** 画一张票的正面到 g 上（g 的单位是像素，每毫米 PPM 像素）。照 ticket.ts 的 paint() 正面部分，一步不少。 */
function paintFront(g: CanvasRenderingContext2D, p: Print, seed: number) {
  const PW = W * PPM;
  const PH = H * PPM;
  const mm = (v: number) => v * PPM;
  const lang = "zh-CN";
  const spot = PRINT.ai;
  const onSpot = "#f4f6f7";
  paintStock(g, PW, PH, { color: BOARD, seed, mottle: 2.4, grain: 2.4, tooth: 16 });
  const micro = (s: string, x: number, y: number, align: CanvasTextAlign = "left", color: string = PRINT.muted) => {
    const han = /\p{Script=Han}/u.test(s);
    const px = mm(han ? 2.05 : 1.6);
    drawText(g, caps(s), mm(x), mm(y), { role: "sans", px, weight: 500, color, align, ls: px * (han ? 0.1 : 0.18), lang });
  };
  const x0 = 8;
  const right = PERF_X - 8;
  // 抬头：是什么票，哪年哪月
  micro(WORDS.label, x0, 10.6);
  micro(`${p.y} 年 ${p.mo} 月`, right, 10.6, "right");
  // 右上的大数字（日），下面是星期
  const numW = 30;
  {
    const px = mm(21);
    const dw = measure(g, p.d, { role: "serif", weight: 500, ls: -mm(0.3), lang }, px);
    drawText(g, p.d, mm(right) - dw, mm(31.2), { role: "serif", px, weight: 500, color: PRINT.ink, ls: -mm(0.3), lang });
    micro(DAYS_ZH[p.wd] ?? "", right, 35.4, "right");
  }
  // 任务名和路线：放得下就一行（字号最小缩到 70 %），否则两行小一号
  const evW = right - x0 - numW;
  const evFont = { role: "serif" as const, weight: 500, ls: -mm(0.05), lang };
  const full = measure(g, p.event, evFont, mm(8.6));
  const one = full <= mm(evW) / 0.7;
  const ev = one ? { lines: [p.event], px: Math.min(mm(8.6), (mm(8.6) * mm(evW)) / full) } : wrapText(g, p.event, evFont, mm(6.4), mm(evW), 2);
  const evBase = one ? 23 : 18;
  ev.lines.forEach((ln, i) => drawText(g, ln, mm(x0 - 0.4), mm(evBase) + i * ev.px * 1.1, { ...evFont, px: ev.px, color: PRINT.ink }));
  if (p.talk) drawText(g, `「${p.talk}」`, mm(x0 - 1.6), mm(one ? 30.4 : 31.6), { role: "serif", px: mm(3.6), weight: 400, color: PRINT.ink2, maxW: mm(evW), lang });
  // 一道细线，下面三栏
  g.fillStyle = PRINT.rule;
  g.fillRect(mm(x0), mm(37.6), mm(right - x0), mm(0.16));
  const value = (s: string, x: number, maxW: number) => drawText(g, s, mm(x), mm(47.4), { role: "sans", px: mm(3), weight: 400, color: PRINT.ink, maxW: mm(maxW), lang });
  const fx = [x0, x0 + 44, x0 + 66] as const;
  micro(WORDS.date, fx[0], 42.2);
  value(p.dateText, fx[0], 41);
  micro(WORDS.time, fx[1], 42.2);
  value(p.time, fx[1], 20);
  if (p.seat) {
    micro(WORDS.seat, fx[2], 42.2);
    value(p.seat, fx[2], right - fx[2] - 8);
  }
  // 底行：线路和里程
  if (p.where) drawText(g, p.where, mm(x0), mm(53.4), { role: "sans", px: mm(2.5), weight: 400, color: PRINT.muted, ls: mm(0.04), maxW: mm(PUNCH.x - PUNCH.r - x0 - 4), lang });
  // 检票孔周围被切开的纤维：一圈很淡的环
  g.strokeStyle = "rgba(40,52,66,0.18)";
  g.lineWidth = mm(0.18);
  g.beginPath();
  g.arc(mm(PUNCH.x), mm(PUNCH.y), mm(PUNCH.r + 0.08), 0, Math.PI * 2);
  g.stroke();
  // 沿打孔线印的一排淡导线
  g.fillStyle = "rgba(28,35,43,0.14)";
  for (let y = 4; y < H - 4; y += 2.2) g.fillRect(mm(PERF_X) - mm(0.07), mm(y), mm(0.14), mm(1.1));
  inkTooth(g, PW, PH, BOARD, seed ^ 0x77, 0.2, 0.05);

  // 票根：专色，和墨色差一丝套印；竖排"乘车凭证"
  const sx = PERF_X + 0.35;
  g.fillStyle = spot;
  g.fillRect(mm(sx), 0, PW - mm(sx), PH);
  const sheen = g.createLinearGradient(mm(sx), 0, PW, 0);
  sheen.addColorStop(0, "rgba(255,255,255,0.04)");
  sheen.addColorStop(1, "rgba(21,35,58,0.06)");
  g.fillStyle = sheen;
  g.fillRect(mm(sx), 0, PW - mm(sx), PH);
  g.save();
  g.translate(mm(sx), 0);
  inkTooth(g, PW - mm(sx), PH, mixHex(spot, "#ffffff", 0.16), seed ^ 0x78, 0.25, 0.04);
  g.restore();
  const ax = PERF_X + 9.6;
  {
    const chars = Array.from(WORDS.admit);
    const px = mm(2.8);
    const step = px * 1.5;
    const y0 = mm(H / 2) - (step * (chars.length - 1)) / 2 + px * 0.36;
    chars.forEach((ch, i) => drawText(g, ch, mm(ax), y0 + i * step, { role: "sans", px, weight: 500, color: onSpot, align: "center", lang }));
  }
  // 票号：小字，沿票根外侧竖着
  g.save();
  g.translate(mm(W - 6.4), mm(H / 2));
  g.rotate(-Math.PI / 2);
  drawText(g, p.serial, 0, 0, { role: "sans", px: mm(1.8), weight: 400, color: onSpot, align: "center", ls: mm(0.2), alpha: 0.72, lang });
  g.restore();
  // 撕口：墨断开的地方露出卡纸的白芯，约 0.3 mm 宽，带几根翘起的纤维
  const edge = tornProfile(seed);
  const r = rng(seed ^ 0x7e);
  const yAt = (i: number) => mm(H - 0.5 - ((H - 1) * i) / TORN_N);
  g.fillStyle = "#f4f5f2";
  g.beginPath();
  g.moveTo(PW, yAt(0) + mm(1));
  let wob = 0;
  for (let i = 0; i <= TORN_N; i++) {
    wob = wob * 0.6 + (r() - 0.5) * 0.14;
    g.lineTo(mm(edge[i]! - 0.3 - wob), yAt(i));
  }
  g.lineTo(PW, yAt(TORN_N) - mm(1));
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(244,245,242,0.7)";
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const k = Math.floor(r() * TORN_N);
    const x = mm(edge[k]! - 0.3);
    const y = yAt(k);
    const l = mm(0.25 + r() * 0.35);
    g.lineWidth = mm(0.05 + r() * 0.04);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - l, y + (r() - 0.5) * l * 0.8);
    g.stroke();
  }
  // 检票孔的内壁：孔口左上一道细细的阴影（光从右上来）
  g.save();
  g.lineCap = "round";
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = `rgba(21,35,58,${(0.18 * (3 - k)) / 3})`;
    g.lineWidth = mm(0.3 - k * 0.06);
    g.beginPath();
    g.arc(mm(PUNCH.x), mm(PUNCH.y), mm(PUNCH.r + 0.15), Math.PI * (0.92 + k * 0.08), Math.PI * (1.62 - k * 0.08));
    g.stroke();
  }
  g.restore();
}

/**
 * 剪出票的形状（照 ticket.ts 的 ticketOutline 和遮罩）：左边两个 0.6 mm 圆角，打孔线上下各一个半圆缺口，右边是撕口；
 * 再打穿打孔线上的一排孔（半径 0.42 mm、每 2.2 mm 一个）、顶上一小段撕口、检票孔。坐标是毫米，y 向下。
 */
function cutOut(g: CanvasRenderingContext2D, seed: number) {
  const mm = (v: number) => v * PPM;
  const edge = tornProfile(seed);
  const yUp = (i: number) => H - (0.5 + ((H - 1) * i) / TORN_N);
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  g.moveTo(mm(0.6), 0);
  g.lineTo(mm(PERF_X - NOTCH), 0);
  g.arc(mm(PERF_X), 0, mm(NOTCH), Math.PI, 0, true);
  g.lineTo(mm(edge[TORN_N]!), 0);
  for (let i = TORN_N; i >= 0; i--) g.lineTo(mm(edge[i]!), mm(yUp(i)));
  g.lineTo(mm(edge[0]!), mm(H));
  g.lineTo(mm(PERF_X + NOTCH), mm(H));
  g.arc(mm(PERF_X), mm(H), mm(NOTCH), 0, Math.PI, true);
  g.lineTo(mm(0.6), mm(H));
  g.quadraticCurveTo(0, mm(H), 0, mm(H - 0.6));
  g.lineTo(0, mm(0.6));
  g.quadraticCurveTo(0, 0, mm(0.6), 0);
  g.closePath();
  g.fillStyle = "#000";
  g.fill();
  g.globalCompositeOperation = "destination-out";
  // 打孔线上的孔（从底边往上 4.2 mm 起，每 2.2 mm 一个，到离顶边 4 mm 为止）
  for (let ymm = 4.2; ymm < H - 4; ymm += 2.2) {
    g.beginPath();
    g.arc(mm(PERF_X), mm(H - ymm), mm(0.42), 0, Math.PI * 2);
    g.fill();
  }
  // 顶上缺口往下撕开的一小段：一条参差的细缝，穿过头两个孔
  const tear = rng(seed ^ 0x7ea);
  const top = NOTCH - 0.4;
  const pts: [number, number][] = [];
  for (let k = 0; k <= 8; k++) pts.push([PERF_X + (0.12 + tear() * 0.12) * (k % 2 ? 1 : -1), top + (k * 5.4) / 8]);
  g.beginPath();
  g.moveTo(mm(PERF_X - 0.5), mm(top - 0.6));
  for (const [x, y] of pts) g.lineTo(mm(x - 0.08), mm(y));
  for (const [x, y] of pts.slice().reverse()) g.lineTo(mm(x + 0.09), mm(y));
  g.lineTo(mm(PERF_X + 0.5), mm(top - 0.6));
  g.closePath();
  g.fill();
  // 检票孔
  g.beginPath();
  g.arc(mm(PUNCH.x), mm(PUNCH.y), mm(PUNCH.r), 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** 画票用的草稿画布（所有票共用一块） */
let scratch: { c: HTMLCanvasElement; g: CanvasRenderingContext2D } | null = null;

type Item = { id: string; label: string; p: Print; seed: number };

function paintTicket(ctx: CanvasRenderingContext2D, it: Item, cell: SlotCell, env: PaintEnv) {
  // 卡面的字用 bag/objects/shared 的画字函数，它有自己的"改用网页字体"开关：卡袋这边（book/content/paint）一换成网页字体，这边也换
  if (printWebOn()) usePrintWeb();
  scratch ??= makeCanvas(W * PPM, H * PPM);
  const { c, g } = scratch;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.clearRect(0, 0, c.width, c.height);
  paintFront(g, it.p, it.seed);
  cutOut(g, it.seed);
  const r = cell.place;
  const k = env.pxPerMm;
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.rotate(r.tilt);
  ctx.translate(-r.w / 2, -r.h / 2);
  // 票在卡袋里的影子（和作者明信片在卡袋里的影子一样：蓝黑、1.3 mm 模糊、往下 0.28 mm），跟着票的轮廓和孔
  ctx.shadowColor = "rgba(21,35,58,0.26)";
  ctx.shadowBlur = 1.3 * k;
  ctx.shadowOffsetY = 0.28 * k;
  ctx.drawImage(c, 0, 0, r.w, r.h);
  ctx.restore();
}

/** 车票卡册的内容 */
export function createTicketContent(tickets: readonly TicketCard[]): ContentSource {
  const items: Item[] = tickets.map((t) => {
    const p = printOf(t);
    return { id: t.id, label: p.event, p, seed: hashStr(t.id + p.event) };
  });
  return createPocketGrid<Item>({ items, layout: TICKET_LAYOUT, paint: paintTicket, fonts: runsFor(items.map((i) => i.p)) });
}
