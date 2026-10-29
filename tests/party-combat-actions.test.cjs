require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const reglas = require("../src/lib/party/combate-reglas.ts");
const reglasExpedicion = require("../src/lib/party/expedicion-reglas.ts");

class MockPartyError extends Error {
  constructor(message, status = 409, code = "PARTY_CONFLICT") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function loadService(prisma, testOptions = {}) {
  const filename = path.resolve(__dirname, "../src/server/services/party/combate-party-actions.ts");
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const dependencies = {
    "@prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/prisma": { prisma },
    "@/lib/expediciones/combate": {
      resolverAtaqueJugador: () => ({ actor: "jugador", tipo: "ataque", animacion: "ofensiva", dano: 12, critico: false, texto: "El aventurero inflige 12 de daño." }),
      resolverAtaqueEnemigo: () => ({ actor: "enemigo", tipo: "ataque", animacion: "ofensiva", dano: 10, critico: false, texto: "El enemigo inflige 10 de daño." }),
      resolverHabilidadJugador: (habilidad, combate) => {
        if (testOptions.resolverHabilidadesReales) return require("../src/lib/expediciones/combate.ts").resolverHabilidadJugador(habilidad, combate);
        const curacion = habilidad.efecto === "curacion"
          ? Math.min(20, Math.max(0, combate.jugadorHpMaximo - combate.jugadorHp))
          : 0;
        return {
          accion: {
            actor: "jugador", tipo: "habilidad",
            animacion: habilidad.efecto === "curacion" ? "curacion" : "ofensiva",
            dano: habilidad.efecto === "dano" ? 20 : 0,
            ...(curacion > 0 ? { curacion } : {}),
            critico: false, texto: "Habilidad de prueba.",
          },
          jugadorHp: combate.jugadorHp + curacion,
          jugadorDefensa: combate.jugadorDefensa + (habilidad.efecto === "bonus_defensa" ? 2 : 0),
          enemigoDefensa: combate.enemigoDefensa,
          efectos: habilidad.efecto === "bonus_defensa"
            ? [{ habilidadId: habilidad.id, tipo: "bonus_defensa", valor: 2, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" }]
            : [],
        };
      },
    },
    "@/lib/expediciones/estados-combate": {
      ...require("../src/lib/expediciones/estados-combate.ts"),
      aplicarBarreraAccion: require("../src/lib/expediciones/estados-combate.ts").aplicarBarreraAccion,
      retirarEfectosHabilidad: require("../src/lib/expediciones/estados-combate.ts").retirarEfectosHabilidad,
      calcularAtaqueModificado: (value) => value,
      calcularEvasionModificada: (value) => value,
      calcularPrecisionModificada: (value) => value,
      leerEfectosCombate: (value) => Array.isArray(value) ? value : [],
      procesarTicksPeriodicos: (effects, hp) => {
        const dano = Array.isArray(effects) ? effects.reduce((total, efecto) =>
          efecto.tipo === "dano_progresivo" ? total + efecto.valor : total, 0) : 0;
        const curacion = Array.isArray(effects) ? effects.reduce((total, efecto) =>
          efecto.tipo === "curacion_progresiva" ? total + efecto.valor : total, 0) : 0;
        return {
          hp: Math.max(0, hp - dano + curacion),
          mensajes: [
            ...(dano > 0 ? [`Daño periódico: ${dano}.`] : []),
            ...(curacion > 0 ? [`Curación periódica: ${curacion}.`] : []),
          ],
          danoAplicado: dano,
          curacionAplicada: curacion,
        };
      },
      avanzarEfectosCombate: (effects, defensa) => ({ efectos: effects, defensa, mensajes: [] }),
      procesarEfectosTurno: (effects, hp, hpMax, defensa, nombre, personajeId) => {
        if (testOptions.efectosReales) return require("../src/lib/expediciones/estados-combate.ts").procesarEfectosTurno(effects,hp,hpMax,defensa,nombre);
        const lista = Array.isArray(effects) ? effects : [];
        const propios = lista.filter((efecto) =>
          efecto.objetivo === (personajeId === undefined ? "enemigo" : "jugador"));
        const danoAplicado = propios.reduce((total, efecto) =>
          efecto.tipo === "dano_progresivo" ? total + efecto.valor : total, 0);
        const curacionAplicada = propios.reduce((total, efecto) =>
          efecto.tipo === "curacion_progresiva" ? total + efecto.valor : total, 0);
        return {
          efectos: lista,
          hp: Math.min(hpMax, Math.max(0, hp - danoAplicado + curacionAplicada)),
          defensa,
          mensajes: [
            ...(danoAplicado > 0 ? [`Daño periódico: ${danoAplicado}.`] : []),
            ...(curacionAplicada > 0 ? [`Curación periódica: ${curacionAplicada}.`] : []),
          ],
          danoAplicado,
          curacionAplicada,
        };
      },
    },
    "@/lib/party/combate-reglas": reglas,
    "@/lib/expediciones/objetivos-combate": require("../src/lib/expediciones/objetivos-combate.ts"),
    "@/lib/expediciones/enemigos-combate": require("../src/lib/expediciones/enemigos-combate.ts"),
    "@/lib/habilidades": {
      obtenerHabilidadPorId: (id) => testOptions.habilidadesPorId?.[id] ?? (id === "golpe_arcano" ? {
        id: "golpe_arcano", claseId: "novato", nombre: "Golpe arcano", descripcion: "Habilidad de test.",
        tipo: "activa", efecto: "dano", costeEnergia: 5, costeMana: 0, cooldownTurnos: 2, multiplicadorDano: 1.5,
      } : undefined),
    },
    "@/lib/objetos": {
      obtenerObjetoPorId: (id) => testOptions.objetosPorId?.[id] ?? (id === "pocion" ? {
        id: "pocion", nombre: "Poción", tipo: "consumible", curacion: 30,
      } : undefined),
    },
    "@/lib/progresion/niveles-habilidad": {
      ajustarHabilidadPorNivel: (habilidad, nivel) => ({ ...habilidad, nivel }),
    },
    "@/lib/progresion/clases": {
      puedeUsarHabilidadDeClase: () => true,
    },
    "@/server/services/combate/accion-combate": {
      reducirCooldowns: (cooldowns) => cooldowns,
      obtenerCooldowns: (valor) => valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {},
      gastarRecursosHabilidad: require("../src/server/services/combate/accion-combate.ts").gastarRecursosHabilidad,
      otorgarExperienciaJob: testOptions.otorgarExperienciaJob ?? (async () => null),
    },
    "@/lib/enemigos": {
      obtenerEnemigoPorId: (id) => ({ id, botin: 10, difMin: 1, ...(testOptions.enemigo ?? {}) }),
    },
    "@/lib/lootObjetos": {
      tirarBotinEnemigo: (enemigo, rng = Math.random) => {
        if (!enemigo?.tablaLoot?.length) return null;
        const tirada = rng();
        if (Array.isArray(testOptions.lootRolls)) testOptions.lootRolls.push(tirada);
        if (tirada >= (enemigo.probabilidadBotin ?? 0)) return null;
        const entrada = enemigo.tablaLoot.find((item) => item.peso > 0);
        if (!entrada) return null;
        const objeto = entrada.objetoId === "pocion"
          ? { id: "pocion", nombre: "Poción", tipo: "consumible", rareza: "comun" }
          : undefined;
        return objeto ? { objeto, sufijoId: "del test", bonificaciones: { vitalidad: 1 } } : null;
      },
    },
    "@/lib/inventario": {
      LIMITE_INVENTARIO_OBJETOS: 30,
      obtenerEquipoDesdePersonaje: () => ({
        arma: null, manoSecundaria: null, casco: null, armadura: null, pantalones: null,
        botas: null, guantes: null, accesorio: null, anillo1: null, anillo2: null,
      }),
    },
    "@/lib/configuracionJuego": { experienciaParaNivel: () => 500 },
    "@/lib/expediciones/dificultad": {
      esModoDificultad: (value) => ["facil", "normal", "dificil"].includes(value),
      calcularExperienciaBaseGanada: (_dificultad, nivel) => nivel * 10,
      calcularOroEnemigo: () => 10,
      aplicarMultiplicadorRecompensa: (value) => value,
      registrarVictoriaRangoNormal: (prev, nivel) => [...(Array.isArray(prev) ? prev : []), nivel],
    },
    "@/lib/party/expedicion-reglas": {
      ...reglasExpedicion,
      calcularFechaLlegadaParty: (_distance, velocidades, _multiplicador, salida) =>
        new Date(salida.getTime() + Math.max(30_000, 1000 / Math.min(...velocidades))),
    },
    "@/lib/expediciones/tiempos": require("../src/lib/expediciones/tiempos.ts"),
    "@/lib/party/reglas": {
      leerCoordenadasBase: (value) => value && typeof value.lat === "number" && typeof value.lng === "number" ? value : null,
    },
    "@/lib/utils": { calcularDistanciaKm: () => 12 },
    "@/server/services/party/party-service": { PartyServiceError: MockPartyError },
  };
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function mkParticipant(id, order, hp = 100, hpMax = 100, status = "activo") {
  return {
    id: "cp-" + id,
    combatePartyId: "combat-1",
    usuarioId: id,
    personajeId: "personaje-" + id,
    ordenTurno: order,
    jugadorPosicion: order === 0 ? "mele" : "centro",
    estado: status,
    jugadorHp: hp,
    jugadorHpMaximo: hpMax,
    jugadorAtaque: 20,
    jugadorAtaqueMagico: 15,
    jugadorDefensa: 5,
    jugadorDefensaMagica: 4,
    jugadorVelocidad: 8,
    jugadorProbCritico: 0.1,
    jugadorDanoCritico: 1.5,
    jugadorPrecision: 75,
    jugadorEvasion: 0,
    jugadorNivel: 3,
    cooldowns: {},
    efectos: [],
  };
}

function mkCombat(overrides = {}) {
  return {
    id: "combat-1",
    expedicionPartyId: "expedition-1",
    version: 0,
    fase: "activo",
    ronda: 1,
    faseTurno: "jugador",
    turnoInicialEnemigo: false,
    turnoActualUsuarioId: "u1",
    enemigoId: "slime",
    enemigoNombre: "Slime",
    enemigoHp: 40,
    enemigoHpMaximo: 40,
    enemigoAtaque: 12,
    enemigoAtaqueMagico: 8,
    enemigoDefensa: 4,
    enemigoDefensaMagica: 3,
    enemigoVelocidad: 5,
    enemigoProbCritico: 0.1,
    enemigoDanoCritico: 1.5,
    enemigoPrecision: 75,
    enemigoEvasion: 0,
    enemigoNivel: 3,
    efectosEnemigo: [],
    log: [],
    participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1)],
    ...overrides,
  };
}

function mockPrisma(combat, options = {}) {
  const propiaV2=Object.values(options.habilidadesPorId??{}).find(h=>h.versionReglas===2);
  const claseFixture=options.profesionActivaId??propiaV2?.claseId??"novato";
  const jobFixture=options.nivelJob??(propiaV2?require("../src/lib/progresion/clases.ts").CLASES[claseFixture].nivelJobMaximo:1);
  const calls = {
    combatWrites: [], participantWrites: [], characterWrites: [], expeditionWrites: [],
    expeditionParticipantWrites: [], resourceWrites: [], inventoryWrites: [], userWrites: [],
    inventoryCreates: [], inventoryStackWrites: [], progressionWrites: [],
  };
  const character = {
    id: "personaje-u1",
    usuarioId: "u1",
    clase: "Novato",
    nivel: 3,
    experiencia: 0,
    rangosAmenazaCompletados: [],
    profesionActivaId: claseFixture,
    progresosClase: [{ claseId: claseFixture, desbloqueada: true, nivelJob: jobFixture }],
    fuerza: 5,
    agilidad: 5,
    vitalidad: 5,
    inteligencia: 5,
    destreza: 5,
    suerte: 5,
    velocidadMejoras: 0,
    capacidadCarruajeMejoras: 0,
    equipoEquipado: null,
    energiaActual: options.energiaActual ?? 20,
    manaActual: options.manaActual ?? 10,
    habilidades: options.habilidades ?? [],
    inventario: options.inventario ?? { id: "inventario-u1", objetos: [{ id: "inv-pocion-1", objetoId: "pocion", cantidad: 1 }] },
  };
  let faseExpedicion = "combatiendo";
  const tx = {
    combateParty: {
      findUnique: async ({ select } = {}) => select?.recompensasResueltas !== undefined
        ? { recompensasResueltas: Boolean(combat.recompensasResueltas) }
        : combat,
      updateMany: async ({ where, data }) => {
        calls.combatWrites.push({ where, data });
        if (options.rejectCombatUpdate) return { count: 0 };
        if (where.version !== undefined && where.version !== combat.version) return { count: 0 };
        if (where.fase !== undefined && where.fase !== combat.fase) return { count: 0 };
        if (where.faseTurno !== undefined && where.faseTurno !== combat.faseTurno) return { count: 0 };
        if (where.turnoActualUsuarioId !== undefined && where.turnoActualUsuarioId !== combat.turnoActualUsuarioId) return { count: 0 };
        if (where.recompensasResueltas === false && combat.recompensasResueltas === true) return { count: 0 };
        if (where.fase === "victoria" && combat.fase !== "victoria") return { count: 0 };
        if (data.recompensasResueltas === true) combat.recompensasResueltas = true;
        Object.assign(combat, data, { version: combat.version + 1 });
        return { count: 1 };
      },
    },
    expedicionParty: {
      findUnique: async ({ select, include } = {}) => {
        if (select?.fase) return { fase: faseExpedicion };
        if (include?.participantes?.include?.personaje) {
          return {
            id: "expedition-1",
            fase: "combatiendo",
            tipo: options.tipo ?? "normal",
            dificultad: 3,
            modoDificultad: "normal",
            recompensa: options.recompensa ?? { oro: 11, madera: 4, piedra: 2, metal: 1, objetos: [{ objetoId: "pocion", cantidad: 2 }] },
            participantes: combat.participantes.map((p) => ({
              id: "exp-part-" + p.usuarioId,
              usuarioId: p.usuarioId,
              personajeId: p.personajeId,
              estado: p.estado,
              creado: new Date(0),
              usuario: { id: p.usuarioId },
              personaje: p.usuarioId === "u1" ? { ...character, id: p.personajeId } : {
                id: p.personajeId, usuarioId: p.usuarioId, nivel: p.usuarioId === "u3" ? 7 : 3, experiencia: 0,
                profesionActivaId: "novato", rangosAmenazaCompletados: [], inventario: { id: "inventario-" + p.usuarioId },
              },
            })),
          };
        }
        if (include?.participantes?.include?.usuario) {
          return { id: "expedition-1", fase: faseExpedicion, participantes: combat.participantes.map((p) => ({
            id: "exp-part-" + p.usuarioId,
            usuarioId: p.usuarioId,
            personajeId: p.personajeId,
            estado: p.estado,
            velocidadViajeKmh: 6,
            usuario: { id: p.usuarioId, baseCoords: { lat: 27.9, lng: -15.4 }, personaje: { estado: "combatiendo" } },
            creado: new Date(0),
            velocidadViajeKmh: 6,
          })),
          origenCoords: { lat: 27.9, lng: -15.4 },
          destinoCoords: { lat: 28.0, lng: -15.5 },
          fechaSalida: new Date("2026-10-15T10:00:00.000Z"),
          fechaLlegada: new Date("2026-10-15T10:15:00.000Z"),
          resultadoFinal: null,
        };
        }
        return {
          id: "expedition-1",
          fase: faseExpedicion,
          tipo: options.tipo ?? "normal",
          dificultad: 3,
          modoDificultad: "normal",
          recompensa: options.recompensa ?? { oro: 11, madera: 4, piedra: 2, metal: 1, objetos: [{ objetoId: "pocion", cantidad: 2 }] },
          resultadoFinal: null,
          origenCoords: { lat: 27.9, lng: -15.4 },
          destinoCoords: { lat: 28.0, lng: -15.5 },
          participantes: combat.participantes.map((p) => ({
            id: "exp-part-" + p.usuarioId,
            usuarioId: p.usuarioId,
            personajeId: p.personajeId,
            estado: p.estado,
            velocidadViajeKmh: 6,
            usuario: { id: p.usuarioId, baseCoords: { lat: 27.9, lng: -15.4 }, personaje: { estado: "combatiendo" } },
            personaje: p.usuarioId === "u1" ? { ...character, id: p.personajeId } : {
              id: p.personajeId,
              usuarioId: p.usuarioId,
              nivel: p.usuarioId === "u3" ? 7 : 3,
              experiencia: 0,
              profesionActivaId: "novato",
              rangosAmenazaCompletados: [],
              inventario: { id: "inventario-" + p.usuarioId },
            },
          })),
        };
      },
      updateMany: async ({ where, data }) => {
        calls.expeditionWrites.push({ where, data });
        if (options.rejectExpeditionUpdate) return { count: 0 };
        if (where.fase && where.fase !== faseExpedicion) return { count: 0 };
        if (data.fase) faseExpedicion = data.fase;
        return { count: 1 };
      },
    },
    usuario: {
      update: async ({ where, data }) => {
        calls.userWrites.push({ where, data });
        return { id: where.id, ...data };
      },
    },
    progresoClase: {
      findUnique: async () => null,
      update: async (args) => {
        calls.progressionWrites.push(args);
        return args.data;
      },
    },
    inventario: {
      findUnique: async ({ where }) => ({ id: "inventario-" + where.personajeId }),
      create: async ({ data }) => {
        calls.inventoryCreates.push(data);
        return { id: "inventario-" + data.personajeId };
      },
    },
    inventarioObjeto: {
      count: async () => options.inventoryCount ?? 0,
      findFirst: async () => null,
      create: async ({ data }) => {
        calls.inventoryStackWrites.push(data);
        return data;
      },
      update: async ({ where, data }) => {
        calls.inventoryStackWrites.push({ where, data });
        return data;
      },
      updateMany: async ({ where, data }) => {
        calls.inventoryWrites.push({ where, data });
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    expedicionPartyParticipante: {
      updateMany: async ({ where, data }) => {
        calls.expeditionParticipantWrites.push({ where, data });
        return { count: combat.participantes.length };
      },
    },
    combatePartyParticipante: {
      updateMany: async ({ where, data }) => {
        calls.participantWrites.push({ where, data });
        if (options.rejectParticipantUpdate) return { count: 0 };
        const target = combat.participantes.find((p) =>
          p.id === where.id && (where.jugadorHp === undefined || p.jugadorHp === where.jugadorHp)
        );
        if (!target) return { count: 0 };
        Object.assign(target, data);
        return { count: 1 };
      },
    },

    personaje: {
      findUnique: async () => character,
      updateMany: async ({ where, data }) => {
        calls.characterWrites.push({ where, data });
        if (data.energiaActual?.decrement !== undefined || data.manaActual?.decrement !== undefined) {
          calls.resourceWrites.push({ where, data });
          character.energiaActual -= data.energiaActual?.decrement ?? 0;
          character.manaActual -= data.manaActual?.decrement ?? 0;
        }
        if (options.rejectCharacterUpdate) return { count: 0 };
        return { count: 1 };
      },
    },
  };
  return {
    prisma: {
      $transaction: async (callback, txOptions) => {
        assert.equal(txOptions?.isolationLevel, "Serializable");
        return callback(tx);
      },
    },
    calls,
    options,
    character,
  };
}

test("solo el aventurero que tiene el turno puede atacar", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u2", "expedition-1", "atacar"),
    (error) => error.status === 409 && error.code === "NO_ES_TU_TURNO",
  );
  assert.equal(calls.combatWrites.length, 0);
});

test("las 245 activas con cinco ranuras y tres pasivas persisten en party el mismo resultado que individual", async () => {
  const {HABILIDADES,obtenerHabilidadesDisponiblesParaClase}=require("../src/lib/habilidades.ts");
  const {calcularEstadisticasPersonaje}=require("../src/lib/estadisticasPersonaje.ts");
  const {resolverHabilidadJugador}=require("../src/lib/expediciones/combate.ts");
  const rng=Math.random;Math.random=()=>.5;
  let comprobadas=0;
  try{
    for(const h of HABILIDADES.filter(h=>h.tipo==="activa")){
      const legales=obtenerHabilidadesDisponiblesParaClase(h.claseId);
      const otras=legales.filter(a=>a.tipo==="activa"&&a.id!==h.id).slice(0,4);
      const pasivas=legales.filter(a=>a.tipo==="pasiva").slice(0,3);
      const habilidades=[...otras.map((a,i)=>({habilidadId:a.id,nivel:1,slot:`activa_${i+1}`})),{habilidadId:h.id,nivel:1,slot:"activa_5"},...pasivas.map((p,i)=>({habilidadId:p.id,nivel:1,slot:`pasiva_${i+1}`}))];
      const actor=mkParticipant("u1",0,50,100);
      const combat=mkCombat({participantes:[actor],enemigoHp:100000,enemigoHpMaximo:100000});
      const options={profesionActivaId:h.claseId,resolverHabilidadesReales:true,efectosReales:true,energiaActual:100,manaActual:1000,habilidades,habilidadesPorId:Object.fromEntries(legales.map(a=>[a.id,a]))};
      const {prisma,character}=mockPrisma(combat,options);
      const stats=calcularEstadisticasPersonaje(character,pasivas).total;
      const aliado=h.objetivo?.equipo!=="enemigo"&&h.efecto!=="dano";
      const c={actorId:"u1",objetivoId:aliado?"u1":"enemigo-1",claseId:h.claseId,ciclo:1,actorHp:50,actorHpMaximo:100,energia:100,energiaMaxima:stats.energiaMaxima,mana:stats.manaMaximo,manaMaximo:stats.manaMaximo,ataque:20,ataqueMagico:15,defensaActor:5,defensaMagicaActor:4,efectosActor:[],objetivoHp:aliado?50:100000,objetivoHpMaximo:aliado?100:100000,defensaObjetivo:aliado?5:4,defensaMagicaObjetivo:aliado?4:3,efectosObjetivo:[],objetivoAliado:aliado,filaActor:0,filaObjetivo:aliado?0:1,pasivas,numeroObjetivos:1,principal:true};
      const esperado=resolverHabilidadJugador(h,{contextoTactico:c,jugadorHp:50,jugadorHpMaximo:100,jugadorDefensa:5,jugadorDefensaMagica:4,jugadorAtaque:20,jugadorAtaqueMagico:15,jugadorNivel:3,jugadorProbCritico:.1,jugadorDanoCritico:1.5,jugadorPrecision:75,enemigoEvasion:0,enemigoDefensa:4,enemigoDefensaMagica:3,enemigoNombre:"Slime",efectosJugador:[],efectosEnemigo:[]});
      const real=await loadService(prisma,options).ejecutarAccionCombateParty("u1","expedition-1","usar_habilidad",{habilidadId:h.id,objetivoId:aliado?"u1":"enemigo-1"});
      assert.equal(real.accion.dano,esperado.accion.dano,h.id+": daño");
      assert.equal(combat.participantes[0].jugadorHp,esperado.actorHpActualizado,h.id+": PV del actor");
      assert.equal(combat.participantes[0].jugadorDefensa,esperado.jugadorDefensa,h.id+": defensa");
      const normalizar=e=>JSON.parse(JSON.stringify(e??[]));
      assert.deepEqual(normalizar(combat.participantes[0].efectos),normalizar(esperado.efectosActorActualizados),h.id+": efectos del actor");
      if(!aliado)assert.deepEqual(normalizar(combat.enemigos[0].efectos),normalizar(esperado.efectosEnemigoActualizados),h.id+": efectos del rival");
      comprobadas++;
    }
  }finally{Math.random=rng;}
  assert.equal(comprobadas,245);
});

test("la barrera de un aliado bloquea y se consume de forma persistente durante el turno enemigo", async () => {
  const combat = mkCombat({ faseTurno: "enemigo", turnoActualUsuarioId: null });
  combat.participantes[0].jugadorHp = 40;
  combat.participantes[0].efectos = [{ habilidadId: "abjurador_tactica", tipo: "barrera", valor: 1, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" }];
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(result.accion.dano, 0);
  assert.equal(combat.participantes[0].jugadorHp, 40);
  assert.ok(calls.participantWrites.some((w) => w.where.id === "cp-u1" && Array.isArray(w.data.efectos) && w.data.efectos.length === 0));
  assert.equal(combat.participantes[0].efectos.length, 0);
});

test("Heraldo mejora al grupo y reaplicar sus mejoras no acumula defensa", async () => {
  const combat = mkCombat();
  combat.participantes[1].jugadorPosicion="mele";
  const habilidad = require("../src/lib/habilidades.ts").obtenerHabilidadPorId("heraldo_guerra_tactica");
  const previo = { habilidadId: habilidad.id, tipo: "bonus_defensa", valor: 2, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" };
  combat.participantes[1].jugadorDefensa = 7;
  combat.participantes[1].efectos = [previo];
  const { prisma, options } = mockPrisma(combat, {
    resolverHabilidadesReales: true,
    energiaActual: 100, manaActual: 100,
    habilidades: [{ habilidadId: habilidad.id, nivel: 1, slot: "activa_1" }],
    habilidadesPorId: { [habilidad.id]: habilidad },
  });
  const result = await loadService(prisma, options).ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: habilidad.id });
  assert.deepEqual(result.accion.objetivosUsuarioIds, ["u1", "u2"]);
  for (const miembro of combat.participantes) {
    assert.equal(miembro.jugadorDefensa, 5);
    assert.equal(miembro.efectos.filter((e) => e.tipo === "bonus_defensa").length, 0);
    const guardias=miembro.efectos.flatMap(e=>e.datosTacticos?.estados??[]).filter(e=>e.familia==="guardia");
    assert.equal(guardias.length,1);
    assert.equal(guardias[0].valor,10,"la reserva del 21 % se reparte entre los dos aliados");
  }
});

test("la protección parcial se descuenta en la base de datos aunque conserve el contenedor táctico", async () => {
  const combat = mkCombat({ faseTurno: "enemigo", turnoActualUsuarioId: null, participantes: [mkParticipant("u1", 0)], turnosPendientes: [{ actorId: "enemigo-1", equipo: "enemigo" }] });
  combat.participantes[0].efectos = [{ habilidadId: "tactica:u1", tipo: "tactico", valor: 0, duracionTurnos: 1, turnosRestantes: 1, objetivo: "jugador", datosTacticos: { version: 2, propietarioId: "u1", limites: {}, estados: [{ id: "g", fuenteId: "guardia", creadorId: "u1", clave: "guardia", familia: "guardia", valor: 25, restantes: 3, reloj: "turno", cargas: 1 }] } }];
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(combat.participantes[0].jugadorHp, 100);
  assert.equal(combat.participantes[0].efectos[0].datosTacticos.estados[0].valor, 15);
  assert.ok(calls.participantWrites.some(w => w.data.efectos?.[0]?.datosTacticos?.estados[0]?.valor === 15));
  combat.faseTurno = "enemigo";
  combat.turnoActualUsuarioId = null;
  combat.turnosPendientes = [{ actorId: "enemigo-1", equipo: "enemigo" }];
  await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(combat.participantes[0].efectos[0].datosTacticos.estados[0].valor, 5);
});

test("la cura de área real del Arconte reserva el presupuesto para los aliados heridos", async () => {
  const h = require("../src/lib/habilidades.ts").obtenerHabilidadPorId("arconte_tactica");
  const combat = mkCombat({ participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1, 90), mkParticipant("u3", 2, 70)] });
  for (const participante of combat.participantes) participante.jugadorPosicion = "mele";
  const options = { profesionActivaId: "arconte", energiaActual: 100, manaActual: 1000, resolverHabilidadesReales: true, efectosReales: true, habilidades: [{ habilidadId: h.id, nivel: 1, slot: "activa_5" }], habilidadesPorId: { [h.id]: h } };
  const { prisma } = mockPrisma(combat, options);
  await loadService(prisma, options).ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: h.id, objetivoId: "u1" });
  assert.deepEqual(combat.participantes.map(p => p.jugadorHp), [100, 96, 89]);
  const preparaciones = combat.participantes[0].efectos.flatMap(e => e.datosTacticos?.estados ?? []).filter(e => e.clave === "luz");
  assert.equal(preparaciones.length, 1);
});

