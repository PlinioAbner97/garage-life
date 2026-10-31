import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
await pg.goto('http://localhost:4173/?debug'); await pg.waitForTimeout(1500);
let ok = 0, bad = 0; const T = (n, c, x = '') => { c ? ok++ : bad++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n} ${x}`); };
const ev = (f, a) => pg.evaluate(f, a);
await ev(() => { __gl.startGame(true); __gl.setSave({ money: 400000, level: 12, slotsUnlocked: 5 }); }); await pg.waitForTimeout(1500);
await pg.click('button[title="Ir al concesionario"]'); await pg.waitForTimeout(800);
T('abre el concesionario', await pg.locator('.dealer').count() === 1);
T('solo los autos del juego (sin duplicar)', await pg.locator('.dealer-car').count() === 8);
await pg.screenshot({ path: '/tmp/claude-0/d0.png' });
// tocar cada auto
const boxes = await pg.locator('.dealer-car').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width * 0.5, r.y + r.height * 0.55]; }));
let names = [];
for (let i = 0; i < 8; i++) { await pg.click('.dealer-zoom button[title="Vista completa"]'); await pg.waitForTimeout(900); const [x, y] = (await pg.locator('.dealer-car').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width * 0.5, r.y + r.height * 0.55]; })))[i]; await pg.mouse.click(x, y); await pg.waitForTimeout(900); names.push(await pg.locator('.dealer-card b').first().textContent({ timeout: 4000 }).catch(() => null)); }
T('cada auto abre su ficha', new Set(names).size === 8, names.join('|'));
await pg.screenshot({ path: '/tmp/claude-0/d1.png' });
const n0 = await ev(() => __gl.getSnapshot().save.cars.length); const m0 = await ev(() => __gl.getSnapshot().save.money);
await pg.locator('.dealer-card .btn.primary').click(); await pg.waitForTimeout(500);
T('comprar añade el auto y cobra', (await ev(() => __gl.getSnapshot().save.cars.length)) === n0 + 1 && (await ev(() => __gl.getSnapshot().save.money)) < m0);
await pg.click('.dealer-top .btn'); await pg.waitForTimeout(300);
T('volver cierra', await pg.locator('.dealer').count() === 0);
await pg.click('.nav button:has-text("Tienda")'); await pg.waitForTimeout(300);
T('tienda sin pestaña de autos', (await pg.locator('.sheet').innerText()).includes('Taller') && !(await pg.locator('.sheet').innerText()).includes('Autos y taller'));
T('sin errores de página', errs.length === 0, errs.join(';'));
console.log(`${ok} ok, ${bad} fail`); await b.close(); process.exit(bad ? 1 : 0);
