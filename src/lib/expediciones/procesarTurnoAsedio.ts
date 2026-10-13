import type { Prisma } from "@prisma/client";
import { haExpiradoTurnoPvp } from "./turno-pvp";
export { TIEMPO_MAXIMO_TURNO_MS } from "./turno-pvp";
import { prisma } from "@/lib/prisma";
import {
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
  calcularBonusDefensaMuralla,
} from "@/lib/expediciones/combate";
import {
  siguienteTurnoAsedio,
  determinarGanadorAsedio,
  finalizarAsedio,
  determinarPrimerTurnoAsedio,
  type EfectoCombateAsedio,
} from "@/lib/expediciones/asedio";
import {
  leerEfectosCombate,
  procesarEfectosTurno,
  calcularAtaqueModificado,
  calcularPrecisionModificada,
  calcularEvasionModificada,
} from "./estados-combate";

function obtenerCooldowns(valor: unknown): Record<string, number> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(valor).filter(
      ([, value]) => typeof value === "number" && value > 0
    )
  ) as Record<string, number>;
}

function disminuirCooldowns(
  cooldowns: Record<string, number>
): Record<string, number> {
  const resultado: Record<string, number> = {};

  for (const [id, valor] of Object.entries(cooldowns)) {
    if (valor > 1) {
      resultado[id] = valor - 1;
    }
  }

  return resultado;
}

function obtenerEfectos(valor: unknown): EfectoCombateAsedio[] {
  return leerEfectosCombate(valor);
}

function actualizarEfectosAlInicioTurno(
  efectos: EfectoCombateAsedio[],
  hpActual: number,
  hpMaximo: number,
  defensaActual: number,
  nombreObjetivo: string,
) {
  return procesarEfectosTurno(efectos, hpActual, hpMaximo, defensaActual, nombreObjetivo);
}

