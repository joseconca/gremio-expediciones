import type { DefinicionHabilidad } from "../../tiposJuego";

type EntradaHabilidad = Omit<DefinicionHabilidad, "rareza" | "precio" | "costePuntosHabilidad"> &
  Partial<Pick<DefinicionHabilidad, "rareza" | "precio" | "costePuntosHabilidad">>;

export function habilidad(datos: EntradaHabilidad): DefinicionHabilidad {
  return { rareza: "basico", precio: 0, costePuntosHabilidad: 1, ...datos };
}
