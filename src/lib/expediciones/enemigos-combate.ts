import type { DefinicionEnemigo, EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import type { ModoDificultad } from "@/lib/expediciones/dificultad";
import { calcularMultiplicadoresEnemigo } from "@/lib/expediciones/dificultad";
import { posicionDesdeIndiceCasilla } from "@/lib/expediciones/objetivos-combate";

/** Snapshot persistido por enemigo: las acciones usan este estado como fuente de verdad. */
export interface EnemigoEnCombate {
  id: string;
  enemigoId: string;
  nombre: string;
  difMin: number;
  casilla: number;
  posicion: "mele" | "centro" | "retaguardia";
  columna: number;
  hp: number;
  hpMaximo: number;
  ataque: number;
  ataqueMagico: number;
  defensa: number;
  defensaMagica: number;
  velocidad: number;
  probCritico: number;
  danoCritico: number;
  precision: number;
  evasion: number;
  nivel: number;
  efectos: EstadoEfectoHabilidad[];
}

/**
 * Congela el grupo al crear el combate. Cada criatura escala con su difMin,
 * no con la amenaza solicitada, de modo que un acompañante inferior es realmente
 * más débil. Los turnos y el loot usan el snapshot hasta el final del combate.
 */
export function crearEnemigosEnCombate(
  definiciones: DefinicionEnemigo[],
  modo: ModoDificultad,
): EnemigoEnCombate[] {
  if (definiciones.length < 1 || definiciones.length > 9) {
    throw new RangeError("Un combate debe contener entre uno y nueve enemigos.");
  }

  return definiciones.map((enemigo, indice) => {
    const casilla = indice;
    const { posicion, columna } = posicionDesdeIndiceCasilla(casilla);
    const multiplicadores = calcularMultiplicadoresEnemigo(enemigo.difMin, modo);
    const hpMaximo = Math.max(1, Math.floor(enemigo.hp * multiplicadores.vida));
    return {
      id: "enemigo-" + (indice + 1),
      enemigoId: enemigo.id,
      nombre: enemigo.nombre,
      difMin: enemigo.difMin,
      casilla,
      posicion,
      columna,
      hp: hpMaximo,
      hpMaximo,
      ataque: Math.max(1, Math.floor(enemigo.ataque * multiplicadores.ataque)),
      ataqueMagico: Math.max(1, Math.floor((enemigo.ataqueMagico ?? enemigo.ataque) * multiplicadores.ataque)),
      defensa: Math.max(0, Math.floor(enemigo.defensa * multiplicadores.defensa)),
      defensaMagica: Math.max(0, Math.floor((enemigo.defensaMagica ?? enemigo.defensa) * multiplicadores.defensa)),
      velocidad: Math.max(1, Math.floor(enemigo.velocidad)),
      probCritico: 0.1,
      danoCritico: 2,
      precision: 75,
      evasion: 0,
      nivel: Math.max(0, enemigo.difMin),
      efectos: [],
    };
  });
}

export interface CamposEnemigoLegacy {
  enemigoId?: string | null;
  enemigoNombre?: string | null;
  enemigoHp?: number | null;
  enemigoHpMaximo?: number | null;
  enemigoAtaque?: number | null;
  enemigoAtaqueMagico?: number | null;
  enemigoDefensa?: number | null;
  enemigoDefensaMagica?: number | null;
  enemigoVelocidad?: number | null;
  enemigoProbCritico?: number | null;
  enemigoDanoCritico?: number | null;
  enemigoPrecision?: number | null;
  enemigoEvasion?: number | null;
  enemigoNivel?: number | null;
  enemigoPosicion?: string | null;
  efectos?: unknown;
}

export function crearEnemigoLegacy(campos: CamposEnemigoLegacy): EnemigoEnCombate | null {
  if (
    !campos.enemigoId ||
    !campos.enemigoNombre ||
    typeof campos.enemigoHp !== "number" ||
    typeof campos.enemigoHpMaximo !== "number" ||
    typeof campos.enemigoAtaque !== "number" ||
    typeof campos.enemigoDefensa !== "number" ||
    typeof campos.enemigoVelocidad !== "number" ||
    typeof campos.enemigoProbCritico !== "number" ||
    typeof campos.enemigoDanoCritico !== "number" ||
    typeof campos.enemigoNivel !== "number"
  ) return null;

  const posicion = campos.enemigoPosicion === "mele" ||
    campos.enemigoPosicion === "retaguardia" ||
    campos.enemigoPosicion === "centro"
      ? campos.enemigoPosicion
      : "centro";
  const columna = 1;
  const casilla = posicion === "mele" ? 1 : posicion === "centro" ? 4 : 7;
  const efectos = Array.isArray(campos.efectos)
    ? campos.efectos as EstadoEfectoHabilidad[]
    : [];
  return {
    id: "enemigo-1",
    enemigoId: campos.enemigoId,
    nombre: campos.enemigoNombre,
    difMin: Math.max(0, campos.enemigoNivel),
    casilla,
    posicion,
    columna,
    hp: campos.enemigoHp,
    hpMaximo: campos.enemigoHpMaximo,
    ataque: campos.enemigoAtaque,
    ataqueMagico: campos.enemigoAtaqueMagico ?? campos.enemigoAtaque,
    defensa: campos.enemigoDefensa,
    defensaMagica: campos.enemigoDefensaMagica ?? campos.enemigoDefensa,
    velocidad: campos.enemigoVelocidad,
    probCritico: campos.enemigoProbCritico,
    danoCritico: campos.enemigoDanoCritico,
    precision: campos.enemigoPrecision ?? 75,
    evasion: campos.enemigoEvasion ?? 0,
    nivel: campos.enemigoNivel,
    efectos,
  };
}

export function leerEnemigosEnCombate(valor: unknown): EnemigoEnCombate[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is EnemigoEnCombate => {
    if (!item || typeof item !== "object") return false;
    const e = item as Partial<EnemigoEnCombate>;
    return typeof e.id === "string" &&
      typeof e.enemigoId === "string" &&
      typeof e.nombre === "string" &&
      typeof e.hp === "number" &&
      typeof e.hpMaximo === "number" &&
      typeof e.ataque === "number" &&
      typeof e.defensa === "number" &&
      typeof e.casilla === "number";
  }).map((enemigo) => ({
    ...enemigo,
    efectos: Array.isArray(enemigo.efectos) ? enemigo.efectos : [],
  }));
}

export function obtenerEnemigoVivoPorId(
  enemigos: EnemigoEnCombate[],
  id?: string | null,
): EnemigoEnCombate | null {
  const vivos = enemigos.filter((enemigo) => enemigo.hp > 0);
  if (id) return vivos.find((enemigo) => enemigo.id === id) ?? null;
  return [...vivos].sort((a, b) => a.casilla - b.casilla)[0] ?? null;
}