test("un ataque básico reduce al enemigo y avanza al siguiente miembro", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.enemigoHp, 28);
  assert.equal(result.fase, "activo");
  assert.equal(result.faseTurno, "jugador");
  assert.equal(result.turnoActualUsuarioId, "u2");
  assert.equal(combat.version, 1);
  assert.equal(calls.combatWrites.length, 1);
  assert.equal(calls.combatWrites[0].data.enemigoHp, 28);
});

test("un ataque que vacía el HP del enemigo marca victoria en vez de ceder otro turno", async () => {
  const combat = mkCombat({ enemigoHp: 10 });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.fase, "victoria");
  assert.equal(combat.fase, "victoria");
  assert.equal(combat.enemigoHp, 0);
  assert.equal(calls.expeditionWrites[0].data.fase, "regresando");
  assert.equal(calls.expeditionWrites[0].data.fechaSalida.toISOString(), "2026-10-15T10:15:00.000Z");
  assert.equal(calls.expeditionWrites[0].data.fechaLlegada.toISOString(), "2026-10-15T10:30:00.000Z");
});

test("al comenzar el siguiente turno de un miembro en party, solo él regenera sus recursos", async () => {
  const combat = mkCombat({
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    turnosPendientes: [
      { actorId: "enemigo-1", equipo: "enemigo" },
      { actorId: "u1", equipo: "jugador" },
      { actorId: "u2", equipo: "jugador" },
    ],
    participantes: [mkParticipant("u1", 0, 80, 100), mkParticipant("u2", 1, 20, 50)],
  });
  const { prisma, calls } = mockPrisma(combat, { energiaActual: 5, manaActual: 1 });
  const service = loadService(prisma);
  await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(calls.characterWrites.some((write) => write.data.energiaActual === 25), true);
  assert.equal(calls.characterWrites.some((write) => write.data.manaActual === 3), true);
});

