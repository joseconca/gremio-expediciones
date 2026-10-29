const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('./load-typescript.cjs');
const { SLOTS_HABILIDADES_ACTIVAS, SLOTS_HABILIDADES_PASIVAS } = require('../src/lib/tiposJuego.ts');
const { esSlotHabilidad, esSlotActivo, esSlotPasivo } = require('../src/lib/progresion/equipo-habilidades.ts');

test('permite exactamente cinco activas y tres pasivas, conservando las ranuras anteriores', () => {
  assert.deepEqual(SLOTS_HABILIDADES_ACTIVAS, ['activa_1','activa_2','activa_3','activa_4','activa_5']);
  assert.deepEqual(SLOTS_HABILIDADES_PASIVAS, ['pasiva_1','pasiva_2','pasiva_3']);
  for (const slot of [...SLOTS_HABILIDADES_ACTIVAS,...SLOTS_HABILIDADES_PASIVAS]) assert.equal(esSlotHabilidad(slot), true);
  for (const slot of ['activa_0','activa_6','pasiva_0','pasiva_4','activa_01',null,{},1]) assert.equal(esSlotHabilidad(slot), false);
  assert.equal(esSlotActivo('pasiva_3'), false);
  assert.equal(esSlotPasivo('activa_5'), false);
});

test('individual y party admiten las nuevas activas y la interfaz no las recorta a tres', () => {
  for (const file of ['src/server/services/combate/accion-combate.ts','src/server/services/party/combate-party-actions.ts','src/server/services/party/party-service.ts']) {
    const source=fs.readFileSync(file,'utf8');
    assert.match(source, /"activa_4", "activa_5"/);
  }
  for (const file of ['src/components/combate/CombateModal.tsx','src/components/combate/AsedioModal.tsx']) {
    const source=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(source, /habilidades\.slice\(0, 3\)/);
    assert.match(source,/habilidades\.slice\(0, 5\)/);
  }
});
