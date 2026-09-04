import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONFIGURACION_EDIFICIOS, IdEdificio } from "@/lib/configuracionJuego";

const CLASES = new Set(["Guerrero", "Explorador", "Comerciante"]);
const SEXOS = new Set(["chico", "chica"]);
const ATRIBUTOS = new Set([
  "ataque",
  "defensa",
  "velocidad",
  "capacidadCarruaje",
]);
const EDIFICIOS = CONFIGURACION_EDIFICIOS;

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
      if (typeof lat !== "number" || typeof lng !== "number" || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ error: "Coordenadas inválidas." }, { status: 400 });
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
        return NextResponse.json({ error: "Personaje inválido." }, { status: 400 });
      }
      const personajeExistente = await prisma.personaje.findUnique({
        where: { usuarioId: usuarioSesion.id },
        select: { id: true },
      });
      if (personajeExistente) {
        return NextResponse.json({ error: "Ya tienes un personaje reclutado." }, { status: 409 });
      }
      const usuario = await prisma.usuario.update({
        where: { id: usuarioSesion.id },
        data: {
          personaje: {
            upsert: {
              create: { nombre, clase, sexo, hpActual: 100, hpMaximo: 100, estado: "ocioso", ataque: 5, defensa: 5, velocidad: 1, capacidadCarruaje: 1, regeneracionDeVida: 1, nivel: 1, experiencia: 0 },
              update: { nombre, clase, sexo },
            },
          },
        },
        include: includeGameData,
      });
      return NextResponse.json(respuestaUsuario(usuario));
    }

    if (accion === "curar") {
      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioSesion.id }, include: { personaje: true } });
      if (!usuario?.personaje || usuario.personaje.hpActual >= usuario.personaje.hpMaximo) {
        return NextResponse.json({ error: "El personaje ya está completamente sano." }, { status: 400 });
      }
      const edificios = usuario.edificios as Record<string, unknown> | null;
      const nivelTaberna = typeof edificios?.taberna === "number" ? edificios.taberna : 1;
      const curaPorOro = 2 * (1 + (nivelTaberna - 1) * 0.1);
      const hpFaltante = usuario.personaje.hpMaximo - usuario.personaje.hpActual;
      const coste = Math.min(usuario.oro, Math.ceil(hpFaltante / curaPorOro));
      const hpCurado = Math.min(hpFaltante, Math.floor(coste * curaPorOro));
      if (coste <= 0 || hpCurado <= 0) return NextResponse.json({ error: "No tienes oro suficiente." }, { status: 400 });
      const actualizado = await prisma.$transaction(async (tx) => {
        await tx.personaje.update({ where: { usuarioId: usuario.id }, data: { hpActual: usuario.personaje!.hpActual + hpCurado, estado: "ocioso" } });
        return tx.usuario.update({ where: { id: usuario.id }, data: { oro: { decrement: coste } }, include: includeGameData });
      });
      return NextResponse.json(respuestaUsuario(actualizado));
    }

    if (accion === "mejorarAtributo") {
      const atributo = body.atributo;
      if (!ATRIBUTOS.has(atributo)) return NextResponse.json({ error: "Atributo inválido." }, { status: 400 });
      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioSesion.id }, include: { personaje: true } });
      if (!usuario?.personaje) return NextResponse.json({ error: "Necesitas un personaje." }, { status: 400 });
      const valorActual = usuario.personaje[atributo as keyof typeof usuario.personaje];
      if (typeof valorActual !== "number") return NextResponse.json({ error: "Atributo inválido." }, { status: 400 });
      const edificios = usuario.edificios as Record<string, unknown> | null;
      const edificioNecesario = atributo === "ataque" || atributo === "defensa" ? "herreria" : "mercado";
      const nivelEdificio = typeof edificios?.[edificioNecesario] === "number" ? edificios[edificioNecesario] as number : 0;
      const maximo = nivelEdificio * (edificioNecesario === "herreria" ? 10 : 5);
      if (nivelEdificio === 0 || valorActual >= maximo) return NextResponse.json({ error: "El atributo ya alcanzó el límite actual." }, { status: 400 });
      const coste = atributo === "capacidadCarruaje" ? valorActual * 100 : valorActual * (atributo === "velocidad" ? 15 : 20);
      if (usuario.oro < coste) return NextResponse.json({ error: "No tienes oro suficiente." }, { status: 400 });
      const actualizado = await prisma.$transaction(async (tx) => {
        await tx.personaje.update({ where: { usuarioId: usuario.id }, data: { [atributo]: { increment: 1 } } });
        return tx.usuario.update({ where: { id: usuario.id }, data: { oro: { decrement: coste } }, include: includeGameData });
      });
      return NextResponse.json(respuestaUsuario(actualizado));
    }

    if (accion === "mejorarEdificio") {
      const idEdificioValue: unknown = body.idEdificio;
      if (typeof idEdificioValue !== "string" || !(idEdificioValue in EDIFICIOS)) {
        return NextResponse.json({ error: "Edificio inválido." }, { status: 400 });
      }
      const idEdificio = idEdificioValue as IdEdificio;
      const configuracion = EDIFICIOS[idEdificio];
      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioSesion.id }, include: includeGameData });
      const edificios = usuario?.edificios as Record<string, unknown> | undefined;
      const nivel = typeof edificios?.[idEdificio] === "number" ? edificios[idEdificio] as number : 0;
      const coste = nivel === 0 ? configuracion.costeConstruccion : configuracion.costeNivel2;
      if (!usuario || nivel >= configuracion.nivelMax || usuario.oro < coste) return NextResponse.json({ error: "No se puede mejorar el edificio." }, { status: 400 });
      const edificiosActualizados: Prisma.InputJsonObject = {
        ...(edificios as Prisma.InputJsonObject | undefined),
        [idEdificio]: nivel + 1,
      };
      const actualizado = await prisma.usuario.update({ where: { id: usuario.id }, data: { oro: { decrement: coste }, edificios: edificiosActualizados }, include: includeGameData });
      return NextResponse.json(respuestaUsuario(actualizado));
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    console.error("Error en acción de jugador:", error);
    return NextResponse.json({ error: "No se pudo completar la acción." }, { status: 500 });
  }
}