test("la regeneración por turno en party solo incrementa al actor del siguiente turno", async () => {
  const combat = mkCombat({
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    turnosPendientes: [
      { actorId: "enemigo-1", equipo: "enemigo" },
      { actorId: "u1", equipo: "jugador" },
      { actorId: "u2", equipo: "jugador" },
    ],
    participantes: [mkParticipant("u1", 0, 80, 100), mkParticipant("u2", 1, 20, 50)],
  });
  const { prisma, calls } = mockPrisma(combat, { energiaActual: 5, manaActual: 1 });
  const service = loadService(prisma);
  await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(calls.characterWrites.some((write) => write.data.energiaActual === 25), true);
  assert.equal(calls.characterWrites.some((write) => write.data.manaActual === 3), true);
});

test("el turno del enemigo apunta al aventurero con menor porcentaje de vida", async () => {
  const combat = mkCombat({
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    turnosPendientes: [
      { actorId: "enemigo-1", equipo: "enemigo" },
      { actorId: "u1", equipo: "jugador" },
      { actorId: "u2", equipo: "jugador" },
    ],
    participantes: [mkParticipant("u1", 0, 80, 100), mkParticipant("u2", 1, 20, 50)],
  });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(result.objetivoUsuarioId, "u2");
  assert.equal(combat.participantes[1].jugadorHp, 10);
  assert.equal(combat.turnoActualUsuarioId, "u1");
  assert.equal(combat.ronda, 1, "el ciclo no avanza de ronda hasta consumir toda la cola");
  assert.equal(calls.characterWrites.filter((write) => write.data.hpActual === 10).length, 1);
  assert.equal(calls.characterWrites.some((write) => write.data.energiaActual === 40 && write.data.manaActual === 12), true);
});

