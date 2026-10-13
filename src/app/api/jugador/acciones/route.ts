import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CONFIGURACION_ATRIBUTOS,
  REQUISITOS_EDIFICIOS,
  calcularCosteAtributo,
  calcularCosteEdificio,
} from "@/lib/configuracionJuego";
import type { IdAtributo } from "@/lib/configuracionJuego";
import { type ClasePersonaje } from "@/lib/tiposJuego";
import { CONFIGURACION_EDIFICIOS, IdEdificio } from "@/lib/tiposJuego";
import { obtenerComidaTaberna } from "@/lib/comidasTaberna";
import { calcularEstadisticasDerivadasRpg } from "@/lib/progresion/estadisticas";
import { asegurarInventarioYEquipo } from "@/lib/inventario";

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
          manoSecundaria: true,
          casco: true,
          pantalones: true,
          botas: true,
          guantes: true,
          anillo1: true,
          anillo2: true,
        },
      },
      progresosClase: true,
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

    const bodyValue: unknown = await request.json().catch(() => null);
    if (
      !bodyValue ||
      typeof bodyValue !== "object" ||
      Array.isArray(bodyValue)
    ) {
      return NextResponse.json(
        { error: "Petición no válida." },
        { status: 400 }
      );
    }
    const body = bodyValue as Record<string, unknown>;
    const accion = body.accion;

    if (accion === "establecerBase") {
      const coords =
        body.coords &&
        typeof body.coords === "object" &&
        !Array.isArray(body.coords)
          ? (body.coords as Record<string, unknown>)
          : {};
      const { lat, lng } = coords;
      if (
        typeof lat !== "number" ||
        !Number.isFinite(lat) ||
        typeof lng !== "number" ||
        !Number.isFinite(lng) ||
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
      const sexo = typeof body.sexo === "string" ? body.sexo : "";
      if (nombre.length < 3 || !SEXOS.has(sexo)) {
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
      // El servidor ignora la clase enviada por el cliente: todos empiezan como Novato.
      const clasePersonaje: ClasePersonaje = "Novato";
      const estadisticasRpgIniciales = calcularEstadisticasDerivadasRpg({
        fuerza: 1,
        agilidad: 1,
        vitalidad: 1,
        inteligencia: 1,
        destreza: 1,
        suerte: 1,
      }, 1);

      const usuario = await prisma.$transaction(async (tx) => {
        const usuarioActualizado = await tx.usuario.update({
          where: { id: usuarioSesion.id },
          data: {
            personaje: {
              create: {
                nombre,
                clase: clasePersonaje,
                profesionActivaId: "novato",
                sexo,
                estado: "ocioso",

                fuerza: 1,
                agilidad: 1,
                vitalidad: 1,
                inteligencia: 1,
                destreza: 1,
                suerte: 1,
                energiaActual: estadisticasRpgIniciales.energiaMaxima,
                manaActual: estadisticasRpgIniciales.manaMaximo,

                hpActual: Math.floor(estadisticasRpgIniciales.hpMaximo),

                velocidadMejoras: 0,
                capacidadCarruajeMejoras: 0,

                nivel: 1,
                experiencia: 0,
                progresosClase: {
                  create: {
                    claseId: "novato",
                    nivelJob: 1,
                    experienciaJob: 0,
                    puntosHabilidadDisponibles: 0,
                    desbloqueada: true,
                  },
                },
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

    if (accion === "prepararComida") {
      const comida = obtenerComidaTaberna(body.comidaId);
      if (!comida) {
        return NextResponse.json({ error: "La comida seleccionada no existe." }, { status: 400 });
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.findUnique({
          where: { id: usuarioSesion.id },
          include: {
            personaje: true,
            expedicionActiva: true,
          },
        });

        if (!usuario?.personaje) throw new Error("PERSONAJE_NO_ENCONTRADO");
        if (usuario.expedicionActiva || usuario.personaje.estado === "de_viaje" || usuario.personaje.estado === "combatiendo") {
          throw new Error("EXPEDICION_ACTIVA");
        }

        const edificios =
          usuario.edificios && typeof usuario.edificios === "object" && !Array.isArray(usuario.edificios)
            ? (usuario.edificios as Record<string, unknown>)
            : {};
        const nivelTaberna = typeof edificios.taberna === "number" ? edificios.taberna : 0;
        if (nivelTaberna <= 0) {
          throw new Error("TABERNA_NO_CONSTRUIDA");
        }
        if (nivelTaberna < comida.nivelRequerido) {
          throw new Error(`NIVEL_TABERNA_INSUFICIENTE:${comida.nivelRequerido}`);
        }
        if (usuario.personaje.comidaPreparada) throw new Error("COMIDA_YA_PREPARADA");

        const personajeActualizado = await tx.personaje.updateMany({
          where: {
            usuarioId: usuario.id,
            comidaPreparada: null,
          },
          data: { comidaPreparada: comida.id },
        });
        if (personajeActualizado.count !== 1) throw new Error("COMIDA_YA_PREPARADA");

        const oroActualizado = await tx.usuario.updateMany({
          where: { id: usuario.id, oro: { gte: comida.coste } },
          data: { oro: { decrement: comida.coste } },
        });
        if (oroActualizado.count !== 1) throw new Error("ORO_INSUFICIENTE");

        return tx.usuario.findUniqueOrThrow({
          where: { id: usuario.id },
          include: includeGameData,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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
      if (error.message === "PERSONAJE_NO_ENCONTRADO") {
        return NextResponse.json({ error: "Necesitas un personaje." }, { status: 400 });
      }
      if (error.message === "COMIDA_YA_PREPARADA") {
        return NextResponse.json(
          { error: "Ya tienes una comida preparada para tu próxima expedición de combate." },
          { status: 409 }
        );
      }
      if (error.message === "TABERNA_NO_CONSTRUIDA") {
        return NextResponse.json({ error: "Necesitas tener una taberna construida." }, { status: 400 });
      }
      if (error.message.startsWith("NIVEL_TABERNA_INSUFICIENTE:")) {
        const nivel = error.message.split(":")[1];
        return NextResponse.json(
          { error: `Necesitas una Taberna de nivel ${nivel} para preparar esta receta.` },
          { status: 400 }
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
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya tienes un personaje reclutado." },
        { status: 409 }
      );
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
