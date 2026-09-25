import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TipoMision } from "@/lib/tiposJuego";

import { seleccionarEnemigoNormal } from "@/lib/expediciones/normal";
import { seleccionarJefeElite } from "@/lib/expediciones/elite";
import {
  calcularBonificacionMuralla,
  determinarPrimerTurnoAsedio,
} from "@/lib/expediciones/asedio";
import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
} from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";

export async function POST() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: {
          include: {
            habilidades: true,
            equipoEquipado: {
              include: {
                arma: true,
                armadura: true,
                accesorio: true,
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

    const expedicion = usuario.expedicionActiva;

    if (!expedicion) {
      return NextResponse.json(
        { error: "No tienes ninguna expedición activa." },
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
      if (!expedicion.objetivoId) {
        return NextResponse.json(
          {
            error: "El asedio no tiene un gremio objetivo.",
          },
          { status: 400 }
        );
      }

      const defensor = await prisma.usuario.findUnique({
        where: {
          id: expedicion.objetivoId,
        },
        include: {
          personaje: {
            include: {
              habilidades: true,
              equipoEquipado: {
                include: {
                  arma: true,
                  armadura: true,
                  accesorio: true,
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

      if (!defensor?.personaje) {
        return NextResponse.json(
          {
            error: "El gremio defensor ya no tiene un personaje disponible.",
          },
          { status: 404 }
        );
      }

      // No permitimos que un personaje participe en dos combates simultáneos.
      const combateDefensor = await prisma.combateActivo.findFirst({
        where: {
          tipo: "pvp",
          defensorUsuarioId: defensor.id,
          fase: "activo",
        },
      });

      if (
        combateDefensor ||
        defensor.expedicionActiva?.combateActivo ||
        defensor.personaje.estado === "combatiendo"
      ) {
        return NextResponse.json(
          {
            error:
              "El personaje defensor ya se encuentra participando en un combate.",
          },
          { status: 409 }
        );
      }

      // ============================================================
      // ESTADÍSTICAS DEL ATACANTE
      // ============================================================

      const personajeAtacante = personaje;

      const equipoAtacante = obtenerEquipoDesdePersonaje(personaje);
      const modificadoresEquipoAtacante =
        calcularModificadoresEquipo(equipoAtacante);

      const estadisticasAtacante = calcularEstadisticasPersonaje(
        personaje,
        personaje.habilidades.map((habilidad) => habilidad.habilidadId),
        modificadoresEquipoAtacante
      );

      // ============================================================
      // ESTADÍSTICAS DEL DEFENSOR
      // ============================================================

      const personajeDefensor = defensor.personaje;

      const equipoDefensor = obtenerEquipoDesdePersonaje(personajeDefensor);

      const modificadoresEquipoDefensor =
        calcularModificadoresEquipo(equipoDefensor);

      const estadisticasDefensor = calcularEstadisticasPersonaje(
        personajeDefensor,
        personajeDefensor.habilidades.map((habilidad) => habilidad.habilidadId),
        modificadoresEquipoDefensor
      );

      // ============================================================
      // EDIFICIOS DEFENSIVOS
      // ============================================================

      const edificiosDefensor = defensor.edificios as Record<
        string,
        unknown
      > | null;

      const nivelMuralla =
        typeof edificiosDefensor?.muralla === "number"
          ? Math.max(0, Math.trunc(edificiosDefensor.muralla))
          : 0;

      const nivelAlmacen =
        typeof edificiosDefensor?.almacen === "number"
          ? Math.max(0, Math.trunc(edificiosDefensor.almacen))
          : 0;

      /*
       * La Muralla se congela al comenzar el combate.
       * Cualquier mejora posterior no afecta a este asedio.
       */
      const bonificacionMuralla = calcularBonificacionMuralla(nivelMuralla);

      const jugadorHpMaximo = estadisticasAtacante.total.hpMaximo;

      const jugadorHp = jugadorHpMaximo;

      const jugadorAtaque = estadisticasAtacante.total.ataque;

      const jugadorDefensa = estadisticasAtacante.total.defensa;

      const jugadorVelocidad = estadisticasAtacante.total.velocidad;

      const jugadorNivel = personaje.nivel;

      const jugadorProbCritico = estadisticasAtacante.total.probCritico;

      const jugadorDanoCritico = estadisticasAtacante.total.danoCritico;

      const enemigoHpMaximo = estadisticasDefensor.total.hpMaximo;

      const enemigoHp = enemigoHpMaximo;

      const enemigoAtaque = estadisticasDefensor.total.ataque;

      const enemigoDefensa =
        estadisticasDefensor.total.defensa + bonificacionMuralla;

      const enemigoVelocidad = estadisticasDefensor.total.velocidad;

      const enemigoNivel = personajeDefensor.nivel;

      const enemigoProbCritico = estadisticasDefensor.total.probCritico;

      const enemigoDanoCritico = estadisticasDefensor.total.danoCritico;

      // ============================================================
      // INICIATIVA
      // ============================================================

      const primerTurno = determinarPrimerTurnoAsedio({
        velocidadAtacante: jugadorVelocidad,
        velocidadDefensor: enemigoVelocidad,
      });

      const logInicial =
        primerTurno === "atacante"
          ? [`⚔️ ${personaje.nombre} tiene la iniciativa y comienza el asedio.`]
          : [
              `⚔️ ${personajeDefensor.nombre} tiene la iniciativa y defiende el gremio.`,
            ];

      // ============================================================
      // CREAR COMBATE PvP
      // ============================================================

      const combate = await prisma.$transaction(async (tx) => {
        const nuevoCombate = await tx.combateActivo.create({
          data: {
            expedicionId: expedicion.id,

            fase: "activo",
            ronda: 1,
            turno: primerTurno,
            ultimoTurnoEn: new Date(),

            tipo: "pvp",

            atacanteUsuarioId: usuario.id,
            defensorUsuarioId: defensor.id,
            enemigoUsuarioId: defensor.id,

            atacanteNombre: usuario.nombre,
            defensorNombre: defensor.nombre,

            atacanteClase: personajeAtacante.clase,
            atacanteSexo: personajeAtacante.sexo,

            defensorClase: personajeDefensor.clase,
            defensorSexo: personajeDefensor.sexo,

            estadoDefensorAnterior: personajeDefensor.estado,

            murallaNivel: nivelMuralla,
            almacenNivel: nivelAlmacen,

            enemigoId: null,
            enemigoNombre: personajeDefensor.nombre,

            enemigoHp,
            enemigoHpMaximo: enemigoHpMaximo,
            enemigoAtaque,
            enemigoDefensa,
            enemigoVelocidad,
            enemigoProbCritico,
            enemigoDanoCritico,
            enemigoNivel,

            jugadorHp,
            jugadorHpMaximo,
            jugadorAtaque,
            jugadorDefensa,
            jugadorVelocidad,
            jugadorProbCritico,
            jugadorDanoCritico,
            jugadorNivel,

            ganadorUsuarioId: null,
            botinResuelto: false,

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

        await tx.personaje.update({
          where: {
            id: personajeDefensor.id,
          },
          data: {
            estado: "combatiendo",
          },
        });

        return nuevoCombate;
      });

      return NextResponse.json({
        exito: true,
        tipo: "asedio",
        combate,
      });
    }

    // ============================================================
    // SELECCIONAR ENEMIGO
    // ============================================================

    const tipoMision = expedicion.tipo as TipoMision;

    let monstruoBase;
    let rarezaMonstruo = "legendario";

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
      } else if (tipoMision === "normal") {
        monstruoBase = seleccionarEnemigoNormal(expedicion.dificultad);
        rarezaMonstruo = monstruoBase.rareza ?? "comun";
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
    // ESTADÍSTICAS
    // ============================================================

    const dificultad = Math.max(0, expedicion.dificultad);

    const equipo = obtenerEquipoDesdePersonaje(personaje);
    const modificadoresEquipo = calcularModificadoresEquipo(equipo);
    const estadisticasJugador = calcularEstadisticasPersonaje(
      personaje,
      personaje.habilidades.map((habilidad) => habilidad.habilidadId),
      modificadoresEquipo
    );

    const variacionStats = () => Math.random() * 0.5 - 0.25;
    const multiplicadorStatPorRareza = (rareza: string) => {
      switch (rareza) {
        case "comun":
          return 0.4;
        case "poco_comun":
          return 0.3;
        case "raro":
          return 0.2;
        case "epico":
        case "legendario":
        default:
          return 0.1;
      }
    };

    const enemigoNombre = monstruoBase.nombre;

    const multiplicadorEscalado =
      1 +
      (dificultad + personaje.nivel) *
        multiplicadorStatPorRareza(rarezaMonstruo);

    const enemigoHp = Math.floor(
      monstruoBase.hp * multiplicadorEscalado * 0.75 * (1 - variacionStats())
    );

    const enemigoAtaque = Math.floor(
      monstruoBase.ataque * multiplicadorEscalado * 0.5 * (1 - variacionStats())
    );

    const enemigoDefensa = Math.floor(
      monstruoBase.defensa *
        multiplicadorEscalado *
        0.5 *
        (1 - variacionStats())
    );

    const enemigoVelocidad = Math.floor(
      monstruoBase.velocidad *
        multiplicadorEscalado *
        0.25 *
        (1 - variacionStats())
    );
    const enemigoProbCritico = /*monstruoBase.probCritico ??*/ 0.1;
    const enemigoDanoCritico = /*monstruoBase.danoCritico ??*/ 2;

    const enemigoNivel = /*monstruoBase.nivel ??*/ 1;

    const jugadorHpMaximo = estadisticasJugador.total.hpMaximo;
    const jugadorHp = Math.min(
      Math.max(1, personaje.hpActual),
      jugadorHpMaximo
    );
    const jugadorAtaque = estadisticasJugador.total.ataque;
    const jugadorDefensa = estadisticasJugador.total.defensa;
    const jugadorVelocidad = estadisticasJugador.total.velocidad;
    const jugadorNivel = personaje.nivel;
    const jugadorProbCritico = estadisticasJugador.total.probCritico;
    const jugadorDanoCritico = estadisticasJugador.total.danoCritico;

    const primerTurno =
      jugadorVelocidad >= enemigoVelocidad ? "jugador" : "enemigo";
    const logInicial =
      primerTurno === "jugador"
        ? [
            `⚔️ Has encontrado un ${enemigoNombre} de nivel ${expedicion.dificultad}. ${usuario.personaje.nombre} tiene la iniciativa.`,
          ]
        : [
            `⚔️ Has encontrado un ${enemigoNombre} de nivel ${expedicion.dificultad}.${enemigoNombre} tiene la iniciativa.`,
          ];

    // ============================================================
    // CREAR COMBATE
    // ============================================================

    const combate = await prisma.$transaction(async (tx) => {
      const nuevoCombate = await tx.combateActivo.create({
        data: {
          expedicionId: expedicion.id,

          fase: "activo",
          ronda: 1,
          turno: primerTurno,

          enemigoId: monstruoBase.id,
          enemigoNombre: monstruoBase.nombre,

          enemigoHp,
          enemigoHpMaximo: enemigoHp,
          enemigoAtaque,
          enemigoDefensa,
          enemigoVelocidad,
          enemigoProbCritico,
          enemigoDanoCritico,
          enemigoNivel,

          jugadorHp,
          jugadorHpMaximo: jugadorHpMaximo,
          jugadorAtaque,
          jugadorDefensa,
          jugadorVelocidad,
          jugadorProbCritico,
          jugadorDanoCritico,
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
      { error: "No se pudo iniciar el combate." },
      { status: 500 }
    );
  }
}
