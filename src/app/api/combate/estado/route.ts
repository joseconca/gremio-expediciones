import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
  calcularBonusDefensaMuralla,
} from "@/lib/expediciones/combate";

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

    let cooldowns = obtenerCooldowns(combate.cooldowns);

    let cooldownsDefensor = obtenerCooldowns(combate.cooldownsDefensor);

    let accion;

    if (combate.turno === "atacante") {
      accion = resolverAtaqueJugador({
        jugadorAtaque: combate.jugadorAtaque,
        jugadorNivel: combate.jugadorNivel,
        jugadorProbCritico: combate.jugadorProbCritico,
        jugadorDanoCritico: combate.jugadorDanoCritico,
        enemigoDefensa: (combate.enemigoDefensa ?? 0) + calcularBonusDefensaMuralla(combate.murallaNivel),
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

    let ganadorUsuarioId: string | null = null;
    let nuevaFase: "activo" | "victoria" | "derrota" = "activo";

    if (jugadorHp <= 0 && enemigoHp <= 0) {
      ganadorUsuarioId = combate.defensorUsuarioId;
      nuevaFase = "derrota";
    } else if (jugadorHp <= 0) {
      ganadorUsuarioId = combate.defensorUsuarioId;
      nuevaFase = "derrota";
    } else if (enemigoHp <= 0) {
      ganadorUsuarioId = combate.atacanteUsuarioId;
      nuevaFase = "victoria";
    }

    const nuevoTurno = combate.turno === "atacante" ? "defensor" : "atacante";

    const nuevoLog = Array.isArray(combate.log)
      ? [...(combate.log as string[]), accion.texto]
      : [accion.texto];

    /*
     * Solo el cliente que consiga esta actualización gana
     * la carrera para resolver el turno.
     */
    const resultadoUpdate = await prisma.combateActivo.updateMany({
      where: {
        id: combate.id,
        version: versionActual,
        fase: "activo",
      },
      data: {
        jugadorHp,
        enemigoHp,

        cooldowns,
        cooldownsDefensor,

        turno: nuevaFase === "activo" ? combate.turno : nuevoTurno,

        fase: nuevaFase,

        ganadorUsuarioId,

        ultimoTurnoEn: new Date(),

        log: nuevoLog,

        ultimaAccion: accion,

        version: {
          increment: 1,
        },
      },
    });

    /*
     * Otro cliente resolvió el turno antes.
     */
    if (resultadoUpdate.count === 0) {
      const combateActualizado = await prisma.combateActivo.findUnique({
        where: {
          id: combate.id,
        },
      });

      return NextResponse.json({
        combate: combateActualizado,
      });
    }

    const combateActualizado = await prisma.combateActivo.findUnique({
      where: {
        id: combate.id,
      },
    });

    return NextResponse.json({
      combate: combateActualizado,
      accion,
      automatica: true,
    });
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
