import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    let usuario = await prisma.usuario.findFirst({
      include: {
        personaje: true,
        expedicion: true,
      },
    });

    // Crear usuario con datos de prueba
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email: "test@test.com",
          nombre: "testUser",
          password: "1234",
          oro: 600,
          edificios: { taberna: 1, herreria: 0, mercado: 0 },
          /*baseCoords: null,
          personaje: {
            create: {
              clase: "Explorador",
              nombre: "Alba la calva poderosa",
              hpActual: 100,
              hpMaximo: 100,
              ataque: 5,
              defensa: 5,
              velocidad: 200,
              capacidadCarruaje: 50,
            },
          },*/
        },
        include: {
          personaje: true,
          expedicion: true,
        },
      });
    }

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Error al cargar el jugador:", error);
    return NextResponse.json(
      { error: "Error al conectar con la base de datos" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { oro, edificios, personaje, baseCoords } = body;

    const usuario = await prisma.usuario.findFirst();

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    //actualizar
    const dataToUpdate: any = {
      oro,
      edificios,
    };

    if (baseCoords !== undefined) {
      dataToUpdate.baseCoords = baseCoords;
    }
    if (personaje) {
      dataToUpdate.personaje = {
        upsert: {
          create: {
            clase: personaje.clase,
            nombre: personaje.nombre,
            hpActual: personaje.hpActual,
            hpMaximo: personaje.hpMaximo,
            ataque: personaje.ataque,
            defensa: personaje.defensa,
            velocidad: personaje.velocidad,
            capacidadCarruaje: personaje.capacidadCarruaje,
            estado: personaje.estado,
          },
          update: {
            hpActual: personaje.hpActual,
            hpMaximo: personaje.hpMaximo,
            ataque: personaje.ataque,
            defensa: personaje.defensa,
            velocidad: personaje.velocidad,
            capacidadCarruaje: personaje.capacidadCarruaje,
            estado: personaje.estado,
          },
        },
      };
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: dataToUpdate,
      include: { personaje: true },
    });

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    console.error("Error al guardar:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
