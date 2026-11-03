require('./load-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { compactarPareja } = require('../src/lib/expediciones/combate/formacion-party.ts');

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

const { crearVistaCombate } = require('../src/components/base/party/vista-combate.ts');

test('el adaptador de combate de party conserva turno, recursos y enemigos', () => {
  const participante = {
    usuarioId: 'u1', estado: 'activo', jugadorPosicion: 'retaguardia', jugadorHp: 66, jugadorHpMaximo: 100,
    jugadorAtaque: 13, jugadorDefensa: 11, jugadorVelocidad: 15, jugadorProbCritico: 0.1,
    jugadorDanoCritico: 1.5, jugadorNivel: 8, efectos: [{ id: 'cura' }],
    cooldowns: { habilidad1: 2, expirada: 0, invalida: '3' },
  };
  const combate = {
    id: 'combate-1', version: 7, fase: 'activo', ronda: 2, faseTurno: 'jugador',
    turnoActualUsuarioId: 'u1', enemigoId: 'slime', enemigoNombre: 'Slime',
    enemigoHp: 20, enemigoHpMaximo: 50, enemigoAtaque: 4, enemigoDefensa: 2,
    enemigoVelocidad: 3, enemigoProbCritico: 0.03, enemigoDanoCritico: 1.5,
    enemigoNivel: 2, efectosEnemigo: [], enemigos: [{ id: 'slime', hp: 20 }],
    log: ['inicio', 2, 'ataque'], participantes: [participante],
  };
  const expedicion = {
    id: 'exp-1', tipo: 'normal', fechaSalida: '2026-11-02T08:00:00Z',
    fechaLlegada: '2026-11-02T09:00:00Z', combate,
  };
  const estado = { usuarioId: 'u1' };
  const vista = crearVistaCombate(estado, { id: 'personaje' }, expedicion, combate, participante);
  assert.equal(vista.id, 'combate-1');
  assert.equal(vista.expedicionId, 'exp-1');
  assert.equal(vista.turno, 'jugador');
  assert.equal(vista.jugadorPosicion, 'retaguardia');
  assert.equal(vista.jugadorHp, 66);
  assert.equal(vista.enemigoHp, 20);
  assert.deepEqual(vista.cooldowns, { habilidad1: 2 });
  assert.deepEqual(vista.log, ['inicio', 'ataque']);
  assert.equal(vista.creado, expedicion.fechaSalida);
  assert.equal(vista.actualizado, expedicion.fechaLlegada);
  combate.turnoActualUsuarioId = 'u2';
  assert.equal(crearVistaCombate(estado, { id: 'personaje' }, expedicion, combate, participante).turno, 'enemigo');
  assert.equal(crearVistaCombate(estado, null, expedicion, combate, participante), null);
});
