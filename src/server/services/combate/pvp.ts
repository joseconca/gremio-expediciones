import { aplicarBarreraAccion } from "@/lib/expediciones/estados-combate";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerPresentacionAtaqueBasico, usaAtaqueMagicoBasico } from "@/lib/expediciones/presentacion-combate";

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
import {
  calcularBonusDefensaMuralla,
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
  type AccionAnimadaCombate,
  resolverHabilidadJugador,
} from "@/lib/expediciones/combate";
import {
  determinarGanadorAsedio,
  determinarPrimerTurnoAsedio,
  siguienteTurnoAsedio,
  finalizarAsedio,
} from "@/lib/expediciones/asedio";
import {
  calcularAtaqueModificado,
  calcularPrecisionModificada,
  calcularEvasionModificada,
} from "../../../lib/expediciones/estados-combate";
import { normalizarActorHabilidadDefensor, distribuirEfectosHabilidadPvp } from "@/lib/expediciones/contrato-accion-combate";
import {
  prepararAccionCombate,
  manejarErrorAccionCombate,
  reducirCooldowns,
  actualizarEfectosAlInicioTurnoJugador,
  gastarRecursosHabilidad,
  regenerarRecursosPorTurno,
  type ContextoAccionCombate,
} from "./accion-combate";

export async function ejecutarAccionPvp(request: Request) {
  const preparado = await prepararAccionCombate(request, "pvp");
  if (!("contexto" in preparado)) return preparado;
  return ejecutarAccionPvpConContexto(preparado.contexto);
}

