import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { obtenerEnemigoPorId } from "@/lib/enemigos";
import {
  calcularMejorasPorNivel,
  experienciaParaNivel,
} from "@/lib/configuracionJuego";
import {
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
  type AccionAnimadaCombate,
  resolverHabilidadJugador,
} from "@/lib/expediciones/combate";
import { obtenerHabilidadPorId } from "@/lib/habilidades";

type AccionCombate = "atacar" | "usar_habilidad";

type EfectoCombate = {
  habilidadId: string;
  tipo: "bonus_defensa";
  valor: number;
  turnosRestantes: number;
};

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
        { error: "Acción de combate no válida." },
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
          { error: "Debes indicar una habilidad." },
          { status: 400 }
        );
      }

      habilidadId = body.habilidadId;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
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
            combateActivo: true,
          },
        },
      },
    });

    if (!usuario || !usuario.personaje) {
      return NextResponse.json(
        { error: "No se encontró el personaje." },
        { status: 404 }
      );
    }

    const habilidadAprendida = usuario.personaje.habilidades.find(
      (habilidad) => habilidad.habilidadId === habilidadId
    );

    if (!habilidadAprendida) {
      return NextResponse.json(
        { error: "No tienes esa habilidad equipada." },
        { status: 403 }
      );
    }

    const habilidad = obtenerHabilidadPorId(habilidadAprendida.habilidadId);

    const expedicion = usuario.expedicionActiva;
    const combate = expedicion?.combateActivo;

    if (!expedicion || !combate) {
      return NextResponse.json(
        { error: "No tienes ningún combate activo." },
        { status: 409 }
      );
    }

    if (expedicion.fase !== "combatiendo") {
      return NextResponse.json(
        {
          error: "La expedición no está en fase de combate.",
          fase: expedicion.fase,
        },
        { status: 409 }
      );
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

    if (accion === "usar_habilidad" && combate.turno !== "jugador") {
      return NextResponse.json(
        { error: "Solo puedes usar habilidades durante tu turno." },
        { status: 409 }
      );
    }

    if (combate.turno !== "jugador" && combate.turno !== "enemigo") {
      return NextResponse.json(
        { error: "Turno de combate no válido." },
        { status: 409 }
      );
    }

    let habilidad: NonNullable<
      ReturnType<typeof obtenerHabilidadPorId>
    > | null = null;

    if (accion === "usar_habilidad") {
      const habilidadAprendida = usuario.personaje.habilidades.find(
        (habilidadAprendida) => habilidadAprendida.habilidadId === habilidadId
      );

      if (!habilidadAprendida) {
        return NextResponse.json(
          { error: "No tienes esa habilidad equipada." },
          { status: 403 }
        );
      }

      habilidad = obtenerHabilidadPorId(habilidadAprendida.habilidadId);

      if (!habilidad) {
        return NextResponse.json(
          { error: "Habilidad no encontrada." },
          { status: 404 }
        );
      }

      if (habilidad.tipo !== "activa") {
        return NextResponse.json(
          {
            error:
              "Solo puedes utilizar habilidades activas durante el combate.",
          },
          { status: 400 }
        );
      }
    }

    // ============================================================
    // FLUJO COMBATE
    // ============================================================
    let jugadorHp = combate.jugadorHp;
    let enemigoHp = combate.enemigoHp;
    let jugadorDefensa = combate.jugadorDefensa;

    let cooldowns = obtenerCooldowns(combate.cooldowns);
    let efectos = obtenerEfectos(combate.efectos);

    const log = Array.isArray(combate.log)
      ? [...(combate.log as string[])]
      : [];

    const actor = combate.turno;

    if (actor === "jugador") {
      cooldowns = reducirCooldowns(cooldowns);

      const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
        efectos,
        jugadorDefensa
      );

      efectos = efectosActualizados.efectos;
      jugadorDefensa = efectosActualizados.defensa;
    }

    let accionAnimada: AccionAnimadaCombate;

    if (actor === "jugador") {
      if (accion === "atacar") {
        accionAnimada = resolverAtaqueJugador(combate);

        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);
      } else {
        if (!habilidad) {
          return NextResponse.json(
            { error: "Habilidad no encontrada." },
            { status: 404 }
          );
        }

        const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
          jugadorAtaque: combate.jugadorAtaque,
          jugadorDefensa,
          jugadorNivel: combate.jugadorNivel,
          jugadorHp,
          jugadorHpMaximo: combate.jugadorHpMaximo,
          enemigoDefensa: combate.enemigoDefensa,
          enemigoNombre: combate.enemigoNombre,
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
        enemigoNombre: combate.enemigoNombre,
      });

      jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
    }

    log.push(accionAnimada.texto);

    // ============================================================
    // VICTORIA
    // ============================================================

    if (enemigoHp <= 0) {
      log.push(`🏆 ¡${combate.enemigoNombre} ha sido derrotado!`);

      const enemigo = obtenerEnemigoPorId(combate.enemigoId);

      if (!enemigo) {
        return NextResponse.json(
          { error: "No se encontró el enemigo derrotado." },
          { status: 500 }
        );
      }

      // ============================================================
      // RECOMPENSA
      // ============================================================

      const oroGanado =
        Math.max(0, expedicion.recompensa) + Math.max(0, enemigo.botin);

      const experienciaGanada =
        expedicion.tipo === "elite"
          ? 150
          : 25 + Math.max(0, expedicion.dificultad) * 20;

      log.push(`💰 Consigues ${enemigo.botin} 🪙 de botín.`);

      log.push(`⭐ Obtienes ${experienciaGanada} XP.`);

      log.push(`🎒 Botín total asegurado: ${oroGanado} 🪙.`);

      // ============================================================
      // CALCULAR EXPERIENCIA Y NIVEL
      // ============================================================

      const experienciaActual = usuario.personaje.experiencia || 0;

      const nivelActual = usuario.personaje.nivel || 1;

      let nivelNuevo = nivelActual;
      let experienciaNueva = experienciaActual + experienciaGanada;

      let ataqueGanado = 0;
      let defensaGanada = 0;
      let velocidadGanada = 0;
      let capacidadGanada = 0;
      let nivelesSubidos = 0;

      while (experienciaNueva >= experienciaParaNivel(nivelNuevo)) {
        experienciaNueva -= experienciaParaNivel(nivelNuevo);

        nivelNuevo += 1;
        nivelesSubidos += 1;

        const mejora = calcularMejorasPorNivel(
          usuario.personaje.clase,
          nivelNuevo
        );

        ataqueGanado += mejora.ataque;
        defensaGanada += mejora.defensa;
        velocidadGanada += mejora.velocidad;
        capacidadGanada += mejora.capacidadCarruaje;
      }

      if (nivelesSubidos > 0) {
        log.push(`⬆️ ¡Subes al nivel ${nivelNuevo}!`);
      }

      // ============================================================
      // VICTORIA
      // ============================================================

      const resultado = await prisma.$transaction(async (tx) => {
        const combateActualizado = await tx.combateActivo.update({
          where: {
            id: combate.id,
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
          },
        });

        await tx.expedicionActiva.update({
          where: { id: expedicion.id },
          data: {
            fase: "regresando",
            recompensa: oroGanado,
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
            id: usuario.personaje!.id,
          },
          data: {
            hpActual: Math.max(1, jugadorHp),
            nivel: nivelNuevo,
            experiencia: experienciaNueva,

            ...(nivelesSubidos > 0
              ? {
                  hpMaximo: {
                    increment: 10 * nivelesSubidos,
                  },
                  ataque: {
                    increment: ataqueGanado,
                  },
                  defensa: {
                    increment: defensaGanada,
                  },
                  velocidad: {
                    increment: velocidadGanada,
                  },
                  capacidadCarruaje: {
                    increment: capacidadGanada,
                  },
                }
              : {}),
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

    // ============================================================
    // DERROTA
    // ============================================================

    if (jugadorHp <= 0) {
      log.push(`💀 El aventurero cae derrotado.`);

      const resultado = await prisma.$transaction(async (tx) => {
        const combateActualizado = await tx.combateActivo.update({
          where: {
            id: combate.id,
          },
          data: {
            jugadorHp: 0,
            jugadorDefensa,
            enemigoHp,
            cooldowns,
            efectos,
            fase: "derrota",
            turno: "jugador",
            oroGanado: 0,
            experienciaGanada: 0,
            log,
          },
        });

        await tx.personaje.update({
          where: {
            id: usuario.personaje!.id,
          },
          data: {
            hpActual: 1,
            estado: "de_viaje",
          },
        });

        await tx.expedicionActiva.update({
          where: { id: expedicion.id },
          data: {
            fase: "regresando",
            recompensa: 0,
            resultadoFinal: "derrota",
            hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),
            experienciaGanada: 0,
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

    // ============================================================
    // SIGUIENTE TURNO
    // ============================================================

    const jugadorEsPrimero =
      combate.jugadorVelocidad >= combate.enemigoVelocidad;

    let siguienteTurno: "jugador" | "enemigo";
    let siguienteRonda = combate.ronda;

    if (actor === "jugador") {
      // Si el jugador es el primero, todavía falta actuar al enemigo
      if (jugadorEsPrimero) {
        siguienteTurno = "enemigo";
      } else {
        // El jugador era el segundo: empieza una nueva ronda
        siguienteRonda += 1;
        siguienteTurno = "enemigo";
      }
    } else {
      // Ha actuado el enemigo
      if (jugadorEsPrimero) {
        // El enemigo era el segundo: nueva ronda
        siguienteRonda += 1;
        siguienteTurno = "jugador";
      } else {
        // El enemigo era el primero: todavía falta el jugador
        siguienteTurno = "jugador";
      }
    }

    const actualizado = await prisma.combateActivo.update({
      where: {
        id: combate.id,
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
      },
    });

    return NextResponse.json({
      exito: true,
      combate: actualizado,
      terminado: false,
      accion: accionAnimada,
    });
  } catch (error) {
    console.error("Error al ejecutar acción de combate:", error);

    return NextResponse.json(
      { error: "No se pudo ejecutar la acción de combate." },
      { status: 500 }
    );
  }
}
