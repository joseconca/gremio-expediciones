import type { DefinicionObjeto } from "./tiposJuego";
import type { ModificadoresEstadisticas } from "./estadisticasPersonaje";

export function calcularEstadisticasObjeto(
  objeto: DefinicionObjeto,
  nivelMejora: number,
  bonificaciones: Record<string, number> = {}
): ModificadoresEstadisticas {
  const nivelSeguro = Math.max(0, Math.floor(nivelMejora));

  return {
    hpMaximo:
      (objeto.hpMaximoBase ?? 0) + (objeto.hpMaximoPorMejora ?? 0) * nivelSeguro + (bonificaciones.hpMaximo ?? 0),
    ataque:
      (objeto.ataqueBase ?? 0) + (objeto.ataquePorMejora ?? 0) * nivelSeguro + (bonificaciones.ataque ?? 0),
    ataqueMagico:
      (objeto.ataqueMagicoBase ?? 0) + (objeto.ataqueMagicoPorMejora ?? 0) * nivelSeguro + (bonificaciones.ataqueMagico ?? 0),
    defensa:
      (objeto.defensaBase ?? 0) + (objeto.defensaPorMejora ?? 0) * nivelSeguro + (bonificaciones.defensa ?? 0),
    defensaMagica:
      (objeto.defensaMagicaBase ?? 0) + (objeto.defensaMagicaPorMejora ?? 0) * nivelSeguro + (bonificaciones.defensaMagica ?? 0),
    velocidad:
      (objeto.velocidadBase ?? 0) + (objeto.velocidadPorMejora ?? 0) * nivelSeguro + (bonificaciones.velocidad ?? 0),
    capacidadCarruaje:
      (objeto.capacidadCarruajeBase ?? 0) + (objeto.capacidadCarruajePorMejora ?? 0) * nivelSeguro + (bonificaciones.capacidadCarruaje ?? 0),
    probCritico:
      (objeto.probCriticoBase ?? 0) + (objeto.probCriticoPorMejora ?? 0) * nivelSeguro + (bonificaciones.probCritico ?? 0),
    danoCritico:
      (objeto.danoCriticoBase ?? 0) + (objeto.danoCriticoPorMejora ?? 0) * nivelSeguro + (bonificaciones.danoCritico ?? 0),
    precision:
      (objeto.precisionBase ?? 0) + (objeto.precisionPorMejora ?? 0) * nivelSeguro + (bonificaciones.precision ?? 0),
    evasion:
      (objeto.evasionBase ?? 0) + (objeto.evasionPorMejora ?? 0) * nivelSeguro + (bonificaciones.evasion ?? 0),
    energiaMaxima:
      (objeto.energiaMaximaBase ?? 0) + (objeto.energiaMaximaPorMejora ?? 0) * nivelSeguro + (bonificaciones.energiaMaxima ?? 0),
    manaMaximo:
      (objeto.manaMaximoBase ?? 0) + (objeto.manaMaximoPorMejora ?? 0) * nivelSeguro + (bonificaciones.manaMaximo ?? 0),
    regeneracionVidaPorTurno:
      (objeto.regeneracionVidaPorTurnoBase ?? 0) + (objeto.regeneracionVidaPorTurnoPorMejora ?? 0) * nivelSeguro + (bonificaciones.regeneracionVidaPorTurno ?? 0),
    regeneracionEnergiaPorTurno:
      (objeto.regeneracionEnergiaPorTurnoBase ?? 0) + (objeto.regeneracionEnergiaPorTurnoPorMejora ?? 0) * nivelSeguro + (bonificaciones.regeneracionEnergiaPorTurno ?? 0),
    regeneracionManaPorTurno:
      (objeto.regeneracionManaPorTurnoBase ?? 0) + (objeto.regeneracionManaPorTurnoPorMejora ?? 0) * nivelSeguro + (bonificaciones.regeneracionManaPorTurno ?? 0),
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
    slot: "arma",
    manos: 1,
    subtipo: "espada",
    descripcion: "Una rama sencilla y nada fiable.",
    rareza: "basico",
    precio: 100,
    ataqueBase: 3,
    ataquePorMejora: 0.5,
  },

  {
    id: "espada_hierro",
    nombre: "Espada de Hierro",
    tipo: "arma",
    slot: "arma",
    manos: 1,
    subtipo: "espada",
    descripcion: "Una espada sencilla pero fiable.",
    rareza: "comun",
    precio: 1000,
    ataqueBase: 6,
    ataquePorMejora: 1,
  },

  {
    id: "espada_acero",
    nombre: "Espada de Acero",
    tipo: "arma",
    slot: "arma",
    manos: 1,
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
    slot: "arma",
    manos: 1,
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
    slot: "arma",
    manos: 2,
    subtipo: "hacha",
    descripcion: "Un hacha robusta utilizada por los orcos.",
    rareza: "raro",
    precio: 12000,
    ataqueBase: 5,
    ataquePorMejora: 1.5,
    probCriticoBase: 0.05,
    probCriticoPorMejora: 0.015,
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
    slot: "armadura",
    categoriaArmadura: "ligera",
    descripcion: "Protección para tapar vergüenzas.",
    rareza: "basico",
    precio: 100,
    defensaBase: 3,
    defensaPorMejora: 0.5,
  },
  {
    id: "armadura_cuero",
    nombre: "Armadura de Cuero",
    tipo: "armadura",
    slot: "armadura",
    categoriaArmadura: "ligera",
    descripcion: "Protección ligera para aventureros.",
    rareza: "comun",
    precio: 1100,
    defensaBase: 6,
    defensaPorMejora: 1,
  },

  {
    id: "armadura_hierro",
    nombre: "Armadura de Hierro",
    tipo: "armadura",
    slot: "armadura",
    categoriaArmadura: "pesada",
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
    slot: "armadura",
    categoriaArmadura: "pesada",
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
    slot: "anillo",
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
    slot: "collar",
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
    slot: "anillo",
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

  // Nuevas ranuras de equipo
  {
    id: "escudo_madera",
    nombre: "Escudo de madera",
    tipo: "accesorio",
    slot: "mano_secundaria",
    descripcion: "Un escudo ligero para proteger la mano secundaria.",
    rareza: "basico",
    precio: 120,
    defensaBase: 2,
  },
  {
    id: "casco_cuero",
    nombre: "Casco de cuero",
    tipo: "armadura",
    slot: "casco",
    categoriaArmadura: "ligera",
    descripcion: "Protege la cabeza sin limitar demasiado el movimiento.",
    rareza: "comun",
    precio: 450,
    defensaBase: 2,
  },
  {
    id: "pantalones_cuero",
    nombre: "Pantalones de cuero",
    tipo: "armadura",
    slot: "pantalones",
    categoriaArmadura: "ligera",
    descripcion: "Unas perneras resistentes para viajar y combatir.",
    rareza: "comun",
    precio: 500,
    defensaBase: 2,
  },
  {
    id: "botas_cuero",
    nombre: "Botas de cuero",
    tipo: "armadura",
    slot: "botas",
    categoriaArmadura: "ligera",
    descripcion: "Botas cómodas para recorrer largas distancias.",
    rareza: "comun",
    precio: 400,
    defensaBase: 1,
    velocidadBase: 1,
  },
  {
    id: "guantes_cuero",
    nombre: "Guantes de cuero",
    tipo: "armadura",
    slot: "guantes",
    categoriaArmadura: "ligera",
    descripcion: "Protegen las manos sin perder tacto.",
    rareza: "comun",
    precio: 350,
    defensaBase: 1,
  },
  {
    id: "collar_cobre",
    nombre: "Collar de cobre",
    tipo: "accesorio",
    slot: "collar",
    descripcion: "Un collar sencillo con una pequeña pieza de cobre.",
    rareza: "poco_comun",
    precio: 1600,
    hpMaximoBase: 4,
  },
  {
    id: "anillo_resistencia",
    nombre: "Anillo de resistencia",
    tipo: "accesorio",
    slot: "anillo",
    descripcion: "Un anillo que ofrece algo de protección.",
    rareza: "poco_comun",
    precio: 2200,
    defensaBase: 1,
  },
]; 

export function obtenerObjetoPorId(id: string): DefinicionObjeto | undefined {
  return OBJETOS.find((objeto) => objeto.id === id);
}

export function obtenerRanuraObjeto(objeto: DefinicionObjeto) {
  if (objeto.slot) return objeto.slot;
  if (objeto.tipo === "arma") return "arma" as const;
  if (objeto.tipo === "armadura") return "armadura" as const;
  if (objeto.tipo === "accesorio") {
    return objeto.id.startsWith("anillo_") ? "anillo" as const : "collar" as const;
  }
  return null;
}

export function obtenerSpriteObjeto(
  objeto: Pick<DefinicionObjeto, "id" | "tipo">
): string | null {
  // Estas piezas se han añadido antes de crear su pixel art; usa el icono
  // genérico de la ranura en vez de mostrar una imagen 404.
  const objetosSinSprite = new Set([
    "escudo_madera",
    "casco_cuero",
    "pantalones_cuero",
    "botas_cuero",
    "guantes_cuero",
    "collar_cobre",
    "anillo_resistencia",
  ]);
  if (objetosSinSprite.has(objeto.id)) return null;

  const carpetaPorTipo: Record<
    "arma" | "armadura" | "accesorio" | "consumible",
    string
  > = {
    arma: "weapons",
    armadura: "armors",
    accesorio: "accessories",
    consumible: "consumables",
  };

  if (!(objeto.tipo in carpetaPorTipo)) {
    return null;
  }

  return `/sprites/items/${carpetaPorTipo[objeto.tipo]}/${objeto.id}.png`;
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
