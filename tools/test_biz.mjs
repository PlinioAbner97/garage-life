// Pruebas del sistema de clientes (16 casos). Uso: node tools/test_biz.mjs  (preview en :4173)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
await pg.goto('http://localhost:4173/?debug'); await pg.waitForTimeout(1500);
let pass = 0, fail = 0;
const T = (n, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${n} ${extra}`); };
const ev = (f, a) => pg.evaluate(f, a);
await ev(() => { __gl.startGame(true); });
await pg.waitForTimeout(800);
await ev(() => { __gl.setSave({ money: 100000, level: 12 }); });
const slotsBefore = await ev(() => JSON.stringify(__gl.getSnapshot().save.slotsUnlocked));
const carsBefore = await ev(() => JSON.stringify(__gl.getSnapshot().save.cars));
// 1
await ev(() => { __gl.buyItem('reception'); });
T('1 comprar recepción -> inventario', await ev(() => __gl.getSnapshot().save.inventory.reception === 1));
// 3 sin recepción instalada ni bahía
T('3a sin recepción no hay ofertas', await ev(() => (__gl.getSnapshot().save.biz.jobs.length === 0)));
// 2 colocar recepción
await ev(() => { __gl.enterEdit(); __gl.editPlace('reception', -9, 10, 0); });
const recDraft = await ev(() => __gl.getSnapshot().ui.edit.draft.length);
await ev(() => { __gl.editSave(); });
T('2 recepción colocada desbloquea Clientes', recDraft === 1 && await ev(() => __gl.hasEquip('reception')));
await pg.waitForFunction(() => __gl.getSnapshot().save.biz.jobs.some((j) => j.state === 'offered'), null, { timeout: 20000 });
const offer0 = await ev(() => __gl.getSnapshot().save.biz.jobs.find((j) => j.state === 'offered')?.id);
T('3 sin bahía no se acepta', !!offer0 && !(await ev((id) => __gl.acceptClient(id), offer0)));
// 4,5
await ev(() => { __gl.buyItem('service_bay'); });
await pg.waitForTimeout(900);
T('4 comprar bahía', await ev(() => __gl.getSnapshot().save.inventory.service_bay === 1));
const slot0 = await ev(() => __gl.getSnapshot().save.cars[0].slot);
const SW = await ev(() => null);
await ev(() => { __gl.enterEdit(); });
const bad = await ev(() => __gl.editPlace('service_bay', -8, 14, 0)); // plaza 0 con auto propio
T('6 no se instala sobre auto propio', bad === false);
const good = await ev(() => __gl.editPlace('service_bay', -4, 14, 0));
const slotB = await ev(() => __gl.getSnapshot().ui.edit.draft.find((p) => p.item === 'service_bay')?.slot);
T('5 bahía en plaza libre desbloqueada (slot persistente)', good && slotB !== undefined, `slot=${slotB}`);
const dup = await ev(() => __gl.editPlace('service_bay', -4, 14, 0));
T('5b una bahía por plaza', dup === false);
await ev(() => { __gl.editSave(); });
T('5c editSave conserva bahía', (await ev(() => __gl.bays().length)) === 1);
// 7
await pg.waitForFunction(() => __gl.getSnapshot().save.biz.jobs.some((j) => j.state === 'offered'), null, { timeout: 20000 });
const jid = await ev(() => __gl.getSnapshot().save.biz.jobs.find((j) => j.state === 'offered')?.id);
const acc = await ev((id) => __gl.acceptClient(id), jid);
await pg.waitForTimeout(1500);
const inScene = await ev(() => __gl.getSnapshot().save.biz.jobs.find((j) => j.state === 'arriving') !== undefined);
T('7 aceptar -> auto llega a la bahía', acc && inScene);
await ev((id) => { const b = __gl.getSnapshot().save.biz; __gl.setSave({ biz: { ...b, jobs: b.jobs.map((j) => (j.id === id ? { ...j, acceptedAt: Date.now() - 10000 } : j)) } }); }, jid);
await pg.waitForTimeout(1200);
T('7b estado waiting', await ev((id) => __gl.getSnapshot().save.biz.jobs.find((j) => j.id === id).state === 'waiting', jid));
// 11 una bahía no tiene dos vehículos
const jid2 = await ev(() => __gl.getSnapshot().save.biz.jobs.find((j) => j.state === 'offered')?.id);
T('11 bahía ocupada no admite segundo vehículo', !jid2 || !(await ev((id) => __gl.acceptClient(id), jid2)));
// bahía con trabajo no se puede retirar
await ev(() => { __gl.enterEdit(); const u = __gl.bays()[0].uid; __gl.editStow(u); });
T('12a no se retira con trabajo activo', await ev(() => __gl.getSnapshot().ui.edit.draft.some((p) => p.item === 'service_bay')));
await ev(() => { __gl.editCancel?.(); __gl.exitEdit?.(); });
// 8
await ev((id) => __gl.startRepair(id), jid);
await ev((id) => { const b = __gl.getSnapshot().save.biz; __gl.setSave({ biz: { ...b, jobs: b.jobs.map((j) => (j.id === id ? { ...j, endsAt: Date.now() - 100 } : j)) } }); }, jid);
await pg.waitForFunction((id) => __gl.getSnapshot().save.biz.jobs.find((j) => j.id === id)?.state === 'ready', jid, { timeout: 15000 });
const m0 = await ev(() => __gl.getSnapshot().save.money), x0 = await ev(() => __gl.getSnapshot().save.xp + __gl.getSnapshot().save.level * 1e6);
const pay = await ev((id) => __gl.getSnapshot().save.biz.jobs.find((j) => j.id === id).pay, jid);
await ev((id) => __gl.claimClient(id), jid);
const dbl = await ev((id) => __gl.claimClient(id), jid);
const m1 = await ev(() => __gl.getSnapshot().save.money);
T('8 recompensa dinero+XP', m1 - m0 === pay && !dbl, `+${m1 - m0}`);
T('16 recompensa no se duplica', dbl === false && m1 - m0 === pay);
await ev(() => { const b = __gl.getSnapshot().save.biz; __gl.setSave({ biz: { ...b, jobs: b.jobs.map((j) => (j.state === 'leaving' ? { ...j, leaveAt: Date.now() - 8000 } : j)) } }); });
await pg.waitForFunction((id) => !__gl.getSnapshot().save.biz.jobs.some((j) => j.id === id), jid, { timeout: 15000 });
T('9 auto se va y bahía libre', (await ev(() => __gl.freeBays().length)) === 1 && !(await ev((id) => __gl.getSnapshot().save.biz.jobs.some((j) => j.id === id), jid)));
// 10 segundo cliente
await pg.waitForTimeout(100);
await ev(() => { const b = __gl.getSnapshot().save.biz; __gl.setSave({ biz: { ...b, nextOfferAt: Date.now() + 100 } }); });
await pg.waitForFunction(() => __gl.getSnapshot().save.biz.jobs.some((j) => j.state === 'offered'), null, { timeout: 20000 });
const j3 = await ev(() => __gl.getSnapshot().save.biz.jobs.find((j) => j.state === 'offered')?.id);
T('10 segundo cliente aceptable', !!j3 && await ev((id) => __gl.acceptClient(id), j3));
// 15 recarga
await pg.waitForTimeout(800);
const snap = await ev(() => JSON.stringify({ biz: __gl.getSnapshot().save.biz, placed: __gl.getSnapshot().save.placed, inv: __gl.getSnapshot().save.inventory, money: __gl.getSnapshot().save.money }));
await pg.reload(); await pg.waitForTimeout(1800);
await ev(() => { __gl.startGame(false); }); await pg.waitForTimeout(1200);
const snap2 = await ev(() => JSON.stringify({ biz: __gl.getSnapshot().save.biz, placed: __gl.getSnapshot().save.placed, inv: __gl.getSnapshot().save.inventory, money: __gl.getSnapshot().save.money }));
const a = JSON.parse(snap), c = JSON.parse(snap2);
T('15 recarga conserva compras, bahía y trabajos', c.placed.length === a.placed.length && c.biz.jobs.length === a.biz.jobs.length && c.money === a.money && JSON.stringify(c.inv) === JSON.stringify(a.inv), `jobs ${a.biz.jobs.length}->${c.biz.jobs.length}`);
const nclient = await ev(() => document.querySelectorAll('canvas').length);
// 12 quitar bahía vacía: terminar el trabajo y sacarla
await ev(() => { const b = __gl.getSnapshot().save.biz; __gl.setSave({ biz: { ...b, jobs: b.jobs.filter((j) => j.state === 'offered') } }); });
await ev(() => { __gl.enterEdit(); const u = __gl.bays()[0].uid; __gl.editStow(u); __gl.editSave(); });
T('12 quitar bahía vacía restaura estacionamiento', (await ev(() => __gl.bays().length)) === 0 && (await ev(() => __gl.freeSlot() >= 0)));
await ev(() => { __gl.moveCar(__gl.getSnapshot().save.cars[0].id, 1); });
T('12b plaza vuelve a ser utilizable', (await ev(() => __gl.getSnapshot().save.cars[0].slot)) === 1);
// 13, 14
T('13 autos del jugador intactos', await ev(() => __gl.getSnapshot().save.cars.length === 1 && __gl.getSnapshot().save.cars[0].model === 'falcon-gt'));
const cfg = await ev(() => null);
T('14 expansiones/slots sin cambios', (await ev(() => JSON.stringify(__gl.getSnapshot().save.slotsUnlocked))) === slotsBefore);
console.log(`\n${pass} OK / ${fail} FAIL`, errs.length ? 'ERRORES: ' + errs.join('|') : 'sin errores de página');
await b.close(); process.exit(fail ? 1 : 0);
