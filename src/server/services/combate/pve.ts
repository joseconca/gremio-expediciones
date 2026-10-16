import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularFechasRegresoProgramadas } from "@/lib/expediciones/tiempos";

function adjuntarPulsosEstado(
  accion: AccionAnimadaCombate,
  objetivo: "jugador" | "enemigo",
  cambios: { danoAplicado: number; curacionAplicada: number },
): AccionAnimadaCombate {
  const pulsosEstado = [...(accion.pulsosEstado ?? [])];
  if (cambios.danoAplicado > 0) pulsosEstado.push({ objetivo, tipo: "dano", cantidad: cambios.danoAplicado });
  if (cambios.curacionAplicada > 0) pulsosEstado.push({ objetivo, tipo: "curacion", cantidad: cambios.curacionAplicada });
  return { ...accion, ...(pulsosEstado.length > 0 ? { pulsosEstado } : {}) };
}
import { actualizarCombateVersionado } from "@/lib/expediciones/actualizar-combate-versionado";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { crearEnemigoLegacy, leerEnemigosEnCombate, type EnemigoEnCombate } from "@/lib/expediciones/enemigos-combate";
import { obtenerReglaObjetivoHabilidad, resolverObjetivosHabilidad } from "@/lib/expediciones/objetivos-combate";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerPresentacionAtaqueBasico } from "@/lib/expediciones/presentacion-combate";
import { experienciaParaNivel } from "@/lib/configuracionJuego";
import {
  aplicarMultiplicadorRecompensa,
  calcularExperienciaBaseGanada,
  calcularOroEnemigo,
  CONFIGURACION_DIFICULTAD,
  esModoDificultad,
  registrarVictoriaRangoNormal,
} from "../../../lib/expediciones/dificultad";
import {
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
  type AccionAnimadaCombate,
  resolverHabilidadJugador,
} from "@/lib/expediciones/combate";
import {
  procesarTicksPeriodicos,
  avanzarEfectosCombate,
  calcularAtaqueModificado,
  calcularPrecisionModificada,
  calcularEvasionModificada,
  leerEfectosCombate,
} from "../../../lib/expediciones/estados-combate";
import {
  prepararAccionCombate,
  manejarErrorAccionCombate,
  obtenerRecompensaMision,
  otorgarExperienciaJob,
  gastarRecursosHabilidad,
  regenerarRecursosPorTurno,
  reducirCooldowns,
  actualizarEfectosAlInicioTurnoJugador,
  type ContextoAccionCombate,
} from "./accion-combate";

// La respuesta de fin de combate se aplica directamente al store.
// Incluimos las relaciones que necesita construirPersonaje para no reiniciar
// temporalmente el Job a nivel 1 ni vaciar habilidades/equipo del personaje.
const incluirUsuarioTrasCombate = {
  personaje: {
    include: {
      habilidades: true,
      inventario: { include: { objetos: true } },
      equipoEquipado: {
        include: {
          arma: true,
          armadura: true,
          accesorio: true,
          manoSecundaria: true,
          casco: true,
          pantalones: true,
          botas: true,
          guantes: true,
          anillo1: true,
          anillo2: true,
        },
      },
      progresosClase: true,
    },
  },
  expedicionActiva: { include: { combateActivo: true } },
} satisfies Prisma.UsuarioInclude;

export async function ejecutarAccionPve(request: Request) {
  const preparado = await prepararAccionCombate(request, "pve");
  if (!("contexto" in preparado)) return preparado;
  return ejecutarAccionPveConContexto(preparado.contexto);
}

