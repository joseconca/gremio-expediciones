import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TipoMision } from "@/lib/tiposJuego";

import { seleccionarEnemigoNormal } from "@/lib/expediciones/normal";
import { seleccionarJefeElite } from "@/lib/expediciones/elite";

export async function POST() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
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
    // SELECCIONAR ENEMIGO
    // ============================================================

    const tipoMision = expedicion.tipo as TipoMision;

    let monstruoBase;

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

    const enemigoNombre = monstruoBase.nombre;
    const enemigoHp = Math.floor(monstruoBase.hp * (1 + dificultad * 0.3));
    const enemigoAtaque = monstruoBase.ataque + Math.floor(dificultad * 1.2);
    const enemigoDefensa = monstruoBase.defensa + Math.floor(dificultad * 0.8);
    const enemigoVelocidad =
      monstruoBase.velocidad + Math.floor(dificultad * 0.5);

    const jugadorHp = Math.max(1, personaje.hpActual);
    const jugadorAtaque = personaje.ataque;
    const jugadorDefensa = personaje.defensa;
    const jugadorVelocidad = personaje.velocidad;
    const jugadorNivel = personaje.nivel;

    const primerTurno =
      jugadorVelocidad >= enemigoVelocidad ? "jugador" : "enemigo";
    const logInicial =
      primerTurno === "jugador"
        ? [`⚔️ ${usuario.personaje.nombre} tiene la iniciativa.`]
        : [`⚔️ ${enemigoNombre} tiene la iniciativa.`];
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

          jugadorHp,
          jugadorHpMaximo: personaje.hpMaximo,
          jugadorAtaque,
          jugadorDefensa,
          jugadorVelocidad,
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
        personaje: true,
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
