import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DefinicionEnemigo, TipoMision } from "@/lib/tiposJuego";

import { seleccionarEnemigosNormales } from "@/lib/expediciones/normal";
import { crearEnemigosEnCombate } from "@/lib/expediciones/enemigos-combate";
import { seleccionarJefeElite } from "@/lib/expediciones/elite";

import { procesarLlegadaAsedio } from "@/lib/expediciones/procesarLlegadaAsedio";

import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
} from "@/lib/estadisticasPersonaje";

import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { calcularMultiplicadoresEnemigo, esModoDificultad } from "../../../lib/expediciones/dificultad";
import { aplicarEfectoComida, comidaOtorgaIniciativa, obtenerComidaTaberna } from "@/lib/comidasTaberna";
import { aplicarModificadoresPosicion, normalizarPosicionCombate } from "@/lib/expediciones/posicion-combate";

export async function llegarExpedicion() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },

      include: {
        personaje: {
          include: {
            habilidades: true,
            progresosClase: true,

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
        {
          error: "No se encontró el personaje.",
        },
        { status: 404 }
      );
    }

    const expedicion = usuario.expedicionActiva;

    if (!expedicion) {
      return NextResponse.json(
        {
          error: "No tienes ninguna expedición activa.",
        },
        { status: 409 }
      );
    }

    if (expedicion.tipo === "comercio") {
      return NextResponse.json(
        {
          error:
            "Las expediciones comerciales no utilizan el sistema de combate.",

          tipo: "comercio",
        },
        { status: 409 }
      );
    }

    /*
     * Si el combate ya existe, simplemente lo devolvemos.
     */
    if (expedicion.combateActivo) {
      return NextResponse.json({
        combate: expedicion.combateActivo,
      });
    }

    if (expedicion.fase !== "en_viaje") {
      return NextResponse.json(
        {
          error: "La expedición no puede iniciar un combate desde esta fase.",

          fase: expedicion.fase,
        },
        { status: 409 }
      );
    }

    const ahora = new Date();

    if (expedicion.fechaLlegada > ahora) {
      return NextResponse.json(
        {
          error: "La expedición todavía no ha llegado a su destino.",

          fechaLlegada: expedicion.fechaLlegada,
        },
        { status: 409 }
      );
    }

    const personaje = usuario.personaje;

    // ============================================================
    // ASEDIO PvP
    // ============================================================

    if (expedicion.tipo === "asedio") {
      try {
        const combate = await procesarLlegadaAsedio(expedicion.id);

        return NextResponse.json({
          exito: true,
          tipo: "asedio",
          combate,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "EXPEDICION_AUN_NO_HA_LLEGADO"
        ) {
          return NextResponse.json(
            {
              error: "La expedición todavía no ha llegado a su destino.",

              fechaLlegada: expedicion.fechaLlegada,
            },
            { status: 409 }
          );
        }

        if (error instanceof Error && error.message === "ASEDIO_SIN_OBJETIVO") {
          return NextResponse.json(
            {
              error: "El asedio no tiene un gremio objetivo.",
            },
            { status: 400 }
          );
        }

        if (
          error instanceof Error &&
          error.message === "DEFENSOR_NO_ENCONTRADO"
        ) {
          return NextResponse.json(
            {
              error: "El gremio defensor ya no tiene un personaje disponible.",
            },
            { status: 404 }
          );
        }

        if (
          error instanceof Error &&
          error.message === "DEFENSOR_YA_PARTICIPA_EN_COMBATE"
        ) {
          return NextResponse.json(
            {
              error:
                "El personaje defensor ya se encuentra participando en un combate.",
            },
            { status: 409 }
          );
        }

        if (error instanceof Error && error.message === "ASEDIO_YA_PROCESADO") {
          return NextResponse.json(
            {
              error: "El asedio ya ha sido procesado.",
            },
            { status: 409 }
          );
        }

        console.error("Error procesando llegada del asedio:", error);

        return NextResponse.json(
          {
            error: "No se pudo iniciar el asedio.",
          },
          { status: 500 }
        );
      }
    }

    // ============================================================
    // SELECCIONAR ENEMIGO PvE
    // ============================================================

    const tipoMision = expedicion.tipo as TipoMision;

    let monstruoBase: DefinicionEnemigo;
    let grupoMonstruosBase: DefinicionEnemigo[];

    try {
      if (tipoMision === "elite") {
        if (!expedicion.enemigoId) {
          return NextResponse.json(
            {
              error: "La expedición de élite no tiene un jefe asignado.",
            },
            { status: 500 }
          );
        }

        monstruoBase = seleccionarJefeElite(expedicion.enemigoId);
        grupoMonstruosBase = [monstruoBase];
      } else if (tipoMision === "normal") {
        grupoMonstruosBase = seleccionarEnemigosNormales(expedicion.dificultad, false);
        monstruoBase = grupoMonstruosBase[0];

      } else {
        return NextResponse.json(
          {
            error: `Tipo de expedición no válido para combate: ${expedicion.tipo}`,
          },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error("Error seleccionando enemigo:", error);

      return NextResponse.json(
        {
          error: "No se pudo seleccionar el enemigo de la expedición.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // ESTADÍSTICAS PvE
    // ============================================================

    const dificultad = Math.max(0, expedicion.dificultad);

    const equipo = obtenerEquipoDesdePersonaje(personaje);

    const modificadoresEquipo = calcularModificadoresEquipo(
      equipo,
      personaje.profesionActivaId
    );

    const estadisticasJugador = calcularEstadisticasPersonaje(
      personaje,
      personaje.habilidades.filter((habilidad) => habilidad.slot !== null).map((habilidad) => ({ habilidadId: habilidad.habilidadId, nivel: habilidad.nivel })),
      modificadoresEquipo
    );

    const modoDificultad = esModoDificultad(expedicion.modoDificultad)
      ? expedicion.modoDificultad
      : "normal";
    const enemigosEnCombate = crearEnemigosEnCombate(grupoMonstruosBase, modoDificultad);
    const enemigoPrincipal = enemigosEnCombate[0];
    const enemigoNombre = enemigoPrincipal.nombre;
    // Los campos escalares se conservan como compatibilidad y apuntan al
    // primer enemigo; la formación completa vive en enemigosEnCombate.
    const enemigoHp = enemigoPrincipal.hp;
    const enemigoAtaque = enemigoPrincipal.ataque;
    const enemigoAtaqueMagico = enemigoPrincipal.ataqueMagico;
    const enemigoDefensa = enemigoPrincipal.defensa;
    const enemigoDefensaMagica = enemigoPrincipal.defensaMagica;
    const enemigoVelocidad = enemigoPrincipal.velocidad;
    const enemigoProbCritico = enemigoPrincipal.probCritico;
    const enemigoDanoCritico = enemigoPrincipal.danoCritico;
    const enemigoPrecision = enemigoPrincipal.precision;
    const enemigoEvasion = enemigoPrincipal.evasion;
    const enemigoNivel = enemigoPrincipal.nivel;

    const jugadorHpMaximo = estadisticasJugador.total.hpMaximo;
    const jugadorHp = jugadorHpMaximo;

    const atributosConComida = aplicarEfectoComida(
      {
        ataque: estadisticasJugador.total.ataque,
        ataqueMagico: estadisticasJugador.total.ataqueMagico ?? estadisticasJugador.total.ataque,
        defensa: estadisticasJugador.total.defensa,
        velocidad: estadisticasJugador.total.velocidad,
        probCritico: estadisticasJugador.total.probCritico,
      },
      expedicion.efectoComida
    );

    const posicionJugador = normalizarPosicionCombate(personaje.posicionCombate);
    const atributosDeCombate = aplicarModificadoresPosicion({
      ataque: atributosConComida.ataque,
      ataqueMagico: atributosConComida.ataqueMagico,
      defensa: atributosConComida.defensa,
      defensaMagica: estadisticasJugador.total.defensaMagica ?? atributosConComida.defensa,
    }, posicionJugador);

    const jugadorAtaque = atributosDeCombate.ataque;
    const jugadorAtaqueMagico = atributosDeCombate.ataqueMagico ?? atributosConComida.ataqueMagico;

    const jugadorDefensa = atributosDeCombate.defensa;
    const jugadorDefensaMagica = atributosDeCombate.defensaMagica ?? jugadorDefensa;

    const jugadorVelocidad = atributosConComida.velocidad;

    const jugadorNivel = personaje.nivel;

    const jugadorProbCritico = atributosConComida.probCritico;
    const jugadorPrecision = estadisticasJugador.total.precision ?? 75;
    const jugadorEvasion = estadisticasJugador.total.evasion ?? 0;

    const jugadorDanoCritico = estadisticasJugador.total.danoCritico;

    const velocidadEnemigoMasRapido = Math.max(...enemigosEnCombate.map((enemigo) => enemigo.velocidad));
    const primerTurno =
      comidaOtorgaIniciativa(expedicion.efectoComida) ||
      jugadorVelocidad >= velocidadEnemigoMasRapido
        ? "jugador"
        : "enemigo";

    const comidaActiva = obtenerComidaTaberna(expedicion.efectoComida);
    const nombresEnemigos = enemigosEnCombate.map((enemigo) => enemigo.nombre);
    const resumenEnemigos = nombresEnemigos.length === 1
      ? nombresEnemigos[0]
      : nombresEnemigos.length === 2
        ? nombresEnemigos.join(" y ")
        : nombresEnemigos.slice(0, -1).join(", ") + " y " + nombresEnemigos[nombresEnemigos.length - 1];
    const mensajeInicioCombate =
      primerTurno === "jugador"
        ? `⚔️ Te enfrentas a ${resumenEnemigos} (${enemigosEnCombate.length} ${enemigosEnCombate.length === 1 ? "enemigo" : "enemigos"}, amenaza ${expedicion.dificultad}, modo ${modoDificultad}). ${usuario.personaje.nombre} tiene la iniciativa.`
        : `⚔️ Te enfrentas a ${resumenEnemigos} (${enemigosEnCombate.length} ${enemigosEnCombate.length === 1 ? "enemigo" : "enemigos"}, amenaza ${expedicion.dificultad}, modo ${modoDificultad}). ${resumenEnemigos} tiene la iniciativa.`;
    const logInicial = [
      ...(comidaActiva
        ? [`🍲 ${comidaActiva.nombre}: ${comidaActiva.descripcion}`]
        : []),
      `📍 Posición táctica: ${posicionJugador === "mele" ? "Melé" : posicionJugador === "retaguardia" ? "Retaguardia" : "Centro"}.`,
      mensajeInicioCombate,
    ];

    // ============================================================
    // CREAR COMBATE PvE
    // ============================================================

    const combate = await prisma.$transaction(async (tx) => {
      const nuevoCombate = await tx.combateActivo.create({
        data: {
          expedicionId: expedicion.id,

          fase: "activo",
          ronda: 1,
          turno: primerTurno,
          jugadorPosicion: posicionJugador,
          enemigoPosicion: "centro",

          enemigoId: monstruoBase.id,

          enemigoNombre: monstruoBase.nombre,

          enemigoHp,
          enemigoHpMaximo: enemigoHp,

          enemigoAtaque,
          enemigoAtaqueMagico,
          enemigoDefensa,
          enemigoDefensaMagica,
          enemigoVelocidad,
          enemigoProbCritico,
          enemigoDanoCritico,
          enemigoPrecision,
          enemigoEvasion,
          enemigoNivel,
          enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,

          jugadorHp,
          jugadorHpMaximo: jugadorHpMaximo,

          jugadorAtaque,
          jugadorAtaqueMagico,
          jugadorDefensa,
          jugadorDefensaMagica,
          jugadorVelocidad,
          jugadorProbCritico,
          jugadorDanoCritico,
          jugadorPrecision,
          jugadorEvasion,
          jugadorNivel,

          oroGanado: 0,
          experienciaGanada: 0,

          cooldowns: {},
          efectos: [],

          log: logInicial,
        },
      });

      await tx.expedicionActiva.update({
        where: {
          id: expedicion.id,
        },

        data: {
          fase: "combatiendo",
        },
      });

      return nuevoCombate;
    });

    const usuarioActualizado = await prisma.usuario.findUnique({
      where: {
        id: usuario.id,
      },

      include: {
        personaje: {
          include: {
            habilidades: true,

            inventario: {
              include: {
                objetos: true,
              },
            },

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
          },
        },

        expedicionActiva: {
          include: {
            combateActivo: true,
          },
        },
      },
    });

    const datosUsuario = usuarioActualizado
      ? Object.fromEntries(
          Object.entries(usuarioActualizado).filter(
            ([clave]) => clave !== "password"
          )
        )
      : null;

    console.log(
      `${usuario.personaje.nombre}(lvl ${
        usuario.personaje.nivel
      }) combate con ${monstruoBase.nombre} nivel ${
        dificultad + personaje.nivel
      } de dificultad ${dificultad}`
    );

    return NextResponse.json({
      exito: true,
      combate,
      usuario: datosUsuario,
    });
  } catch (error) {
    console.error("Error al iniciar el combate de la expedición:", error);

    return NextResponse.json(
      {
        error: "No se pudo iniciar el combate.",
      },
      { status: 500 }
    );
  }
}
