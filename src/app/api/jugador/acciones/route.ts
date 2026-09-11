import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarRegeneracion } from "@/lib/regeneracion";
import {
  CONFIGURACION_ATRIBUTOS,
  CONFIGURACION_EDIFICIOS,
  ESTADISTICAS_BASE_CLASE,
  calcularCosteAtributo,
  calcularCosteEdificio,
} from "@/lib/configuracionJuego";
import type {
  IdAtributo,
  IdEdificio,
  ClasePersonaje,
} from "@/lib/configuracionJuego";

const CLASES = new Set(["Guerrero", "Explorador", "Comerciante"]);
const SEXOS = new Set(["chico", "chica"]);

const includeGameData = { personaje: true, expedicionActiva: true } as const;

function respuestaUsuario(usuario: {
  password: string;
  [key: string]: unknown;
}) {
  return Object.fromEntries(
    Object.entries(usuario).filter(([clave]) => clave !== "password")
  );
}

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();
    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body = await request.json();
    const accion = body?.accion;

    if (accion === "establecerBase") {
      const { lat, lng } = body.coords || {};
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return NextResponse.json(
          { error: "Coordenadas inválidas." },
          { status: 400 }
        );
      }
      const usuario = await prisma.usuario.update({
        where: { id: usuarioSesion.id },
        data: { baseCoords: { lat, lng } },
        include: includeGameData,
      });
      return NextResponse.json(respuestaUsuario(usuario));
    }

    if (accion === "reclutar") {
      const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
      const clase = typeof body.clase === "string" ? body.clase : "";
      const sexo = typeof body.sexo === "string" ? body.sexo : "";
      if (nombre.length < 3 || !CLASES.has(clase) || !SEXOS.has(sexo)) {
        return NextResponse.json(
          { error: "Personaje inválido." },
          { status: 400 }
        );
      }
      const personajeExistente = await prisma.personaje.findUnique({
        where: { usuarioId: usuarioSesion.id },
        select: { id: true },
      });
      if (personajeExistente) {
        return NextResponse.json(
          { error: "Ya tienes un personaje reclutado." },
          { status: 409 }
        );
      }
      const estadisticas = ESTADISTICAS_BASE_CLASE[clase as ClasePersonaje];
      const usuario = await prisma.usuario.update({
        where: { id: usuarioSesion.id },
        data: {
          personaje: {
            upsert: {
              create: {
                nombre,
                clase,
                sexo,
                hpActual: 100,
                hpMaximo: 100,
                estado: "ocioso",
                ...estadisticas,
                regeneracionDeVida: 1,
                nivel: 1,
                experiencia: 0,
              },
              update: { nombre, clase, sexo },
            },
          },
        },
        include: includeGameData,
      });
      return NextResponse.json(respuestaUsuario(usuario));
    }

    if (accion === "curar") {
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioSesion.id },
        include: { personaje: true, expedicionActiva: true },
      });
      if (!usuario?.personaje) {
        return NextResponse.json(
          { error: "Necesitas un personaje." },
          { status: 400 }
        );
      }
      if (usuario.expedicionActiva || usuario.personaje.estado === "de_viaje") {
        return NextResponse.json(
          { error: "No puedes curar a un aventurero que está de expedición." },
          { status: 409 }
        );
      }
      usuario.personaje = await sincronizarRegeneracion(usuario.personaje);
      if (usuario.personaje.hpActual >= usuario.personaje.hpMaximo) {
        return NextResponse.json(
          { error: "El personaje ya está completamente sano." },
          { status: 400 }
        );
      }
      const edificios = usuario.edificios as Record<string, unknown> | null;
      const nivelTaberna =
        typeof edificios?.taberna === "number" ? edificios.taberna : 1;
      const curaPorOro = 2 * (1 + (nivelTaberna - 1) * 0.1);
      const hpFaltante =
        usuario.personaje.hpMaximo - usuario.personaje.hpActual;
      const coste = Math.min(usuario.oro, Math.ceil(hpFaltante / curaPorOro));
      const hpCurado = Math.min(hpFaltante, Math.floor(coste * curaPorOro));
      if (coste <= 0 || hpCurado <= 0)
        return NextResponse.json(
          { error: "No tienes oro suficiente." },
          { status: 400 }
        );
      const actualizado = await prisma.$transaction(async (tx) => {
        await tx.personaje.update({
          where: { usuarioId: usuario.id },
          data: {
            hpActual: usuario.personaje!.hpActual + hpCurado,
            estado: "ocioso",
          },
        });
        return tx.usuario.update({
          where: { id: usuario.id },
          data: { oro: { decrement: coste } },
          include: includeGameData,
        });
      });
      return NextResponse.json(respuestaUsuario(actualizado));
    }

    if (accion === "mejorarAtributo") {
      const atributoValue: unknown = body.atributo;

      if (
        typeof atributoValue !== "string" ||
        !(atributoValue in CONFIGURACION_ATRIBUTOS)
      ) {
        return NextResponse.json(
          { error: "Atributo inválido." },
          { status: 400 }
        );
      }

      const atributo = atributoValue as IdAtributo;

      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioSesion.id },
        include: { personaje: true },
      });

      if (!usuario?.personaje) {
        return NextResponse.json(
          { error: "Necesitas un personaje." },
          { status: 400 }
        );
      }

      const valorActual = usuario.personaje[atributo];

      if (typeof valorActual !== "number") {
        return NextResponse.json(
          { error: "Atributo inválido." },
          { status: 400 }
        );
      }

      const configuracionAtributo = CONFIGURACION_ATRIBUTOS[atributo];

      const edificios = usuario.edificios as Record<string, unknown> | null;

      const nivelEdificioValue = edificios?.[configuracionAtributo.edificio];

      const nivelEdificio =
        typeof nivelEdificioValue === "number" ? nivelEdificioValue : 0;

      const maximo = nivelEdificio * configuracionAtributo.limitePorNivel;

      if (nivelEdificio === 0 || valorActual >= maximo) {
        return NextResponse.json(
          { error: "El atributo ya alcanzó el límite actual." },
          { status: 400 }
        );
      }

      const coste = calcularCosteAtributo(atributo, valorActual);

      if (usuario.oro < coste) {
        return NextResponse.json(
          { error: "No tienes oro suficiente." },
          { status: 400 }
        );
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        await tx.personaje.update({
          where: { usuarioId: usuario.id },
          data: {
            [atributo]: {
              increment: 1,
            },
          },
        });

        return tx.usuario.update({
          where: { id: usuario.id },
          data: {
            oro: {
              decrement: coste,
            },
          },
          include: includeGameData,
        });
      });

      return NextResponse.json(respuestaUsuario(actualizado));
    }

    if (accion === "mejorarEdificio") {
      const idEdificioValue: unknown = body.idEdificio;

      if (
        typeof idEdificioValue !== "string" ||
        !(idEdificioValue in CONFIGURACION_EDIFICIOS)
      ) {
        return NextResponse.json(
          { error: "Edificio inválido." },
          { status: 400 }
        );
      }

      const idEdificio = idEdificioValue as IdEdificio;
      const configuracion = CONFIGURACION_EDIFICIOS[idEdificio];

      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioSesion.id },
        include: includeGameData,
      });

      if (!usuario) {
        return NextResponse.json(
          { error: "Usuario no encontrado." },
          { status: 404 }
        );
      }

      const edificios = usuario.edificios as
        | Record<string, unknown>
        | undefined;

      const nivel =
        typeof edificios?.[idEdificio] === "number" ? edificios[idEdificio] : 0;

      if (nivel >= configuracion.nivelMax) {
        return NextResponse.json(
          { error: "El edificio ya está al nivel máximo." },
          { status: 400 }
        );
      }

      const coste = calcularCosteEdificio(idEdificio, nivel);

      if (usuario.oro < coste) {
        return NextResponse.json(
          { error: "No tienes oro suficiente." },
          { status: 400 }
        );
      }

      const edificiosActualizados: Prisma.InputJsonObject = {
        ...(edificios as Prisma.InputJsonObject | undefined),
        [idEdificio]: nivel + 1,
      };

      const actualizado = await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          oro: {
            decrement: coste,
          },
          edificios: edificiosActualizados,
        },
        include: includeGameData,
      });

      return NextResponse.json(respuestaUsuario(actualizado));
    }

    return NextResponse.json(
      { error: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en acción de jugador:", error);
    return NextResponse.json(
      { error: "No se pudo completar la acción." },
      { status: 500 }
    );
  }
}
