import type { DefinicionObjeto } from "./tiposJuego";
import type { ModificadoresEstadisticas } from "./estadisticasPersonaje";

export function calcularEstadisticasObjeto(
  objeto: DefinicionObjeto,
  nivelMejora: number
): ModificadoresEstadisticas {
  const nivelSeguro = Math.max(0, Math.floor(nivelMejora));

  return {
    hpMaximo:
      (objeto.hpMaximoBase ?? 0) +
      (objeto.hpMaximoPorMejora ?? 0) * nivelSeguro,
    ataque:
      (objeto.ataqueBase ?? 0) + (objeto.ataquePorMejora ?? 0) * nivelSeguro,
    defensa:
      (objeto.defensaBase ?? 0) + (objeto.defensaPorMejora ?? 0) * nivelSeguro,
    velocidad:
      (objeto.velocidadBase ?? 0) +
      (objeto.velocidadPorMejora ?? 0) * nivelSeguro,
    capacidadCarruaje:
      (objeto.capacidadCarruajeBase ?? 0) +
      (objeto.capacidadCarruajePorMejora ?? 0) * nivelSeguro,
    probCritico:
      (objeto.probCriticoBase ?? 0) +
      (objeto.probCriticoPorMejora ?? 0) * nivelSeguro,
    danoCritico:
      (objeto.danoCriticoBase ?? 0) +
      (objeto.danoCriticoPorMejora ?? 0) * nivelSeguro,
  };
}

export const OBJETOS: DefinicionObjeto[] = [
  // ============================================================
  // CONSUMIBLES
  // ============================================================

  {
    id: "pocion",
    nombre: "Poción",
    tipo: "consumible",
    descripcion: "Recupera 30 puntos de vida.",
    rareza: "comun",
    precio: 25,
    curacion: 30,
    limiteCantidad: 3,
  },

  {
    id: "pocion_grande",
    nombre: "Poción Grande",
    tipo: "consumible",
    descripcion: "Recupera 60 puntos de vida.",
    rareza: "poco_comun",
    precio: 60,
    curacion: 60,
    limiteCantidad: 3,
  },

  // ============================================================
  // ARMAS
  // ============================================================

  {
    id: "espada_madera",
    nombre: "Un palo de madera",
    tipo: "arma",
    subtipo: "espada",
    descripcion: "Una rama sencilla y nada fiable.",
    rareza: "basico",
    precio: 100,
    ataqueBase: 1,
    ataquePorMejora: 0.5,
  },

  {
    id: "espada_hierro",
    nombre: "Espada de Hierro",
    tipo: "arma",
    subtipo: "espada",
    descripcion: "Una espada sencilla pero fiable.",
    rareza: "comun",
    precio: 1000,
    ataqueBase: 4,
    ataquePorMejora: 1,
  },

  {
    id: "espada_acero",
    nombre: "Espada de Acero",
    tipo: "arma",
    subtipo: "espada",
    descripcion: "Una espada resistente y bien equilibrada.",
    rareza: "poco_comun",
    precio: 12500,
    ataqueBase: 9,
    ataquePorMejora: 2,
  },

  {
    id: "espada_runa",
    nombre: "Espada Rúnica",
    tipo: "arma",
    subtipo: "espada",
    descripcion: "Una espada imbuida con poder mágico.",
    rareza: "raro",
    precio: 146000,
    ataqueBase: 10,
    ataquePorMejora: 2.5,
    velocidadPorMejora: 0.5,
  },
  {
    id: "hacha_orca",
    nombre: "Hacha Orca",
    tipo: "arma",
    subtipo: "hacha",
    descripcion: "Un hacha robusta utilizada por los orcos.",
    rareza: "raro",
    precio: 12000,
    ataqueBase: 5,
    ataquePorMejora: 1,
    probCriticoBase: 0.05,
    probCriticoPorMejora: 0.02,
    velocidadBase: -1,
    velocidadPorMejora: 0.1,
  },

  // ============================================================
  // ARMADURAS
  // ============================================================

  {
    id: "tela_andrajosa",
    nombre: "Tela Andrajosa",
    tipo: "armadura",
    descripcion: "Protección para tapar vergüenzas.",
    rareza: "basico",
    precio: 100,
    defensaBase: 1,
    defensaPorMejora: 0.5,
  },
  {
    id: "armadura_cuero",
    nombre: "Armadura de Cuero",
    tipo: "armadura",
    descripcion: "Protección ligera para aventureros.",
    rareza: "comun",
    precio: 1100,
    defensaBase: 4,
    defensaPorMejora: 1,
  },

  {
    id: "armadura_hierro",
    nombre: "Armadura de Hierro",
    tipo: "armadura",
    descripcion: "Una armadura pesada y resistente.",
    rareza: "poco_comun",
    precio: 12500,
    defensaBase: 9,
    defensaPorMejora: 2,
    velocidadBase: -2,
  },

  {
    id: "armadura_acero",
    nombre: "Armadura de Acero",
    tipo: "armadura",
    descripcion: "Protección de gran calidad.",
    rareza: "raro",
    precio: 146000,
    defensaBase: 12,
    defensaPorMejora: 3,
    velocidadBase: -4,
  },

  // ============================================================
  // ACCESORIOS
  // ============================================================

  {
    id: "anillo_viajero",
    nombre: "Anillo del Viajero",
    tipo: "accesorio",
    descripcion: "Aumenta ligeramente la velocidad.",
    rareza: "poco_comun",
    precio: 20000,
    velocidadBase: 2,
    velocidadPorMejora: 0.5,
  },

  {
    id: "amuleto_vitalidad",
    nombre: "Amuleto de Vitalidad",
    tipo: "accesorio",
    descripcion: "Aumenta la vida máxima del aventurero.",
    rareza: "raro",
    precio: 55000,
    hpMaximoBase: 20,
    hpMaximoPorMejora: 5,
  },

  {
    id: "anillo_maldito",
    nombre: "Anillo Maldito",
    tipo: "accesorio",
    descripcion: "Un anillo que maldice a su portador.",
    rareza: "epico",
    precio: 500000,

    ataqueBase: -10,
    hpMaximoBase: -50,
    defensaBase: -10,
    velocidadBase: -10,

    ataquePorMejora: 1.5,
    hpMaximoPorMejora: 7.5,
    defensaPorMejora: 1.5,
    velocidadPorMejora: 1.5,
  },
];

export function obtenerObjetoPorId(id: string): DefinicionObjeto | undefined {
  return OBJETOS.find((objeto) => objeto.id === id);
}

export function obtenerObjetosPorTipo(
  tipo: DefinicionObjeto["tipo"]
): DefinicionObjeto[] {
  return OBJETOS.filter((objeto) => objeto.tipo === tipo);
}

export function obtenerObjetosConsumibles(): DefinicionObjeto[] {
  return obtenerObjetosPorTipo("consumible");
}

export function obtenerObjetosEquipables(): DefinicionObjeto[] {
  return OBJETOS.filter((objeto) =>
    ["arma", "armadura", "accesorio"].includes(objeto.tipo)
  );
}

export function calcularCosteMejoraObjeto(
  precioObjeto: number,
  nivelMejora: number
): number {
  return Math.ceil(precioObjeto * 5 * (nivelMejora + 1));
}