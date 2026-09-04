import { prisma } from "@/lib/prisma";

interface PersonajeRegen {
  id: string;
  usuarioId: string;
  hpActual: number;
  hpMaximo: number;
  regeneracionDeVida: number;
  estado: string;
  ultimaRegeneracion: Date;
}

export async function sincronizarRegeneracion<T extends PersonajeRegen>(
  personaje: T
): Promise<T> {
  const ahora = new Date();

  if (personaje.ultimaRegeneracion.getTime() > ahora.getTime()) {
    await prisma.personaje.update({
      where: { usuarioId: personaje.usuarioId },
      data: { ultimaRegeneracion: ahora },
    });
    return { ...personaje, ultimaRegeneracion: ahora };
  }

  if (personaje.estado === "de_viaje" || personaje.hpActual >= personaje.hpMaximo) {
    if (personaje.hpActual >= personaje.hpMaximo && ahora.getTime() - personaje.ultimaRegeneracion.getTime() < 1000) {
      return personaje;
    }
    await prisma.personaje.update({
      where: { usuarioId: personaje.usuarioId },
      data: { ultimaRegeneracion: ahora },
    });
    return { ...personaje, ultimaRegeneracion: ahora };
  }

  const segundosTranscurridos = (ahora.getTime() - personaje.ultimaRegeneracion.getTime()) / 1000;
  const hpGanado = Math.floor(segundosTranscurridos * personaje.regeneracionDeVida);

  if (hpGanado <= 0) return personaje;

  const hpActual = Math.min(personaje.hpMaximo, personaje.hpActual + hpGanado);
  const nuevoEstado = hpActual >= personaje.hpMaximo ? "ocioso" : personaje.estado;

  await prisma.personaje.update({
    where: { usuarioId: personaje.usuarioId },
    data: { hpActual, estado: nuevoEstado, ultimaRegeneracion: ahora },
  });

  return { ...personaje, hpActual, estado: nuevoEstado, ultimaRegeneracion: ahora };
}
