export type AtributoComida = "ataque" | "ataqueMagico" | "defensa" | "velocidad";

export type EfectoComida =
  | { tipo: "porcentaje"; atributo: AtributoComida; porcentaje: number }
  | { tipo: "critico"; incremento: number }
  | { tipo: "iniciativa" };

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
export const COMIDAS_TABERNA: readonly ComidaTaberna[] = [
  {
    id: "carne-cazadora",
    nombre: "Carne del cazador",
    icono: "🍖",
    descripcion: "Aumenta un 10 % el ataque físico durante la expedición.",
    coste: 8,
    nivelRequerido: 1,
    efectos: [{ tipo: "porcentaje", atributo: "ataque", porcentaje: 0.10 }],
  },
  {
    id: "caldo-guardian",
    nombre: "Caldo del guardián",
    icono: "🥣",
    descripcion: "Aumenta un 10 % la defensa física durante la expedición.",
    coste: 10,
    nivelRequerido: 1,
    efectos: [{ tipo: "porcentaje", atributo: "defensa", porcentaje: 0.10 }],
  },
  {
    id: "setas-arcanas",
    nombre: "Setas arcanas",
    icono: "🍄",
    descripcion: "Aumenta un 10 % el ataque mágico durante la expedición.",
    coste: 10,
    nivelRequerido: 1,
    efectos: [{ tipo: "porcentaje", atributo: "ataqueMagico", porcentaje: 0.10 }],
  },
  {
    id: "raices-vigorizantes",
    nombre: "Guiso de raíces vigorizantes",
    icono: "🥕",
    descripcion: "Aumenta un 10 % la velocidad y un 10 % la defensa física.",
    coste: 16,
    nivelRequerido: 2,
    efectos: [
      { tipo: "porcentaje", atributo: "velocidad", porcentaje: 0.10 },
      { tipo: "porcentaje", atributo: "defensa", porcentaje: 0.10 },
    ],
  },
  {
    id: "brocheta-especiada",
    nombre: "Brocheta especiada",
    icono: "🍢",
    descripcion: "Añade 10 puntos porcentuales al crítico y aumenta un 10 % el ataque físico.",
    coste: 18,
    nivelRequerido: 2,
    efectos: [
      { tipo: "critico", incremento: 0.10 },
      { tipo: "porcentaje", atributo: "ataque", porcentaje: 0.10 },
    ],
  },
  {
    id: "desayuno-explorador",
    nombre: "Desayuno del explorador",
    icono: "🍳",
    descripcion: "Garantiza la iniciativa en el primer combate y aumenta un 10 % la velocidad.",
    coste: 20,
    nivelRequerido: 2,
    efectos: [
      { tipo: "iniciativa" },
      { tipo: "porcentaje", atributo: "velocidad", porcentaje: 0.10 },
    ],
  },
  {
    id: "banquete-campeon",
    nombre: "Banquete del campeón",
    icono: "🍗",
    descripcion: "Aumenta un 15 % el ataque físico y la defensa, y añade 10 puntos porcentuales al crítico.",
    coste: 32,
    nivelRequerido: 3,
    efectos: [
      { tipo: "porcentaje", atributo: "ataque", porcentaje: 0.15 },
      { tipo: "porcentaje", atributo: "defensa", porcentaje: 0.15 },
      { tipo: "critico", incremento: 0.10 },
    ],
  },
  {
    id: "festin-arcano",
    nombre: "Festín arcano",
    icono: "✨",
    descripcion: "Aumenta un 20 % el ataque mágico, un 10 % la velocidad y un 10 % la defensa.",
    coste: 34,
    nivelRequerido: 3,
    efectos: [
      { tipo: "porcentaje", atributo: "ataqueMagico", porcentaje: 0.20 },
      { tipo: "porcentaje", atributo: "velocidad", porcentaje: 0.10 },
      { tipo: "porcentaje", atributo: "defensa", porcentaje: 0.10 },
    ],
  },
  {
    id: "racion-de-asedio",
    nombre: "Ración de asedio",
    icono: "🍲",
    descripcion: "Garantiza la iniciativa y aumenta un 20 % el ataque físico y un 15 % la defensa.",
    coste: 36,
    nivelRequerido: 3,
    efectos: [
      { tipo: "iniciativa" },
      { tipo: "porcentaje", atributo: "ataque", porcentaje: 0.20 },
      { tipo: "porcentaje", atributo: "defensa", porcentaje: 0.15 },
    ],
  },
] as const satisfies readonly ComidaTaberna[];

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
        Math.floor(resultado[atributo] * (1 + efecto.porcentaje) + 1e-9)
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

export function comidaOtorgaIniciativa(comidaId: unknown): boolean {
  return obtenerComidaTaberna(comidaId)?.efectos.some(
    (efecto) => efecto.tipo === "iniciativa"
  ) ?? false;
}
