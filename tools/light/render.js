// 无头渲染页面并导出画布：node tools/light/render.js "<query>" out.png [宽 高]
// 需要本地服务：在仓库根目录 python3 -m http.server 8765。页面默认 lab/window-light.html（环境变量 PAGE 可改）
// SwiftShader 下截图会卡，所以用 canvas.toDataURL 取图；页面画完后会设 body.dataset.ready = '1'
const { chromium } = require('playwright');
(async () => {
  const [q, out, w, h] = [process.argv[2] || '', process.argv[3], +(process.argv[4] || 570), +(process.argv[5] || 570)];
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  const t0 = Date.now();
  await pg.goto('http://localhost:8765/' + (process.env.PAGE || 'lab/window-light.html') + '?' + q, { waitUntil: 'commit' });
  await pg.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 280000 }).catch(() => errs.push('timeout'));
  const data = await pg.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  require('fs').writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log('render', ((Date.now() - t0) / 1000).toFixed(0) + 's', errs.length ? errs.slice(0, 4) : 'no errors');
  await b.close();
})();
