import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    let usuario = await prisma.usuario.findFirst({
      include: {
        personaje: true,
        expedicionActiva: true,
      },
    });

    // Crear usuario con datos de prueba
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email: "test@test.com",
          nombre: "testUser",
          password: "1234",
          oro: 50,
          edificios: { taberna: 1, herreria: 0, mercado: 0 },
          /*baseCoords: null,*/
          personaje: {
            create: {
              clase: "Explorador",
              nombre: "Alba la calva poderosa",
              hpActual: 100,
              hpMaximo: 100,
              ataque: 5,
              defensa: 5,
              velocidad: 2000,
              capacidadCarruaje: 50,
              regeneracionDeVida: 1,
            },
          },
        },
        include: {
          personaje: true,
          expedicionActiva: true,
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
    const { oro, edificios, personaje, baseCoords, expedicionActiva } = body;

    const usuario = await prisma.usuario.findFirst({
      include: {
        personaje: true,
        expedicionActiva: true,
      },
    });

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

    //coordenadas
    if (baseCoords !== undefined) {
      dataToUpdate.baseCoords = baseCoords;
    }

    //personaje
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
            regeneracionDeVida: personaje.regeneracionDeVida,
          },
          update: {
            clase: personaje.clase,
            nombre: personaje.nombre,
            hpActual: personaje.hpActual,
            hpMaximo: personaje.hpMaximo,
            ataque: personaje.ataque,
            defensa: personaje.defensa,
            velocidad: personaje.velocidad,
            capacidadCarruaje: personaje.capacidadCarruaje,
            estado: personaje.estado,
            regeneracionDeVida: personaje.regeneracionDeVida,
          },
        },
      };
    }

    //expedicion
    if (expedicionActiva !== undefined) {
      if (expedicionActiva === null) {
        // Si viene null y existe en BBDD, la borramos (es decir, la misión ha terminado)
        if (usuario.expedicionActiva) {
          dataToUpdate.expedicionActiva = { delete: true };
        }
      } else {
        // Si viene con datos, la creamos o actualizamos
        dataToUpdate.expedicionActiva = {
          upsert: {
            create: {
              misionId: expedicionActiva.idMision,
              nombre: expedicionActiva.nombre,
              recompensa: expedicionActiva.recompensa,
              dificultad: expedicionActiva.dificultad,
              fechaLlegada: new Date(expedicionActiva.fechaLlegada),
              destinoCoords: expedicionActiva.destinoCoords || {},
            },
            update: {
              misionId: expedicionActiva.idMision,
              nombre: expedicionActiva.nombre,
              recompensa: expedicionActiva.recompensa,
              dificultad: expedicionActiva.dificultad,
              fechaLlegada: new Date(expedicionActiva.fechaLlegada),
              destinoCoords: expedicionActiva.destinoCoords || {},
            }
          }
        };
      }
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: dataToUpdate,
      include: { personaje: true, expedicionActiva: true },
    });

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    console.error("Error al guardar:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
