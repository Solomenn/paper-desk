/* wall3d.js：卡册、手账、小票这几页的背景墙（2026-11-03，用户："我一直以为是真实光……用主页光"）。
   原来是 room.js 按入口页的公式画的一张平面图（SVG，颜色从截图量的）——形状对，但不是照出来的。
   现在用 room3d.js 渲染：和入口页同一面墙、同一扇百叶窗、同一个太阳、同样的软影、反射光、高光溢出、光柱、浮尘、胶片感、ACES。
   这几页墙前面没有 3D 物件，只画墙；画面和墙的对应同入口页（画面宽 2.536 m，正中对着墙上 (0, YC)）。
   没有 WebGL 时什么都不做，room.js 画的那张平面图留着当替补。 */
import { createRoom3D } from "./room3d.js";

const okGL = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
if (okGL) {
  const canvas = Object.assign(document.createElement("canvas"), { id: "gl3d" });
  const dust = Object.assign(document.createElement("canvas"), { id: "dust3d" });
  const film = Object.assign(document.createElement("div"), { id: "film3d" });
  for (const [el, css] of [[canvas, "position:fixed;inset:0;width:100%;height:100%;display:block;z-index:-1;pointer-events:none"],
                           [dust, "position:fixed;inset:0;width:100%;height:100%;display:block;z-index:-1;pointer-events:none"],
                           [film, "position:fixed;inset:0;z-index:-1;pointer-events:none"]]) el.style.cssText = css;
  document.body.prepend(canvas, dust, film);
  const R = await createRoom3D({ canvas, base: "./", dust, film });
  R.layout();
  document.body.classList.add("w3d");
}