export async function ejecutarAccionPveConContexto(contexto: ContextoAccionCombate) {
  const {
    accion,
    usuario,
    personaje,
    bonusCuracion,
    expedicion,
    combate,
    enemigos: enemigosContexto,
    enemigoObjetivoId,
    actor,
    habilidad,
  } = contexto;
  let {
    cooldowns,
    efectos,
    efectosDefensor,
    jugadorHp,
    jugadorDefensa,
    enemigoHp,
    enemigoDefensa,
  } = contexto;
  const { log, consumible } = contexto;
  let accionAnimada: AccionAnimadaCombate;
  const enemigosLegados = leerEnemigosEnCombate(enemigosContexto);
  let enemigosEnCombate: EnemigoEnCombate[] = enemigosLegados.length > 0
    ? enemigosLegados
    : (crearEnemigoLegacy({
        enemigoId: combate.enemigoId,
        enemigoNombre: combate.enemigoNombre,
        enemigoHp: combate.enemigoHp,
        enemigoHpMaximo: combate.enemigoHpMaximo,
        enemigoAtaque: combate.enemigoAtaque,
        enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
        enemigoDefensa: combate.enemigoDefensa,
        enemigoDefensaMagica: combate.enemigoDefensaMagica,
        enemigoVelocidad: combate.enemigoVelocidad,
        enemigoProbCritico: combate.enemigoProbCritico,
        enemigoDanoCritico: combate.enemigoDanoCritico,
        enemigoPrecision: combate.enemigoPrecision,
        enemigoEvasion: combate.enemigoEvasion,
        enemigoNivel: combate.enemigoNivel,
        enemigoPosicion: combate.enemigoPosicion,
        efectos: efectosDefensor,
      }) ? [crearEnemigoLegacy({
        enemigoId: combate.enemigoId,
        enemigoNombre: combate.enemigoNombre,
        enemigoHp: combate.enemigoHp,
        enemigoHpMaximo: combate.enemigoHpMaximo,
        enemigoAtaque: combate.enemigoAtaque,
        enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
        enemigoDefensa: combate.enemigoDefensa,
        enemigoDefensaMagica: combate.enemigoDefensaMagica,
        enemigoVelocidad: combate.enemigoVelocidad,
        enemigoProbCritico: combate.enemigoProbCritico,
        enemigoDanoCritico: combate.enemigoDanoCritico,
        enemigoPrecision: combate.enemigoPrecision,
        enemigoEvasion: combate.enemigoEvasion,
        enemigoNivel: combate.enemigoNivel,
        enemigoPosicion: combate.enemigoPosicion,
        efectos: efectosDefensor,
      })!] : []);
  const danoEnemigoPorId = new Map<string, number>();
  const efectosEnemigoPorId = new Map<string, { defensa: number; efectos: ReturnType<typeof leerEfectosCombate> }>();
  try {
      if (accion === "escapar") {
        const accionHuida: AccionAnimadaCombate = {
          actor: "jugador",
          tipo: "fallo",
          animacion: "defensiva",
          dano: 0,
          critico: false,
          texto: "🏃 Huyes del combate y regresas sin completar la misión.",
        };
        log.push(accionHuida.texto);
        const resultado = await prisma.$transaction(async (tx) => {
          const combateActualizado = await actualizarCombateVersionado(tx, combate.id, combate.version, {
            jugadorHp: Math.max(1, jugadorHp),
            jugadorDefensa,
            enemigoHp,
            enemigoDefensa,
            enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
            cooldowns,
            efectos: efectos as unknown as Prisma.InputJsonValue,
            efectosDefensor: efectosDefensor as unknown as Prisma.InputJsonValue,
            fase: "huida",
            turno: "jugador",
            oroGanado: 0,
            experienciaGanada: 0,
            log,
            ultimaAccion: accionHuida,
          });
          await tx.expedicionActiva.update({
            where: { id: expedicion.id },
            data: {
              fase: "regresando",
              ...calcularFechasRegresoProgramadas(expedicion.fechaSalida, expedicion.fechaLlegada),
              recompensa: { oro: 0, madera: 0, piedra: 0, metal: 0 },
              resultadoFinal: "huida",
              hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),
              experienciaGanada: 0,
            },
          });
          await tx.personaje.update({
            where: { id: personaje.id },
            data: { hpActual: Math.max(1, jugadorHp), estado: "de_viaje" },
          });
          const usuarioActualizado = await tx.usuario.findUnique({
            where: { id: usuario.id },
            include: incluirUsuarioTrasCombate,
          });
          return { combate: combateActualizado, usuario: usuarioActualizado };
        });
        const datosUsuario = resultado.usuario
          ? Object.fromEntries(Object.entries(resultado.usuario).filter(([clave]) => clave !== "password"))
          : null;
        return NextResponse.json({
          exito: true,
          combate: resultado.combate,
          usuario: datosUsuario,
          terminado: true,
          accion: accionHuida,
        });
      }

      const modoDificultad = esModoDificultad(expedicion.modoDificultad)
        ? expedicion.modoDificultad
        : "normal";

      if (actor === "jugador") {
        if (accion === "atacar") {
          const objetivo = enemigosEnCombate.find((enemigo) => enemigo.id === enemigoObjetivoId && enemigo.hp > 0)
            ?? enemigosEnCombate.find((enemigo) => enemigo.hp > 0);
          if (!objetivo) return NextResponse.json({ error: "No quedan enemigos vivos a los que atacar." }, { status: 409 });
          const efectosObjetivo = leerEfectosCombate(objetivo.efectos);
          accionAnimada = resolverAtaqueJugador({
            jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos),
            jugadorNivel: combate.jugadorNivel,
            jugadorProbCritico: combate.jugadorProbCritico,
            jugadorDanoCritico: combate.jugadorDanoCritico,
            jugadorPrecision: calcularPrecisionModificada(combate.jugadorPrecision ?? 75, efectos),
            enemigoEvasion: calcularEvasionModificada(objetivo.evasion, efectosObjetivo),
            enemigoDefensa: objetivo.defensa,
            enemigoNombre: objetivo.nombre,
          });
          accionAnimada = { ...accionAnimada, enemigoObjetivoId: objetivo.id };
          danoEnemigoPorId.set(objetivo.id, accionAnimada.dano);
          const armaEquipadaId = personaje.equipoEquipado?.arma?.objetoId;
          const subtipoArma = armaEquipadaId ? obtenerObjetoPorId(armaEquipadaId)?.subtipo : undefined;
          const presentacionArma = obtenerPresentacionAtaqueBasico(subtipoArma);
          if (presentacionArma) accionAnimada = { ...accionAnimada, presentacion: presentacionArma };
        } else if (accion === "usar_objeto") {
          if (!consumible) {
            return NextResponse.json({ error: "Objeto de combate no válido." }, { status: 400 });
          }
          const curacion = Math.min(consumible.curacion, combate.jugadorHpMaximo - jugadorHp);
          if (curacion <= 0) {
            return NextResponse.json({ error: "Ya tienes la salud al máximo." }, { status: 400 });
          }
          jugadorHp += curacion;
          accionAnimada = {
            actor: "jugador",
            tipo: "habilidad",
            animacion: "curacion",
            dano: 0,
            curacion,
            critico: false,
            texto: `Usas ${consumible.nombre} y recuperas ${curacion} puntos de vida.`,
          };
        } else {
          if (!habilidad) {
            return NextResponse.json({ error: "Habilidad no encontrada." }, { status: 404 });
          }

          const reglaObjetivo = obtenerReglaObjetivoHabilidad(habilidad);
          if (reglaObjetivo.equipo === "enemigo") {
            const seleccion = resolverObjetivosHabilidad({
              habilidad,
              actorId: personaje.id,
              objetivoId: enemigoObjetivoId,
              combatientes: [
                { id: personaje.id, nombre: personaje.nombre, equipo: "aliado", posicion: combate.jugadorPosicion, hpActual: jugadorHp, estado: jugadorHp > 0 ? "activo" : "caido" },
                ...enemigosEnCombate.map((enemigo) => ({
                  id: enemigo.id,
                  nombre: enemigo.nombre,
                  equipo: "enemigo" as const,
                  posicion: enemigo.posicion,
                  columna: enemigo.columna,
                  casilla: enemigo.casilla,
                  hpActual: enemigo.hp,
                  estado: enemigo.hp > 0 ? "activo" : "caido",
                })),
              ],
            });
            if (seleccion.error || seleccion.objetivos.length === 0) {
              return NextResponse.json({ error: "No hay enemigos válidos para esa habilidad." }, { status: 409 });
            }
            const resultados = seleccion.objetivos.map((seleccionado) => {
              const enemigo = enemigosEnCombate.find((entrada) => entrada.id === seleccionado.id);
              if (!enemigo || enemigo.hp <= 0) {
                throw new Error("ENEMIGO_OBJETIVO_NO_ACTIVO");
              }
              const efectosObjetivo = leerEfectosCombate(enemigo.efectos);
              const resultado = resolverHabilidadJugador(habilidad!, {
                jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos),
                jugadorAtaqueMagico: calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true),
                jugadorProbCritico: combate.jugadorProbCritico,
                jugadorDanoCritico: combate.jugadorDanoCritico,
                jugadorPrecision: calcularPrecisionModificada(combate.jugadorPrecision ?? 75, efectos),
                enemigoEvasion: calcularEvasionModificada(enemigo.evasion, efectosObjetivo),
                jugadorDefensa,
                jugadorDefensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa,
                jugadorNivel: combate.jugadorNivel,
                jugadorHp,
                jugadorHpMaximo: combate.jugadorHpMaximo,
                enemigoDefensa: enemigo.defensa,
                enemigoDefensaMagica: enemigo.defensaMagica,
                enemigoNombre: enemigo.nombre,
                bonusCuracion,
                efectosJugador: efectos,
              });
              const efectosNuevos = [
                ...efectosObjetivo.filter((efecto) => !resultado.efectos.some((nuevo) =>
                  nuevo.objetivo === "enemigo" && nuevo.habilidadId === efecto.habilidadId)),
                ...resultado.efectos.filter((efecto) => efecto.objetivo === "enemigo"),
              ];
              efectosEnemigoPorId.set(enemigo.id, {
                defensa: resultado.enemigoDefensa,
                efectos: efectosNuevos,
              });
              danoEnemigoPorId.set(enemigo.id, resultado.accion.dano);
              return { enemigo, resultado };
            });
            const primero = resultados[0];
            const danoTotal = resultados.reduce((total, entrada) => total + entrada.resultado.accion.dano, 0);
            accionAnimada = {
              ...primero.resultado.accion,
              dano: danoTotal,
              enemigoObjetivoId: primero.enemigo.id,
              objetivosEnemigoIds: resultados.map((entrada) => entrada.enemigo.id),
              ...(resultados.length > 1 ? {
                impactosEnemigo: resultados.map((entrada) => ({
                  enemigoId: entrada.enemigo.id,
                  dano: entrada.resultado.accion.dano,
                  critico: entrada.resultado.accion.critico,
                })),
                texto: `${habilidad.nombre} afecta a ${resultados.length} enemigos.`,
              } : {}),
            };
            jugadorHp = primero.resultado.jugadorHp;
            jugadorDefensa = primero.resultado.jugadorDefensa;
            efectos = [
              ...efectos.filter((efecto) => !primero.resultado.efectosJugadorActualizados?.some((actualizado) =>
                actualizado.habilidadId === efecto.habilidadId && actualizado.objetivo === efecto.objetivo)),
              ...(primero.resultado.efectosJugadorActualizados ?? []),
              ...primero.resultado.efectos.filter((efecto) => efecto.objetivo === "jugador"),
            ];
          } else {
            const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
              jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos),
              jugadorAtaqueMagico: calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true),
              jugadorProbCritico: combate.jugadorProbCritico,
              jugadorDanoCritico: combate.jugadorDanoCritico,
              jugadorPrecision: calcularPrecisionModificada(combate.jugadorPrecision ?? 75, efectos),
              enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion ?? 0, efectosDefensor),
              jugadorDefensa,
              jugadorDefensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa,
              jugadorNivel: combate.jugadorNivel,
              jugadorHp,
              jugadorHpMaximo: combate.jugadorHpMaximo,
              enemigoDefensa,
              enemigoDefensaMagica: combate.enemigoDefensaMagica ?? enemigoDefensa,
              enemigoNombre: combate.enemigoNombre ?? "Enemigo",
              bonusCuracion,
              efectosJugador: efectos,
            });

            accionAnimada = resultadoHabilidad.accion;
            jugadorHp = resultadoHabilidad.jugadorHp;
            jugadorDefensa = resultadoHabilidad.jugadorDefensa;
            enemigoDefensa = resultadoHabilidad.enemigoDefensa;
            for (const estado of resultadoHabilidad.efectos) {
              if (estado.objetivo === "enemigo") efectosDefensor = [...efectosDefensor, estado];
              else efectos = [...efectos, estado];
            }
            if (resultadoHabilidad.efectosJugadorActualizados) efectos = resultadoHabilidad.efectosJugadorActualizados;
          }

          const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

          if (cooldownTurnos > 0) {
            cooldowns[habilidad.id] = cooldownTurnos;
          }
        }
      } else {
        const impactos: { enemigo: EnemigoEnCombate; dano: number; critico: boolean }[] = [];
        const textos: string[] = [];
        for (const enemigoInicial of [...enemigosEnCombate].sort((a, b) => a.casilla - b.casilla)) {
          const enemigo = enemigosEnCombate.find((entrada) => entrada.id === enemigoInicial.id);
          if (!enemigo || enemigo.hp <= 0) continue;
          const efectosDelEnemigo = leerEfectosCombate(enemigo.efectos);
          const ticksEnemigo = procesarTicksPeriodicos(
            efectosDelEnemigo,
            enemigo.hp,
            enemigo.hpMaximo,
            enemigo.nombre,
          );
          log.push(...ticksEnemigo.mensajes.map((mensaje) => `${enemigo.nombre}: ${mensaje}`));
          let enemigoActualizado: EnemigoEnCombate = {
            ...enemigo,
            hp: ticksEnemigo.hp,
            // procesarTicksPeriodicos solo calcula HP; la duración de estados se
            // actualiza por separado en avanzarEfectosCombate más abajo.
            defensa: enemigo.defensa,
            efectos: efectosDelEnemigo,
          };
          if (enemigoActualizado.hp > 0 && jugadorHp > 0) {
            const accionDelEnemigo = resolverAtaqueEnemigo({
              enemigoAtaque: calcularAtaqueModificado(enemigoActualizado.ataque, enemigoActualizado.efectos),
              enemigoProbCritico: enemigoActualizado.probCritico,
              enemigoDanoCritico: enemigoActualizado.danoCritico,
              enemigoPrecision: calcularPrecisionModificada(enemigoActualizado.precision, enemigoActualizado.efectos),
              jugadorEvasion: calcularEvasionModificada(combate.jugadorEvasion ?? 0, efectos),
              jugadorDefensa,
              enemigoNombre: enemigoActualizado.nombre,
            });
            jugadorHp = Math.max(0, jugadorHp - accionDelEnemigo.dano);
            impactos.push({ enemigo: enemigoActualizado, dano: accionDelEnemigo.dano, critico: accionDelEnemigo.critico });
            textos.push(accionDelEnemigo.texto);
            log.push(accionDelEnemigo.texto);
          } else if (enemigoActualizado.hp <= 0) {
            textos.push(`${enemigoActualizado.nombre} cae por los efectos acumulados.`);
            log.push(`☠️ ${enemigoActualizado.nombre} cae por los efectos acumulados.`);
          }
          const avance = avanzarEfectosCombate(enemigoActualizado.efectos, enemigoActualizado.defensa);
          enemigoActualizado = { ...enemigoActualizado, efectos: avance.efectos, defensa: avance.defensa };
          log.push(...avance.mensajes.map((mensaje) => `${enemigoActualizado.nombre}: ${mensaje}`));
          efectosEnemigoPorId.set(enemigoActualizado.id, {
            defensa: enemigoActualizado.defensa,
            efectos: leerEfectosCombate(enemigoActualizado.efectos),
          });
          // Se conserva el HP del enemigo procesado tras sus estados.
          danoEnemigoPorId.set(`__hp__:${enemigoActualizado.id}`, enemigoActualizado.hp);
        }
        const danoTotal = impactos.reduce((total, impacto) => total + impacto.dano, 0);
        const primero = impactos[0];
        accionAnimada = impactos.length > 0 ? {
          actor: "enemigo",
          actorEnemigoId: primero.enemigo.id,
          actoresEnemigoIds: impactos.map((impacto) => impacto.enemigo.id),
          dano: danoTotal,
          critico: impactos.some((impacto) => impacto.critico),
          tipo: "ataque",
          animacion: "ofensiva",
          texto: impactos.length === 1
            ? textos[0]
            : `${impactos.length} enemigos atacan e infligen ${danoTotal} de daño total.`,
          ...(impactos.length > 1 ? {
            pulsosEstado: impactos.filter((impacto) => impacto.dano > 0).map((impacto) => ({
              objetivo: "jugador" as const,
              tipo: "dano" as const,
              cantidad: impacto.dano,
            })),
          } : {}),
        } : {
          actor: "enemigo",
          tipo: "fallo",
          animacion: "ofensiva",
          dano: 0,
          critico: false,
          texto: "Los enemigos restantes han caído o no pueden atacar.",
        };
      }

      // La lista de enemigos es la fuente autoritativa. Los campos escalares se
      // conservan para compatibilidad con interfaces y registros antiguos.
      enemigosEnCombate = enemigosEnCombate.map((enemigo) => {
        const hpTick = danoEnemigoPorId.get(`__hp__:${enemigo.id}`);
        const extras = efectosEnemigoPorId.get(enemigo.id);
        const hpTrasImpacto = hpTick ?? enemigo.hp;
        return {
          ...enemigo,
          hp: Math.max(0, hpTrasImpacto - (danoEnemigoPorId.get(enemigo.id) ?? 0)),
          defensa: extras?.defensa ?? enemigo.defensa,
          efectos: extras?.efectos ?? enemigo.efectos,
        };
      });
      const enemigosVivos = enemigosEnCombate.filter((enemigo) => enemigo.hp > 0);
      const enemigoPrincipal = enemigosVivos[0] ?? enemigosEnCombate[0];
      enemigoHp = enemigosVivos.length > 0 ? enemigoPrincipal.hp : 0;
      enemigoDefensa = enemigoPrincipal.defensa;
      efectosDefensor = leerEfectosCombate(enemigoPrincipal.efectos);
      log.push(accionAnimada.texto);

      // ==========================================================
      // VICTORIA PVE
      // ==========================================================

      if (enemigoHp <= 0) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El enemigo"} ha sido derrotado!`
        );

        const definicionesEnemigos = enemigosEnCombate.map((enemigo) => ({
          combate: enemigo,
          definicion: obtenerEnemigoPorId(enemigo.enemigoId),
        }));
        if (definicionesEnemigos.length === 0 || definicionesEnemigos.some((entrada) => !entrada.definicion)) {
          return NextResponse.json({ error: "No se pudieron resolver todas las criaturas derrotadas." }, { status: 500 });
        }

        const recompensaMision = obtenerRecompensaMision(expedicion.recompensa);
        const recompensaEnemigo = definicionesEnemigos.reduce(
          (total, entrada) => total + calcularOroEnemigo(entrada.definicion!.botin, entrada.combate.difMin),
          0,
        );
        const oroSinMultiplicar = recompensaMision.oro + recompensaEnemigo;
        const oroGanado = aplicarMultiplicadorRecompensa(oroSinMultiplicar, modoDificultad);
        const experienciaGanada = definicionesEnemigos.reduce(
          (total, entrada) => total + calcularExperienciaBaseGanada(
            entrada.combate.difMin,
            personaje.nivel,
            modoDificultad,
          ),
          0,
        );

        log.push(
          `💰 Recompensa base: ${recompensaMision.oro} 🪙 por la misión + ${recompensaEnemigo} 🪙 por ${definicionesEnemigos.length} ${definicionesEnemigos.length === 1 ? "enemigo" : "enemigos"} (según la amenaza de cada criatura). Modo ${CONFIGURACION_DIFICULTAD[modoDificultad].nombre}: cobras ${oroGanado} 🪙 en total.`
        );

        log.push(`⭐ Obtienes ${experienciaGanada} XP por derrotar al grupo enemigo.`);

        const experienciaActual = personaje.experiencia || 0;

        const nivelActual = personaje.nivel || 1;

        let nivelNuevo = nivelActual;
        let experienciaNueva = experienciaActual + experienciaGanada;

        let nivelesSubidos = 0;

        while (experienciaNueva >= experienciaParaNivel(nivelNuevo)) {
          experienciaNueva -= experienciaParaNivel(nivelNuevo);

          nivelNuevo += 1;
          nivelesSubidos += 1;
        }

        if (nivelesSubidos > 0) {
          log.push(`⬆️ ¡Subes al nivel ${nivelNuevo}!`);
        }

        const resultado = await prisma.$transaction(async (tx) => {
          await gastarRecursosHabilidad(tx, personaje.id, habilidad);
          if (consumible) {
            const consumido = await tx.inventarioObjeto.updateMany({
              where: {
                id: consumible.inventarioObjetoId,
                inventarioId: personaje.inventario?.id,
                objetoId: consumible.id,
                cantidad: { gte: 1 },
              },
              data: { cantidad: { decrement: 1 } },
            });
            if (consumido.count !== 1) throw new Error("CONSUMIBLE_MODIFICADO");
            await tx.inventarioObjeto.deleteMany({
              where: { id: consumible.inventarioObjetoId, cantidad: { lte: 0 } },
            });
          }
          const progresoJob = await otorgarExperienciaJob(
            tx,
            personaje,
            expedicion.dificultad,
            personaje.nivel,
            modoDificultad
          );
          if (progresoJob && progresoJob.nivelesSubidos > 0) {
            log.push(`⬆️ Job de ${progresoJob.claseNombre}: nivel ${progresoJob.nivelJob}.`);
          }
          if (progresoJob?.maestriaCompletada) {
            log.push(`🏅 ¡Has completado la maestría de ${progresoJob.claseNombre}!`);
          }

          const combateActualizado = await actualizarCombateVersionado(tx, combate.id, combate.version, {
            enemigoHp: 0,
            enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
            jugadorDefensa,
            cooldowns,
            efectos: efectos as unknown as Prisma.InputJsonValue,
            fase: "victoria",
            turno: "jugador",
            oroGanado,
            experienciaGanada,
            log,
            ultimaAccion: accionAnimada,
          });

          await tx.expedicionActiva.update({
            where: {
              id: expedicion.id,
            },
            data: {
              fase: "regresando",
              ...calcularFechasRegresoProgramadas(expedicion.fechaSalida, expedicion.fechaLlegada),
              recompensa: {
                oro: oroGanado,
                madera: recompensaMision.madera,
                piedra: recompensaMision.piedra,
                metal: recompensaMision.metal,
              },
              resultadoFinal: "exito",
              hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),
              experienciaGanada,
            },
          });

          if (expedicion.tipo === "elite") {
            await tx.usuario.update({
              where: {
                id: usuario.id,
              },
              data: {
                ultimaMisionElite: new Date(),
              },
            });
          }

          await tx.personaje.update({
            where: {
              id: personaje.id,
            },
            data: {
              hpActual: Math.max(1, jugadorHp),
              nivel: nivelNuevo,
              experiencia: experienciaNueva,
              ...(expedicion.tipo === "normal" && modoDificultad === "normal"
                ? {
                    rangosAmenazaCompletados: registrarVictoriaRangoNormal(
                      personaje.rangosAmenazaCompletados,
                      expedicion.dificultad
                    ),
                  }
                : {}),
            },
          });

          const usuarioActualizado = await tx.usuario.findUnique({
            where: {
              id: usuario.id,
            },
            include: incluirUsuarioTrasCombate,
          });

          return {
            combate: combateActualizado,
            usuario: usuarioActualizado,
          };
        });

        const datosUsuario = resultado.usuario
          ? Object.fromEntries(
              Object.entries(resultado.usuario).filter(
                ([clave]) => clave !== "password"
              )
            )
          : null;

        return NextResponse.json({
          exito: true,
          combate: resultado.combate,
          usuario: datosUsuario,
          terminado: true,
          accion: accionAnimada,
        });
      }

      // ==========================================================
      // DERROTA PVE
      // ==========================================================

      if (jugadorHp <= 0) {
        log.push("💀 El aventurero cae derrotado.");

        if (!combate.enemigoId) {
          return NextResponse.json(
            {
              error: "El combate no tiene enemigo asociado.",
            },
            { status: 500 }
          );
        }

        const enemigo = obtenerEnemigoPorId(combate.enemigoId);

        if (!enemigo) {
          return NextResponse.json(
            {
              error: "No se encontró el enemigo del combate.",
            },
            { status: 500 }
          );
        }

        const recompensaMision = obtenerRecompensaMision(expedicion.recompensa);
        const oroAsegurado = Math.floor(
          recompensaMision.oro *
            CONFIGURACION_DIFICULTAD[modoDificultad].multiplicadorRecompensa *
            0.2
        );
        const experienciaVictoria = calcularExperienciaBaseGanada(
          expedicion.dificultad,
          personaje.nivel,
          modoDificultad
        );
        const experienciaGanada = Math.floor(experienciaVictoria * 0.1);

        log.push(`💰 Antes de caer, consigues asegurar ${oroAsegurado} 🪙.`);

        log.push(`⭐ Obtienes ${experienciaGanada} XP.`);

        const resultado = await prisma.$transaction(async (tx) => {
          await gastarRecursosHabilidad(tx, personaje.id, habilidad);
          if (consumible) {
            const consumido = await tx.inventarioObjeto.updateMany({
              where: {
                id: consumible.inventarioObjetoId,
                inventarioId: personaje.inventario?.id,
                objetoId: consumible.id,
                cantidad: { gte: 1 },
              },
              data: { cantidad: { decrement: 1 } },
            });
            if (consumido.count !== 1) throw new Error("CONSUMIBLE_MODIFICADO");
            await tx.inventarioObjeto.deleteMany({
              where: { id: consumible.inventarioObjetoId, cantidad: { lte: 0 } },
            });
          }
          const progresoJob = await otorgarExperienciaJob(
            tx,
            personaje,
            expedicion.dificultad,
            personaje.nivel,
            modoDificultad,
            0.1
          );
          if (progresoJob && progresoJob.nivelesSubidos > 0) {
            log.push(`⬆️ Job de ${progresoJob.claseNombre}: nivel ${progresoJob.nivelJob}.`);
          }
          const combateActualizado = await actualizarCombateVersionado(tx, combate.id, combate.version, {
            jugadorHp: 0,
            enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
            jugadorDefensa,
            enemigoHp,
            cooldowns,
            efectos: efectos as unknown as Prisma.InputJsonValue,
            fase: "derrota",
            turno: "jugador",
            oroGanado: oroAsegurado,
            experienciaGanada,
            log,
            ultimaAccion: accionAnimada,
          });

          const experienciaActual = personaje.experiencia || 0;

          const nivelActual = personaje.nivel || 1;

          let nivelNuevo = nivelActual;
          let experienciaNueva = experienciaActual + experienciaGanada;

          let nivelesSubidos = 0;

          while (experienciaNueva >= experienciaParaNivel(nivelNuevo)) {
            experienciaNueva -= experienciaParaNivel(nivelNuevo);

            nivelNuevo += 1;
            nivelesSubidos += 1;
          }

          if (nivelesSubidos > 0) {
            log.push(`⬆️ ¡Subes al nivel ${nivelNuevo}!`);
          }

          await tx.personaje.update({
            where: {
              id: personaje.id,
            },
            data: {
              hpActual: 1,
              estado: "de_viaje",
              nivel: nivelNuevo,
              experiencia: experienciaNueva,

            },
          });

          await tx.expedicionActiva.update({
            where: {
              id: expedicion.id,
            },
            data: {
              fase: "regresando",
              ...calcularFechasRegresoProgramadas(expedicion.fechaSalida, expedicion.fechaLlegada),
              recompensa: {
                oro: oroAsegurado,
                madera: 0,
                piedra: 0,
                metal: 0,
              },
              experienciaGanada,
              resultadoFinal: "derrota",
              hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),
            },
          });

          const usuarioActualizado = await tx.usuario.findUnique({
            where: {
              id: usuario.id,
            },
            include: incluirUsuarioTrasCombate,
          });

          return {
            combate: combateActualizado,
            usuario: usuarioActualizado,
          };
        });

        const datosUsuario = resultado.usuario
          ? Object.fromEntries(
              Object.entries(resultado.usuario).filter(
                ([clave]) => clave !== "password"
              )
            )
          : null;

        return NextResponse.json({
          exito: true,
          combate: resultado.combate,
          usuario: datosUsuario,
          terminado: true,
          accion: accionAnimada,
        });
      }

      // ==========================================================
      // SIGUIENTE TURNO PVE
      // ==========================================================

      const jugadorEsPrimero =
        combate.jugadorVelocidad >= combate.enemigoVelocidad;

      let siguienteTurno: "jugador" | "enemigo";

      let siguienteRonda = combate.ronda;

      if (actor === "jugador") {
        if (jugadorEsPrimero) {
          siguienteTurno = "enemigo";
        } else {
          siguienteRonda += 1;
          siguienteTurno = "enemigo";
        }
      } else {
        if (jugadorEsPrimero) {
          siguienteRonda += 1;
          siguienteTurno = "jugador";
        } else {
          siguienteTurno = "jugador";
        }
      }

      if (actor === "enemigo" && siguienteTurno === "jugador") {
        cooldowns = reducirCooldowns(cooldowns);

        const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
          efectos, jugadorHp, combate.jugadorHpMaximo, jugadorDefensa, personaje.nombre
        );

        efectos = efectosActualizados.efectos;
        jugadorHp = efectosActualizados.hp;
        jugadorDefensa = efectosActualizados.defensa;
        accionAnimada = adjuntarPulsosEstado(accionAnimada, "jugador", efectosActualizados);
        log.push(...efectosActualizados.mensajes);
      }

      const combateActualizado = await prisma.$transaction(async (tx) => {
        await gastarRecursosHabilidad(tx, personaje.id, habilidad);
        if (consumible) {
          const consumido = await tx.inventarioObjeto.updateMany({
            where: {
              id: consumible.inventarioObjetoId,
              inventarioId: personaje.inventario?.id,
              objetoId: consumible.id,
              cantidad: { gte: 1 },
            },
            data: { cantidad: { decrement: 1 } },
          });
          if (consumido.count !== 1) throw new Error("CONSUMIBLE_MODIFICADO");
          await tx.inventarioObjeto.deleteMany({
            where: {
              id: consumible.inventarioObjetoId,
              cantidad: { lte: 0 },
            },
          });
        }
        if (siguienteTurno === "jugador") {
          await regenerarRecursosPorTurno(tx, usuario.id);
        }

        return actualizarCombateVersionado(tx, combate.id, combate.version, {
          jugadorHp,
          jugadorDefensa,
          enemigoHp,
          enemigoDefensa,
          enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
          ronda: siguienteRonda,
          turno: siguienteTurno,
          cooldowns,
          efectos: efectos as unknown as Prisma.InputJsonValue,
          efectosDefensor: efectosDefensor as unknown as Prisma.InputJsonValue,
          ultimoTurnoEn: new Date(),
          log,
          ultimaAccion: accionAnimada,
        });
      });

      return NextResponse.json({
        exito: true,
        combate: combateActualizado,
        terminado: false,
        accion: accionAnimada,
      });
  } catch (error) {
    return manejarErrorAccionCombate(error);
  }
}
