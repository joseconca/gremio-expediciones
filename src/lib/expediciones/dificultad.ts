export type ModoDificultad = "facil" | "normal" | "dificil";
export type IdRangoAmenaza = "I" | "II" | "III" | "IV" | "V";

export interface RangoAmenaza {
  id: IdRangoAmenaza;
  nombre: string;
  minimo: number;
  maximo: number;
  nivelBaseMinimo: number;
}

export const RANGOS_AMENAZA: readonly RangoAmenaza[] = [
  { id: "I", nombre: "Primeras amenazas", minimo: 1, maximo: 3, nivelBaseMinimo: 1 },
  { id: "II", nombre: "Criaturas organizadas", minimo: 4, maximo: 6, nivelBaseMinimo: 4 },
  { id: "III", nombre: "Monstruos mayores", minimo: 7, maximo: 9, nivelBaseMinimo: 7 },
  { id: "IV", nombre: "Amenazas de élite", minimo: 10, maximo: 12, nivelBaseMinimo: 10 },
  { id: "V", nombre: "Amenazas extraordinarias", minimo: 13, maximo: Number.POSITIVE_INFINITY, nivelBaseMinimo: 13 },
] as const;

export const CONFIGURACION_DIFICULTAD: Record<
  ModoDificultad,
  { nombre: string; vidaEnemigo: number; ataqueEnemigo: number; defensaEnemigo: number; multiplicadorRecompensa: number }
> = {
  facil: { nombre: "Fácil", vidaEnemigo: 0.8, ataqueEnemigo: 0.85, defensaEnemigo: 0.9, multiplicadorRecompensa: 0.85 },
  normal: { nombre: "Normal", vidaEnemigo: 1, ataqueEnemigo: 1, defensaEnemigo: 1, multiplicadorRecompensa: 1 },
  dificil: { nombre: "Difícil", vidaEnemigo: 1.25, ataqueEnemigo: 1.15, defensaEnemigo: 1.1, multiplicadorRecompensa: 1.25 },
};

export function esModoDificultad(valor: unknown): valor is ModoDificultad {
  return valor === "facil" || valor === "normal" || valor === "dificil";
}

export function obtenerRangoAmenaza(nivelAmenaza: number): RangoAmenaza {
  const nivel = Number.isFinite(nivelAmenaza) ? Math.max(1, Math.floor(nivelAmenaza)) : 1;
  return [...RANGOS_AMENAZA].reverse().find((rango) => nivel >= rango.minimo) ?? RANGOS_AMENAZA[0];
}

export function leerRangosAmenazaCompletados(valor: unknown): IdRangoAmenaza[] {
  if (!Array.isArray(valor)) return [];
  const validos = new Set<IdRangoAmenaza>(["I", "II", "III", "IV", "V"]);
  const encontrados = new Set<IdRangoAmenaza>();
  for (const item of valor) {
    if (typeof item === "string" && validos.has(item as IdRangoAmenaza)) encontrados.add(item as IdRangoAmenaza);
  }
  return RANGOS_AMENAZA.filter((rango) => encontrados.has(rango.id)).map((rango) => rango.id);
}

/** El rango siguiente exige nivel Base mínimo y una victoria Normal en el rango anterior. */
export function obtenerRangoMaximoDesbloqueado(nivelBase: number, rangosCompletados: unknown): RangoAmenaza {
  const nivel = Number.isFinite(nivelBase) ? Math.max(1, Math.floor(nivelBase)) : 1;
  const completados = new Set(leerRangosAmenazaCompletados(rangosCompletados));
  let resultado = RANGOS_AMENAZA[0];

  for (let indice = 1; indice < RANGOS_AMENAZA.length; indice += 1) {
    const siguiente = RANGOS_AMENAZA[indice];
    const anterior = RANGOS_AMENAZA[indice - 1];
    if (nivel < siguiente.nivelBaseMinimo || !completados.has(anterior.id)) break;
    resultado = siguiente;
  }

  return resultado;
}

/** Rango V sigue escalando con Base + 4, pero nunca por debajo de su nivel inicial 13. */
export function obtenerNivelMaximoAmenazaDesbloqueada(nivelBase: number, rangosCompletados: unknown): number {
  const nivel = Number.isFinite(nivelBase) ? Math.max(1, Math.floor(nivelBase)) : 1;
  const rango = obtenerRangoMaximoDesbloqueado(nivel, rangosCompletados);
  return rango.id === "V" ? Math.max(13, nivel + 4) : rango.maximo;
}

export function registrarVictoriaRangoNormal(rangosCompletados: unknown, nivelAmenaza: number): IdRangoAmenaza[] {
  const completados = new Set(leerRangosAmenazaCompletados(rangosCompletados));
  const nivel = Number.isFinite(nivelAmenaza) ? Math.floor(nivelAmenaza) : 0;

  // La amenaza 0 es una expedición segura, pero está fuera de los rangos I–V.
  // Tampoco debe desbloquearlos una amenaza inválida o inferior a 1.
  if (nivel < RANGOS_AMENAZA[0].minimo) {
    return RANGOS_AMENAZA.filter((rango) => completados.has(rango.id)).map((rango) => rango.id);
  }

  completados.add(obtenerRangoAmenaza(nivel).id);
  return RANGOS_AMENAZA.filter((rango) => completados.has(rango.id)).map((rango) => rango.id);
}

