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
          accionAnimada = resolverAtaqueJugador({
            jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos),
            jugadorNivel: combate.jugadorNivel,
            jugadorProbCritico: combate.jugadorProbCritico,
            jugadorDanoCritico: combate.jugadorDanoCritico,
            jugadorPrecision: calcularPrecisionModificada(combate.jugadorPrecision ?? 75, efectos),
            enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion ?? 0, efectosDefensor),
            enemigoDefensa,
            enemigoNombre: combate.enemigoNombre ?? "Enemigo",
          });

          enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);
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
            return NextResponse.json(
              {
                error: "Habilidad no encontrada.",
              },
              { status: 404 }
            );
          }

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

          enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);

          for (const estado of resultadoHabilidad.efectos) {
            if (estado.objetivo === "enemigo") efectosDefensor = [...efectosDefensor, estado];
            else efectos = [...efectos, estado];
          }
          if (resultadoHabilidad.efectosJugadorActualizados) efectos = resultadoHabilidad.efectosJugadorActualizados;


          const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

          if (cooldownTurnos > 0) {
            cooldowns[habilidad.id] = cooldownTurnos;
          }
        }
      } else {
        const ticksEnemigo = procesarTicksPeriodicos(
          efectosDefensor,
          enemigoHp,
          combate.enemigoHpMaximo ?? enemigoHp,
          combate.enemigoNombre ?? "Enemigo",
        );
        enemigoHp = ticksEnemigo.hp;
        log.push(...ticksEnemigo.mensajes);

        if (enemigoHp <= 0) {
          accionAnimada = {
            actor: "enemigo",
            tipo: "fallo",
            animacion: "ofensiva",
            dano: 0,
            critico: false,
            texto: `${combate.enemigoNombre ?? "El enemigo"} cae por los efectos acumulados.`,
          };
        } else {
          accionAnimada = resolverAtaqueEnemigo({
            enemigoAtaque: calcularAtaqueModificado(combate.enemigoAtaque, efectosDefensor),
            enemigoPrecision: calcularPrecisionModificada(combate.enemigoPrecision ?? 75, efectosDefensor),
            jugadorEvasion: calcularEvasionModificada(combate.jugadorEvasion ?? 0, efectos),
            jugadorDefensa,
            enemigoNombre: combate.enemigoNombre ?? "Enemigo",
          });
          jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
        }

        accionAnimada = adjuntarPulsosEstado(accionAnimada, "enemigo", ticksEnemigo);
        const avanceEnemigo = avanzarEfectosCombate(efectosDefensor, enemigoDefensa);
        efectosDefensor = avanceEnemigo.efectos;
        enemigoDefensa = avanceEnemigo.defensa;
        log.push(...avanceEnemigo.mensajes);
      }

      log.push(accionAnimada.texto);

      // ==========================================================
      // VICTORIA PVE
      // ==========================================================

      if (enemigoHp <= 0) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El enemigo"} ha sido derrotado!`
        );

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
              error: "No se encontró el enemigo derrotado.",
            },
            { status: 500 }
          );
        }

        const recompensaMision = obtenerRecompensaMision(expedicion.recompensa);
        const recompensaEnemigo = calcularOroEnemigo(
          enemigo.botin,
          expedicion.dificultad
        );
        const oroSinMultiplicar = recompensaMision.oro + recompensaEnemigo;
        const oroGanado = aplicarMultiplicadorRecompensa(oroSinMultiplicar, modoDificultad);
        const experienciaGanada = calcularExperienciaBaseGanada(
          expedicion.dificultad,
          personaje.nivel,
          modoDificultad
        );

        log.push(
          `💰 Recompensa base: ${recompensaMision.oro} 🪙 por la misión + ${recompensaEnemigo} 🪙 por el enemigo. Modo ${CONFIGURACION_DIFICULTAD[modoDificultad].nombre}: cobras ${oroGanado} 🪙 en total.`
        );

        log.push(`⭐ Obtienes ${experienciaGanada} XP.`);

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
