import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  obtenerObjetoPorId,
  calcularCosteMejoraObjeto,
  calcularCosteRecursosMejora,
} from "@/lib/objetos";
import { obtenerNombreObjetoConSufijo } from "@/lib/sufijosObjetos";


function personajeOcupado(estado: string): boolean {
  return estado === "de_viaje" || estado === "combatiendo";
}

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body.objetoInventarioId !== "string" ||
      body.objetoInventarioId.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Debes indicar el objeto que quieres mejorar." },
        { status: 400 }
      );
    }

    const objetoInventarioId = body.objetoInventarioId;

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      include: {
        personaje: {
          include: {
            inventario: true,
            equipoEquipado: true,
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

    const personaje = usuario.personaje;
    if (personajeOcupado(personaje.estado)) {
      return NextResponse.json(
        { error: "No puedes mejorar el equipo durante una expedición o un combate." },
        { status: 409 }
      );
    }

    const edificios =
      usuario.edificios &&
      typeof usuario.edificios === "object" &&
      !Array.isArray(usuario.edificios)
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelHerrería =
      typeof edificios.herreria === "number"
        ? edificios.herreria
        : 0;

    if (nivelHerrería <= 0) {
      return NextResponse.json(
        { error: "No tienes la Herrería construida." },
        { status: 403 }
      );
    }

    if (!personaje.inventario) {
      return NextResponse.json(
        { error: "El personaje no tiene inventario." },
        { status: 409 }
      );
    }

    if (!personaje.equipoEquipado) {
      return NextResponse.json(
        { error: "No existe un equipo equipado para este personaje." },
        { status: 409 }
      );
    }

    const objetoInventario = await prisma.inventarioObjeto.findFirst({
      where: {
        id: objetoInventarioId,
        inventarioId: personaje.inventario.id,
      },
    });

    if (!objetoInventario) {
      return NextResponse.json(
        { error: "El objeto no pertenece a tu inventario." },
        { status: 403 }
      );
    }

    const objeto = obtenerObjetoPorId(objetoInventario.objetoId);

    if (!objeto) {
      return NextResponse.json(
        { error: "No se encontró la definición del objeto." },
        { status: 404 }
      );
    }

    if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") {
      return NextResponse.json(
        { error: "Este objeto no puede mejorarse en la Herrería." },
        { status: 400 }
      );
    }

    const ranurasEquipo = [
      personaje.equipoEquipado.armaInventarioId,
      personaje.equipoEquipado.manoSecundariaInventarioId,
      personaje.equipoEquipado.cascoInventarioId,
      personaje.equipoEquipado.armaduraInventarioId,
      personaje.equipoEquipado.pantalonesInventarioId,
      personaje.equipoEquipado.botasInventarioId,
      personaje.equipoEquipado.guantesInventarioId,
      personaje.equipoEquipado.accesorioInventarioId,
      personaje.equipoEquipado.anillo1InventarioId,
      personaje.equipoEquipado.anillo2InventarioId,
    ];
    const objetoEstaEquipado = ranurasEquipo.includes(objetoInventario.id);

    if (!objetoEstaEquipado) {
      return NextResponse.json(
        { error: "Solo puedes mejorar un objeto que esté equipado." },
        { status: 400 }
      );
    }

    const nivelMaximo = nivelHerrería * 3;

    if (objetoInventario.nivelMejora >= nivelMaximo) {
      return NextResponse.json(
        {
          error: `Este objeto ya tiene el nivel máximo de mejora para tu Herrería (+${nivelMaximo}).`,
        },
        { status: 400 }
      );
    }

    const coste = calcularCosteMejoraObjeto(
      objeto.precio,
      objetoInventario.nivelMejora,
      objeto.rareza
    );
    const costeRecursos = calcularCosteRecursosMejora(
      objeto,
      objetoInventario.nivelMejora
    );

    if (usuario.oro < coste) {
      return NextResponse.json(
        {
          error: `No tienes suficiente oro. Necesitas ${coste} 🪙.`,
        },
        { status: 400 }
      );
    }

    if (
      usuario.madera < costeRecursos.madera ||
      usuario.piedra < costeRecursos.piedra ||
      usuario.metal < costeRecursos.metal
    ) {
      return NextResponse.json(
        {
          error: "No tienes suficientes materiales para esta mejora.",
          costeRecursos,
          recursosDisponibles: {
            madera: usuario.madera,
            piedra: usuario.piedra,
            metal: usuario.metal,
          },
        },
        { status: 400 }
      );
    }

    const nivelAnterior = objetoInventario.nivelMejora;
    const nivelNuevo = nivelAnterior + 1;

    const resultado = await prisma.$transaction(async (tx) => {
      // La herrería no debe modificar las estadísticas de una expedición ya
      // iniciada. Releer estado y ranura evita una carrera con el comienzo del viaje.
      const personajeActual = await tx.personaje.findUnique({
        where: { id: personaje.id },
        select: { estado: true },
      });
      if (!personajeActual) throw new Error("PERSONAJE_NO_ENCONTRADO");
      if (personajeOcupado(personajeActual.estado)) throw new Error("PERSONAJE_OCUPADO");

      const equipoActual = await tx.equipoEquipado.findUnique({
        where: { personajeId: personaje.id },
      });
      const objetoSigueEquipado = [
        equipoActual?.armaInventarioId,
        equipoActual?.manoSecundariaInventarioId,
        equipoActual?.cascoInventarioId,
        equipoActual?.armaduraInventarioId,
        equipoActual?.pantalonesInventarioId,
        equipoActual?.botasInventarioId,
        equipoActual?.guantesInventarioId,
        equipoActual?.accesorioInventarioId,
        equipoActual?.anillo1InventarioId,
        equipoActual?.anillo2InventarioId,
      ].includes(objetoInventario.id);
      if (!objetoSigueEquipado) throw new Error("OBJETO_NO_EQUIPADO");

      // El oro y los tres materiales se descuentan en una sola operación
      // condicional y dentro de la misma transacción que mejora la instancia.
      const usuarioActualizado = await tx.usuario.updateMany({
        where: {
          id: usuario.id,
          oro: { gte: coste },
          madera: { gte: costeRecursos.madera },
          piedra: { gte: costeRecursos.piedra },
          metal: { gte: costeRecursos.metal },
        },
        data: {
          oro: { decrement: coste },
          madera: { decrement: costeRecursos.madera },
          piedra: { decrement: costeRecursos.piedra },
          metal: { decrement: costeRecursos.metal },
        },
      });

      if (usuarioActualizado.count !== 1) {
        throw new Error("COSTE_CAMBIADO");
      }

      const objetoActualizado = await tx.inventarioObjeto.updateMany({
        where: {
          id: objetoInventario.id,
          inventarioId: personaje.inventario!.id,
          nivelMejora: nivelAnterior,
        },
        data: {
          nivelMejora: nivelNuevo,
        },
      });

      if (objetoActualizado.count !== 1) {
        throw new Error("OBJETO_MODIFICADO");
      }

      const usuarioFinal = await tx.usuario.findUniqueOrThrow({
        where: {
          id: usuario.id,
        },
        select: {
          oro: true,
          madera: true,
          piedra: true,
          metal: true,
        },
      });

      return usuarioFinal;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      mensaje: `Has mejorado ${obtenerNombreObjetoConSufijo(objeto.nombre, objetoInventario.sufijoId)} a +${nivelNuevo}.`,
      oro: resultado.oro,
      recursos: {
        madera: resultado.madera,
        piedra: resultado.piedra,
        metal: resultado.metal,
      },
      nivelMejora: nivelNuevo,
      coste,
      costeRecursos,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PERSONAJE_OCUPADO") {
      return NextResponse.json(
        { error: "No puedes mejorar el equipo durante una expedición o un combate." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "PERSONAJE_NO_ENCONTRADO") {
      return NextResponse.json({ error: "No se encontró el personaje." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "OBJETO_NO_EQUIPADO") {
      return NextResponse.json(
        { error: "El objeto ya no está equipado. Actualiza el inventario e inténtalo de nuevo." },
        { status: 409 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json(
        { error: "El personaje o el equipo han cambiado. Actualiza e inténtalo de nuevo." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "ORO_INSUFICIENTE") {
      return NextResponse.json(
        { error: "No tienes suficiente oro." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "COSTE_CAMBIADO") {
      return NextResponse.json(
        { error: "El saldo de oro o los materiales han cambiado. Actualiza el juego e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "OBJETO_MODIFICADO") {
      return NextResponse.json(
        {
          error:
            "El objeto ha cambiado mientras se procesaba la mejora. Actualiza el inventario e inténtalo de nuevo.",
        },
        { status: 409 }
      );
    }

    console.error("Error al mejorar objeto:", error);

    return NextResponse.json(
      { error: "No se pudo mejorar el objeto." },
      { status: 500 }
    );
  }
}