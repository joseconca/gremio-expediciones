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
    id: "espada_hierro",
    nombre: "Espada de Hierro",
    tipo: "arma",
    subtipo: "espada",
    descripcion: "Una espada sencilla pero fiable.",
    rareza: "comun",
    precio: 100,
    ataqueBase: 3,
    ataquePorMejora: 1,
  },

  {
    id: "espada_acero",
    nombre: "Espada de Acero",
    tipo: "arma",
    subtipo: "espada",
    descripcion: "Una espada resistente y bien equilibrada.",
    rareza: "poco_comun",
    precio: 250,
    ataqueBase: 7,
    ataquePorMejora: 2,
  },

  {
    id: "espada_runa",
    nombre: "Espada Rúnica",
    tipo: "arma",
    subtipo: "espada",
    descripcion: "Una espada imbuida con poder mágico.",
    rareza: "raro",
    precio: 600,
    ataqueBase: 12,
    ataquePorMejora: 3,
    velocidadPorMejora: 0.5,
  },

  // ============================================================
  // ARMADURAS
  // ============================================================

  {
    id: "armadura_cuero",
    nombre: "Armadura de Cuero",
    tipo: "armadura",
    descripcion: "Protección ligera para aventureros.",
    rareza: "comun",
    precio: 100,
    defensaBase: 3,
    defensaPorMejora: 1,
  },

  {
    id: "armadura_hierro",
    nombre: "Armadura de Hierro",
    tipo: "armadura",
    descripcion: "Una armadura pesada y resistente.",
    rareza: "poco_comun",
    precio: 250,
    defensaBase: 7,
    defensaPorMejora: 2,
    velocidadBase: -3,
  },

  {
    id: "armadura_acero",
    nombre: "Armadura de Acero",
    tipo: "armadura",
    descripcion: "Protección de gran calidad.",
    rareza: "raro",
    precio: 600,
    defensaBase: 12,
    defensaPorMejora: 3,
    velocidadBase: -5,
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
    precio: 200,
    velocidadBase: 2,
    velocidadPorMejora: 0.5,
  },

  {
    id: "amuleto_vitalidad",
    nombre: "Amuleto de Vitalidad",
    tipo: "accesorio",
    descripcion: "Aumenta la vida máxima del aventurero.",
    rareza: "raro",
    precio: 500,
    hpMaximoBase: 20,
    hpMaximoPorMejora: 5,
  },

  {
    id: "anillo_maldito",
    nombre: "Anillo Maldito",
    tipo: "accesorio",
    descripcion: "Un anillo que maldice a su portador.",
    rareza: "epico",
    precio: 800,

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
