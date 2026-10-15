import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
await pg.goto('http://localhost:4173/?debug'); await pg.waitForTimeout(1500);
let ok = 0, bad = 0; const T = (n, c, x = '') => { c ? ok++ : bad++; console.log(`${c ? 'OK  ' : 'FAIL'} ${n} ${x}`); };
const ev = (f, a) => pg.evaluate(f, a);
await ev(() => { __gl.startGame(true); __gl.setSave({ money: 5000, level: 4 }); }); await pg.waitForTimeout(600);
const car = await ev(() => __gl.getSnapshot().save.cars[0].id);
const street = { kind: 'ai', tier: 'street', name: 'Rival', model: 'falcon-gt', paint: 'black', rim: 'stock', mul: 0.9, fee: 100, prize: 300, xp: 40 };
T('nivel bloquea categoría', !(await ev((c) => __gl.startRace(c, { kind: 'ai', tier: 'elite', name: 'x', model: 'nami-34', paint: 'white', rim: 'stock', mul: 1, fee: 3000, prize: 9000, xp: 450 }), car)));
const m0 = await ev(() => __gl.getSnapshot().save.money);
T('inscribirse cobra cuota', (await ev((a) => __gl.startRace(a[0], a[1]), [car, street])) && (await ev(() => __gl.getSnapshot().save.money)) === m0 - 100);
T('una sola carrera a la vez', !(await ev((a) => __gl.startRace(a[0], a[1]), [car, street])));
T('no se cobra sin resultado', !(await ev(() => __gl.claimRace())));
// jugar: espacio al verde y cambios cada ~1.3 s
await pg.waitForTimeout(2000); await pg.screenshot({ path: '/tmp/claude-0/r0.png' });
await pg.waitForFunction(() => true);
let shot = 0; const t0 = Date.now();
while (Date.now() - t0 < 40000 && !(await ev(() => !!__gl.getSnapshot().save.race?.result))) {
  await pg.keyboard.press('Space'); await pg.waitForTimeout(700);
  if (Date.now() - t0 > 7000 && !shot) { shot = 1; await pg.keyboard.press('KeyN'); await pg.screenshot({ path: '/tmp/claude-0/r1.png' }); }
}
const res = await ev(() => __gl.getSnapshot().save.race?.result);
T('la carrera termina con resultado', !!res, JSON.stringify(res));
await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/claude-0/r2.png' });
const m1 = await ev(() => __gl.getSnapshot().save.money);
T('cobrar una vez', (await ev(() => __gl.claimRace())) && !(await ev(() => __gl.claimRace())));
const m2 = await ev(() => __gl.getSnapshot().save.money);
T('premio correcto', m2 - m1 === (res.win ? 300 : 0), `win=${res.win} +${m2 - m1}`);
T('enfriamiento activo', !(await ev((a) => __gl.startRace(a[0], a[1]), [car, street])));
// recarga a mitad: se abandona
await ev(() => { __gl.setSave({ raceCd: {} }); __gl.startRace(__gl.getSnapshot().save.cars[0].id, { kind: 'ai', tier: 'street', name: 'Rival', model: 'falcon-gt', paint: 'black', rim: 'stock', mul: 0.9, fee: 100, prize: 300, xp: 40 }); });
await pg.waitForTimeout(600); await pg.reload(); await pg.waitForTimeout(1500); await ev(() => __gl.startGame(false)); await pg.waitForTimeout(6000);
T('recarga: carrera interrumpida detectada', (await pg.locator('text=Carrera interrumpida').count()) === 1);
await pg.getByText('Continuar').click(); await pg.waitForTimeout(300);
T('abandono libera la carrera', !(await ev(() => __gl.getSnapshot().save.race)));
await pg.setViewportSize({ width: 390, height: 780 });
await ev(() => { __gl.openPanel('races'); }); await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/claude-0/r3.png' });
console.log(`${ok} OK / ${bad} FAIL`, errs.join('|')); await b.close(); process.exit(bad ? 1 : 0);
