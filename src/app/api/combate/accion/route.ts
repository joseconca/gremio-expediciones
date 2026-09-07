import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import {
  calcularMejorasPorNivel,
  experienciaParaNivel,
} from "@/lib/configuracionJuego";

type AccionCombate = "atacar";

const d20 = () => Math.floor(Math.random() * 20) + 1;
const d6 = () => Math.floor(Math.random() * 6) + 1;

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body = await request.json();

    const accion = body.accion as AccionCombate;

    if (accion !== "atacar") {
      return NextResponse.json(
        { error: "Acción de combate no válida." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: true,
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

    if (combate.turno !== "jugador") {
      return NextResponse.json(
        { error: "No es el turno del jugador." },
        { status: 409 }
      );
    }

    // ============================================================
    // COPIA DEL ESTADO ACTUAL
    // ============================================================

    let jugadorHp = combate.jugadorHp;
    let enemigoHp = combate.enemigoHp;

    const log = Array.isArray(combate.log)
      ? [...(combate.log as string[])]
      : [];

    // ============================================================
    // ATAQUE DEL JUGADOR
    // ============================================================

    const dadoJugador = d20();

    if (dadoJugador === 20) {
      const dano = Math.max(
        1,
        (combate.jugadorAtaque + d6()) * 2 - combate.enemigoDefensa
      );

      enemigoHp -= dano;

      log.push(
        `💥 ¡GOLPE CRÍTICO! El aventurero inflige ${dano} de daño a ${combate.enemigoNombre}.`
      );
    } else if (dadoJugador === 1) {
      log.push(`🤡 El aventurero comete una pifia y falla su ataque.`);
    } else {
      /*const diferenciaNivel =
        combate.jugadorNivel -
        (combate.enemigoNivel ?? combate.jugadorNivel);

      const umbralAcierto = Math.max(2, 2 - diferenciaNivel);*/

      //TEMPORAL
      const umbralAcierto = 2;

      if (dadoJugador >= umbralAcierto) {
        const variacion = 0.8 + Math.random() * 0.4;

        const danoBase =
          Math.floor(combate.jugadorAtaque * variacion) + combate.jugadorNivel;

        const dano = Math.max(
          1,
          danoBase - Math.floor(combate.enemigoDefensa / 2)
        );

        enemigoHp -= dano;

        log.push(
          `⚔️ Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`
        );
      } else {
        log.push(`💨 ${combate.enemigoNombre} esquiva tu ataque.`);
      }
    }

    enemigoHp = Math.max(0, enemigoHp);

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
      // GUARDAR VICTORIA
      // ============================================================

      const resultado = await prisma.$transaction(async (tx) => {
        const combateActualizado = await tx.combateActivo.update({
          where: {
            id: combate.id,
          },
          data: {
            enemigoHp: 0,
            fase: "victoria",
            turno: "jugador",
            oroGanado,
            experienciaGanada,
            log,
          },
        });

        await tx.expedicionActiva.update({
          where: {
            id: expedicion.id,
          },
          data: {
            fase: "regresando",
            recompensa: oroGanado,
          },
        });

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
      });
    }

    // ============================================================
    // CONTRAATAQUE DEL ENEMIGO
    // ============================================================

    const dadoEnemigo = d20();

    if (dadoEnemigo === 20) {
      const dano = Math.max(
        1,
        (combate.enemigoAtaque + d6()) * 2 - combate.jugadorDefensa
      );

      jugadorHp -= dano;

      log.push(
        `💥 ¡CRÍTICO! ${combate.enemigoNombre} inflige ${dano} de daño.`
      );
    } else if (dadoEnemigo === 1) {
      log.push(
        `🤡 ${combate.enemigoNombre} comete una pifia y falla su ataque.`
      );
    } else {
      const variacion = 0.8 + Math.random() * 0.4;

      const danoBase = Math.floor(combate.enemigoAtaque * variacion) + 1;

      const dano = Math.max(
        1,
        danoBase - Math.floor(combate.jugadorDefensa / 2)
      );

      jugadorHp -= dano;

      log.push(
        `🩸 ${combate.enemigoNombre} te golpea e inflige ${dano} de daño.`
      );
    }

    jugadorHp = Math.max(0, jugadorHp);

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
            enemigoHp,
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
          where: {
            id: expedicion.id,
          },
          data: {
            fase: "regresando",
            recompensa: 0,
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
      });
    }

    // ============================================================
    // SIGUIENTE RONDA
    // ============================================================

    const actualizado = await prisma.combateActivo.update({
      where: {
        id: combate.id,
      },
      data: {
        jugadorHp,
        enemigoHp,
        ronda: {
          increment: 1,
        },
        turno: "jugador",
        log,
      },
    });

    return NextResponse.json({
      exito: true,
      combate: actualizado,
      terminado: false,
    });
  } catch (error) {
    console.error("Error al ejecutar acción de combate:", error);

    return NextResponse.json(
      { error: "No se pudo ejecutar la acción de combate." },
      { status: 500 }
    );
  }
}
