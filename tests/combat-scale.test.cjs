require('./load-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { alturaCombatiente, limiteEscalaEnemigo, encajarEnemigo, calcularDisposicionEnemigoEnEscena } = require('../src/lib/sprites/escala-combate.ts');
const { ENEMIGOS_HD, escalaEnemigoEnEscena } = require('../src/lib/sprites/enemigos.ts');
const { distribuirFormacionParty } = require('../src/lib/expediciones/formacion-party.ts');

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

test('la formación de party conserva los tres carriles en móvil y escritorio', () => {
  const miembros = [
    { id: 'm', jugadorPosicion: 'mele', esLider: true, ordenTurno: 2 },
    { id: 'r', jugadorPosicion: 'retaguardia', esLider: false, ordenTurno: 1 },
    { id: 'c', jugadorPosicion: 'centro', esLider: false, ordenTurno: 0 },
  ];
  for (const ancho of [344, 1080]) {
    const anterior = miembros.map(m => ({ ...m }));
    const formacion = distribuirFormacionParty(miembros, 420, 128, ancho);
    assert.deepEqual(formacion.map(x => x.participante.id), ['r', 'c', 'm']);
    assert.deepEqual(formacion.map(x => x.x), [30, 56, 76]);
    assert.ok(formacion.every(x => Number.isFinite(x.y) && x.y >= 0 && x.y <= 100));
    assert.deepEqual(miembros, anterior, 'Calcular la formación no cambia los integrantes');
  }
});

test('el líder aparece debajo de sus compañeros si comparten posición', () => {
  const integrantes = [
    { id: 'lider', jugadorPosicion: 'centro', esLider: true, ordenTurno: 0 },
    { id: 'aliado', jugadorPosicion: 'centro', esLider: false, ordenTurno: 1 },
  ];
  for (const ancho of [344, 1080]) {
    const formacion = distribuirFormacionParty(integrantes, 420, 128, ancho);
    assert.deepEqual(formacion.map(x => x.participante.id), ['aliado', 'lider']);
    assert.ok(formacion[0].y < formacion[1].y);
  }
});

test('la distribución visual mantiene posiciones y tamaños de grupos, solo y jefes', () => {
  const escena = { ancho: 1024, alto: 520 };
  const altura = alturaCombatiente(escena.ancho, escena.alto, false);
  const normal = ENEMIGOS_HD.bandido_camino;
  const jefe = ENEMIGOS_HD.dragon_anciano;
  assert.ok(jefe.boss);

  const datos = { posicion: 'centro', columna: 1 };
  const antes = { ...datos };
  const solo = calcularDisposicionEnemigoEnEscena(datos, 0, 1, escena, 460, altura, normal);
  const soloJefe = calcularDisposicionEnemigoEnEscena(datos, 0, 1, escena, 460, altura, jefe);
  assert.equal(solo.escalaContenedor, 'w-[68%] max-w-[220px]');
  assert.ok(soloJefe.unidadEnemigo * jefe.height > solo.unidadEnemigo * normal.height, 'El jefe mantiene mayor tamaño visual');
  assert.ok(solo.unidadEnemigo > 0 && soloJefe.unidadEnemigo > 0);
  assert.deepEqual(datos, antes, 'No debe modificar al enemigo de entrada');

  const dos = [0, 1].map((indice) =>
    calcularDisposicionEnemigoEnEscena(datos, indice, 2, escena, 460, altura, normal));
  assert.ok(dos[0].xAjustada < dos[1].xAjustada);
  assert.ok(dos.every(x => x.escalaContenedor === 'w-[48%] max-w-[164px]'));
  const tres = calcularDisposicionEnemigoEnEscena({ posicion: 'retaguardia', columna: 2 }, 2, 3,
    { ancho: 344, alto: 420 }, 160, alturaCombatiente(344, 420, true, 3), normal);
  assert.equal(tres.escalaContenedor, 'w-[36%] max-w-[120px]');
  assert.ok(Number.isFinite(tres.posicionAjustada.y));
  assert.ok(Number.isFinite(tres.xAjustada));
});
