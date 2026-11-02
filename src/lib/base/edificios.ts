import type { IdEdificio } from "../tiposJuego";
import { CONFIGURACION_EDIFICIOS } from "../tiposJuego";

/** Requisitos y costes de construcción: valores originales sin modificar. */
export const REQUISITOS_EDIFICIOS: Partial<
  Record<IdEdificio, { edificio: IdEdificio; nivel: number }>
> = {
  herreria: {
    edificio: "armeria",
    nivel: 1,
  },
};

export interface CosteEdificio {
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
}

export function calcularCosteEdificio(idEdificio: IdEdificio, nivelActual: number): CosteEdificio {
  const configuracion = CONFIGURACION_EDIFICIOS[idEdificio];
  const nivel = Number.isFinite(nivelActual) ? Math.max(0, Math.floor(nivelActual)) : 0;
  const multiplicador = Math.pow(1.5, nivel);
  return {
    oro: Math.ceil(configuracion.costeConstruccion * multiplicador),
    madera: idEdificio === "muralla" && nivel > 0 ? 0 : Math.ceil(configuracion.costeMadera * multiplicador),
    piedra: idEdificio === "muralla" && nivel > 0 ? Math.ceil(10 * multiplicador) : Math.ceil(configuracion.costePiedra * multiplicador),
    metal: Math.ceil(configuracion.costeMetal * multiplicador),
  };
}

