/** Costes de mejoras adquiridas en la base. Contrato y fórmulas originales. */
export type CampoMejora = "velocidadMejoras" | "capacidadCarruajeMejoras";

export const CONFIGURACION_ATRIBUTOS = {
  velocidad: {
    campo: "velocidadMejoras" as CampoMejora,
    costeBase: 100,
    edificio: "mercado",
    limitePorNivel: 5,
  },
  capacidadCarruaje: {
    campo: "capacidadCarruajeMejoras" as CampoMejora,
    costeBase: 200,
    edificio: "mercado",
    limitePorNivel: 5,
  },
} as const;

export type IdAtributo = keyof typeof CONFIGURACION_ATRIBUTOS;

export function calcularCosteAtributo(
  atributo: IdAtributo,
  valorActual: number
): number {
  const configuracion = CONFIGURACION_ATRIBUTOS[atributo];
  const siguienteNivel = valorActual + 1;

  return configuracion.costeBase * siguienteNivel * siguienteNivel;
}

