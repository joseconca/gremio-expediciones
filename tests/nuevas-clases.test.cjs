require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CLASES, obtenerAncestrosClase, evaluarDesbloqueoClase, esClaseDescubierta, calcularBonificacionesDominioEquipo } = require("../src/lib/progresion/clases.ts");
const { CLASES_NUEVAS } = require("../src/lib/progresion/clases-nuevas.ts");
const { HABILIDADES, obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
const { resolverHabilidadJugador } = require("../src/lib/expediciones/combate.ts");
const { aplicarBarreraAccion, calcularAtaqueModificado, calcularPrecisionModificada, procesarEfectosTurno, retirarEfectosHabilidad, leerEfectosCombate } = require("../src/lib/expediciones/estados-combate.ts");
const { ajustarHabilidadPorNivel } = require("../src/lib/progresion/niveles-habilidad.ts");
const { calcularRecompensaComercio } = require("../src/lib/expediciones/comercio.ts");
const { tirarBotinEnemigo } = require("../src/lib/lootObjetos.ts");
const { obtenerSpriteHeroe, obtenerRutaSpritesheetHeroe, obtenerLogoClaseHeroe, obtenerNombreClaseHeroe } = require("../src/lib/configuracionJuego.ts");

const progreso = (claseId, nivelJob) => ({ claseId, nivelJob, desbloqueada: true });
const combate = { jugadorAtaque: 100, jugadorAtaqueMagico: 5, jugadorDefensa: 50, jugadorDefensaMagica: 30, jugadorNivel: 10, jugadorHp: 50, jugadorHpMaximo: 100, jugadorProbCritico: 0, jugadorDanoCritico: 1.5, enemigoDefensa: 999, enemigoDefensaMagica: 0, enemigoNombre: "Objetivo", jugadorPrecision: 100, enemigoEvasion: 0 };

test("los requisitos 20/20/30/30 son independientes de los máximos Job", () => {
  for (const clase of Object.values(CLASES)) {
    if (clase.tier < 2 || clase.descubrimiento) continue;
    const umbral = clase.tier <= 2.5 ? 20 : 30;
    assert.ok(clase.requisitos.every((r) => r.nivelJob === umbral), clase.id);
    const completos = clase.requisitos.map((r) => progreso(r.claseId, umbral));
    assert.equal(evaluarDesbloqueoClase(clase.id, completos).puedeDesbloquear, true, clase.id);
    for (let i = 0; i < completos.length; i++) {
      const incompletos = completos.map((p, indice) => ({ ...p, nivelJob: indice === i ? umbral - 1 : umbral }));
      assert.equal(evaluarDesbloqueoClase(clase.id, incompletos).puedeDesbloquear, false, `${clase.id}: requisito ${i}`);
    }
    assert.equal(clase.nivelJobMaximo, clase.tier === 2 ? 60 : clase.tier === 2.5 ? 70 : 80);
  }
  assert.deepEqual(CLASES.corsario.requisitos, [{ claseId: "pirata", nivelJob: 30 }]);
  assert.deepEqual(CLASES.ninja.requisitos.map((r) => r.claseId), ["bardo", "explorador", "mago"]);
});

test("el dominio se conserva por todas las ramas sin sumar bonos", () => {
  for (const clase of Object.values(CLASES)) {
    for (const ancestro of obtenerAncestrosClase(clase.id)) {
      for (const arma of CLASES[ancestro].armasDominadas) assert.ok(clase.armasDominadas.includes(arma), `${clase.id}: ${arma}`);
    }
  }
  assert.equal(calcularBonificacionesDominioEquipo("maestro_espadas", "daga").multiplicadorAtaqueArma, 1 + CLASES.maestro_espadas.bonoAtaqueArmaDominada);
  for (const arma of ["espada", "hacha", "lanza", "daga", "arco", "baston", "maza", "libro", "puños"]) {
    assert.ok(Object.values(CLASES).filter((c) => c.armasDominadas.includes(arma)).length >= 2, arma);
  }
});

test("Comerciante y su descendencia permanecen ocultos hasta el hito comercial", () => {
  const progresos = [progreso("novato", 10), progreso("mago", 20)];
  for (const id of ["comerciante", "alquimista", "herrero"]) {
    assert.equal(esClaseDescubierta(id, progresos, { intercambiosComerciales: 4 }), false);
    assert.equal(esClaseDescubierta(id, progresos, { intercambiosComerciales: 5 }), true);
  }
  assert.equal(evaluarDesbloqueoClase("comerciante", progresos).puedeDesbloquear, false);
  assert.equal(evaluarDesbloqueoClase("comerciante", progresos, { intercambiosComerciales: 5 }).puedeDesbloquear, true);
  assert.equal(evaluarDesbloqueoClase("comerciante", [progreso("novato", 20), progreso("mago", 19)], { intercambiosComerciales: 99 }).puedeDesbloquear, false);
  assert.equal(esClaseDescubierta("alquimista", [progreso("comerciante", 20)]), true, "El descubrimiento persiste una vez desbloqueada la profesión");
});

test("Comerciante mejora botín y comercio y sus descendientes heredan el beneficio una sola vez", () => {
  const parametros = { distanciaKm: 100, nivelPersonaje: 5, nivelMercado: 2, afinidad: 10, capacidadCarruaje: 12, clase: "Comerciante", profesionActivaId: "mago" };
  const base = calcularRecompensaComercio(parametros);
  for (const id of ["comerciante", "alquimista", "herrero"]) {
    assert.equal(calcularRecompensaComercio({ ...parametros, profesionActivaId: id }), Math.floor(base * 1.1));
  }
  const enemigo = { probabilidadBotin: 0.1, tablaLoot: [{ objetoId: "pocion", peso: 1 }] };
  assert.equal(tirarBotinEnemigo(enemigo, () => 0.11, "mago"), null);
  assert.ok(tirarBotinEnemigo(enemigo, () => 0.11, "comerciante"));
  assert.equal(tirarBotinEnemigo(enemigo, () => 0.12, "comerciante"), null);
  assert.equal(tirarBotinEnemigo({ ...enemigo, probabilidadBotin: 0 }, () => 0, "comerciante"), null);
});

test("Hoja del velo usa ataque físico contra defensa mágica y sustituye el desgaste por preparación del velo", () => {
  const random = Math.random;
  Math.random = () => 0.5;
  try {
    const tecnica = obtenerHabilidadPorId("hoja_velo_ataque");
    const normal = resolverHabilidadJugador(tecnica, combate);
    const masMana = resolverHabilidadJugador(tecnica, { ...combate, jugadorAtaqueMagico: 999 });
    const masFuerza = resolverHabilidadJugador(tecnica, { ...combate, jugadorAtaque: 200 });
    const protegido = resolverHabilidadJugador(tecnica, { ...combate, enemigoDefensaMagica: 100 });
    assert.equal(normal.accion.dano, 125);
    assert.equal(masMana.accion.dano, normal.accion.dano);
    assert.equal(masFuerza.accion.dano, 250);
    assert.equal(protegido.accion.dano, 62);
    assert.equal(normal.efectosEnemigoActualizados.some(e=>e.tipo==="dano_progresivo"),false);
  } finally { Math.random = random; }
});

test("barrera bloquea un impacto, no consume fallos y no escala sus cargas", () => {
  const habilidad = obtenerHabilidadPorId("abjurador_tactica");
  const resultado = resolverHabilidadJugador(habilidad, combate);
  const efectos = leerEfectosCombate(resultado.efectosJugadorActualizados).filter(e=>e.tipo==="barrera");
  const fallo = { dano: 0, critico: false, texto: "Fallo" };
  aplicarBarreraAccion(fallo, efectos);
  assert.equal(efectos.length, 1);
  const golpe = { dano: 50, critico: true, texto: "Golpe" };
  aplicarBarreraAccion(golpe, efectos);
  assert.equal(golpe.dano, 0);
  assert.equal(golpe.critico, false);
  assert.equal(efectos.length, 0);
  const siguiente = { dano: 50, critico: false, texto: "Golpe" };
  aplicarBarreraAccion(siguiente, efectos);
  assert.equal(siguiente.dano, 50);
  const mejorada = ajustarHabilidadPorNivel(habilidad, 10);
  assert.equal(mejorada.estadosSecundarios[0].valor, 1);
  const expirada = procesarEfectosTurno([{ ...resultado.efectosJugadorActualizados.find(e=>e.tipo==="barrera"), turnosRestantes: 1 }], 50, 100, 50, "Aliado");
  assert.equal(expirada.efectos.length, 0);
});

test("bloquear una técnica también impide el drenaje y sus estados perjudiciales", () => {
  const rng = Math.random;
  Math.random = () => 0.5;
  try {
    const escudo = [{ habilidadId: "abjurador_tactica", tipo: "barrera", valor: 1, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" }];
    const resultado = resolverHabilidadJugador(obtenerHabilidadPorId("saqueador_ataque"), { ...combate, efectosEnemigo: escudo });
    assert.equal(resultado.accion.dano, 0);
    assert.equal(resultado.jugadorHp, combate.jugadorHp);
    assert.equal(resultado.efectos.length, 0);
    assert.equal(resultado.efectosEnemigoActualizados.some(e=>e.tipo==="barrera"),false);
    assert.equal(escudo.length,1,"el resolver no modifica el snapshot de entrada");
  } finally { Math.random = rng; }
});

test("Bardo y Heraldo aplican mejoras reales a los objetivos aliados", () => {
  const bardo = resolverHabilidadJugador(obtenerHabilidadPorId("bardo_tactica"), combate);
  const golpeBardo={dano:100,critico:false,texto:""};
  aplicarBarreraAccion(golpeBardo,bardo.efectosJugadorActualizados);
  assert.equal(golpeBardo.dano,82);
  const heraldo = resolverHabilidadJugador(obtenerHabilidadPorId("heraldo_guerra_tactica"), combate);
  const golpeHeraldo={dano:100,critico:false,texto:""};
  aplicarBarreraAccion(golpeHeraldo,heraldo.efectosJugadorActualizados);
  assert.equal(golpeHeraldo.dano,79);
  assert.equal(heraldo.jugadorDefensa,combate.jugadorDefensa,"las guardias no alteran permanentemente la defensa");
});

test("las clases nuevas tienen habilidades aprendibles y visuales provisionales existentes", () => {
  assert.equal(new Set(HABILIDADES.map((h) => h.id)).size, HABILIDADES.length);
  for (const clase of Object.values(CLASES_NUEVAS)) {
    const propias = HABILIDADES.filter((h) => h.claseId === clase.id);
    assert.equal(propias.filter((h) => h.tipo === "activa").length, 4, clase.id);
    assert.equal(propias.filter((h) => h.tipo === "pasiva").length, 2, clase.id);
    assert.ok(propias.every((h) => h.nivelJobRequerido <= clase.nivelJobMaximo));
    assert.equal(obtenerNombreClaseHeroe(null, clase.id), clase.nombre);
    for (const sexo of ["chico", "chica"]) {
      for (const ruta of [obtenerSpriteHeroe(null, sexo, clase.id), obtenerRutaSpritesheetHeroe(null, sexo, clase.id), obtenerLogoClaseHeroe(null, sexo, clase.id)]) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", "public", ruta.slice(1))), `${clase.id}: ${ruta}`);
      }
    }
  }
});
