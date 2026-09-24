import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { experienciaParaNivel } from "@/lib/configuracionJuego";
import {
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
  type AccionAnimadaCombate,
  resolverHabilidadJugador,
} from "@/lib/expediciones/combate";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import {
  determinarGanadorAsedio,
  determinarPrimerTurnoAsedio,
  siguienteTurnoAsedio,
} from "@/lib/expediciones/asedio";
import type { DefinicionHabilidad, RecompensaMision } from "@/lib/tiposJuego";

type AccionCombate = "atacar" | "usar_habilidad";

type EfectoCombate = {
  habilidadId: string;
  tipo: "bonus_defensa";
  valor: number;
  turnosRestantes: number;
};

function obtenerRecompensaMision(valor: unknown): RecompensaMision {
  if (
    typeof valor === "object" &&
    valor !== null &&
    "oro" in valor &&
    "madera" in valor &&
    "piedra" in valor &&
    "metal" in valor &&
    typeof valor.oro === "number" &&
    typeof valor.madera === "number" &&
    typeof valor.piedra === "number" &&
    typeof valor.metal === "number"
  ) {
    return {
      oro: Math.max(0, valor.oro),
      madera: Math.max(0, valor.madera),
      piedra: Math.max(0, valor.piedra),
      metal: Math.max(0, valor.metal),
    };
  }

  return {
    oro: 0,
    madera: 0,
    piedra: 0,
    metal: 0,
  };
}

function obtenerOroRecompensa(valor: unknown): number {
  return obtenerRecompensaMision(valor).oro;
}

function obtenerCooldowns(valor: unknown): Record<string, number> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  const resultado: Record<string, number> = {};

  for (const [habilidadId, cooldown] of Object.entries(valor)) {
    if (
      typeof cooldown === "number" &&
      Number.isFinite(cooldown) &&
      cooldown > 0
    ) {
      resultado[habilidadId] = Math.floor(cooldown);
    }
  }

  return resultado;
}

function reducirCooldowns(
  cooldowns: Record<string, number>
): Record<string, number> {
  const resultado: Record<string, number> = {};

  for (const [habilidadId, cooldown] of Object.entries(cooldowns)) {
    const nuevoCooldown = cooldown - 1;

    if (nuevoCooldown > 0) {
      resultado[habilidadId] = nuevoCooldown;
    }
  }

  return resultado;
}

function obtenerEfectos(valor: unknown): EfectoCombate[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.filter((efecto): efecto is EfectoCombate => {
    if (!efecto || typeof efecto !== "object") {
      return false;
    }

    const registro = efecto as Record<string, unknown>;

    return (
      typeof registro.habilidadId === "string" &&
      registro.tipo === "bonus_defensa" &&
      typeof registro.valor === "number" &&
      typeof registro.turnosRestantes === "number" &&
      registro.turnosRestantes > 0
    );
  });
}

