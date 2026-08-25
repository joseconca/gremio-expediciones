import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Evitamos crear múltiples instancias de Prisma en desarrollo
const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Buscamos el primer usuario que exista
    let usuario = await prisma.usuario.findFirst({
      include: {
        personaje: true, // Hacemos JOIN para traer su personaje
        expedicion: true, // Y su expedición activa si la tiene
      },
    });

    // 2. Si la base de datos está vacía, creamos un jugador de prueba
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email: "test@test.com",
          nombre: "Aventurero",
          password: "password_falsa_123", // Ya la hashearemos cuando hagamos el login real
          oro: 600,
          personaje: {
            create: {
              clase: "Explorador",
              hpActual: 100,
              hpMaximo: 100,
              ataque: 10,
              defensa: 8,
              velocidad: 15,
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

    // 3. Devolvemos los datos al frontend
    return NextResponse.json(usuario);
    
  } catch (error) {
    console.error("Error al cargar el jugador:", error);
    return NextResponse.json(
      { error: "Error al conectar con la base de datos" },
      { status: 500 }
    );
  }
}