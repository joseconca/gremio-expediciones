import type { DefinicionObjeto } from "./tiposJuego";

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
    descripcion: "Una espada sencilla pero fiable.",
    rareza: "comun",
    precio: 100,
    ataque: 3,
  },

  {
    id: "espada_acero",
    nombre: "Espada de Acero",
    tipo: "arma",
    descripcion: "Una espada resistente y bien equilibrada.",
    rareza: "poco_comun",
    precio: 250,
    ataque: 7,
  },

  {
    id: "espada_runa",
    nombre: "Espada Rúnica",
    tipo: "arma",
    descripcion: "Una espada imbuida con poder mágico.",
    rareza: "raro",
    precio: 600,
    ataque: 12,
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
    defensa: 3,
  },

  {
    id: "armadura_hierro",
    nombre: "Armadura de Hierro",
    tipo: "armadura",
    descripcion: "Una armadura pesada y resistente.",
    rareza: "poco_comun",
    precio: 250,
    defensa: 7,
  },

  {
    id: "armadura_acero",
    nombre: "Armadura de Acero",
    tipo: "armadura",
    descripcion: "Protección de gran calidad.",
    rareza: "raro",
    precio: 600,
    defensa: 12,
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
    velocidad: 2,
  },

  {
    id: "amuleto_vitalidad",
    nombre: "Amuleto de Vitalidad",
    tipo: "accesorio",
    descripcion: "Aumenta la vida máxima del aventurero.",
    rareza: "raro",
    precio: 500,
    hpMaximo: 20,
  },
];

export function obtenerObjetoPorId(
  id: string
): DefinicionObjeto | undefined {
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