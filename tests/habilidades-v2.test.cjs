require('./load-typescript.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { HABILIDADES, obtenerHabilidadPorId, obtenerHabilidadesDisponiblesParaClase } = require('../src/lib/habilidades.ts');
const { CLASES } = require('../src/lib/progresion/clases.ts');
const { nivelMaximoHabilidad } = require('../src/lib/progresion/niveles-habilidad.ts');
const { aplicarBarreraAccion, procesarEfectosTurno } = require('../src/lib/expediciones/estados-combate.ts');
const { establecerCooldownHabilidad } = require('../src/lib/expediciones/cooldowns-habilidades.ts');
const { calcularPesosCuracion } = require('../src/lib/expediciones/presupuesto-curacion.ts');
const { calcularEstadisticasPersonaje } = require('../src/lib/estadisticasPersonaje.ts');
const m = require('../src/lib/expediciones/motor-tactico.ts');
const tactico = (estados, propietarioId = 'a') => ({ habilidadId: 'tactica:' + propietarioId, tipo: 'tactico', valor: 0, turnosRestantes: 1, duracionTurnos: 1, objetivo: 'jugador', datosTacticos: { version: 2, propietarioId, estados, limites: {} } });
const estado = (familia, valor, fuenteId, creadorId = 'a') => ({ id: fuenteId, fuenteId, creadorId, familia, clave: familia, valor, restantes: 3, reloj: 'turno', cargas: 1 });

test('las 61 clases tienen un catálogo activo completo, una técnica adicional e iconos existentes', () => {
  assert.equal(HABILIDADES.length, 367);
  assert.equal(HABILIDADES.filter(h => h.tipo === 'activa').length, 245);
  assert.equal(HABILIDADES.filter(h => h.tipo === 'pasiva').length, 122);
  assert.equal(new Set(HABILIDADES.map(h => h.id)).size, 367);
  for (const clase of Object.values(CLASES)) {
    const propias = HABILIDADES.filter(h => h.claseId === clase.id);
    assert.ok(propias.filter(h => h.tipo === 'activa').length >= 4, clase.id);
    assert.equal(propias.filter(h => h.tipo === 'pasiva').length, 2, clase.id);
    assert.ok(propias.some(h => h.id === `${clase.id}_tecnica_adicional`), clase.id);
    assert.ok(propias.every(h => h.versionReglas === 2), clase.id);
  }
  for (const h of HABILIDADES) {
    assert.ok(fs.existsSync(path.join(__dirname, '../public/sprites/habilidades', h.id + '.svg')), h.id);
    assert.ok(h.descripcion.length > 15, h.id);
    if (h.tipo === 'activa') assert.ok(h.disenoActiva, h.id);
  }
});

test('las pasivas condicionales tienen combinaciones distintas y rango único; solo Mago aumenta maná plano', () => {
  const condicionales = HABILIDADES.filter(h => h.reglaPasiva);
  assert.equal(condicionales.length, 119);
  assert.equal(new Set(condicionales.map(h => `${h.reglaPasiva.condicion}:${h.reglaPasiva.ventaja}`)).size, 119);
  for (const h of condicionales) assert.equal(nivelMaximoHabilidad(h.claseId, h), 1, h.id);
  assert.deepEqual(HABILIDADES.filter(h => h.bonusManaMaximo).map(h => h.id), ['reserva_arcana']);
});

test('toda preparación consumida por un kit se puede generar con habilidades de su rama sin rasgo', () => {
  for (const h of HABILIDADES.filter(h => h.tipo === 'activa')) {
    const generadores = obtenerHabilidadesDisponiblesParaClase(h.claseId).flatMap(h => h.disenoActiva?.operaciones ?? []);
    for (const op of h.disenoActiva.operaciones.filter(o => o.tipo === 'consumir_preparacion')) {
      assert.ok(generadores.some(g => g.tipo === 'estado' && g.clave === op.clave), `${h.id}: ${op.clave}`);
    }
  }
});

test('las dos respiraciones heredadas comparten cooldown incluso con cinco huecos', () => {
  const cds = {};
  for (const id of ['respiracion_interior', 'respiracion_del_vacio']) {
    establecerCooldownHabilidad(cds, obtenerHabilidadPorId(id));
    assert.equal(cds.respiracion_interior, 6);
    assert.equal(cds.respiracion_del_vacio, 6);
  }
});

test('las guardias de varias habilidades no se convierten en capas de absorción consecutivas', () => {
  const efectos = [tactico([estado('guardia', 20, 'g1'), estado('guardia', 10, 'g2', 'b')])];
  const primero = { dano: 15, critico: false, texto: '' };
  aplicarBarreraAccion(primero, efectos);
  assert.equal(primero.dano, 0);
  const segundo = { dano: 15, critico: false, texto: '' };
  aplicarBarreraAccion(segundo, efectos);
  assert.equal(segundo.dano, 10);
  assert.equal(efectos[0].datosTacticos.estados.length, 0);
  const unidades = ['a', 'e'].map(id => ({ id, equipo: id === 'a' ? 'aliado' : 'enemigo', hp: 100, hpMaximo: 100, estados: id === 'a' ? [estado('guardia', 20, 'g1'), estado('guardia', 10, 'g2')] : [], limites: {} }));
  const mundo = { version: 2, ciclo: 1, unidades, eventos: [] };
  m.danarTactico(mundo, 'e', 'a', 'golpe', 15);
  m.danarTactico(mundo, 'e', 'a', 'golpe', 15);
  assert.equal(unidades[0].hp, 90);
});

test('la regeneración solo aplica su pulso más fuerte por sanador; las heridas distinguen creador', () => {
  const efectos = [tactico([estado('regeneracion', 10, 'cura1'), estado('regeneracion', 7, 'cura2'), estado('regeneracion', 4, 'cura3', 'b')])];
  const cura = procesarEfectosTurno(efectos, 20, 100, 0, 'a');
  assert.equal(cura.hp, 34);
  assert.equal(cura.curacionAplicada, 14);
  const heridas = [tactico([estado('herida', 10, 'h1'), estado('herida', 7, 'h2'), estado('herida', 4, 'h3', 'b')])];
  assert.equal(procesarEfectosTurno(heridas, 100, 100, 0, 'a').hp, 86);
});

test('la conversión del Archimago pierde reserva, tiene techo y no realimenta el maná', () => {
  const personaje = { clase: 'Novato', profesionActivaId: 'archimago', nivel: 30, nivelJob: 60, velocidadMejoras: 0, capacidadCarruajeMejoras: 0 };
  const base = calcularEstadisticasPersonaje(personaje, ['reserva_arcana']);
  const convertido = calcularEstadisticasPersonaje(personaje, ['reserva_arcana', 'nucleo_arcano']);
  const incremento = Math.min(Math.floor(base.total.manaMaximo * .1), Math.floor(base.atributosPrincipales.inteligencia * .2), 12);
  assert.equal(convertido.atributosPrincipales.inteligencia - base.atributosPrincipales.inteligencia, incremento);
  assert.equal(convertido.total.manaMaximo, Math.floor(base.total.manaMaximo * .9));
  const superNovato = { ...personaje, profesionActivaId: 'superNovato' };
  assert.deepEqual(calcularEstadisticasPersonaje(superNovato, ['nucleo_arcano']).total, calcularEstadisticasPersonaje(superNovato, []).total);
});

test('un acompañante manual tiene tres órdenes, no causa pulsos gratuitos ni duplica la orden por ciclo', () => {
  const unidad = (id, equipo) => ({ id, equipo, hp: 100, hpMaximo: 100, energia: 100, energiaMaxima: 100, mana: 100, manaMaximo: 100, ataque: 20, ataqueMagico: 20, defensa: 0, defensaMagica: 0, fila: 0, columna: 0, estados: [], limites: {} });
  const w = { version: 2, ciclo: 1, unidades: [unidad('a', 'aliado'), unidad('e', 'enemigo')], eventos: [] };
  m.ejecutarComandosTacticos(w, 'a', 'e', 'invocar', [{ tipo: 'invocar', clave: 'bestia', potencia: 10, duracion: 6, mantenimiento: 0, manual: true }]);
  for (let ciclo = 0; ciclo < 3; ciclo++) {
    const hpAntes = w.unidades[1].hp;
    m.avanzarRelojTactico(w, 'ciclo');
    assert.equal(w.unidades[1].hp, hpAntes);
    m.ejecutarComandosTacticos(w, 'a', 'e', 'orden', [{ tipo: 'ordenar', modo: 'asalto' }]);
    m.ejecutarComandosTacticos(w, 'a', 'e', 'orden', [{ tipo: 'ordenar', modo: 'asalto' }]);
    assert.equal(w.unidades[1].hp, hpAntes - 10);
  }
  assert.equal(w.unidades[0].estados.filter(e => e.familia === 'acompanante').length, 0);
  assert.ok(HABILIDADES.find(h => h.claseId === 'nigromante' && h.tipo === 'activa').disenoActiva.operaciones.some(o => o.tipo === 'ordenar'));
});

test('la curación de grupo reparte una reserva entre heridas reales sin pagar por aliados sanos', () => {
  assert.deepEqual(calcularPesosCuracion([{ id: 'a', hp: 100, hpMaximo: 100 }, { id: 'b', hp: 90, hpMaximo: 100 }, { id: 'c', hp: 70, hpMaximo: 100 }]), { a: 0, b: .25, c: .75 });
  assert.deepEqual(calcularPesosCuracion([{ id: 'a', hp: 100, hpMaximo: 100 }]), { a: 0 });
});

test('la migración contempla todos los propietarios y no borra compras ni ranuras', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261029203000_redisenio_habilidades/migration.sql'), 'utf8');
  const propietarios = new Map([...sql.matchAll(/\('([^']+)','([^']+)'\)/g)].map(m => [m[1], m[2]]));
  assert.equal(propietarios.size, 367);
  for (const h of HABILIDADES) assert.equal(propietarios.get(h.id), h.claseId, h.id);
  assert.match(sql, /SUM\(GREATEST\(h.nivel - 1, 0\)\)/);
  assert.match(sql, /SET nivel = 1/);
  assert.doesNotMatch(sql, /DELETE\s+FROM|SET\s+slot\s*=/i);
});

