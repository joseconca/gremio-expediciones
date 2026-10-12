import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarRegeneracion } from "@/lib/regeneracion";
import {
  CONFIGURACION_ATRIBUTOS,
  REQUISITOS_EDIFICIOS,
  calcularCosteAtributo,
  calcularCosteEdificio,
  calcularEstadisticasBase,
} from "@/lib/configuracionJuego";
import type { IdAtributo } from "@/lib/configuracionJuego";
import { type ClasePersonaje } from "@/lib/tiposJuego";
import { CONFIGURACION_EDIFICIOS, IdEdificio } from "@/lib/tiposJuego";
import { calcularEstadisticasPersonaje } from "@/lib/estadisticasPersonaje";
import { asegurarInventarioYEquipo } from "@/lib/inventario";

const CLASES = new Set(["Guerrero", "Explorador", "Comerciante"]);
const SEXOS = new Set(["chico", "chica"]);

const includeGameData = {
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
  expedicionActiva: true,
} as const;

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
      const clasePersonaje = clase as ClasePersonaje;
      const estadisticasBase = calcularEstadisticasBase(clasePersonaje, 1);

      const usuario = await prisma.$transaction(async (tx) => {
        const usuarioActualizado = await tx.usuario.update({
          where: { id: usuarioSesion.id },
          data: {
            personaje: {
              upsert: {
                create: {
                  nombre,
                  clase,
                  sexo,
                  estado: "ocioso",

                  hpActual: Math.floor(estadisticasBase.hpMaximo),

                  velocidadMejoras: 0,
                  capacidadCarruajeMejoras: 0,

                  regeneracionDeVida: 0.3,

                  nivel: 1,
                  experiencia: 0,
                },
                update: { nombre, clase, sexo },
              },
            },
          },
          include: includeGameData,
        });

        if (!usuarioActualizado.personaje) {
          throw new Error("No se pudo crear el personaje.");
        }

        await asegurarInventarioYEquipo(tx, usuarioActualizado.personaje.id);
        return tx.usuario.findUniqueOrThrow({
          where: { id: usuarioActualizado.id },
          include: includeGameData,
        });
      });

      return NextResponse.json(respuestaUsuario(usuario));
    }

    if (accion === "curar") {
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioSesion.id },
        include: {
          personaje: { include: { habilidades: true } },
          expedicionActiva: true,
        },
      });

      if (!usuario?.personaje) {
        return NextResponse.json({ error: "Necesitas un personaje." }, { status: 400 });
      }
      if (usuario.expedicionActiva || usuario.personaje.estado === "de_viaje") {
        return NextResponse.json(
          { error: "No puedes curar a un aventurero que está de expedición." },
          { status: 409 }
        );
      }

      const personaje = await sincronizarRegeneracion(usuario.personaje);
      const estadisticas = calcularEstadisticasPersonaje(
        personaje,
        personaje.habilidades?.map((habilidad) => habilidad.habilidadId) ?? []
      );
      const hpMaximo = estadisticas.total.hpMaximo;

      if (personaje.hpActual >= hpMaximo) {
        return NextResponse.json(
          { error: "El personaje ya está completamente sano." },
          { status: 400 }
        );
      }

      const edificios = usuario.edificios as Record<string, unknown> | null;
      const nivelTaberna =
        typeof edificios?.taberna === "number" ? edificios.taberna : 1;
      const curaPorOro = 2 * (1 + (nivelTaberna - 1) * 0.1);
      const hpFaltante = hpMaximo - personaje.hpActual;
      const coste = Math.min(usuario.oro, Math.ceil(hpFaltante / curaPorOro));
      const hpCurado = Math.min(hpFaltante, Math.floor(coste * curaPorOro));

      if (coste <= 0 || hpCurado <= 0) {
        return NextResponse.json(
          { error: "No tienes oro suficiente." },
          { status: 400 }
        );
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        const expedicion = await tx.expedicionActiva.findUnique({
          where: { usuarioId: usuario.id },
          select: { id: true },
        });
        if (expedicion) throw new Error("EXPEDICION_ACTIVA");

        const personajeActualizado = await tx.personaje.updateMany({
          where: {
            usuarioId: usuario.id,
            hpActual: personaje.hpActual,
            estado: { not: "de_viaje" },
          },
          data: { hpActual: { increment: hpCurado }, estado: "ocioso" },
        });
        if (personajeActualizado.count !== 1) {
          throw new Error("PERSONAJE_CAMBIO");
        }

        const oroActualizado = await tx.usuario.updateMany({
          where: { id: usuario.id, oro: { gte: coste } },
          data: { oro: { decrement: coste } },
        });
        if (oroActualizado.count !== 1) throw new Error("ORO_INSUFICIENTE");

        return tx.usuario.findUniqueOrThrow({
          where: { id: usuario.id },
          include: includeGameData,
        });
      });

      return NextResponse.json(respuestaUsuario(actualizado));
    }

    if (accion === "mejorarAtributo") {
      const atributoValue: unknown = body.atributo;
      if (
        typeof atributoValue !== "string" ||
        !Object.prototype.hasOwnProperty.call(CONFIGURACION_ATRIBUTOS, atributoValue)
      ) {
        return NextResponse.json({ error: "Atributo inválido." }, { status: 400 });
      }

      const atributo = atributoValue as IdAtributo;
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioSesion.id },
        include: { personaje: true },
      });
      if (!usuario?.personaje) {
        return NextResponse.json({ error: "Necesitas un personaje." }, { status: 400 });
      }

      const configuracionAtributo = CONFIGURACION_ATRIBUTOS[atributo];
      const campoMejora = configuracionAtributo.campo;
      const valorActual = usuario.personaje[campoMejora];
      if (typeof valorActual !== "number") {
        return NextResponse.json({ error: "Atributo inválido." }, { status: 400 });
      }

      const edificios = usuario.edificios as Record<string, unknown> | null;
      const nivelEdificioValue = edificios?.[configuracionAtributo.edificio];
      const nivelEdificio =
        typeof nivelEdificioValue === "number" ? nivelEdificioValue : 0;
      const maximo = nivelEdificio * configuracionAtributo.limitePorNivel;

      if (nivelEdificio <= 0 || valorActual >= maximo) {
        return NextResponse.json(
          { error: "El atributo ya alcanzó el límite actual." },
          { status: 400 }
        );
      }

      const coste = calcularCosteAtributo(atributo, valorActual);
      if (usuario.oro < coste) {
        return NextResponse.json({ error: "No tienes oro suficiente." }, { status: 400 });
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        // El valor previo evita que dos peticiones simultáneas compren el mismo
        // incremento y que se supere el límite calculado desde un estado obsoleto.
        const atributoActualizado = await tx.personaje.updateMany({
          where: {
            usuarioId: usuario.id,
            [campoMejora]: valorActual,
          },
          data: { [campoMejora]: { increment: 1 } },
        });
        if (atributoActualizado.count !== 1) throw new Error("ATRIBUTO_MODIFICADO");

        const oroActualizado = await tx.usuario.updateMany({
          where: { id: usuario.id, oro: { gte: coste } },
          data: { oro: { decrement: coste } },
        });
        if (oroActualizado.count !== 1) throw new Error("ORO_INSUFICIENTE");

        return tx.usuario.findUniqueOrThrow({
          where: { id: usuario.id },
          include: includeGameData,
        });
      });

      return NextResponse.json(respuestaUsuario(actualizado));
    }

    if (accion === "mejorarEdificio") {
      const idEdificioValue: unknown = body.idEdificio;
      if (
        typeof idEdificioValue !== "string" ||
        !Object.prototype.hasOwnProperty.call(CONFIGURACION_EDIFICIOS, idEdificioValue)
      ) {
        return NextResponse.json({ error: "Edificio inválido." }, { status: 400 });
      }

      const idEdificio = idEdificioValue as IdEdificio;
      const configuracion = CONFIGURACION_EDIFICIOS[idEdificio];

      // La lectura, validación y actualización del JSON de edificios ocurren en
      // una transacción serializable para evitar sobrescribir mejoras concurrentes.
      const actualizado = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.findUnique({
          where: { id: usuarioSesion.id },
          include: includeGameData,
        });
        if (!usuario) throw new Error("USUARIO_NO_ENCONTRADO");

        const edificios =
          usuario.edificios &&
          typeof usuario.edificios === "object" &&
          !Array.isArray(usuario.edificios)
            ? (usuario.edificios as Record<string, unknown>)
            : {};

        const nivel =
          typeof edificios[idEdificio] === "number" ? edificios[idEdificio] : 0;
        if (nivel >= configuracion.nivelMax) throw new Error("EDIFICIO_NIVEL_MAXIMO");

        const requisito = REQUISITOS_EDIFICIOS[idEdificio];
        if (requisito) {
          const nivelRequisitoValue = edificios[requisito.edificio];
          const nivelRequisito =
            typeof nivelRequisitoValue === "number" ? nivelRequisitoValue : 0;
          if (nivelRequisito < requisito.nivel) {
            throw new Error(
              `REQUISITO_EDIFICIO:${CONFIGURACION_EDIFICIOS[requisito.edificio].nombre}:${requisito.nivel}`
            );
          }
        }

        const coste = calcularCosteEdificio(idEdificio, nivel);
        if (
          usuario.oro < coste.oro ||
          usuario.madera < coste.madera ||
          usuario.piedra < coste.piedra ||
          usuario.metal < coste.metal
        ) {
          throw new Error("RECURSOS_INSUFICIENTES");
        }

        const edificiosActualizados: Prisma.InputJsonObject = {
          ...(edificios as Prisma.InputJsonObject),
          [idEdificio]: nivel + 1,
        };

        const debitado = await tx.usuario.updateMany({
          where: {
            id: usuario.id,
            oro: { gte: coste.oro },
            madera: { gte: coste.madera },
            piedra: { gte: coste.piedra },
            metal: { gte: coste.metal },
          },
          data: {
            oro: { decrement: coste.oro },
            madera: { decrement: coste.madera },
            piedra: { decrement: coste.piedra },
            metal: { decrement: coste.metal },
            edificios: edificiosActualizados,
          },
        });
        if (debitado.count !== 1) throw new Error("RECURSOS_CAMBIARON");

        return tx.usuario.findUniqueOrThrow({
          where: { id: usuario.id },
          include: includeGameData,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return NextResponse.json(respuestaUsuario(actualizado));
    }

    return NextResponse.json(
      { error: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORO_INSUFICIENTE") {
        return NextResponse.json({ error: "No tienes oro suficiente." }, { status: 400 });
      }
      if (error.message === "PERSONAJE_CAMBIO" || error.message === "ATRIBUTO_MODIFICADO") {
        return NextResponse.json(
          { error: "El estado del personaje ha cambiado. Actualiza el juego e inténtalo de nuevo." },
          { status: 409 }
        );
      }
      if (error.message === "EXPEDICION_ACTIVA") {
        return NextResponse.json(
          { error: "No puedes realizar esta acción mientras tienes una expedición activa." },
          { status: 409 }
        );
      }
      if (error.message === "USUARIO_NO_ENCONTRADO") {
        return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
      }
      if (error.message === "EDIFICIO_NIVEL_MAXIMO") {
        return NextResponse.json({ error: "El edificio ya está al nivel máximo." }, { status: 400 });
      }
      if (error.message === "RECURSOS_INSUFICIENTES" || error.message === "RECURSOS_CAMBIARON") {
        return NextResponse.json({ error: "No tienes recursos suficientes o han cambiado." }, { status: 409 });
      }
      if (error.message.startsWith("REQUISITO_EDIFICIO:")) {
        const [, nombre, nivel] = error.message.split(":");
        return NextResponse.json(
          { error: `Necesitas ${nombre} nivel ${nivel}.` },
          { status: 400 }
        );
      }
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Otra acción ha actualizado tu base al mismo tiempo. Actualiza e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    console.error("Error en acción de jugador:", error);
    return NextResponse.json(
      { error: "No se pudo completar la acción." },
      { status: 500 }
    );
  }
}