test("si falla el control de versión, no se puede completar dos veces el turno", async () => {
  const combat = mkCombat();
  const { prisma } = mockPrisma(combat, { rejectCombatUpdate: true });
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar"),
    (error) => error.status === 409 && error.code === "COMBATE_PARTY_MODIFICADO",
  );
});


test("una habilidad activa equipada aplica daño, gasta recursos y guarda cooldown y efectos individuales", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "golpe_arcano", nivel: 1, slot: "activa_1" }],
    energiaActual: 20,
    manaActual: 10,
  });
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: "golpe_arcano" });
  assert.equal(result.accion.texto, "Habilidad de prueba.");
  assert.equal(result.enemigoHp, 20);
  assert.equal(combat.participantes[0].cooldowns.golpe_arcano, 2);
  assert.equal(calls.participantWrites.some((c) => c.data.efectos), true);
  assert.equal(calls.resourceWrites.some((c) => c.data.energiaActual?.decrement === 5), true);
  assert.equal(calls.resourceWrites.some((c) => c.data.manaActual === undefined), true);
});

test("un ataque básico golpea al enemigo seleccionado y no modifica el HP de los demás", async () => {
  const combat = mkCombat({
    enemigos: [
      {
        id: "enemigo-1", enemigoId: "slime", nombre: "Slime frontal", difMin: 2,
        casilla: 1, posicion: "mele", columna: 1, hp: 60, hpMaximo: 60,
        ataque: 12, ataqueMagico: 8, defensa: 4, defensaMagica: 3,
        velocidad: 5, probCritico: 0.1, danoCritico: 2, precision: 75, evasion: 0, nivel: 2, efectos: [],
      },
      {
        id: "enemigo-2", enemigoId: "raton", nombre: "Ratón del fondo", difMin: 1,
        casilla: 4, posicion: "centro", columna: 1, hp: 30, hpMaximo: 30,
        ataque: 7, ataqueMagico: 5, defensa: 2, defensaMagica: 2,
        velocidad: 6, probCritico: 0.1, danoCritico: 2, precision: 75, evasion: 0, nivel: 1, efectos: [],
      },
    ],
  });
  const { prisma } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar", {
    enemigoObjetivoId: "enemigo-2",
  });

  assert.equal(combat.enemigos[0].hp, 60);
  assert.equal(combat.enemigos[1].hp, 18);
  assert.equal(result.enemigoHp, 60, "el campo heredado representa al primer enemigo vivo, no el seleccionado");
  assert.equal(result.accion.enemigoObjetivoId, "enemigo-2");
});