export async function procesarTurnoAutomaticoAsedio(
  combateId: string
) {
  const combate = await prisma.combateActivo.findUnique({
    where: {
      id: combateId,
    },
  });

  if (!combate) {
    return {
      combate: null,
      procesado: false,
      expirado: false,
    };
  }

  if (
    combate.jugadorHp == null ||
    combate.jugadorHpMaximo == null ||
    combate.enemigoHp == null ||
    combate.enemigoHpMaximo == null ||
    combate.enemigoAtaque == null ||
    combate.enemigoDefensa == null ||
    combate.enemigoNivel == null
  ) {
    throw new Error("COMBATE_SIN_DATOS_COMPLETOS");
  }

  /*
   * Si el combate ya terminó, simplemente devolvemos
   * su estado actual.
   */
  if (combate.fase !== "activo") {
    return {
      combate,
      procesado: false,
      expirado: false,
    };
  }

  const ahora = Date.now();
  const ultimoTurno = combate.ultimoTurnoEn.getTime();

  const turnoExpirado = haExpiradoTurnoPvp(ultimoTurno, ahora);

  /*
   * Todavía queda tiempo para que actúe el jugador.
   */
  if (!turnoExpirado) {
    return {
      combate,
      procesado: false,
      expirado: false,
    };
  }

  /*
   * Guardamos la versión que hemos leído.
   *
   * Si otra petición procesa este mismo turno antes que nosotros,
   * el updateMany final no encontrará esta versión y perderemos
   * la carrera de forma segura.
   */
  const versionActual = combate.version;

  if (
    combate.turno !== "atacante" &&
    combate.turno !== "defensor"
  ) {
    throw new Error("TURNO_PVP_NO_VALIDO");
  }

  let jugadorHp = combate.jugadorHp;
  let enemigoHp = combate.enemigoHp;

  let jugadorDefensa = combate.jugadorDefensa;
  let enemigoDefensa = combate.enemigoDefensa;

  let cooldowns = obtenerCooldowns(combate.cooldowns);
  let cooldownsDefensor = obtenerCooldowns(
    combate.cooldownsDefensor
  );

  let efectos = obtenerEfectos(combate.efectos);
  let efectosDefensor = obtenerEfectos(
    combate.efectosDefensor
  );

  let accion;

  // ============================================================
  // EJECUTAR ATAQUE AUTOMÁTICO
  // ============================================================

  if (combate.turno === "atacante") {
    const accionAutomatica = resolverAtaqueJugador({
      jugadorAtaque: calcularAtaqueModificado(combate.jugadorAtaque, efectos),
      jugadorNivel: combate.jugadorNivel,
      jugadorProbCritico: combate.jugadorProbCritico,
      jugadorDanoCritico: combate.jugadorDanoCritico,

      enemigoDefensa:
        combate.enemigoDefensa +
        calcularBonusDefensaMuralla(combate.murallaNivel),

      jugadorPrecision: calcularPrecisionModificada(combate.jugadorPrecision ?? 75, efectos),
      enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion ?? 0, efectosDefensor),
      enemigoNombre:
        combate.defensorNombre ??
        combate.enemigoNombre ??
        "el defensor",
    });

    accion = accionAutomatica;

    enemigoHp = Math.max(
      0,
      enemigoHp - accionAutomatica.dano
    );
  } else {
    const accionAutomatica = resolverAtaqueEnemigo({
      enemigoAtaque: calcularAtaqueModificado(combate.enemigoAtaque, efectosDefensor),
      enemigoProbCritico:
        combate.enemigoProbCritico ?? undefined,
      enemigoDanoCritico:
        combate.enemigoDanoCritico ?? undefined,
      enemigoPrecision: calcularPrecisionModificada(combate.enemigoPrecision ?? 75, efectosDefensor),
      jugadorEvasion: calcularEvasionModificada(combate.jugadorEvasion ?? 0, efectos),
      jugadorDefensa,
      enemigoNombre:
        combate.atacanteNombre ?? "el atacante",
    });

    accion = accionAutomatica;

    jugadorHp = Math.max(
      0,
      jugadorHp - accionAutomatica.dano
    );
  }

  const nuevoLog = Array.isArray(combate.log)
    ? [...(combate.log as string[]), accion.texto]
    : [accion.texto];

  // ============================================================
  // PREPARAR SIGUIENTE TURNO
  // ============================================================

  const siguienteTurno = siguienteTurnoAsedio(
    combate.turno
  );

  let siguienteRonda = combate.ronda;

  const primerTurno = determinarPrimerTurnoAsedio({
    velocidadAtacante:
      combate.jugadorVelocidad,

    velocidadDefensor:
      combate.enemigoVelocidad ?? 0,
  });

  if (siguienteTurno === primerTurno) {
    siguienteRonda += 1;
  }

  // ============================================================
  // ACTUALIZAR COOLDOWNS Y EFECTOS DEL JUGADOR
  // QUE VA A ACTUAR
  // ============================================================

  if (siguienteTurno === "atacante") {
    cooldowns = disminuirCooldowns(cooldowns);

    const efectosActualizados = actualizarEfectosAlInicioTurno(
      efectos,
      jugadorHp,
      combate.jugadorHpMaximo,
      jugadorDefensa,
      combate.atacanteNombre ?? "El atacante",
    );

    efectos = efectosActualizados.efectos;
    jugadorHp = efectosActualizados.hp;
    jugadorDefensa = efectosActualizados.defensa;
    nuevoLog.push(...efectosActualizados.mensajes);
  }

  if (siguienteTurno === "defensor") {
    cooldownsDefensor =
      disminuirCooldowns(cooldownsDefensor);

    const efectosActualizados = actualizarEfectosAlInicioTurno(
      efectosDefensor,
      enemigoHp,
      combate.enemigoHpMaximo,
      enemigoDefensa,
      combate.defensorNombre ?? combate.enemigoNombre ?? "El defensor",
    );

    efectosDefensor = efectosActualizados.efectos;
    enemigoHp = efectosActualizados.hp;
    enemigoDefensa = efectosActualizados.defensa;
    nuevoLog.push(...efectosActualizados.mensajes);
  }

  const ganador = determinarGanadorAsedio({
    hpAtacante: jugadorHp,
    hpDefensor: enemigoHp,
  });

  if (ganador) {
    nuevoLog.push(
      ganador === "atacante"
        ? `🏆 ¡${
            combate.defensorNombre ??
            combate.enemigoNombre ??
            "El defensor"
          } ha sido derrotado!`
        : `🏆 ¡${
            combate.atacanteNombre ?? "El atacante"
          } ha sido derrotado!`
    );

    const resultado = await prisma.$transaction(
      async (tx) => {
        return finalizarAsedio({
          tx,

          combate: {
            id: combate.id,
            version: versionActual,

            atacanteUsuarioId:
              combate.atacanteUsuarioId,

            defensorUsuarioId:
              combate.defensorUsuarioId,

            jugadorHpMaximo:
              combate.jugadorHpMaximo,

            almacenNivel:
              combate.almacenNivel,

            capacidadCarruaje:
              combate.capacidadCarruaje,

            estadoDefensorAnterior:
              combate.estadoDefensorAnterior,
          },

          expedicionId:
            combate.expedicionId,

          jugadorHp,
          enemigoHp,

          jugadorDefensa,
          enemigoDefensa,

          cooldowns,
          efectos,

          cooldownsDefensor,
          efectosDefensor,

          accion,
          log: nuevoLog,

          ganador,
        });
      }
    );

    return {
      combate: resultado.combate,
      procesado: true,
      expirado: true,
      accion,
      terminado: true,
      botin: resultado.botin,
    };
  }

  // ============================================================
  // GUARDAR EL TURNO AUTOMÁTICO
  // ============================================================

  const actualizado =
    await prisma.combateActivo.updateMany({
      where: {
        id: combate.id,
        version: versionActual,
        fase: "activo",
      },

      data: {
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

        log: nuevoLog,
        ultimaAccion: accion,

        version: {
          increment: 1,
        },
      },
    });

  /*
   * Otra petición ganó la carrera.
   *
   * Esto puede ocurrir si el jugador y el cron intentan
   * resolver el mismo turno al mismo tiempo.
   */
  if (actualizado.count !== 1) {
    const combateActualizado =
      await prisma.combateActivo.findUnique({
        where: {
          id: combate.id,
        },
      });

    return {
      combate: combateActualizado,
      procesado: false,
      expirado: true,
      carreraPerdida: true,
    };
  }

  const combateActualizado =
    await prisma.combateActivo.findUniqueOrThrow({
      where: {
        id: combate.id,
      },
    });

  return {
    combate: combateActualizado,
    procesado: true,
    expirado: true,
    accion,
    terminado: false,
  };
}