import type { DefinicionHabilidad } from "./tiposJuego";
import {
  HABILIDADES,
  obtenerHabilidadesDisponiblesParaClase,
} from "./habilidades";
import { randomSeeded } from "./utils";

function obtenerDiaActual(): string {
  return new Date().toISOString().slice(0, 10);
}

function obtenerSeedDelDia(dia: string): number {
  return (
    dia.split("-").reduce((total, parte) => total + Number(parte), 0) * 431
  );
}

function seleccionarOfertasDiarias(
  disponibles: readonly DefinicionHabilidad[],
  limite = 4
): DefinicionHabilidad[] {
  const dia = obtenerDiaActual();
  const seed = obtenerSeedDelDia(dia);
  const restantes = [...disponibles];
  const seleccionadas: DefinicionHabilidad[] = [];

  for (let i = 0; i < limite && restantes.length > 0; i++) {
    const indice = Math.floor(randomSeeded(seed + i + 1) * restantes.length);
    const habilidad = restantes.splice(indice, 1)[0];
    if (habilidad) seleccionadas.push(habilidad);
  }

  return seleccionadas;
}

export function obtenerHabilidadesEnVenta(
  claseActualId?: string
): DefinicionHabilidad[] {
  if (!claseActualId) {
    // Compatibilidad temporal para los consumidores antiguos del catálogo.
    return seleccionarOfertasDiarias(
      HABILIDADES.filter((habilidad) => habilidad.rareza !== "legendario")
    );
  }

  const disponibles = obtenerHabilidadesDisponiblesParaClase(claseActualId)
    .filter((habilidad) => habilidad.rareza !== "legendario");

  // Las habilidades profesionales y heredadas nunca desaparecen por una rotación diaria.
  const habilidadesProfesionales = disponibles.filter(
    (habilidad) => Boolean(habilidad.claseId)
  );
  // Solo las habilidades genéricas mantienen las ofertas rotatorias de la Escuela.
  const habilidadesGenericas = seleccionarOfertasDiarias(
    disponibles.filter((habilidad) => !habilidad.claseId)
  );

  return [...habilidadesProfesionales, ...habilidadesGenericas];
}
