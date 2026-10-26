require('./load-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { compactarPareja } = require('../src/lib/expediciones/formacion-party.ts');

test('dos aliados del mismo carril se acercan y se centran, dejando sitio para sus barras', () => {
  for (const [alto, ancho, altura] of [[508, 374, 110], [800, 1300, 144]]) {
    const originales = [{ x: 56, y: 25, id: 'uno' }, { x: 56, y: 85, id: 'dos' }];
    const compactos = compactarPareja(originales, alto, ancho, altura, 25, 85);
    const distancia = (compactos[1].y - compactos[0].y) * alto / 100;
    assert.ok(distancia < alto * .6);
    assert.ok(distancia >= altura + 71.99, 'No solapar el sprite y la barra del aliado inferior');
    assert.equal((compactos[0].y + compactos[1].y) / 2, 55);
    assert.deepEqual(compactos.map(p => [p.x, p.id]), originales.map(p => [p.x, p.id]));
    assert.deepEqual(originales.map(p => p.y), [25, 85], 'No mutar los datos originales');
  }
});

test('dos carriles separados horizontalmente permiten una pareja más compacta', () => {
  const compactos = compactarPareja([{ x: 30, y: 55 }, { x: 76, y: 25 }], 508, 374, 110, 25, 85);
  assert.ok(compactos[0].y > compactos[1].y, 'Conservar la profundidad relativa');
  assert.ok((compactos[0].y - compactos[1].y) * 508 / 100 <= 82.51);
});

test('la formación de tres y las escenas pequeñas mantienen sus límites', () => {
  const tres = [{ x: 30, y: 55 }, { x: 56, y: 85 }, { x: 76, y: 25 }];
  assert.equal(compactarPareja(tres, 508, 374, 110, 25, 85), tres);
  const dos = [{ x: 56, y: 40 }, { x: 56, y: 70 }];
  const compactos = compactarPareja(dos, 230, 374, 100, 40, 70);
  assert.deepEqual(compactos, dos, 'No acercar más si ya falta espacio para las barras');
});
