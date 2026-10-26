require('./load-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { bossDiarioDisponible, ESPERA_BOSS_DIARIO_MS } = require('../src/lib/expediciones/boss-diario.ts');
const { generarMisionesDisponibles } = require('../src/lib/generadorMisiones.ts');
const { obtenerEnemigoPorId } = require('../src/lib/enemigos.ts');
const victoria = new Date('2026-10-25T22:00:00Z');
const opciones = { baseLat: 28, baseLng: -15, nivelPersonaje: 1, ultimaMisionElite: null, ahora: victoria };
const bosses = (opciones) => generarMisionesDisponibles(opciones).filter(m => m.tipo === 'elite');

test('el boss reaparece exactamente a las 23 horas desde la victoria', () => {
  const disponibleEn = victoria.getTime() + ESPERA_BOSS_DIARIO_MS;
  for (const ultima of [victoria, victoria.toISOString()]) {
    assert.equal(bossDiarioDisponible(ultima, new Date(disponibleEn - 1)), false);
    assert.equal(bossDiarioDisponible(ultima, new Date(disponibleEn)), true);
    assert.equal(bossDiarioDisponible(ultima, new Date(disponibleEn + 1)), true);
  }
});
test('medianoche no reinicia la espera ni una fecha futura permite saltarla', () => {
  assert.equal(bossDiarioDisponible(victoria, new Date('2026-10-26T00:01:00Z')), false);
  assert.equal(bossDiarioDisponible(victoria, new Date('2026-10-25T20:00:00Z')), false);
  assert.equal(bossDiarioDisponible('fecha inválida', victoria), false);
});
test('primer intento disponible y catálogo sin boss mientras espera', () => {
  assert.equal(bosses(opciones).length, 1);
  assert.equal(bosses({ ...opciones, ultimaMisionElite: victoria }).length, 0);
  assert.equal(bosses({ ...opciones, ultimaMisionElite: victoria, ahora: new Date(victoria.getTime() + ESPERA_BOSS_DIARIO_MS) }).length, 1);
});
test('jefe y ubicación pseudoaleatorios son estables durante el día y respetan la amenaza desbloqueada', () => {
  const seleccion = new Set();
  for (let dia = 1; dia <= 28; dia++) {
    const ahora = new Date(`2026-10-${String(dia).padStart(2, '0')}T12:00:00Z`);
    const jefe = bosses({ ...opciones, ahora })[0];
    assert.deepEqual(jefe, bosses({ ...opciones, ahora: new Date(ahora.getTime() + 60000) })[0]);
    assert.ok(obtenerEnemigoPorId(jefe.enemigoId).esJefe);
    assert.ok(jefe.dificultad <= 3);
    assert.ok(obtenerEnemigoPorId(jefe.enemigoId).difMin <= jefe.dificultad);
    assert.ok(Number.isFinite(jefe.lat) && Number.isFinite(jefe.lng));
    seleccion.add(jefe.enemigoId);
  }
  assert.ok(seleccion.size > 1, 'La rotación debe ofrecer distintos bosses');
});