test("Bola de fuego aplica daño independiente al objetivo y a sus enemigos adyacentes", async () => {
  const combat = mkCombat({
    enemigos: [
      {
        id: "enemigo-1", enemigoId: "slime", nombre: "Slime frontal", difMin: 2,
        casilla: 1, posicion: "mele", columna: 1, hp: 60, hpMaximo: 60,
        ataque: 12, ataqueMagico: 8, defensa: 4, defensaMagica: 3,
        velocidad: 5, probCritico: 0.1, danoCritico: 2, precision: 75, evasion: 0, nivel: 2, efectos: [],
      },
      {
        id: "enemigo-2", enemigoId: "raton", nombre: "Ratón del fondo", difMin: 1,
        casilla: 4, posicion: "centro", columna: 1, hp: 30, hpMaximo: 30,
        ataque: 7, ataqueMagico: 5, defensa: 2, defensaMagica: 2,
        velocidad: 6, probCritico: 0.1, danoCritico: 2, precision: 75, evasion: 0, nivel: 1, efectos: [],
      },
    ],
  });
  const { prisma, options: opcionesServicio } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "bola_fuego", nivel: 1, slot: "activa_1" }],
    habilidadesPorId: {
      bola_fuego: {
        id: "bola_fuego", claseId: "novato", nombre: "Bola de fuego", descripcion: "Explosión adyacente.",
        tipo: "activa", efecto: "dano", costeEnergia: 1, cooldownTurnos: 2,
        objetivo: { equipo: "enemigo", patron: "adyacentes" },
      },
    },
  });
  const service = loadService(prisma, opcionesServicio);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", {
    habilidadId: "bola_fuego",
    enemigoObjetivoId: "enemigo-2",
  });

  assert.deepEqual(combat.enemigos.map((enemigo) => enemigo.hp), [40, 10]);
  assert.deepEqual(result.accion.objetivosEnemigoIds, ["enemigo-1", "enemigo-2"]);
  assert.deepEqual(
    result.accion.impactosMultiples.map((impacto) => [impacto.objetivoId, impacto.dano]),
    [["enemigo-1", 20], ["enemigo-2", 20]],
  );
  assert.equal(result.enemigoHp, 40);
});

test("una curación individual de party se aplica y persiste en el aliado seleccionado", async () => {
  const combat = mkCombat({
    participantes: [mkParticipant("u1", 0, 60, 100), mkParticipant("u2", 1, 40, 100)],
  });
  const { prisma, calls, options: opcionesServicio } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "primeros_auxilios", nivel: 1, slot: "activa_1" }],
    habilidadesPorId: {
      primeros_auxilios: {
        id: "primeros_auxilios", claseId: "novato", nombre: "Primeros auxilios",
        descripcion: "Cura a un aliado.", tipo: "activa", efecto: "curacion",
        costeEnergia: 1, cooldownTurnos: 2,
        objetivo: { equipo: "aliado", patron: "individual", incluirPropio: true },
      },
    },
  });
  const service = loadService(prisma, opcionesServicio);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", {
    habilidadId: "primeros_auxilios",
    objetivoId: "u2",
  });

  assert.equal(combat.participantes[1].jugadorHp, 60);
  assert.equal(combat.participantes[0].jugadorHp, 60);
  assert.equal(calls.participantWrites.some((write) =>
    write.where.id === "cp-u2" && write.data.jugadorHp === 60
  ), true);
  assert.equal(calls.characterWrites.some((write) =>
    write.where.id === "personaje-u2" && write.data.hpActual === 60
  ), true);
  assert.equal(result.accion.objetivoUsuarioId, "u2");
  assert.deepEqual(result.accion.objetivosUsuarioIds, ["u2"]);
});

test("autocurarse en party usa los PV posteriores al pulso y no restaura efectos ya expirados", async () => {
  const herido = mkParticipant("u1",0,60,100);
  herido.efectos = [{ habilidadId: "sangrado", tipo: "dano_progresivo", valor: 10, duracionTurnos: 1, turnosRestantes: 1, objetivo: "jugador" }];
  const combat = mkCombat({ participantes: [herido,mkParticipant("u2",1)] });
  const { prisma, options } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "cura", nivel: 1, slot: "activa_4" }],
    habilidadesPorId: { cura: { id: "cura", claseId: "novato", nombre: "Cura", tipo: "activa", efecto: "curacion", costeEnergia: 1, cooldownTurnos: 2, objetivo: { equipo: "aliado", patron: "individual", incluirPropio: true } } },
  });
  const service=loadService(prisma,{...options,efectosReales:true});
  await service.ejecutarAccionCombateParty("u1","expedition-1","usar_habilidad",{habilidadId:"cura",objetivoId:"u1"});
  assert.equal(combat.participantes[0].jugadorHp,70);
  assert.equal(combat.participantes[0].efectos.some(e=>e.habilidadId==="sangrado"),false);
});