const contexto = (extra = {}) => ({ actorId: 'a', objetivoId: 'e', claseId: 'arconte', ciclo: 1, actorHp: 50, actorHpMaximo: 100, energia: 100, energiaMaxima: 100, mana: 100, manaMaximo: 100, ataque: 100, ataqueMagico: 100, defensaActor: 10, defensaMagicaActor: 10, efectosActor: [], objetivoHp: 1000, objetivoHpMaximo: 1000, defensaObjetivo: 0, defensaMagicaObjetivo: 0, efectosObjetivo: [], objetivoAliado: false, filaActor: 0, filaObjetivo: 0, ...extra });
function resolver(h, c) {
  const random = Math.random;
  Math.random = () => .5;
  try {
    return require('../src/lib/expediciones/combate.ts').resolverHabilidadJugador(h, { contextoTactico: c, jugadorHp: c.objetivoAliado ? c.objetivoHp : c.actorHp, jugadorHpMaximo: c.objetivoAliado ? c.objetivoHpMaximo : c.actorHpMaximo, jugadorDefensa: c.defensaActor, jugadorAtaque: c.ataque, jugadorAtaqueMagico: c.ataqueMagico, jugadorProbCritico: 0, jugadorPrecision: 100, enemigoDefensa: 0, efectosJugador: c.objetivoAliado ? c.efectosObjetivo : c.efectosActor, efectosEnemigo: c.efectosObjetivo });
  } finally { Math.random = random; }
}

