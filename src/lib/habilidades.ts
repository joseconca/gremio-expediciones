import type { DefinicionHabilidad } from "./tiposJuego";

export const HABILIDADES: DefinicionHabilidad[] = [
  // ============================================================
  // HABILIDADES ACTIVAS
  // ============================================================

  {
    id: "golpe_poderoso",
    nombre: "Golpe Poderoso",
    descripcion: "Realiza un ataque más potente de lo normal.",
    tipo: "activa",
    rareza: "basico",
    precio: 150,
    cooldownTurnos: 2,
    multiplicadorDano: 1.5,
  },

  {
    id: "golpe_preciso",
    nombre: "Golpe Preciso",
    descripcion:
      "Un ataque rápido con una mayor probabilidad de acertar un golpe crítico.",
    tipo: "activa",
    rareza: "comun",
    precio: 175,
    cooldownTurnos: 1,
    multiplicadorDano: 1.2,
    probabilidad: 0.15,
  },

  {
    id: "defensa_ferrea",
    nombre: "Defensa Férrea",
    descripcion: "Aumenta temporalmente la defensa del aventurero.",
    tipo: "activa",
    rareza: "comun",
    precio: 300,
    cooldownTurnos: 2,
    bonusDefensa: 5,
    duracionTurnos: 2,
  },

  {
    id: "curacion",
    nombre: "Curación",
    descripcion: "Recupera parte de los puntos de vida.",
    tipo: "activa",
    rareza: "comun",
    precio: 350,
    cooldownTurnos: 3,
    curacion: 30,
  },

  {
    id: "segundo_aire",
    nombre: "Segundo Aire",
    descripcion: "Recupera una gran cantidad de vida.",
    tipo: "activa",
    rareza: "raro",
    precio: 500,
    cooldownTurnos: 3,
    curacion: 50,
  },

  {
    id: "ataque_devastador",
    nombre: "Ataque Devastador",
    descripcion: "Un ataque extremadamente poderoso.",
    tipo: "activa",
    rareza: "epico",
    precio: 800,
    cooldownTurnos: 4,
    multiplicadorDano: 2.2,
  },

  // ============================================================
  // HABILIDADES PASIVAS
  // ============================================================

  {
    id: "piel_dura",
    nombre: "Piel Dura",
    descripcion: "Aumenta permanentemente la defensa.",
    tipo: "pasiva",
    rareza: "poco_comun",
    precio: 200,
    bonusDefensa: 2,
  },

  {
    id: "veterano",
    nombre: "Veterano",
    descripcion: "La experiencia en combate aumenta el ataque.",
    tipo: "pasiva",
    rareza: "poco_comun",
    precio: 350,
    bonusAtaque: 2,
  },

  {
    id: "precision",
    nombre: "Precisión",
    descripcion: "Aumenta la probabilidad de golpe crítico.",
    tipo: "pasiva",
    rareza: "raro",
    precio: 200,
    probabilidad: 0.20,
  },

  {
    id: "corredor",
    nombre: "Corredor",
    descripcion: "Aumenta la velocidad del aventurero.",
    tipo: "pasiva",
    rareza: "epico",
    precio: 350,
    bonusVelocidad: 5,
  },

  {
    id: "vitalidad",
    nombre: "Vitalidad",
    descripcion: "Aumenta la vida máxima.",
    tipo: "pasiva",
    rareza: "legendario",
    precio: 500,
    bonusHpMaximo: 80,
  },

  {
    id: "sed_de_batalla",
    nombre: "Sed de Batalla",
    descripcion: "Aumenta considerablemente el poder ofensivo.",
    tipo: "pasiva",
    rareza: "legendario",
    precio: 750,
    bonusAtaque: 5,
  },
];

export function obtenerHabilidadPorId(
  id: string
): DefinicionHabilidad | undefined {
  return HABILIDADES.find((habilidad) => habilidad.id === id);
}

export function obtenerHabilidadesActivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "activa");
}

export function obtenerHabilidadesPasivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "pasiva");
}
