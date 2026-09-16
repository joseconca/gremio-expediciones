import { prisma } from "@/lib/prisma";
import { calcularEstadisticasPersonaje } from "@/lib/estadisticasPersonaje";

interface PersonajeRegen {
  id: string;
  usuarioId: string;
  clase: string;
  nivel: number;
  velocidadMejoras: number;
  capacidadCarruajeMejoras: number;
  hpActual: number;
  regeneracionDeVida: number;
  estado: string;
  ultimaRegeneracion: Date;
  habilidades?: {
    habilidadId: string;
  }[];
}

export async function sincronizarRegeneracion<T extends PersonajeRegen>(
  personaje: T
): Promise<T> {
  const ahora = new Date();

  const estadisticas = calcularEstadisticasPersonaje(
    personaje,
    personaje.habilidades?.map((habilidad) => habilidad.habilidadId) ?? []
  );

  const hpMaximo = estadisticas.total.hpMaximo;

  if (personaje.ultimaRegeneracion.getTime() > ahora.getTime()) {
    await prisma.personaje.update({
      where: { usuarioId: personaje.usuarioId },
      data: { ultimaRegeneracion: ahora },
    });

    return { ...personaje, ultimaRegeneracion: ahora } as T;
  }

  if (personaje.estado === "de_viaje" || personaje.hpActual >= hpMaximo) {
    if (
      personaje.hpActual >= hpMaximo &&
      ahora.getTime() - personaje.ultimaRegeneracion.getTime() < 1000
    ) {
      return personaje;
    }

    await prisma.personaje.update({
      where: { usuarioId: personaje.usuarioId },
      data: { ultimaRegeneracion: ahora },
    });

    return { ...personaje, ultimaRegeneracion: ahora } as T;
  }

  const segundosTranscurridos =
    (ahora.getTime() - personaje.ultimaRegeneracion.getTime()) / 1000;

  const hpGanado = Math.floor(
    segundosTranscurridos * personaje.regeneracionDeVida
  );

  if (hpGanado <= 0) {
    return personaje;
  }

  const hpActual = Math.min(hpMaximo, personaje.hpActual + hpGanado);

  const nuevoEstado = hpActual >= hpMaximo ? "ocioso" : personaje.estado;

  await prisma.personaje.update({
    where: { usuarioId: personaje.usuarioId },
    data: {
      hpActual,
      estado: nuevoEstado,
      ultimaRegeneracion: ahora,
    },
  });

  return {
    ...personaje,
    hpActual,
    estado: nuevoEstado,
    ultimaRegeneracion: ahora,
  } as T;
}