test('tres pasivas de maná comparten el pago y el límite de cinco por ciclo', () => {
  const pasivas = ['apoyo', 'preparacion', 'cambiar_objetivo'].map(condicion => HABILIDADES.find(h => h.reglaPasiva?.condicion === condicion && h.reglaPasiva?.ventaja === 'mana'));
  assert.ok(pasivas.every(Boolean));
  const hist = { ...estado('preparacion', 1, 'anterior'), clave: '_historial', destinatarioId: 'otro' };
  const h = { ...obtenerHabilidadPorId('arconte_tactica'), costeMana: 40 };
  const c = contexto({ objetivoId: 'a', objetivoAliado: true, objetivoHp: 50, objetivoHpMaximo: 100, pasivas, efectosActor: [tactico([hist])] });
  c.efectosObjetivo = c.efectosActor;
  const primero = resolver(h, c);
  assert.equal(primero.recursosRecuperados.mana, 5);
  const segundoContexto = { ...c, efectosActor: primero.efectosActorActualizados, efectosObjetivo: primero.efectosActorActualizados };
  assert.equal(resolver(h, segundoContexto).recursosRecuperados.mana, 0);
  assert.equal(resolver(h, { ...segundoContexto, ciclo: 2 }).recursosRecuperados.mana, 5);
});

test('el drenaje usa daño real sin sobreletal y consumir Observación cura al cazador, nunca al rival', () => {
  const drenaje = HABILIDADES.find(h => h.claseId === 'brujo' && h.roboVida);
  const r = resolver(drenaje, contexto({ objetivoHp: 1 }));
  assert.equal(r.actorHpActualizado, 50);
  const h = obtenerHabilidadPorId('cazador_espectral_avanzada');
  const preparacion = { ...estado('preparacion', 1, 'observar'), clave: 'observacion' };
  const resultado = resolver(h, contexto({ claseId: 'cazador_espectral', efectosActor: [tactico([preparacion])] }));
  assert.equal(resultado.actorHpActualizado, 54);
  assert.ok(resultado.accion.dano > 0);
});
