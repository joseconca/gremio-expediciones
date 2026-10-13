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
  efecto: EfectoComida;
}

/**
 * Las comidas son preparaciones de un solo uso. Se compran en la taberna y su
 * identificador queda guardado hasta iniciar la siguiente expedición de combate.
 */
export const COMIDAS_TABERNA: readonly ComidaTaberna[] = [
  {
    id: "carne-cazadora",
    nombre: "Carne del cazador",
    icono: "🍖",
    descripcion: "Aumenta un 10 % el ataque físico durante la expedición.",
    coste: 8,
    efecto: { tipo: "porcentaje", atributo: "ataque", porcentaje: 0.10 },
  },
  {
    id: "caldo-guardian",
    nombre: "Caldo del guardián",
    icono: "🥣",
    descripcion: "Aumenta un 10 % la defensa física durante la expedición.",
    coste: 10,
    efecto: { tipo: "porcentaje", atributo: "defensa", porcentaje: 0.10 },
  },
  {
    id: "setas-arcanas",
    nombre: "Setas arcanas",
    icono: "🍄",
    descripcion: "Aumenta un 10 % el ataque mágico durante la expedición.",
    coste: 10,
    efecto: { tipo: "porcentaje", atributo: "ataqueMagico", porcentaje: 0.10 },
  },
  {
    id: "raices-vigorizantes",
    nombre: "Raíces vigorizantes",
    icono: "🥕",
    descripcion: "Aumenta un 10 % la velocidad durante la expedición.",
    coste: 10,
    efecto: { tipo: "porcentaje", atributo: "velocidad", porcentaje: 0.10 },
  },
  {
    id: "brocheta-especiada",
    nombre: "Brocheta especiada",
    icono: "🍢",
    descripcion: "Añade 10 puntos porcentuales a la probabilidad de crítico.",
    coste: 12,
    efecto: { tipo: "critico", incremento: 0.10 },
  },
  {
    id: "desayuno-explorador",
    nombre: "Desayuno del explorador",
    icono: "🍳",
    descripcion: "Te garantiza la iniciativa en el primer combate de la expedición.",
    coste: 15,
    efecto: { tipo: "iniciativa" },
  },
] as const;

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

  if (comida.efecto.tipo === "porcentaje") {
    const atributo = comida.efecto.atributo;
    resultado[atributo] = Math.max(
      atributo === "defensa" ? 0 : 1,
      Math.floor(resultado[atributo] * (1 + comida.efecto.porcentaje))
    );
  } else if (comida.efecto.tipo === "critico") {
    resultado.probCritico = Math.min(
      0.75,
      resultado.probCritico + comida.efecto.incremento
    );
  }

  return resultado;
}

export function comidaOtorgaIniciativa(comidaId: unknown): boolean {
  return obtenerComidaTaberna(comidaId)?.efecto.tipo === "iniciativa";
}
