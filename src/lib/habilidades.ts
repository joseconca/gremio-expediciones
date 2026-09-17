import type { DefinicionHabilidad } from "./tiposJuego";

export const HABILIDADES: DefinicionHabilidad[] = [
  // ============================================================
  // HABILIDADES ACTIVAS
  // ============================================================

  {
    id: "golpe_poderoso",
    nombre: "Golpe Poderoso",
    descripcion: "Ataque potenciado.",
    tipo: "activa",
    rareza: "basico",
    precio: 850,
    cooldownTurnos: 1,

    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.5,
    multiplicadorCritico: 0.5,
  },

  {
    id: "golpe_preciso",
    nombre: "Golpe Preciso",
    descripcion: "Ataque con mayor probabilidad de hacer golpe crítico.",
    tipo: "activa",
    rareza: "comun",
    precio: 1175,
    cooldownTurnos: 1,

    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.2,
    multiplicadorCritico: 0.25,
    probabilidadCritico: 0.25,
  },

  {
    id: "defensa_ferrea",
    nombre: "Defensa Férrea",
    descripcion: "Aumenta temporalmente la defensa.",
    tipo: "activa",
    rareza: "comun",
    precio: 1300,
    cooldownTurnos: 4,

    efecto: "bonus_defensa",
    animacion: "defensiva",
    bonusDefensa: 15,
    duracionTurnos: 4,
  },

  {
    id: "curacion",
    nombre: "Curación",
    descripcion: "Recupera parte de los puntos de vida.",
    tipo: "activa",
    rareza: "comun",
    precio: 1350,
    cooldownTurnos: 2,

    efecto: "curacion",
    animacion: "curacion",
    curacion: 30,
    multiplicadorCritico: 1.5,
  },

  {
    id: "segundo_aire",
    nombre: "Segundo Aire",
    descripcion: "Recupera una gran cantidad de vida.",
    tipo: "activa",
    rareza: "raro",
    precio: 2100,
    cooldownTurnos: 3,

    efecto: "curacion",
    animacion: "curacion",
    curacion: 60,
    multiplicadorCritico: 1.5,
  },

  {
    id: "ataque_devastador",
    nombre: "Ataque Devastador",
    descripcion: "Un ataque extremadamente poderoso.",
    tipo: "activa",
    rareza: "epico",
    precio: 3800,
    cooldownTurnos: 4,

    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 2.2,
    multiplicadorCritico: 0.5,
  },

  // ============================================================
  // HABILIDADES PASIVAS
  // ============================================================

  {
    id: "piel_dura",
    nombre: "Piel Dura",
    descripcion: "Aumenta la defensa.",
    tipo: "pasiva",
    rareza: "poco_comun",
    precio: 2200,
    bonusDefensa: 8,
  },

  {
    id: "veterano",
    nombre: "Veterano",
    descripcion: "La experiencia en combate aumenta el ataque y la defensa.",
    tipo: "pasiva",
    rareza: "raro",
    precio: 3350,
    bonusAtaque: 5,
    bonusDefensa: 5,
  },

  {
    id: "precision",
    nombre: "Precisión",
    descripcion: "Aumenta la probabilidad de golpe crítico.",
    tipo: "pasiva",
    rareza: "raro",
    precio: 3200,
    probabilidadCritico: 0.20,
  },

  {
    id: "corredor",
    nombre: "Corredor",
    descripcion: "Aumenta la velocidad.",
    tipo: "pasiva",
    rareza: "epico",
    precio: 3350,
    bonusVelocidad: 10,
  },

  {
    id: "vitalidad",
    nombre: "Vitalidad",
    descripcion: "Aumenta la vida máxima.",
    tipo: "pasiva",
    rareza: "legendario",
    precio: 5500,
    bonusHpMaximo: 200,
  },

  {
    id: "sed_de_batalla",
    nombre: "Sed de Batalla",
    descripcion: "Aumenta considerablemente el poder ofensivo.",
    tipo: "pasiva",
    rareza: "legendario",
    precio: 5750,
    bonusAtaque: 20,
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
