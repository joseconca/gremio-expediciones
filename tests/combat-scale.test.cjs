require('./load-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { alturaCombatiente, limiteEscalaEnemigo } = require('../src/lib/expediciones/escala-combate.ts');
const { ENEMIGOS_HD, escalaEnemigoEnEscena } = require('../src/lib/sprites-enemigos-hd.ts');

test('los humanoides no superan la altura del jugador en móvil, solo y party', () => {
  for (const [ancho, alto] of [[320, 320], [344, 400], [374, 420], [414, 480], [1056, 420]]) {
    for (const party of [false, true]) {
      const altura = alturaCombatiente(ancho, alto, party);
      for (const id of ['bandido_camino', 'ghoul_cripta', 'goblin_explorador']) {
        const sprite = ENEMIGOS_HD[id];
        const escala = escalaEnemigoEnEscena(sprite, ancho / 2, alto, 50, 50, limiteEscalaEnemigo(altura, false));
        assert.ok(escala * sprite.height <= altura * 1.05, `${id} en ${ancho}px`);
      }
    }
  }
});

test('la party mantiene una altura legible en móvil y los bosses conservan su escala especial', () => {
  const altura = alturaCombatiente(344, 400, true);
  assert.ok(altura >= 110);
  assert.ok(limiteEscalaEnemigo(altura, true) > limiteEscalaEnemigo(altura, false) * 2);
  assert.ok(alturaCombatiente(344, 160, true) < altura, 'El paisaje corto sigue ajustándose a la escena');
});
