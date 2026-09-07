import type { DefinicionEnemigo } from "./tiposJuego";

export const ENEMIGOS: DefinicionEnemigo[] = [
  {
    id: "slime_acido",
    nombre: "Slime Ácido",
    hp: 8,
    ataque: 1,
    defensa: 5,
    botin: 3,
    difMin: 0,
    rareza: "comun",
  },

  {
    id: "rata_gigante",
    nombre: "Rata Gigante",
    hp: 10,
    ataque: 2,
    defensa: 6,
    botin: 4,
    difMin: 0,
    rareza: "comun",
  },

  {
    id: "goblin_explorador",
    nombre: "Goblin Explorador",
    hp: 12,
    ataque: 2,
    defensa: 8,
    botin: 6,
    difMin: 2,
    rareza: "comun",
  },

  {
    id: "bandido_camino",
    nombre: "Bandido del Camino",
    hp: 15,
    ataque: 3,
    defensa: 9,
    botin: 10,
    difMin: 2,
    rareza: "poco_comun",
  },

  {
    id: "orco_despiadado",
    nombre: "Orco Despiadado",
    hp: 20,
    ataque: 4,
    defensa: 11,
    botin: 15,
    difMin: 4,
    rareza: "poco_comun",
  },

  {
    id: "esqueleto_guerrero",
    nombre: "Esqueleto Guerrero",
    hp: 18,
    ataque: 4,
    defensa: 12,
    botin: 12,
    difMin: 4,
    rareza: "poco_comun",
  },

  {
    id: "arana_sombras",
    nombre: "Araña de las Sombras",
    hp: 25,
    ataque: 5,
    defensa: 10,
    botin: 18,
    difMin: 5,
    rareza: "raro",
  },

  {
    id: "troll_cavernas",
    nombre: "Troll de las Cavernas",
    hp: 35,
    ataque: 6,
    defensa: 13,
    botin: 30,
    difMin: 6,
    rareza: "raro",
  },

  {
    id: "minotauro",
    nombre: "Minotauro",
    hp: 45,
    ataque: 7,
    defensa: 14,
    botin: 40,
    difMin: 7,
    rareza: "epico",
  },
];

export const JEFES_ELITE: DefinicionEnemigo[] = [
  {
    id: "senor_frontera",
    nombre: "Señor de la Frontera",
    hp: 70,
    ataque: 9,
    defensa: 16,
    botin: 150,
    difMin: 3,
    rareza: "legendario",
  },

  {
    id: "reina_sombras",
    nombre: "Reina de las Sombras",
    hp: 62,
    ataque: 11,
    defensa: 14,
    botin: 150,
    difMin: 3,
    rareza: "legendario",
  },

  {
    id: "titan_hierro",
    nombre: "Titán de Hierro",
    hp: 85,
    ataque: 8,
    defensa: 18,
    botin: 150,
    difMin: 3,
    rareza: "legendario",
  },

  {
    id: "dragon_bosque_verde",
    nombre: "Dragón del Bosque Verde",
    hp: 76,
    ataque: 12,
    defensa: 15,
    botin: 150,
    difMin: 3,
    rareza: "legendario",
  },
];

export function obtenerEnemigoPorId(
  id: string
): DefinicionEnemigo | undefined {
  return [...ENEMIGOS, ...JEFES_ELITE].find(
    (enemigo) => enemigo.id === id
  );
}

export function obtenerEnemigosPorDificultad(
  dificultad: number
): DefinicionEnemigo[] {
  return ENEMIGOS.filter(
    (enemigo) => enemigo.difMin <= dificultad
  );
}
/* ANTIGUAS LISTAS:
const listaMonstruos = [
  {
    id: "slime",
    nombre: "Slime Ácido",
    hp: 8,
    ataque: 1,
    defensa: 5,
    botin: 3,
    difMin: 0,
  },
  {
    id: "rata",
    nombre: "Rata Gigante",
    hp: 10,
    ataque: 2,
    defensa: 6,
    botin: 4,
    difMin: 0,
  },
  {
    id: "goblin",
    nombre: "Goblin Explorador",
    hp: 12,
    ataque: 2,
    defensa: 8,
    botin: 6,
    difMin: 2,
  },
  {
    id: "bandido",
    nombre: "Bandido del Camino",
    hp: 15,
    ataque: 3,
    defensa: 9,
    botin: 10,
    difMin: 2,
  },
  {
    id: "orco",
    nombre: "Orco Despiadado",
    hp: 20,
    ataque: 4,
    defensa: 11,
    botin: 15,
    difMin: 4,
  },
  {
    id: "esqueleto",
    nombre: "Esqueleto Guerrero",
    hp: 18,
    ataque: 4,
    defensa: 12,
    botin: 12,
    difMin: 4,
  },
  {
    id: "arana",
    nombre: "Araña de las Sombras",
    hp: 25,
    ataque: 5,
    defensa: 10,
    botin: 18,
    difMin: 5,
  },
  {
    id: "troll",
    nombre: "Troll de las Cavernas",
    hp: 35,
    ataque: 6,
    defensa: 13,
    botin: 30,
    difMin: 6,
  },
  {
    id: "minotauro",
    nombre: "Minotauro",
    hp: 45,
    ataque: 7,
    defensa: 14,
    botin: 40,
    difMin: 7,
  },
];

const jefesElite = [
  {
    id: "senor-frontera",
    nombre: "Señor de la Frontera",
    hp: 70,
    ataque: 9,
    defensa: 16,
    botin: 150,
    difMin: 3,
  },
  {
    id: "reina-arana",
    nombre: "Reina de las Sombras",
    hp: 62,
    ataque: 11,
    defensa: 14,
    botin: 150,
    difMin: 3,
  },
  {
    id: "titan-hierro",
    nombre: "Titán de Hierro",
    hp: 85,
    ataque: 8,
    defensa: 18,
    botin: 150,
    difMin: 3,
  },
  {
    id: "dragon-verde",
    nombre: "Dragón del Bosque Verde",
    hp: 76,
    ataque: 12,
    defensa: 15,
    botin: 150,
    difMin: 3,
  },
];*/