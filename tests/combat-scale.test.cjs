require('./load-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { alturaCombatiente, limiteEscalaEnemigo, encajarEnemigo } = require('../src/lib/expediciones/escala-combate.ts');
const { ENEMIGOS_HD, escalaEnemigoEnEscena } = require('../src/lib/sprites-enemigos-hd.ts');

test('los humanoides no superan la altura del jugador en móvil, solo y party', () => {
  for (const [ancho, alto] of [[320, 320], [344, 400], [374, 420], [414, 480], [1056, 420]]) {
    for (const party of [false, true]) {
      const altura = alturaCombatiente(ancho, alto, party);
      for (const id of ['bandido_camino', 'ghoul_cripta', 'goblin_explorador', 'orco_despiadado', 'esqueleto_guerrero']) {
        const sprite = ENEMIGOS_HD[id];
        const escala = escalaEnemigoEnEscena(sprite, ancho, alto, 50, 50, limiteEscalaEnemigo(altura, false, sprite.height));
        assert.ok(escala * sprite.height <= altura * 1.05, `${id} en ${ancho}px`);
      }
    }
  }
});

test('estar junto al borde no encoge al humanoide respecto al jugador', () => {
  for (const [ancho, alto] of [[320, 450], [390, 510], [1120, 392]]) {
    const altura = alturaCombatiente(ancho, alto, true, 3);
    for (const id of ['bandido_camino', 'orco_despiadado', 'ghoul_cripta', 'goblin_explorador', 'esqueleto_guerrero']) {
      const sprite = ENEMIGOS_HD[id];
      for (const x of [55, 75, 95]) for (const y of [25, 55, 88]) {
        const ajuste = encajarEnemigo(sprite, ancho, alto, x, y, limiteEscalaEnemigo(altura, false, sprite.height), 16);
        const escala = escalaEnemigoEnEscena(sprite, ancho, alto, ajuste.x, ajuste.y, ajuste.escala, 16);
        assert.ok(Math.abs(sprite.height * escala - altura) < 0.001, `${id}: altura constante`);
        assert.ok(ajuste.x > 0 && ajuste.x < 100 && ajuste.y > 0 && ajuste.y < 100);
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