/** Factor limitado para que farmear amenazas muy inferiores no supere las expediciones apropiadas. */
export function calcularFactorExperienciaAmenaza(nivelAmenaza: number, nivelBase: number): number {
  const diferencia = Math.floor(nivelAmenaza) - Math.floor(nivelBase);
  if (diferencia <= -4) return 0.15;
  if (diferencia === -3) return 0.25;
  if (diferencia === -2) return 0.4;
  if (diferencia === -1) return 0.65;
  if (diferencia <= 2) return 1;
  if (diferencia <= 4) return 1.1;
  return 1.2;
}

/**
 * La XP Base depende del nivel de amenaza derrotado, no del nivel actual del
 * jugador: el mismo enemigo siempre conserva su recompensa, aunque el personaje
 * suba de nivel. Las criaturas más fuertes entregan más XP; el modo modifica el
 * pago, pero no hay una penalización adicional por diferencia de nivel.
 */
export function calcularExperienciaBaseGanada(nivelAmenaza: number, _nivelBase: number, modo: ModoDificultad): number {
  const nivelAmenazaSeguro = Number.isFinite(nivelAmenaza)
    ? Math.max(1, Math.floor(nivelAmenaza))
    : 1;
  const base = Math.max(1, Math.round(45 * Math.pow(nivelAmenazaSeguro, 1.05)));
  return Math.max(1, Math.floor(base * CONFIGURACION_DIFICULTAD[modo].multiplicadorRecompensa));
}

/**
 * La XP Job escala con la amenaza derrotada, no como porcentaje del umbral Job.
 * Su recompensa de referencia es menor que la Base y se ajusta por amenaza,
 * dificultad y resultado del combate.
 */
export function calcularExperienciaJobGanada(
  _nivelJob: number,
  nivelAmenaza: number,
  nivelBase: number,
  modo: ModoDificultad,
  factorResultado = 1
): number {
  const amenazaSegura = Number.isFinite(nivelAmenaza)
    ? Math.max(1, Math.floor(nivelAmenaza))
    : 1;
  const baseSeguro = Number.isFinite(nivelBase)
    ? Math.max(1, Math.floor(nivelBase))
    : 1;
  const base = Math.max(1, Math.round(23 * Math.pow(amenazaSegura, 1.05)));
  const resultadoSeguro = Number.isFinite(factorResultado)
    ? Math.max(0, Math.min(1, factorResultado))
    : 1;

  return Math.max(
    0,
    Math.floor(
      base *
        calcularFactorExperienciaAmenaza(amenazaSegura, baseSeguro) *
        CONFIGURACION_DIFICULTAD[modo].multiplicadorRecompensa *
        resultadoSeguro
    )
  );
}

/**
 * Escalado lineal global: amenaza 0 conserva las estadísticas base del catálogo.
 * La rareza y difMin determinan la selección del enemigo, no su factor de estadísticas.
 */
export function calcularMultiplicadoresEnemigo(nivelAmenaza: number, modo: ModoDificultad) {
  const amenazaSegura = Number.isFinite(nivelAmenaza) ? Math.max(0, Math.floor(nivelAmenaza)) : 0;
  // Trabajar desde porcentajes enteros reduce artefactos de coma flotante.
  const factorAmenaza = (100 + amenazaSegura * 30) / 100;
  const configuracion = CONFIGURACION_DIFICULTAD[modo];
  return {
    vida: factorAmenaza * configuracion.vidaEnemigo,
    ataque: factorAmenaza * configuracion.ataqueEnemigo,
    defensa: factorAmenaza * configuracion.defensaEnemigo,
  };
}

/**
 * El botín escala con la amenaza de la misión, sin depender del difMin de la especie.
 * El tope ×1,5 evita que el oro del enemigo descontrole la economía a niveles muy altos.
 */
export function calcularOroEnemigo(base: number, nivelAmenaza: number): number {
  const baseSegura = Number.isFinite(base) ? Math.max(0, Math.floor(base)) : 0;
  const amenazaSegura = Number.isFinite(nivelAmenaza) ? Math.max(0, Math.floor(nivelAmenaza)) : 0;
  const factorAmenaza = Math.min(1.5, 1 + amenazaSegura * 0.02);
  return Math.max(0, Math.floor(baseSegura * factorAmenaza));
}

export function aplicarMultiplicadorRecompensa(cantidad: number, modo: ModoDificultad): number {
  return Math.max(0, Math.floor(cantidad * CONFIGURACION_DIFICULTAD[modo].multiplicadorRecompensa));
}
