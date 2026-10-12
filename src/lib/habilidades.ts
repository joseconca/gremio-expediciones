import type { DefinicionHabilidad } from "./tiposJuego";
import { puedeUsarHabilidadDeClase } from "./progresion/clases";

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
    cooldownTurnos: 2,

    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.5,
  },

  {
    id: "golpe_preciso",
    nombre: "Golpe Preciso",
    descripcion: "Ataque potenciado con mayor probabilidad de hacer golpe crítico.",
    tipo: "activa",
    rareza: "comun",
    precio: 1175,
    cooldownTurnos: 2,

    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.3,
    multiplicadorCritico: 0.5,
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
    cooldownTurnos: 5,

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
    cooldownTurnos: 6,

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
  // HABILIDADES PROFESIONALES (catálogo inicial)
  // ============================================================

  {
    id: "estocada_espadachin",
    claseId: "espadachin",
    nivelJobRequerido: 1,
    costePuntosHabilidad: 1,
    nombre: "Estocada",
    descripcion: "Una estocada precisa que concentra la fuerza del Espadachín.",
    tipo: "activa",
    rareza: "basico",
    precio: 0,
    costeEnergia: 5,
    cooldownTurnos: 2,
    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.4,
  },
  {
    id: "luz_acolito",
    claseId: "acolito",
    nivelJobRequerido: 1,
    costePuntosHabilidad: 1,
    nombre: "Luz Sanadora",
    descripcion: "Una plegaria sencilla que restaura la salud.",
    tipo: "activa",
    rareza: "basico",
    precio: 0,
    costeMana: 6,
    cooldownTurnos: 3,
    efecto: "curacion",
    animacion: "curacion",
    curacion: 18,
  },
  {
    id: "disparo_arquero",
    claseId: "arquero",
    nivelJobRequerido: 1,
    costePuntosHabilidad: 1,
    nombre: "Disparo Preciso",
    descripcion: "Un disparo calculado que aprovecha la destreza del Arquero.",
    tipo: "activa",
    rareza: "basico",
    precio: 0,
    costeEnergia: 5,
    cooldownTurnos: 2,
    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.5,
    probabilidadCritico: 0.1,
  },
  {
    id: "chispa_mago",
    claseId: "mago",
    nivelJobRequerido: 1,
    costePuntosHabilidad: 1,
    nombre: "Chispa Arcana",
    descripcion: "Un proyectil mágico que inflige daño arcano.",
    tipo: "activa",
    rareza: "basico",
    precio: 0,
    costeMana: 7,
    cooldownTurnos: 2,
    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.6,
  },
  {
    id: "guardia_caballero",
    claseId: "caballero",
    nivelJobRequerido: 1,
    costePuntosHabilidad: 1,
    nombre: "Guardia del Caballero",
    descripcion: "Adopta una postura defensiva durante varios turnos.",
    tipo: "activa",
    rareza: "comun",
    precio: 0,
    costeEnergia: 8,
    cooldownTurnos: 4,
    efecto: "bonus_defensa",
    animacion: "defensiva",
    bonusDefensa: 12,
    duracionTurnos: 3,
  },
  {
    id: "bendicion_sacerdote",
    claseId: "sacerdote",
    nivelJobRequerido: 1,
    costePuntosHabilidad: 1,
    nombre: "Bendición",
    descripcion: "Una bendición que restaura la salud del aventurero.",
    tipo: "activa",
    rareza: "comun",
    precio: 0,
    costeMana: 10,
    cooldownTurnos: 4,
    efecto: "curacion",
    animacion: "curacion",
    curacion: 28,
  },
  {
    id: "golpe_cruzado",
    claseId: "cruzado",
    nivelJobRequerido: 1,
    costePuntosHabilidad: 1,
    nombre: "Golpe Cruzado",
    descripcion: "Un ataque que combina disciplina marcial y convicción.",
    tipo: "activa",
    rareza: "raro",
    precio: 0,
    costeEnergia: 8,
    costeMana: 4,
    cooldownTurnos: 3,
    efecto: "dano",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1.9,
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

/**
 * Devuelve habilidades accesibles para la profesión actual.
 * Las definiciones antiguas sin clase propietaria siguen siendo globales mientras se migran.
 */
export function obtenerHabilidadesDisponiblesParaClase(
  claseActualId: string
): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) =>
    puedeUsarHabilidadDeClase(claseActualId, habilidad.claseId)
  );
}

export function obtenerHabilidadesActivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "activa");
}

export function obtenerHabilidadesPasivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "pasiva");
}