test("una mejora defensiva puede aplicarse a otro aliado y persistir su defensa y estado", async () => {
  const combat = mkCombat({
    participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1)],
  });
  const { prisma, calls, options: opcionesServicio } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "baluarte", nivel: 1, slot: "activa_1" }],
    habilidadesPorId: {
      baluarte: {
        id: "baluarte", claseId: "novato", nombre: "Baluarte",
        descripcion: "Mejora la defensa de un aliado.", tipo: "activa", efecto: "bonus_defensa",
        costeEnergia: 1, cooldownTurnos: 2,
      },
    },
  });
  const service = loadService(prisma, opcionesServicio);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", {
    habilidadId: "baluarte",
    objetivoId: "u2",
  });

  assert.equal(combat.participantes[1].jugadorDefensa, 7);
  assert.equal(combat.participantes[0].jugadorDefensa, 5);
  assert.equal(
    calls.participantWrites.some((write) =>
      write.where.id === "cp-u2" &&
      write.data.jugadorDefensa === 7 &&
      write.data.efectos.some((efecto) => efecto.habilidadId === "baluarte")
    ),
    true,
  );
  assert.equal(result.accion.objetivoUsuarioId, "u2");
});

test("una habilidad de curación en área persiste a todos los aliados vivos y emite pulsos individuales", async () => {
  const combat = mkCombat({
    participantes: [
      mkParticipant("u1", 0, 60, 100),
      mkParticipant("u2", 1, 40, 100),
      mkParticipant("u3", 2, 20, 100),
    ],
  });
  const { prisma, calls, options: opcionesServicio } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "onda_curativa", nivel: 1, slot: "activa_1" }],
    habilidadesPorId: {
      onda_curativa: {
        id: "onda_curativa", claseId: "novato", nombre: "Onda curativa",
        descripcion: "Cura a todos los aliados.", tipo: "activa", efecto: "curacion",
        costeEnergia: 1, cooldownTurnos: 3,
        objetivo: { equipo: "aliado", patron: "todos", incluirPropio: true },
      },
    },
  });
  const service = loadService(prisma, opcionesServicio);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", {
    habilidadId: "onda_curativa",
  });

  assert.deepEqual(combat.participantes.map((p) => p.jugadorHp), [80, 60, 40]);
  assert.deepEqual(result.accion.objetivosUsuarioIds, ["u1", "u2", "u3"]);
  assert.equal(result.accion.curacion, undefined, "el total agregado no debe duplicar el pulso del primer objetivo");
  assert.deepEqual(
    result.accion.pulsosEstado.map((pulso) => [pulso.objetivoUsuarioId, pulso.cantidad]),
    [["u1", 20], ["u2", 20], ["u3", 20]],
  );
  assert.equal(calls.participantWrites.some((write) => write.where.id === "cp-u2" && write.data.jugadorHp === 60), true);
  assert.equal(calls.participantWrites.some((write) => write.where.id === "cp-u3" && write.data.jugadorHp === 40), true);
});

test("una habilidad sin Energía suficiente se rechaza sin avanzar el turno", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "golpe_arcano", nivel: 1, slot: "activa_1" }],
    energiaActual: 0,
  });
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: "golpe_arcano" }),
    (error) => error.code === "ENERGIA_INSUFICIENTE",
  );
  assert.equal(calls.combatWrites.length, 0);
});

test("usar una poción cura al aventurero y consume una unidad de inventario", async () => {
  const combat = mkCombat({ participantes: [mkParticipant("u1", 0, 50, 100), mkParticipant("u2", 1)] });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_objeto", { objetoInventarioId: "inv-pocion-1" });
  assert.equal(result.jugadorHp, 80);
  assert.equal(combat.participantes[0].jugadorHp, 80);
  assert.equal(calls.characterWrites.some((c) => c.data.hpActual === 80), true);
  assert.equal(calls.inventoryWrites.some((c) => c.data.cantidad?.decrement === 1), true);
});


test("el daño periódico puede ganar el combate en el turno enemigo y liquida una sola vez", async () => {
  const combat = mkCombat({
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    enemigoHp: 5,
    id: "combat-periodic-victory",
    efectosEnemigo: [
      { habilidadId: "quemadura", tipo: "dano_progresivo", valor: 5, duracionTurnos: 2, turnosRestantes: 2, objetivo: "enemigo" },
    ],
  });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");

  assert.equal(result.fase, "victoria");
  assert.equal(combat.fase, "victoria");
  assert.equal(combat.enemigoHp, 0);
  assert.equal(combat.recompensasResueltas, true);
  assert.equal(calls.userWrites.length, 2);
  assert.equal(calls.expeditionWrites[0].data.fase, "regresando");
  const informe = calls.combatWrites.find((write) => write.data.recompensasResultado);
  assert.ok(informe, "el informe debe persistirse también en la victoria por daño periódico");
  assert.equal(informe.data.recompensasResultado.recompensas.length, 2);
});

test("repetir el turno enemigo tras la victoria no liquida recompensas ni inicia otro regreso", async () => {
  const combat = mkCombat({
    fase: "victoria",
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    enemigoHp: 0,
    recompensasResueltas: true,
    id: "combat-already-won",
  });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");

  assert.equal(result.fase, "victoria");
  assert.equal(result.yaTerminado, true);
  assert.equal(calls.userWrites.length, 0);
  assert.equal(calls.expeditionWrites.length, 0);
  assert.equal(calls.inventoryStackWrites.length, 0);
});

test("los efectos del aventurero se procesan al empezar su turno", async () => {
  const combat = mkCombat({
    participantes: [
      {
        ...mkParticipant("u1", 0, 30, 100),
        efectos: [{ habilidadId: "sangrado", tipo: "dano_progresivo", valor: 10, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" }],
      },
      mkParticipant("u2", 1),
    ],
  });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.jugadorHp, 30);
  assert.equal(calls.participantWrites.some((c) => Array.isArray(c.data.efectos)), true);
});

test("el turno enemigo procesa los efectos periódicos del enemigo antes de atacar", async () => {
  const combat = mkCombat({
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    efectosEnemigo: [{ habilidadId: "quemadura", tipo: "dano_progresivo", valor: 5, duracionTurnos: 2, turnosRestantes: 2, objetivo: "enemigo" }],
  });
  const { prisma } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(result.enemigoHp, 35);
});


test("la victoria reparte oro, recursos y objetos de misión sin generar unidades", async () => {
  const combat = mkCombat({ enemigoHp: 10 });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma, {
    otorgarExperienciaJob: async () => ({ experienciaJobGanada: 12, nivelesSubidos: 1 }),
  });
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.fase, "victoria");
  assert.equal(combat.recompensasResueltas, true);
  assert.equal(calls.userWrites.length, 2);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.oro.increment, 0), 21);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.madera.increment, 0), 4);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.piedra.increment, 0), 2);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.metal.increment, 0), 1);
  assert.equal(calls.inventoryStackWrites.reduce((s, w) => s + (w.cantidad ?? 0), 0), 2);
  assert.equal(result.recompensas.recompensas.length, 2);
  assert.deepEqual(result.recompensas.recompensas.map((miembro) => miembro.experienciaJob), [12, 12]);
  assert.deepEqual(result.recompensas.recompensas.map((miembro) => miembro.nivelesJobSubidos), [1, 1]);
  const informePersistido = calls.combatWrites.find((write) => write.data.recompensasResultado);
  assert.deepEqual(informePersistido.data.recompensasResultado.experienciaPorMiembro.map((miembro) => miembro.experienciaJob), [12, 12]);
  assert.equal(combat.log.filter((line) => line.startsWith("🎁 ")).length, 2);
});

