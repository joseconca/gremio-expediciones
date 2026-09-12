import type { DefinicionHabilidad } from "./tiposJuego";
import { HABILIDADES } from "./habilidades";
import { randomSeeded } from "./utils";

function obtenerDiaActual(): string {
  return new Date().toISOString().slice(0, 10);
}

function obtenerSeedDelDia(dia: string): number {
  return (
    dia.split("-").reduce((total, parte) => total + Number(parte), 0) * 431
  );
}

export function obtenerHabilidadesEnVenta(): DefinicionHabilidad[] {
  const disponibles = HABILIDADES.filter(
    (habilidad) => habilidad.rareza !== "legendario"
  );

  const dia = obtenerDiaActual();
  const seed = obtenerSeedDelDia(dia);

  const restantes = [...disponibles];
  const seleccionadas: DefinicionHabilidad[] = [];

  for (let i = 0; i < 2 && restantes.length > 0; i++) {
    const indice = Math.floor(randomSeeded(seed + i + 1) * restantes.length);

    const habilidad = restantes.splice(indice, 1)[0];

    if (habilidad) {
      seleccionadas.push(habilidad);
    }
  }

  return seleccionadas;
}