export async function ejecutarAccionPvpConContexto(contexto: ContextoAccionCombate) {
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
    cooldownsDefensor,
    efectosDefensor,
    jugadorHp,
    jugadorDefensa,
    enemigoHp,
    enemigoDefensa,
  } = contexto;
  const { log } = contexto;
  const armaEquipadaId = personaje.equipoEquipado?.arma?.objetoId;
  const subtipoArma = armaEquipadaId ? obtenerObjetoPorId(armaEquipadaId)?.subtipo : undefined;
  const usarAtaqueMagico = usaAtaqueMagicoBasico(subtipoArma);
  let accionAnimada: AccionAnimadaCombate;
  try {
    // PVP
    // ============================================================

    if (!combate.atacanteUsuarioId || !combate.defensorUsuarioId) {
      return NextResponse.json(
        {
          error: "El combate PvP no tiene atacante y defensor válidos.",
        },
        { status: 500 }
      );
    }

    const atacanteUsuarioId = combate.atacanteUsuarioId;

    const defensorUsuarioId = combate.defensorUsuarioId;

    const atacanteEsUsuario = usuario.id === atacanteUsuarioId;

    const defensorEsUsuario = usuario.id === defensorUsuarioId;

    if (!atacanteEsUsuario && !defensorEsUsuario) {
      return NextResponse.json(
        {
          error: "No perteneces a este combate.",
        },
        { status: 403 }
      );
    }

    // En PvP:
    //
    // jugadorHp      = HP del atacante
    // enemigoHp      = HP del defensor
    //
    // jugadorAtaque  = ataque del atacante
    // enemigoAtaque  = ataque del defensor
    //
    // jugadorDefensa = defensa del atacante
    // enemigoDefensa = defensa del defensor

    if (actor === "atacante") {
      if (!atacanteEsUsuario) {
        return NextResponse.json(
          {
            error: "No es tu turno.",
          },
          { status: 409 }
        );
      }

      if (accion === "atacar") {
        accionAnimada = resolverAtaqueJugador({
          jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos),
          jugadorAtaqueMagico: calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true),
          usarMejorAtaqueMagico: usarAtaqueMagico,
          jugadorNivel: combate.jugadorNivel,
          jugadorProbCritico: combate.jugadorProbCritico,
          jugadorDanoCritico: combate.jugadorDanoCritico,
          jugadorPrecision: calcularPrecisionModificada(combate.jugadorPrecision ?? 75, efectos),
          enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion ?? 0, efectosDefensor),
          enemigoDefensa:
            combate.enemigoDefensa +
            calcularBonusDefensaMuralla(combate.murallaNivel ?? 0),
          enemigoDefensaMagica:
            (combate.enemigoDefensaMagica ?? combate.enemigoDefensa) +
            calcularBonusDefensaMuralla(combate.murallaNivel ?? 0),
          enemigoNombre: combate.enemigoNombre ?? "Defensor",
        });

        aplicarBarreraAccion(accionAnimada, efectosDefensor);
        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);
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
          efectosEnemigo: efectosDefensor,
          jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos),
          jugadorAtaqueMagico: calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true),
          jugadorProbCritico: combate.jugadorProbCritico,
          jugadorDanoCritico: combate.jugadorDanoCritico,
          jugadorDefensa,
          jugadorDefensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa,
          jugadorNivel: combate.jugadorNivel,
          jugadorHp,
          jugadorHpMaximo: combate.jugadorHpMaximo,
          enemigoDefensa:
            combate.enemigoDefensa +
            calcularBonusDefensaMuralla(combate.murallaNivel ?? 0),
          enemigoDefensaMagica:
            (combate.enemigoDefensaMagica ?? combate.enemigoDefensa) +
            calcularBonusDefensaMuralla(combate.murallaNivel ?? 0),
          enemigoNombre: combate.enemigoNombre ?? "Defensor",
        });

        accionAnimada = resultadoHabilidad.accion;

        jugadorHp = resultadoHabilidad.jugadorHp;
        jugadorDefensa = resultadoHabilidad.jugadorDefensa;
        enemigoDefensa = resultadoHabilidad.enemigoDefensa;

        aplicarBarreraAccion(accionAnimada, efectosDefensor);
        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);

        const efectosRepartidos = distribuirEfectosHabilidadPvp(resultadoHabilidad.efectos, "atacante");
        efectos = [...efectos, ...efectosRepartidos.efectosAtacante];
        efectosDefensor = [...efectosDefensor, ...efectosRepartidos.efectosDefensor];
        if (resultadoHabilidad.efectosJugadorActualizados) efectos = resultadoHabilidad.efectosJugadorActualizados;


        const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

        if (cooldownTurnos > 0) {
          cooldowns[habilidad.id] = cooldownTurnos;
        }
      }
    } else if (actor === "defensor") {
      if (!defensorEsUsuario) {
        return NextResponse.json(
          {
            error: "No es tu turno.",
          },
          { status: 409 }
        );
      }

      if (accion === "atacar") {
        accionAnimada = resolverAtaqueEnemigo({
          enemigoAtaque: calcularAtaqueModificado(combate.enemigoAtaque, efectosDefensor),
          enemigoAtaqueMagico: calcularAtaqueModificado(combate.enemigoAtaqueMagico ?? combate.enemigoAtaque, efectosDefensor, true),
          usarMejorAtaqueMagico: usarAtaqueMagico,
          enemigoPrecision: calcularPrecisionModificada(combate.enemigoPrecision ?? 75, efectosDefensor),
          jugadorEvasion: calcularEvasionModificada(combate.jugadorEvasion ?? 0, efectos),
          jugadorDefensa,
          jugadorDefensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa,
          enemigoNombre: personaje.nombre,
        });

        aplicarBarreraAccion(accionAnimada, efectos);
        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
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
          efectosEnemigo: efectos,
          jugadorAtaque: calcularAtaqueModificado(combate.enemigoAtaque, efectosDefensor),
          jugadorAtaqueMagico: calcularAtaqueModificado(combate.enemigoAtaqueMagico ?? combate.enemigoAtaque, efectosDefensor, true),
          jugadorProbCritico: combate.enemigoProbCritico,
          jugadorDanoCritico: combate.enemigoDanoCritico,
          jugadorPrecision: calcularPrecisionModificada(combate.enemigoPrecision ?? 75, efectosDefensor),
          enemigoEvasion: calcularEvasionModificada(combate.jugadorEvasion ?? 0, efectos),
          jugadorDefensa: enemigoDefensa,
          jugadorDefensaMagica: combate.enemigoDefensaMagica ?? enemigoDefensa,
          jugadorNivel: combate.enemigoNivel,
          jugadorHp: enemigoHp,
          jugadorHpMaximo: combate.enemigoHpMaximo,
          enemigoDefensa: jugadorDefensa,
          enemigoDefensaMagica: combate.jugadorDefensaMagica,
          enemigoNombre: "Atacante",
          bonusCuracion,
          efectosJugador: efectosDefensor,
        });

        // En PvP, el resolver compartido etiqueta como "jugador" al atacante.
        // Al resolver la habilidad del defensor, traducimos el actor real.
        accionAnimada = normalizarActorHabilidadDefensor(resultadoHabilidad.accion);

        enemigoHp = resultadoHabilidad.jugadorHp;
        enemigoDefensa = resultadoHabilidad.jugadorDefensa;
        jugadorDefensa = resultadoHabilidad.enemigoDefensa;

        aplicarBarreraAccion(accionAnimada, efectos);
        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);

        const efectosRepartidos = distribuirEfectosHabilidadPvp(resultadoHabilidad.efectos, "defensor");
        efectos = [...efectos, ...efectosRepartidos.efectosAtacante];
        efectosDefensor = [...efectosDefensor, ...efectosRepartidos.efectosDefensor];
        if (resultadoHabilidad.efectosJugadorActualizados) efectosDefensor = resultadoHabilidad.efectosJugadorActualizados;


        const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

        if (cooldownTurnos > 0) {
          cooldownsDefensor[habilidad.id] = cooldownTurnos;
        }
      }
    } else {
      return NextResponse.json(
        {
          error: "Turno de combate PvP no válido.",
        },
        { status: 409 }
      );
    }

    if (accion === "atacar") {
      const presentacionArma = obtenerPresentacionAtaqueBasico(subtipoArma);
      if (presentacionArma) accionAnimada = { ...accionAnimada, presentacion: presentacionArma };
    }

    log.push(accionAnimada.texto);

    // ============================================================
    // DETERMINAR GANADOR PVP
    // ============================================================

    const ganador = determinarGanadorAsedio({
      hpAtacante: jugadorHp,
      hpDefensor: enemigoHp,
    });

    if (ganador) {
      const atacanteGana = ganador === "atacante";

      if (atacanteGana) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El defensor"} ha sido derrotado!`
        );
      } else {
        log.push(`🏆 ¡El atacante ha sido derrotado!`);
      }

      const resultado = await prisma.$transaction(async (tx) => {
        await gastarRecursosHabilidad(tx, personaje.id, habilidad);
        return finalizarAsedio({
          tx,

          combate: {
            id: combate.id,
            version: combate.version,

            atacanteUsuarioId: combate.atacanteUsuarioId,
            defensorUsuarioId: combate.defensorUsuarioId,

            jugadorHpMaximo: combate.jugadorHpMaximo,

            almacenNivel: combate.almacenNivel,
            capacidadCarruaje: combate.capacidadCarruaje,

            estadoDefensorAnterior: combate.estadoDefensorAnterior,
          },

          expedicionId: expedicion.id,

          jugadorHp,
          enemigoHp,

          jugadorDefensa,
          enemigoDefensa,

          cooldowns,
          efectos: efectos as unknown as import("@/lib/tiposJuego").EstadoEfectoHabilidad[],
          cooldownsDefensor,
          efectosDefensor: efectosDefensor as unknown as import("@/lib/tiposJuego").EstadoEfectoHabilidad[],

          accion: accionAnimada,
          log,

          ganador,
        });
      });

      return NextResponse.json({
        exito: true,
        combate: resultado.combate,
        terminado: true,
        accion: accionAnimada,
        botin: resultado.botin,
      });
    }

    // ============================================================
    // SIGUIENTE TURNO PVP
    // ============================================================

    const siguienteTurno = siguienteTurnoAsedio(actor);

    let siguienteRonda = combate.ronda;

    // El inicio de la ronda siguiente se produce
    // cuando vuelve el turno al participante que
    // comenzó la ronda.
    const primerTurno = determinarPrimerTurnoAsedio({
      velocidadAtacante: combate.jugadorVelocidad,
      velocidadDefensor: combate.enemigoVelocidad,
    });

    if (siguienteTurno === primerTurno) {
      siguienteRonda += 1;
    }

    if (siguienteTurno === "atacante") {
      cooldowns = reducirCooldowns(cooldowns);

      const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
        efectos, jugadorHp, combate.jugadorHpMaximo, jugadorDefensa, combate.atacanteNombre ?? personaje.nombre
      );

      efectos = efectosActualizados.efectos;
      jugadorHp = efectosActualizados.hp;
      jugadorDefensa = efectosActualizados.defensa;
      accionAnimada = adjuntarPulsosEstado(accionAnimada, "jugador", efectosActualizados);
      log.push(...efectosActualizados.mensajes);
    }

    if (siguienteTurno === "defensor") {
      cooldownsDefensor = reducirCooldowns(cooldownsDefensor);

      const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
        efectosDefensor, enemigoHp, combate.enemigoHpMaximo ?? enemigoHp, enemigoDefensa, combate.defensorNombre ?? combate.enemigoNombre ?? "Defensor"
      );

      efectosDefensor = efectosActualizados.efectos;
      enemigoHp = efectosActualizados.hp;
      enemigoDefensa = efectosActualizados.defensa;
      accionAnimada = adjuntarPulsosEstado(accionAnimada, "enemigo", efectosActualizados);
      log.push(...efectosActualizados.mensajes);
    }

    const combateActualizado = await prisma.$transaction(async (tx) => {
      await gastarRecursosHabilidad(tx, personaje.id, habilidad);
      const siguienteUsuarioId =
        siguienteTurno === "atacante" ? atacanteUsuarioId : defensorUsuarioId;
      await regenerarRecursosPorTurno(tx, siguienteUsuarioId);

      return actualizarCombateVersionado(tx, combate.id, combate.version, {
        jugadorHp,
        enemigoHp,
        jugadorDefensa,
        enemigoDefensa,
        ronda: siguienteRonda,
        turno: siguienteTurno,
        cooldowns,
        efectos: efectos as unknown as Prisma.InputJsonValue,
        cooldownsDefensor,
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