test("una liquidación persistida impide volver a otorgar la recompensa", async () => {
  const combat = mkCombat({ fase: "victoria", enemigoHp: 0, recompensasResueltas: true });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar"),
    (error) => error.code === "COMBATE_PARTY_TERMINADO",
  );
  assert.equal(calls.userWrites.length, 0);
});


test("la victoria tira botín de forma independiente para cada miembro y mantiene la XP Base común", async () => {
  const lootRolls = [];
  const combat = mkCombat({
    enemigoHp: 10,
    id: "combat-loot-independent",
    participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1), mkParticipant("u3", 2)],
  });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma, {
    lootRolls,
    enemigo: { probabilidadBotin: 1, tablaLoot: [{ objetoId: "pocion", peso: 1 }] },
  });
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.fase, "victoria");
  assert.equal(lootRolls.length, 3, "cada aventurero debe tener una tirada independiente");
  assert.deepEqual(result.recompensas.dropsEnemigo.map((drop) => drop.usuarioId), ["u1", "u2", "u3"]);
  assert.ok(result.recompensas.dropsEnemigo.every((drop) => drop.objetoId === "pocion" && drop.sufijoId === "del test"));
  assert.deepEqual(result.recompensas.recompensas.map((miembro) => miembro.experiencia), [30, 30, 30]);
  assert.equal(result.recompensas.recompensas.length, 3);
  const objetosMisionRepartidos = result.recompensas.recompensas.reduce(
    (suma, miembro) => suma + miembro.objetos.reduce((subtotal, objeto) => subtotal + objeto.cantidad, 0),
    0,
  );
  assert.equal(objetosMisionRepartidos, 2);
  assert.equal(result.recompensas.dropsEnemigo.length, 3, "el botín del enemigo se registra por separado");
  assert.equal(calls.inventoryStackWrites.reduce((s, w) => s + (w.cantidad ?? 0), 0), 5);
  assert.equal(calls.userWrites.length, 3);

  const informePersistido = calls.combatWrites.find((write) => write.data.recompensasResultado);
  assert.ok(informePersistido, "el informe estructurado debe guardarse en el combate");
  assert.deepEqual(informePersistido.data.recompensasResultado.dropsEnemigo.map((drop) => drop.usuarioId), ["u1", "u2", "u3"]);
  assert.deepEqual(informePersistido.data.recompensasResultado.recompensas.map((miembro) => miembro.experiencia), [30, 30, 30]);
  assert.deepEqual(informePersistido.data.recompensasResultado.recompensas.map((miembro) => miembro.objetos.reduce((n, obj) => n + obj.cantidad, 0)), [1, 1, 0]);
});

test("el informe registra los objetos de misión que no caben en el inventario", async () => {
  const combat = mkCombat({
    enemigoHp: 10,
    id: "combat-mission-loot-full",
    participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1)],
  });
  const { prisma, calls } = mockPrisma(combat, {
    inventoryCount: 30,
    recompensa: {
      oro: 11, madera: 4, piedra: 2, metal: 1,
      objetos: [{ objetoId: "pocion", cantidad: 2 }],
    },
  });
  const service = loadService(prisma, {
    enemigo: { probabilidadBotin: 0, tablaLoot: [{ objetoId: "pocion", peso: 1 }] },
  });
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");

  assert.equal(result.fase, "victoria");
  assert.deepEqual(result.recompensas.recompensas.map((miembro) => miembro.objetos), [[], []]);
  assert.equal(combat.log.filter((line) => line.includes("no ha podido recibir") && line.includes("inventario está lleno")).length, 2);
  const informePersistido = calls.combatWrites.find((write) => write.data.recompensasResultado)?.data.recompensasResultado;
  assert.ok(informePersistido);
  assert.deepEqual(informePersistido.recompensas.map((miembro) => miembro.objetos), [[], []]);
  assert.equal(informePersistido.dropsEnemigo.length, 0);
});

test("cada aventurero conserva su propio límite de inventario al recibir el drop", async () => {
  const lootRolls = [];
  const combat = mkCombat({ enemigoHp: 10, id: "combat-loot-full" });
  const { prisma, calls } = mockPrisma(combat, { inventoryCount: 30 });
  const service = loadService(prisma, {
    lootRolls,
    enemigo: { probabilidadBotin: 1, tablaLoot: [{ objetoId: "pocion", peso: 1 }] },
  });
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.fase, "victoria");
  assert.deepEqual(result.recompensas.dropsEnemigo, []);
  assert.equal(lootRolls.length, 2, "se realizan dos tiradas aunque los inventarios estén llenos");
  assert.equal(calls.inventoryStackWrites.length, 0);
  assert.equal(combat.log.filter((line) => line.includes("El botín de Slime para") && line.includes("su inventario está lleno")).length, 2);
  assert.equal(combat.log.filter((line) => line.includes("no ha podido recibir") && line.includes("inventario está lleno")).length, 2);
  assert.equal(combat.log.filter((line) => line.includes("inventarios de la party están llenos")).length, 0);
});


test("huir en party saca al jugador del turno sin expulsarlo de la party", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "escapar");
  assert.equal(result.fase, "activo");
  assert.equal(result.turnoActualUsuarioId, "u2");
  assert.equal(combat.participantes[0].estado, "huyo");
  assert.equal(calls.expeditionParticipantWrites.some((write) => write.data.estado === "huyo"), true);
  assert.match(combat.log.join(" "), /huye del combate/);
});

test("un miembro puede huir fuera de su turno sin interrumpir al aliado activo", async () => {
  const combat = mkCombat({ faseTurno: "jugador", turnoActualUsuarioId: "u1" });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);

  const result = await service.ejecutarAccionCombateParty("u2", "expedition-1", "escapar");

  assert.equal(result.fase, "activo");
  assert.equal(result.faseTurno, "jugador");
  assert.equal(result.turnoActualUsuarioId, "u1");
  assert.equal(combat.participantes.find((p) => p.usuarioId === "u2").estado, "huyo");
  assert.equal("faseTurno" in calls.combatWrites[0].where, false);
  assert.equal("turnoActualUsuarioId" in calls.combatWrites[0].where, false);
});

test("un miembro puede huir durante el turno enemigo sin saltárselo", async () => {
  const combat = mkCombat({ faseTurno: "enemigo", turnoActualUsuarioId: null });
  const { prisma } = mockPrisma(combat);
  const service = loadService(prisma);

  const result = await service.ejecutarAccionCombateParty("u2", "expedition-1", "escapar");

  assert.equal(result.fase, "activo");
  assert.equal(result.faseTurno, "enemigo");
  assert.equal(result.turnoActualUsuarioId, null);
  assert.equal(combat.participantes.find((p) => p.usuarioId === "u2").estado, "huyo");
});


test("cambiar la posición es visual, se persiste y no consume el turno", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "cambiar_posicion", { posicion: "retaguardia" });
  assert.equal(result.jugadorPosicion, "retaguardia");
  assert.equal(combat.participantes[0].jugadorPosicion, "retaguardia");
  assert.equal(combat.faseTurno, "jugador");
  assert.equal(combat.turnoActualUsuarioId, "u1");
  assert.equal(calls.participantWrites.some((write) => write.data.jugadorPosicion === "retaguardia"), true);
  assert.equal(calls.characterWrites.length, 0);
});


