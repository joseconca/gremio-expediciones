import type { DefinicionEnemigo } from "./tiposJuego";

export const ENEMIGOS: DefinicionEnemigo[] = [
  {
    id: "slime_acido",
    nombre: "Slime Ácido",
    hp: 40,
    ataque: 7,
    defensa: 2,
    velocidad: 3,
    botin: 13,
    difMin: 0,
    rareza: "comun",
  },

  {
    id: "rata_gigante",
    nombre: "Rata Gigante",
    hp: 35,
    ataque: 6,
    defensa: 3,
    velocidad: 12,
    botin: 18,
    difMin: 1,
    rareza: "comun",
  },

  {
    id: "goblin_explorador",
    nombre: "Goblin Explorador",
    hp: 65,
    ataque: 8,
    defensa: 3,
    velocidad: 11,
    botin: 25,
    difMin: 2,
    rareza: "comun",
  },

  {
    id: "bandido_camino",
    nombre: "Bandido del Camino",
    hp: 80,
    ataque: 9,
    defensa: 6,
    velocidad: 10,
    botin: 33,
    difMin: 3,
    rareza: "poco_comun",
  },

  {
    id: "orco_despiadado",
    nombre: "Orco Despiadado",
    hp: 95,
    ataque: 18,
    defensa: 13,
    velocidad: 5,
    botin: 45,
    difMin: 4,
    rareza: "poco_comun",
  },

  {
    id: "esqueleto_guerrero",
    nombre: "Esqueleto Guerrero",
    hp: 90,
    ataque: 15,
    defensa: 17,
    velocidad: 6,
    botin: 40,
    difMin: 4,
    rareza: "poco_comun",
  },

  {
    id: "arana_sombras",
    nombre: "Araña de las Sombras",
    hp: 110,
    ataque: 21,
    defensa: 13,
    velocidad: 18,
    botin: 53,
    difMin: 5,
    rareza: "raro",
  },

  {
    id: "troll_cavernas",
    nombre: "Troll de las Cavernas",
    hp: 145,
    ataque: 17,
    defensa: 10,
    velocidad: 5,
    botin: 62,
    difMin: 6,
    rareza: "raro",
  },

  {
    id: "minotauro",
    nombre: "Minotauro",
    hp: 165,
    ataque: 28,
    defensa: 19,
    velocidad: 8,
    botin: 77,
    difMin: 7,
    rareza: "epico",
  },
];

export const JEFES_ELITE: DefinicionEnemigo[] = [
  {
    id: "senor_frontera",
    nombre: "Señor de la Frontera",
    hp: 220,
    ataque: 30,
    defensa: 20,
    velocidad: 7,
    botin: 200,
    difMin: 3,
    rareza: "legendario",
  },

  {
    id: "reina_sombras",
    nombre: "Reina de las Sombras",
    hp: 190,
    ataque: 34,
    defensa: 17,
    velocidad: 13,
    botin: 200,
    difMin: 3,
    rareza: "legendario",
  },

  {
    id: "titan_hierro",
    nombre: "Titán de Hierro",
    hp: 260,
    ataque: 28,
    defensa: 23,
    velocidad: 4,
    botin: 225,
    difMin: 3,
    rareza: "legendario",
  },

  {
    id: "dragon_bosque_verde",
    nombre: "Dragón del Bosque Verde",
    hp: 230,
    ataque: 36,
    defensa: 20,
    velocidad: 10,
    botin: 250,
    difMin: 3,
    rareza: "legendario",
  },
];

export function obtenerEnemigoPorId(id: string): DefinicionEnemigo | undefined {
  return [...ENEMIGOS, ...JEFES_ELITE].find((enemigo) => enemigo.id === id);
}

export function obtenerEnemigosPorDificultad(
  dificultad: number
): DefinicionEnemigo[] {
  return ENEMIGOS.filter((enemigo) => enemigo.difMin <= dificultad);
}
