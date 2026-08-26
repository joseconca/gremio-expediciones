import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Buscamos el primer usuario que exista para pruebas
    let usuario = await prisma.usuario.findFirst({
      include: {
        personaje: true,
        expedicion: true,
      },
    });

    // Crear primer user de prueba
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email: "test@test.com",
          nombre: "testUser",
          password: "1234",
          oro: 600,
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
          },
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