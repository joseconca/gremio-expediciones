import { aplicarModificadoresPosicion } from "./expediciones/posicion-combate";
export type AtributoComida = "ataque" | "ataqueMagico" | "defensa" | "velocidad";

export type EfectoComida =
  | { tipo: "porcentaje"; atributo: AtributoComida; porcentaje: number; fijo?: number }
  | { tipo: "critico"; incremento: number };

export interface ComidaTaberna {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  coste: number;
  nivelRequerido: 1 | 2 | 3;
  efectos: readonly EfectoComida[];
}

/**
 * Las comidas se reservan para la siguiente expedición de combate.
 * Los platos avanzados combinan efectos, en lugar de limitarse a inflar una
 * única bonificación. El servidor valida siempre el nivel requerido.
 */
const RECETAS: readonly ComidaTaberna[] = [
  {
    id: "carne-cazadora",
    nombre: "Carne del cazador",
    icono: "🍖",
    descripcion: "Aumenta un 10 % el ataque físico durante la expedición.",
    coste: 20,
    nivelRequerido: 1,
    efectos: [{ tipo: "porcentaje", atributo: "ataque", fijo: 3, porcentaje: 0.10 }],
  },
  {
    id: "caldo-guardian",
    nombre: "Caldo del guardián",
    icono: "🥣",
    descripcion: "Aumenta un 10 % la defensa física durante la expedición.",
    coste: 24,
    nivelRequerido: 1,
    efectos: [{ tipo: "porcentaje", atributo: "defensa", fijo: 3, porcentaje: 0.10 }],
  },
  {
    id: "setas-arcanas",
    nombre: "Setas arcanas",
    icono: "🍄",
    descripcion: "Aumenta un 10 % el ataque mágico durante la expedición.",
    coste: 24,
    nivelRequerido: 1,
    efectos: [{ tipo: "porcentaje", atributo: "ataqueMagico", fijo: 3, porcentaje: 0.10 }],
  },
  {
    id: "raices-vigorizantes",
    nombre: "Guiso de raíces vigorizantes",
    icono: "🥕",
    descripcion: "Aumenta un 10 % la velocidad y un 10 % la defensa física.",
    coste: 45,
    nivelRequerido: 2,
    efectos: [
      { tipo: "porcentaje", atributo: "velocidad", porcentaje: 0.10 },
      { tipo: "porcentaje", atributo: "defensa", fijo: 3, porcentaje: 0.10 },
    ],
  },
  {
    id: "brocheta-especiada",
    nombre: "Brocheta especiada",
    icono: "🍢",
    descripcion: "Añade 10 puntos porcentuales al crítico y aumenta un 10 % el ataque físico.",
    coste: 55,
    nivelRequerido: 2,
    efectos: [
      { tipo: "critico", incremento: 0.10 },
      { tipo: "porcentaje", atributo: "ataque", fijo: 3, porcentaje: 0.10 },
    ],
  },
  {
    id: "desayuno-explorador",
    nombre: "Desayuno del explorador",
    icono: "🍳",
    descripcion: "Aumenta la velocidad un 10 % y la defensa física en 3 más un 10 %.",
    coste: 50,
    nivelRequerido: 2,
    efectos: [
      { tipo: "porcentaje", atributo: "velocidad", porcentaje: 0.10 },
      { tipo: "porcentaje", atributo: "defensa", fijo: 3, porcentaje: 0.10 },
    ],
  },
  {
    id: "banquete-campeon",
    nombre: "Banquete del campeón",
    icono: "🍗",
    descripcion: "Aumenta un 15 % el ataque físico y la defensa, y añade 10 puntos porcentuales al crítico.",
    coste: 90,
    nivelRequerido: 3,
    efectos: [
      { tipo: "porcentaje", atributo: "ataque", fijo: 3, porcentaje: 0.15 },
      { tipo: "porcentaje", atributo: "defensa", fijo: 3, porcentaje: 0.15 },
      { tipo: "critico", incremento: 0.10 },
    ],
  },
  {
    id: "festin-arcano",
    nombre: "Festín arcano",
    icono: "✨",
    descripcion: "Aumenta un 20 % el ataque mágico, un 10 % la velocidad y un 10 % la defensa.",
    coste: 100,
    nivelRequerido: 3,
    efectos: [
      { tipo: "porcentaje", atributo: "ataqueMagico", fijo: 3, porcentaje: 0.20 },
      { tipo: "porcentaje", atributo: "velocidad", porcentaje: 0.10 },
      { tipo: "porcentaje", atributo: "defensa", fijo: 3, porcentaje: 0.10 },
    ],
  },
  {
    id: "racion-de-asedio",
    nombre: "Ración de asedio",
    icono: "🍲",
    descripcion: "Aumenta el ataque físico en 5 más un 20 % y la defensa física en 5 más un 15 %.",
    coste: 110,
    nivelRequerido: 3,
    efectos: [
      { tipo: "porcentaje", atributo: "ataque", fijo: 3, porcentaje: 0.20 },
      { tipo: "porcentaje", atributo: "defensa", fijo: 3, porcentaje: 0.15 },
    ],
  },
];

export const COMIDAS_TABERNA: readonly ComidaTaberna[] = RECETAS.map((comida) => ({ ...comida, descripcion: comida.efectos.map((efecto) => {
  if (efecto.tipo === "critico") return `+${Math.round(efecto.incremento * 100)} puntos porcentuales de crítico`;
  const nombres: Record<string, string> = { ataque: "ataque físico", ataqueMagico: "ataque mágico", defensa: "defensa física", velocidad: "velocidad" };
  return `${efecto.fijo ? `+${efecto.fijo} y ` : ""}+${Math.round(efecto.porcentaje * 100)} % de ${nombres[efecto.atributo]}`;
}).join("; ") + ". Durante la expedición." }));

export function obtenerComidaTaberna(id: unknown): ComidaTaberna | null {
  if (typeof id !== "string") return null;
  return COMIDAS_TABERNA.find((comida) => comida.id === id) ?? null;
}

export interface AtributosCombateComida {
  ataque: number;
  ataqueMagico: number;
  defensa: number;
  velocidad: number;
  probCritico: number;
}

export function aplicarEfectoComida(
  atributos: AtributosCombateComida,
  comidaId: unknown
): AtributosCombateComida {
  const comida = obtenerComidaTaberna(comidaId);
  const resultado = { ...atributos };

  if (!comida) return resultado;

  for (const efecto of comida.efectos) {
    if (efecto.tipo === "porcentaje") {
      const atributo = efecto.atributo;
      resultado[atributo] = Math.max(
        atributo === "defensa" ? 0 : 1,
        resultado[atributo] + Math.round(atributos[atributo] * efecto.porcentaje + (efecto.fijo ?? 0))
      );
    } else if (efecto.tipo === "critico") {
      resultado.probCritico = Math.min(
        0.75,
        resultado.probCritico + efecto.incremento
      );
    }
  }

  return resultado;
}

/** Contribución real, calculada al crear el combate y conservada para el detalle. */
export function calcularBonificacionesComida(atributos: AtributosCombateComida, comidaId: unknown, posicion: unknown = "centro"): Partial<AtributosCombateComida> {
  const conComida = aplicarModificadoresPosicion(aplicarEfectoComida(atributos, comidaId), posicion);
  const sinComida = aplicarModificadoresPosicion(atributos, posicion);
  return Object.fromEntries((Object.keys(atributos) as (keyof AtributosCombateComida)[])
    .map((atributo) => [atributo, Math.round((conComida[atributo] - sinComida[atributo]) * 10000) / 10000])
    .filter(([, valor]) => valor !== 0));
}