test("quien huye recibe oro y objetos de misión, pero no XP ni botín enemigo", async () => {
  const lootRolls = [];
  const combat = mkCombat({
    enemigoHp: 10,
    id: "combat-flee-rewards",
    turnosPendientes: [
      { actorId: "u1", equipo: "jugador" },
      { actorId: "u2", equipo: "jugador" },
      { actorId: "u3", equipo: "jugador" },
      { actorId: "enemigo-1", equipo: "enemigo" },
    ],
    participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1), mkParticipant("u3", 2)],
  });
  const { prisma } = mockPrisma(combat);
  const service = loadService(prisma, {
    lootRolls,
    enemigo: { probabilidadBotin: 1, tablaLoot: [{ objetoId: "pocion", peso: 1 }] },
  });
  const huida = await service.ejecutarAccionCombateParty("u1", "expedition-1", "escapar");
  assert.equal(huida.turnoActualUsuarioId, "u2");
  const victoria = await service.ejecutarAccionCombateParty("u2", "expedition-1", "atacar");
  assert.equal(victoria.fase, "victoria");
  const recompensa = victoria.recompensas.recompensas.find((miembro) => miembro.usuarioId === "u1");
  assert.ok(recompensa.oro > 0, "la cuota de oro se mantiene");
  assert.equal(recompensa.experiencia, 0, "no recibe XP por el enemigo");
  assert.ok(recompensa.objetos.length > 0, "conserva su reparto de objetos de misión");
  assert.equal(victoria.recompensas.dropsEnemigo.some((drop) => drop.usuarioId === "u1"), false);
  assert.equal(lootRolls.length, 2, "solo los dos participantes que permanecieron combatiendo tiran botín");
});


test("el boss diario ganado en party inicia la espera de los participantes que no huyeron", async () => {
  const combat = mkCombat({ enemigoHp: 10, participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1, 0, 100, "caido"), mkParticipant("u3", 2, 100, 100, "huyo")] });
  const { prisma, calls } = mockPrisma(combat, { tipo: "elite" });
  const inicio = Date.now();
  const service = loadService(prisma);
  const resultado = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(resultado.fase, "victoria");
  const victorias = calls.userWrites.filter(w => w.data.ultimaMisionElite);
  assert.deepEqual(victorias.map(w => w.where.id), ["u1", "u2"]);
  assert.ok(victorias.every(w => w.data.ultimaMisionElite.getTime() >= inicio));
});

test("un boss diario aún sin derrotar no consume el intento de la party", async () => {
  const combat = mkCombat({ enemigoHp: 40 });
  const { prisma, calls } = mockPrisma(combat, { tipo: "elite" });
  const service = loadService(prisma);
  await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(calls.userWrites.some(w => w.data.ultimaMisionElite), false);
});

test("perder o huir del boss diario permite reintentarlo sin iniciar la espera", async () => {
  for (const huir of [false, true]) {
    const combat = mkCombat({ enemigoHp: 40, faseTurno: huir ? "jugador" : "enemigo", turnoActualUsuarioId: huir ? "u1" : null,
      participantes: [mkParticipant("u1", 0, 1), mkParticipant("u2", 1, 0, 100, "caido")] });
    const { prisma, calls } = mockPrisma(combat, { tipo: "elite" });
    const service = loadService(prisma);
    const resultado = huir
      ? await service.ejecutarAccionCombateParty("u1", "expedition-1", "escapar")
      : await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
    assert.equal(resultado.fase, huir ? "huida" : "derrota");
    assert.equal(calls.userWrites.some(w => w.data.ultimaMisionElite), false);
  }
});

test("party aplica la pasiva del sanador y los PV máximos del aliado como el resolutor individual", async () => {
  const { obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
  const habilidad = obtenerHabilidadPorId("primeros_auxilios");
  const pasiva = obtenerHabilidadPorId("manos_piadosas");
  const combat = mkCombat({ participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1, 10, 200)] });
  const options = {
    energiaActual: 100,
    resolverHabilidadesReales: true,
    habilidades: [{ habilidadId: habilidad.id, nivel: 1, slot: "activa_1" }, { habilidadId: pasiva.id, nivel: 1, slot: "pasiva_1" }],
    habilidadesPorId: { [habilidad.id]: habilidad, [pasiva.id]: pasiva },
  };
  const { prisma } = mockPrisma(combat, options);
  const resultado = await loadService(prisma, options).ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: habilidad.id, objetivoId: "u2" });
  const individual = require("../src/lib/expediciones/combate.ts").resolverHabilidadJugador(habilidad, {
    jugadorHp: 10, jugadorHpMaximo: 200, jugadorDefensa: 5, enemigoDefensa: 2,
    jugadorAtaque: 20, jugadorProbCritico: 0, bonusCuracion: pasiva.bonusCuracion,
  });
  assert.equal(resultado.accion.curacion, individual.accion.curacion);
  assert.equal(combat.participantes[1].jugadorHp, individual.jugadorHp);
  assert.equal(combat.participantes[1].efectos.find(e=>e.tipo==="curacion_progresiva").valor, individual.efectosJugadorActualizados.find(e=>e.tipo==="curacion_progresiva").valor);
  assert.equal(combat.participantes[0].jugadorHp, 100);
});

test("purificar en party elimina realmente el perjuicio y restaura la defensa del aliado", async () => {
  const habilidad = require("../src/lib/habilidades.ts").obtenerHabilidadPorId("purificacion");
  const combat = mkCombat({ participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1, 40)] });
  combat.participantes[1].efectos = [{ habilidadId: "maldicion", tipo: "debuff_defensa", valor: 2, turnosRestantes: 3, duracionTurnos: 3, objetivo: "jugador" }];
  const options = { manaActual: 100, resolverHabilidadesReales: true,
    habilidades: [{ habilidadId: habilidad.id, nivel: 1, slot: "activa_1" }], habilidadesPorId: { [habilidad.id]: habilidad } };
  const { prisma } = mockPrisma(combat, options);
  await loadService(prisma, options).ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: habilidad.id, objetivoId: "u2" });
  assert.equal(combat.participantes[1].efectos.some((e) => e.tipo === "debuff_defensa"), false);
  assert.equal(combat.participantes[1].jugadorDefensa, 7);
});

test("las técnicas de recuperación de energía de party usan el mismo gasto y límite que individual", async () => {
  const habilidad = require("../src/lib/habilidades.ts").obtenerHabilidadPorId("respiracion_interior");
  const combat = mkCombat();
  const options = { energiaActual: 45, resolverHabilidadesReales: true,
    habilidades: [{ habilidadId: habilidad.id, nivel: 1, slot: "activa_1" }], habilidadesPorId: { [habilidad.id]: habilidad } };
  const { prisma, calls } = mockPrisma(combat, options);
  await loadService(prisma, options).ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: habilidad.id });
  assert.ok(calls.characterWrites.some((w) => w.where.id === "personaje-u1" && w.data.energiaActual === 75));
});

test("una poción de vida aplica también su porcentaje en party", async () => {
  const combat = mkCombat({ participantes: [mkParticipant("u1", 0, 10, 200), mkParticipant("u2", 1)] });
  const options = { objetosPorId: { pocion: { id: "pocion", nombre: "Poción", tipo: "consumible", curacion: 15, curacionPorcentaje: 0.15 } } };
  const { prisma, calls } = mockPrisma(combat, options);
  const resultado = await loadService(prisma, options).ejecutarAccionCombateParty("u1", "expedition-1", "usar_objeto", { objetoInventarioId: "inv-pocion-1" });
  assert.equal(resultado.accion.curacion, 45);
  assert.equal(combat.participantes[0].jugadorHp, 55);
  assert.equal(calls.inventoryWrites.length, 1);
});

test("una poción de maná se puede usar con la vida completa y restaura sus recursos en party", async () => {
  const combat = mkCombat();
  const options = { manaActual: 0, objetosPorId: { pocion: { id: "pocion", nombre: "Poción de maná", tipo: "consumible", restauracionMana: 5, restauracionManaPorcentaje: 0.4 } } };
  const { prisma, calls } = mockPrisma(combat, options);
  await loadService(prisma, options).ejecutarAccionCombateParty("u1", "expedition-1", "usar_objeto", { objetoInventarioId: "inv-pocion-1" });
  assert.ok(calls.characterWrites.some((w) => w.where.id === "personaje-u1" && w.data.manaActual?.increment === 10));
  assert.equal(calls.inventoryWrites.length, 1);
});
