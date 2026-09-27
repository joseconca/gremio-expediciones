import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
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
} from "@/lib/expediciones/asedio";

const TIEMPO_MAXIMO_TURNO_MS = 2 * 60 * 1000;

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

function obtenerEfectos(valor: unknown): {
  habilidadId: string;
  tipo: "bonus_defensa";
  valor: number;
  turnosRestantes: number;
}[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.filter(
    (
      efecto
    ): efecto is {
      habilidadId: string;
      tipo: "bonus_defensa";
      valor: number;
      turnosRestantes: number;
    } => {
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
    }
  );
}

function actualizarEfectosAlInicioTurno(
  efectos: {
    habilidadId: string;
    tipo: "bonus_defensa";
    valor: number;
    turnosRestantes: number;
  }[],
  defensaActual: number
): {
  efectos: {
    habilidadId: string;
    tipo: "bonus_defensa";
    valor: number;
    turnosRestantes: number;
  }[];
  defensa: number;
} {
  let defensa = defensaActual;

  const nuevosEfectos: typeof efectos = [];

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

export async function GET() {
  try {
    const usuario = await getAuthenticatedUser();

    if (!usuario) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const combate = await prisma.combateActivo.findFirst({
      where: {
        tipo: "pvp",
        OR: [
          { atacanteUsuarioId: usuario.id },
          { defensorUsuarioId: usuario.id },
        ],
      },
      orderBy: {
        actualizado: "desc",
      },
    });

    if (!combate) {
      return NextResponse.json({
        combate: null,
      });
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
      return NextResponse.json(
        { error: "El combate no tiene todos los datos necesarios." },
        { status: 400 }
      );
    }

    /*
     * Si el combate ya terminó, simplemente lo devolvemos.
     */
    if (combate.fase !== "activo") {
      return NextResponse.json({
        combate,
      });
    }

    const ahora = Date.now();
    const ultimoTurno = combate.ultimoTurnoEn.getTime();

    const turnoExpirado = ahora - ultimoTurno >= TIEMPO_MAXIMO_TURNO_MS;

    /*
     * Todavía queda tiempo para que actúe el jugador.
     */
    if (!turnoExpirado) {
      return NextResponse.json({
        combate,
      });
    }

    /*
     * El turno ha expirado.
     *
     * Como atacante y defensor hacen polling al mismo tiempo,
     * utilizamos "version" como bloqueo optimista.
     */
    const versionActual = combate.version;

    let jugadorHp = combate.jugadorHp;
    let enemigoHp = combate.enemigoHp;

    let jugadorDefensa = combate.jugadorDefensa;
    let enemigoDefensa = combate.enemigoDefensa;

    let cooldowns = obtenerCooldowns(combate.cooldowns);
    let cooldownsDefensor = obtenerCooldowns(combate.cooldownsDefensor);

    let efectos = obtenerEfectos(combate.efectos);
    let efectosDefensor = obtenerEfectos(combate.efectosDefensor);

    let accion;

    // Resolver ataque automático
    if (combate.turno === "atacante") {
      accion = resolverAtaqueJugador({
        jugadorAtaque: combate.jugadorAtaque,
        jugadorNivel: combate.jugadorNivel,
        jugadorProbCritico: combate.jugadorProbCritico,
        jugadorDanoCritico: combate.jugadorDanoCritico,
        enemigoDefensa:
          combate.enemigoDefensa +
          calcularBonusDefensaMuralla(combate.murallaNivel),
        enemigoNombre:
          combate.defensorNombre ?? combate.enemigoNombre ?? "Defensor",
      });

      enemigoHp = Math.max(0, enemigoHp - accion.dano);

      cooldowns = disminuirCooldowns(cooldowns);
    } else {
      accion = resolverAtaqueEnemigo({
        enemigoAtaque: combate.enemigoAtaque ?? 0,
        enemigoProbCritico: combate.enemigoProbCritico ?? 0.1,
        enemigoDanoCritico: combate.enemigoDanoCritico ?? 1.5,
        jugadorDefensa: combate.jugadorDefensa ?? 0,
        enemigoNombre: combate.atacanteNombre ?? "Atacante",
      });

      jugadorHp = Math.max(0, jugadorHp - accion.dano);

      cooldownsDefensor = disminuirCooldowns(cooldownsDefensor);
    }

    const ganador = determinarGanadorAsedio({
      hpAtacante: jugadorHp,
      hpDefensor: enemigoHp,
    });

    const nuevoLog = Array.isArray(combate.log)
      ? [...(combate.log as string[]), accion.texto]
      : [accion.texto];

    /*
     * Solo el cliente que consiga esta actualización gana
     * la carrera para resolver el turno.
     */
    if (ganador) {
      nuevoLog.push(
        ganador === "atacante"
          ? `🏆 ¡${
              combate.defensorNombre ?? combate.enemigoNombre ?? "El defensor"
            } ha sido derrotado!`
          : "🏆 ¡El atacante ha sido derrotado!"
      );

      const resultado = await prisma.$transaction(async (tx) => {
        return finalizarAsedio({
          tx,

          combate: {
            id: combate.id,
            version: versionActual,

            atacanteUsuarioId: combate.atacanteUsuarioId,
            defensorUsuarioId: combate.defensorUsuarioId,

            jugadorHpMaximo: combate.jugadorHpMaximo,

            almacenNivel: combate.almacenNivel,
            capacidadCarruaje: combate.capacidadCarruaje,

            estadoDefensorAnterior: combate.estadoDefensorAnterior,
          },

          expedicionId: combate.expedicionId,

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
      });

      return NextResponse.json({
        combate: resultado.combate,
        accion,
        automatica: true,
        terminado: true,
        botin: resultado.botin,
      });
    }

    /*
     * El combate continúa.
     *
     * Calculamos el siguiente turno y la siguiente ronda.
     */
    if (combate.turno !== "atacante" && combate.turno !== "defensor") {
      return NextResponse.json(
        {
          error: "Turno de combate PvP no válido.",
        },
        { status: 409 }
      );
    }
    const siguienteTurno = siguienteTurnoAsedio(combate.turno);

    let siguienteRonda = combate.ronda;

    const primerTurno = determinarPrimerTurnoAsedio({
      velocidadAtacante: combate.jugadorVelocidad,
      velocidadDefensor: combate.enemigoVelocidad ?? 0,
    });

    if (siguienteTurno === primerTurno) {
      siguienteRonda += 1;
    }

    if (siguienteTurno === "atacante") {
      cooldowns = disminuirCooldowns(cooldowns);

      const efectosActualizados = actualizarEfectosAlInicioTurno(
        efectos,
        jugadorDefensa
      );

      efectos = efectosActualizados.efectos;
      jugadorDefensa = efectosActualizados.defensa;
    }

    if (siguienteTurno === "defensor") {
      cooldownsDefensor = disminuirCooldowns(cooldownsDefensor);

      const efectosActualizados = actualizarEfectosAlInicioTurno(
        efectosDefensor,
        enemigoDefensa
      );

      efectosDefensor = efectosActualizados.efectos;
      enemigoDefensa = efectosActualizados.defensa;

      const actualizado = await prisma.combateActivo.updateMany({
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
          efectos,
          cooldownsDefensor,
          efectosDefensor,
          ultimoTurnoEn: new Date(),
          log: nuevoLog,
          ultimaAccion: accion,
          version: {
            increment: 1,
          },
        },
      });

      if (actualizado.count !== 1) {
        const combateActualizado = await prisma.combateActivo.findUnique({
          where: {
            id: combate.id,
          },
        });

        return NextResponse.json({
          combate: combateActualizado,
        });
      }

      const combateActualizado = await prisma.combateActivo.findUniqueOrThrow({
        where: {
          id: combate.id,
        },
      });

      return NextResponse.json({
        combate: combateActualizado,
        accion,
        automatica: true,
        terminado: false,
      });
    }
  } catch (error) {
    console.error("Error obteniendo estado del combate:", error);

    return NextResponse.json(
      {
        error: "No se pudo obtener el estado del combate.",
      },
      { status: 500 }
    );
  }
}