function actualizarEfectosAlInicioTurnoJugador(
  efectos: EfectoCombate[],
  defensaActual: number
): {
  efectos: EfectoCombate[];
  defensa: number;
} {
  let defensa = defensaActual;
  const nuevosEfectos: EfectoCombate[] = [];

  for (const efecto of efectos) {
    const turnosRestantes = efecto.turnosRestantes - 1;

    if (turnosRestantes > 0) {
      nuevosEfectos.push({
        ...efecto,
        turnosRestantes,
      });

      continue;
    }

    if (efecto.tipo === "bonus_defensa") {
      defensa = Math.max(0, defensa - efecto.valor);
    }
  }

  return {
    efectos: nuevosEfectos,
    defensa,
  };
}

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body = await request.json();

    const accionValor = body.accion;

    if (accionValor !== "atacar" && accionValor !== "usar_habilidad") {
      return NextResponse.json(
        {
          error: "Acción de combate no válida.",
        },
        { status: 400 }
      );
    }

    const accion = accionValor as AccionCombate;

    let habilidadId: string | null = null;

    if (accion === "usar_habilidad") {
      if (
        typeof body.habilidadId !== "string" ||
        body.habilidadId.trim() === ""
      ) {
        return NextResponse.json(
          {
            error: "Debes indicar una habilidad.",
          },
          { status: 400 }
        );
      }

      habilidadId = body.habilidadId;
    }

    // ============================================================
    // BUSCAR USUARIO
    // ============================================================

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      include: {
        personaje: {
          include: {
            habilidades: {
              where: {
                slot: {
                  not: null,
                },
              },
            },
          },
        },
        expedicionActiva: {
          include: {
            combateActivo: {
              include: {
                expedicion: true,
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.personaje) {
      return NextResponse.json(
        {
          error: "No se encontró el personaje.",
        },
        { status: 404 }
      );
    }

    const personaje = usuario.personaje;

    // ============================================================
    // LOCALIZAR COMBATE
    // ============================================================

    let expedicion = usuario.expedicionActiva;
    let combate = expedicion?.combateActivo ?? null;

    // En PvP el defensor NO tiene expedición propia.
    // Buscamos el combate que tiene al usuario como defensor.
    if (!combate) {
      combate = await prisma.combateActivo.findFirst({
        where: {
          tipo: "pvp",
          defensorUsuarioId: usuario.id,
          fase: "activo",
        },
        include: {
          expedicion: {
            include: {
              combateActivo: true,
            },
          },
        },
      });

      if (combate) {
        expedicion = {
          ...combate.expedicion,
          combateActivo: combate,
        };
      }
    }

    if (!combate || !expedicion) {
      return NextResponse.json(
        {
          error: "No tienes ningún combate activo.",
        },
        { status: 409 }
      );
    }

    const esPvp = combate.tipo === "pvp";

    // ============================================================
    // VALIDACIÓN DE EXPEDICIÓN
    // ============================================================

    if (!esPvp && expedicion.fase !== "combatiendo") {
      return NextResponse.json(
        {
          error: "La expedición no está en fase de combate.",
          fase: expedicion.fase,
        },
        { status: 409 }
      );
    }

    if (esPvp) {
      if (
        usuario.id !== combate.atacanteUsuarioId &&
        usuario.id !== combate.defensorUsuarioId
      ) {
        return NextResponse.json(
          {
            error: "No perteneces a este combate.",
          },
          { status: 403 }
        );
      }
    }

    if (combate.fase !== "activo") {
      return NextResponse.json(
        {
          error: "El combate ya ha terminado.",
          fase: combate.fase,
        },
        { status: 409 }
      );
    }

    // ============================================================
    // VALIDAR CAMPOS NECESARIOS DEL OPONENTE
    // ============================================================

    if (
      combate.enemigoHp === null ||
      combate.enemigoHpMaximo === null ||
      combate.enemigoAtaque === null ||
      combate.enemigoDefensa === null ||
      combate.enemigoVelocidad === null ||
      combate.enemigoProbCritico === null ||
      combate.enemigoDanoCritico === null ||
      combate.enemigoNivel === null
    ) {
      return NextResponse.json(
        {
          error: "El combate no contiene todos los datos del enemigo.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // DETERMINAR ACTOR
    // ============================================================

    const actor = combate.turno;

    if (esPvp) {
      const usuarioEsAtacante = usuario.id === combate.atacanteUsuarioId;

      const usuarioEsDefensor = usuario.id === combate.defensorUsuarioId;

      if (actor !== "atacante" && actor !== "defensor") {
        return NextResponse.json(
          {
            error: "Turno de combate PvP no válido.",
          },
          { status: 409 }
        );
      }

      if (
        (actor === "atacante" && !usuarioEsAtacante) ||
        (actor === "defensor" && !usuarioEsDefensor)
      ) {
        return NextResponse.json(
          {
            error: "No es tu turno de combate.",
          },
          { status: 409 }
        );
      }

      // Por ahora las habilidades existentes están
      // modeladas sobre el lado "jugador".
      // El atacante sí puede utilizarlas.
      if (usuarioEsDefensor && accion === "usar_habilidad") {
        return NextResponse.json(
          {
            error: "El defensor solo puede atacar por ahora.",
          },
          { status: 400 }
        );
      }
    } else {
      if (actor !== "jugador" && actor !== "enemigo") {
        return NextResponse.json(
          {
            error: "Turno de combate no válido.",
          },
          { status: 409 }
        );
      }

      if (accion === "usar_habilidad" && actor !== "jugador") {
        return NextResponse.json(
          {
            error: "Solo puedes usar habilidades durante tu turno.",
          },
          { status: 409 }
        );
      }
    }

    // ============================================================
    // HABILIDAD
    // ============================================================

    let habilidad: DefinicionHabilidad | null = null;

    let cooldowns = obtenerCooldowns(combate.cooldowns);

    let efectos = obtenerEfectos(combate.efectos);

    if (accion === "usar_habilidad") {
      const habilidadAprendida = personaje.habilidades.find(
        (habilidadAprendida) => habilidadAprendida.habilidadId === habilidadId
      );

      if (!habilidadAprendida) {
        return NextResponse.json(
          {
            error: "No tienes esa habilidad equipada.",
          },
          { status: 403 }
        );
      }

      const habilidadEncontrada = obtenerHabilidadPorId(
        habilidadAprendida.habilidadId
      );

      if (!habilidadEncontrada) {
        return NextResponse.json(
          {
            error: "Habilidad no encontrada.",
          },
          { status: 404 }
        );
      }

      habilidad = habilidadEncontrada;

      if (habilidad.tipo !== "activa") {
        return NextResponse.json(
          {
            error:
              "Solo puedes utilizar habilidades activas durante el combate.",
          },
          { status: 400 }
        );
      }

      const cooldownRestante = cooldowns[habilidad.id] ?? 0;

      if (cooldownRestante > 0) {
        return NextResponse.json(
          {
            error: `Esta habilidad está en cooldown durante ${cooldownRestante} turno${
              cooldownRestante === 1 ? "" : "s"
            }.`,
          },
          { status: 409 }
        );
      }
    }

    // ============================================================
    // ESTADO ACTUAL
    // ============================================================

    let jugadorHp = combate.jugadorHp;
    let enemigoHp = combate.enemigoHp;
    let jugadorDefensa = combate.jugadorDefensa;

    const log = Array.isArray(combate.log)
      ? [...(combate.log as string[])]
      : [];

    let accionAnimada: AccionAnimadaCombate;

    // ============================================================
    // PVE
    // ============================================================

    if (!esPvp) {
      if (actor === "jugador") {
        if (accion === "atacar") {
          accionAnimada = resolverAtaqueJugador({
            jugadorAtaque: combate.jugadorAtaque,
            jugadorNivel: combate.jugadorNivel,
            jugadorProbCritico: combate.jugadorProbCritico,
            jugadorDanoCritico: combate.jugadorDanoCritico,
            enemigoDefensa: combate.enemigoDefensa,
            enemigoNombre: combate.enemigoNombre ?? "Enemigo",
          });

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
            jugadorAtaque: combate.jugadorAtaque,
            jugadorProbCritico: combate.jugadorProbCritico,
            jugadorDanoCritico: combate.jugadorDanoCritico,
            jugadorDefensa,
            jugadorNivel: combate.jugadorNivel,
            jugadorHp,
            jugadorHpMaximo: combate.jugadorHpMaximo,
            enemigoDefensa: combate.enemigoDefensa,
            enemigoNombre: combate.enemigoNombre ?? "Enemigo",
          });

          accionAnimada = resultadoHabilidad.accion;

          jugadorHp = resultadoHabilidad.jugadorHp;
          jugadorDefensa = resultadoHabilidad.jugadorDefensa;

          enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);

          if (resultadoHabilidad.efecto) {
            efectos = [...efectos, resultadoHabilidad.efecto];
          }

          const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

          if (cooldownTurnos > 0) {
            cooldowns[habilidad.id] = cooldownTurnos;
          }
        }
      } else {
        accionAnimada = resolverAtaqueEnemigo({
          enemigoAtaque: combate.enemigoAtaque,
          jugadorDefensa,
          enemigoNombre: combate.enemigoNombre ?? "Enemigo",
        });

        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
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

        const recompensaEnemigo = Math.trunc(
          Math.max(
            0,
            enemigo.botin *
              (1 + (expedicion.dificultad + personaje.nivel) * 0.3)
          )
        );

        const oroGanado = recompensaMision.oro + recompensaEnemigo;

        const experienciaGanada =
          expedicion.tipo === "elite"
            ? 250 +
              Math.max(0, expedicion.dificultad * (1 + enemigo.difMin)) * 20
            : 25 +
              Math.max(0, expedicion.dificultad * (1 + enemigo.difMin)) * 20;

        log.push(
          `💰 Consigues ${recompensaMision.oro} 🪙 de recompensa por la misión y ${recompensaEnemigo} 🪙 por derrotar al enemigo.`
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
          const actualizacionCombate = await tx.combateActivo.updateMany({
            where: {
              id: combate.id,
              version: combate.version,
            },
            data: {
              enemigoHp: 0,
              jugadorDefensa,
              cooldowns,
              efectos,
              fase: "victoria",
              turno: "jugador",
              oroGanado,
              experienciaGanada,
              log,
              version: {
                increment: 1,
              },
            },
          });

          if (actualizacionCombate.count !== 1) {
            throw new Error("COMBATE_MODIFICADO");
          }

          const combateActualizado = await tx.combateActivo.findUniqueOrThrow({
            where: {
              id: combate.id,
            },
          });

          await tx.expedicionActiva.update({
            where: {
              id: expedicion.id,
            },
            data: {
              fase: "regresando",
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
            },
          });

          const usuarioActualizado = await tx.usuario.findUnique({
            where: {
              id: usuario.id,
            },
            include: {
              personaje: true,
              expedicionActiva: {
                include: {
                  combateActivo: true,
                },
              },
            },
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

        const oroTotalPosible =
          obtenerOroRecompensa(expedicion.recompensa) +
          Math.max(0, Math.floor(enemigo.botin));

        const oroAsegurado = Math.floor(oroTotalPosible / 5);

        const experienciaTotalPosible =
          25 + Math.max(0, expedicion.dificultad * (1 + enemigo.difMin)) * 20;

        const experienciaGanada = Math.floor(experienciaTotalPosible / 10);

        log.push(`💰 Antes de caer, consigues asegurar ${oroAsegurado} 🪙.`);

        log.push(`⭐ Obtienes ${experienciaGanada} XP.`);

        const resultado = await prisma.$transaction(async (tx) => {
          const actualizacionCombate = await tx.combateActivo.updateMany({
            where: {
              id: combate.id,
              version: combate.version,
            },
            data: {
              jugadorHp: 0,
              jugadorDefensa,
              enemigoHp,
              cooldowns,
              efectos,
              fase: "derrota",
              turno: "jugador",
              oroGanado: oroAsegurado,
              experienciaGanada,
              log,
              version: {
                increment: 1,
              },
            },
          });

          if (actualizacionCombate.count !== 1) {
            throw new Error("COMBATE_MODIFICADO");
          }

          const combateActualizado = await tx.combateActivo.findUniqueOrThrow({
            where: {
              id: combate.id,
            },
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
            include: {
              personaje: true,
              expedicionActiva: {
                include: {
                  combateActivo: true,
                },
              },
            },
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
          efectos,
          jugadorDefensa
        );

        efectos = efectosActualizados.efectos;
        jugadorDefensa = efectosActualizados.defensa;
      }

      const actualizado = await prisma.combateActivo.updateMany({
        where: {
          id: combate.id,
          version: combate.version,
        },
        data: {
          jugadorHp,
          jugadorDefensa,
          enemigoHp,
          ronda: siguienteRonda,
          turno: siguienteTurno,
          cooldowns,
          efectos,
          log,
          version: {
            increment: 1,
          },
        },
      });

      if (actualizado.count !== 1) {
        return NextResponse.json(
          {
            error:
              "El combate ha cambiado mientras se procesaba la acción. Actualiza el combate e inténtalo de nuevo.",
          },
          { status: 409 }
        );
      }

      const combateActualizado = await prisma.combateActivo.findUniqueOrThrow({
        where: {
          id: combate.id,
        },
      });

      return NextResponse.json({
        exito: true,
        combate: combateActualizado,
        terminado: false,
        accion: accionAnimada,
      });
    }

    // ============================================================
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
          jugadorAtaque: combate.jugadorAtaque,
          jugadorNivel: combate.jugadorNivel,
          jugadorProbCritico: combate.jugadorProbCritico,
          jugadorDanoCritico: combate.jugadorDanoCritico,
          enemigoDefensa: combate.enemigoDefensa,
          enemigoNombre: combate.enemigoNombre ?? "Defensor",
        });

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
          jugadorAtaque: combate.jugadorAtaque,
          jugadorProbCritico: combate.jugadorProbCritico,
          jugadorDanoCritico: combate.jugadorDanoCritico,
          jugadorDefensa,
          jugadorNivel: combate.jugadorNivel,
          jugadorHp,
          jugadorHpMaximo: combate.jugadorHpMaximo,
          enemigoDefensa: combate.enemigoDefensa,
          enemigoNombre: combate.enemigoNombre ?? "Defensor",
        });

        accionAnimada = resultadoHabilidad.accion;

        jugadorHp = resultadoHabilidad.jugadorHp;

        jugadorDefensa = resultadoHabilidad.jugadorDefensa;

        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);

        if (resultadoHabilidad.efecto) {
          efectos = [...efectos, resultadoHabilidad.efecto];
        }

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

      if (accion !== "atacar") {
        return NextResponse.json(
          {
            error: "El defensor solo puede atacar por ahora.",
          },
          { status: 400 }
        );
      }

      accionAnimada = resolverAtaqueEnemigo({
        enemigoAtaque: combate.enemigoAtaque,
        jugadorDefensa,
        enemigoNombre: combate.enemigoNombre ?? "Defensor",
      });

      jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
    } else {
      return NextResponse.json(
        {
          error: "Turno de combate PvP no válido.",
        },
        { status: 409 }
      );
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
      const ganadorUsuarioId =
        ganador === "atacante" ? atacanteUsuarioId : defensorUsuarioId;

      const atacanteGana = ganador === "atacante";

      if (atacanteGana) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El defensor"} ha sido derrotado!`
        );
      } else {
        log.push(`🏆 ¡El atacante ha sido derrotado!`);
      }

      const faseFinal = atacanteGana ? "victoria" : "derrota";

      const resultado = await prisma.$transaction(async (tx) => {
        const actualizacionCombate = await tx.combateActivo.updateMany({
          where: {
            id: combate.id,
            version: combate.version,
          },
          data: {
            jugadorHp,
            enemigoHp,
            jugadorDefensa,
            fase: faseFinal,
            turno: ganador,
            ganadorUsuarioId,
            botinResuelto: false,
            log,
            version: {
              increment: 1,
            },
          },
        });

        if (actualizacionCombate.count !== 1) {
          throw new Error("COMBATE_MODIFICADO");
        }

        const combateActualizado = await tx.combateActivo.findUniqueOrThrow({
          where: {
            id: combate.id,
          },
        });

        // La expedición pertenece SIEMPRE al atacante.
        await tx.expedicionActiva.update({
          where: {
            id: expedicion.id,
          },
          data: {
            fase: "regresando",
            resultadoFinal: atacanteGana ? "exito" : "derrota",
            recompensa: {
              oro: 0,
              madera: 0,
              piedra: 0,
              metal: 0,
            },
            hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),
            experienciaGanada: 0,
          },
        });

        // Guardamos el HP final del atacante.
        await tx.personaje.update({
          where: {
            usuarioId: atacanteUsuarioId,
          },
          data: {
            hpActual: Math.max(1, jugadorHp),
          },
        });

        // Guardamos el HP final del defensor.
        await tx.personaje.update({
          where: {
            usuarioId: defensorUsuarioId,
          },
          data: {
            hpActual: Math.max(1, enemigoHp),
          },
        });

        return {
          combate: combateActualizado,
        };
      });

      return NextResponse.json({
        exito: true,
        combate: resultado.combate,
        terminado: true,
        accion: accionAnimada,
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

    // Los cooldowns y efectos pertenecen actualmente
    // al atacante, igual que en PvE.
    //
    // Cuando vuelve su turno, reducimos cooldowns
    // y actualizamos los efectos de defensa.
    if (siguienteTurno === "atacante") {
      cooldowns = reducirCooldowns(cooldowns);

      const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
        efectos,
        jugadorDefensa
      );

      efectos = efectosActualizados.efectos;

      jugadorDefensa = efectosActualizados.defensa;
    }

    const actualizado = await prisma.combateActivo.updateMany({
      where: {
        id: combate.id,
        version: combate.version,
      },
      data: {
        jugadorHp,
        enemigoHp,
        jugadorDefensa,
        ronda: siguienteRonda,
        turno: siguienteTurno,
        cooldowns,
        efectos,
        log,
        version: {
          increment: 1,
        },
      },
    });

    if (actualizado.count !== 1) {
      return NextResponse.json(
        {
          error:
            "El combate ha cambiado mientras se procesaba la acción. Actualiza el combate e inténtalo de nuevo.",
        },
        { status: 409 }
      );
    }

    const combateActualizado = await prisma.combateActivo.findUniqueOrThrow({
      where: {
        id: combate.id,
      },
    });

    return NextResponse.json({
      exito: true,
      combate: combateActualizado,
      terminado: false,
      accion: accionAnimada,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "COMBATE_MODIFICADO") {
      return NextResponse.json(
        {
          error:
            "El combate ha cambiado mientras se procesaba la acción. La acción ya no es válida.",
        },
        { status: 409 }
      );
    }

    console.error("Error al ejecutar acción de combate:", error);

    return NextResponse.json(
      {
        error: "No se pudo ejecutar la acción de combate.",
      },
      { status: 500 }
    );
  }
}
