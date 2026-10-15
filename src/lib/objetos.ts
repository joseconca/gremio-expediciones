import type { DefinicionObjeto, TipoArmadura } from "./tiposJuego";
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

/**
 * Devuelve el subtipo de protección (ligera, media o pesada).
 * categoriaArmadura se conserva como respaldo para datos anteriores.
 */
export function obtenerSubtipoArmadura(
  objeto: Pick<DefinicionObjeto, "subtipo" | "categoriaArmadura">
): TipoArmadura | undefined {
  const tiposValidos: readonly TipoArmadura[] = ["ligera", "media", "pesada"];
  const subtipo = objeto.subtipo?.trim().toLowerCase();
  if (subtipo && tiposValidos.includes(subtipo as TipoArmadura)) {
    return subtipo as TipoArmadura;
  }
  return objeto.categoriaArmadura;
}

export const OBJETOS: DefinicionObjeto[] = [
  // ============================================================
  // CONSUMIBLES
  // ============================================================

  {
    id: "pocion",
    vendibleEnArmeria: false,
    nombre: "Poción",
    tipo: "consumible",
    descripcion: "Recupera 30 puntos de vida.",
    rareza: "comun",
    precio: 20,
    curacion: 30,
    limiteCantidad: 3,
  },

  {
    id: "pocion_grande",
    vendibleEnArmeria: false,
    nombre: "Poción Grande",
    tipo: "consumible",
    descripcion: "Recupera 60 puntos de vida.",
    rareza: "poco_comun",
    precio: 55,
    curacion: 60,
    limiteCantidad: 3,
  },

  // ============================================================
  // ARMAS
  // ============================================================

  {
    id: "espada_madera",
    vendibleEnArmeria: true,
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
    id: "espada_piedra",
    vendibleEnArmeria: true,
    nombre: "Espada de Piedra",
    tipo: "arma",
    slot: "arma",
    manos: 1,
    subtipo: "espada",
    descripcion: "Una espada tosca tallada en piedra, más pesada que una de madera.",
    rareza: "comun",
    precio: 350,
    ataqueBase: 5,
    ataquePorMejora: 0.75,
  },

  {
    id: "espada_hierro",
    vendibleEnArmeria: true,
    nombre: "Espada de Hierro",
    tipo: "arma",
    slot: "arma",
    manos: 1,
    subtipo: "espada",
    descripcion: "Una espada sencilla pero fiable.",
    rareza: "comun",
    precio: 800,
    ataqueBase: 6,
    ataquePorMejora: 1,
  },

  {
    id: "espada_acero",
    vendibleEnArmeria: true,
    nombre: "Espada de Acero",
    tipo: "arma",
    slot: "arma",
    manos: 1,
    subtipo: "espada",
    descripcion: "Una espada resistente y bien equilibrada.",
    rareza: "comun",
    precio: 1800,
    ataqueBase: 9,
    ataquePorMejora: 2,
  },

  {
    id: "espada_runa",
    vendibleEnArmeria: false,
    nombre: "Espada Rúnica",
    tipo: "arma",
    slot: "arma",
    manos: 1,
    subtipo: "espada",
    descripcion: "Una espada imbuida con poder mágico.",
    rareza: "raro",
    precio: 6500,
    ataqueBase: 10,
    ataquePorMejora: 2.5,
    velocidadPorMejora: 0.5,
  },
  {
    id: "hacha_orca",
    vendibleEnArmeria: false,
    nombre: "Hacha Orca",
    tipo: "arma",
    slot: "arma",
    manos: 2,
    subtipo: "hacha",
    descripcion: "Un hacha robusta utilizada por los orcos.",
    rareza: "raro",
    precio: 4200,
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
    vendibleEnArmeria: true,
    nombre: "Tela Andrajosa",
    tipo: "armadura",
    subtipo: "ligera",
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
    vendibleEnArmeria: true,
    nombre: "Armadura de Cuero",
    tipo: "armadura",
    subtipo: "ligera",
    slot: "armadura",
    categoriaArmadura: "ligera",
    descripcion: "Protección ligera para aventureros.",
    rareza: "comun",
    precio: 650,
    defensaBase: 6,
    defensaPorMejora: 1,
  },

  {
    id: "armadura_hierro",
    vendibleEnArmeria: true,
    nombre: "Armadura de Hierro",
    tipo: "armadura",
    subtipo: "pesada",
    slot: "armadura",
    categoriaArmadura: "pesada",
    descripcion: "Una armadura pesada y resistente.",
    rareza: "comun",
    precio: 2200,
    defensaBase: 9,
    defensaPorMejora: 2,
    velocidadBase: -2,
  },

  {
    id: "armadura_acero",
    vendibleEnArmeria: true,
    nombre: "Armadura de Acero",
    tipo: "armadura",
    subtipo: "pesada",
    slot: "armadura",
    categoriaArmadura: "pesada",
    descripcion: "Protección de gran calidad.",
    rareza: "comun",
    precio: 5200,
    defensaBase: 12,
    defensaPorMejora: 3,
    velocidadBase: -4,
  },

  // ============================================================
  // ACCESORIOS
  // ============================================================

  {
    id: "anillo_viajero",
    vendibleEnArmeria: false,
    nombre: "Anillo del Viajero",
    tipo: "accesorio",
    slot: "anillo",
    descripcion: "Aumenta la velocidad en 2 puntos.",
    rareza: "poco_comun",
    precio: 1100,
    velocidadBase: 2,
  },

  {
    id: "amuleto_vitalidad",
    vendibleEnArmeria: false,
    nombre: "Amuleto de Vitalidad",
    tipo: "accesorio",
    slot: "collar",
    descripcion: "Aumenta la vida máxima en 20 puntos.",
    rareza: "raro",
    precio: 2800,
    hpMaximoBase: 20,
  },

  {
    id: "anillo_maldito",
    vendibleEnArmeria: false,
    nombre: "Anillo Maldito",
    tipo: "accesorio",
    slot: "anillo",
    descripcion: "Aumenta el ataque, pero reduce la vida, la defensa y la velocidad.",
    rareza: "epico",
    precio: 3200,

    ataqueBase: 6,
    hpMaximoBase: -20,
    defensaBase: -4,
    velocidadBase: -4,
  },

  // Nuevas ranuras de equipo
  {
    id: "escudo_madera",
    vendibleEnArmeria: true,
    nombre: "Escudo de madera",
    tipo: "armadura",
    subtipo: "escudo",
    slot: "mano_secundaria",
    descripcion: "Un escudo ligero para proteger la mano secundaria.",
    rareza: "basico",
    precio: 150,
    defensaBase: 2,
  },
  {
    id: "casco_cuero",
    vendibleEnArmeria: true,
    nombre: "Casco de cuero",
    tipo: "armadura",
    subtipo: "ligera",
    slot: "casco",
    categoriaArmadura: "ligera",
    descripcion: "Protege la cabeza sin limitar demasiado el movimiento.",
    rareza: "comun",
    precio: 300,
    defensaBase: 2,
    defensaPorMejora: 0.5,
  },
  {
    id: "pantalones_cuero",
    vendibleEnArmeria: true,
    nombre: "Pantalones de cuero",
    tipo: "armadura",
    subtipo: "ligera",
    slot: "pantalones",
    categoriaArmadura: "ligera",
    descripcion: "Unas perneras resistentes para viajar y combatir.",
    rareza: "comun",
    precio: 320,
    defensaBase: 2,
    defensaPorMejora: 0.5,
  },
  {
    id: "botas_cuero",
    vendibleEnArmeria: true,
    nombre: "Botas de cuero",
    tipo: "armadura",
    subtipo: "ligera",
    slot: "botas",
    categoriaArmadura: "ligera",
    descripcion: "Botas cómodas para recorrer largas distancias.",
    rareza: "comun",
    precio: 280,
    defensaBase: 1,
    velocidadBase: 1,
    defensaPorMejora: 0.25,
    velocidadPorMejora: 0.1,
  },
  {
    id: "guantes_cuero",
    vendibleEnArmeria: true,
    nombre: "Guantes de cuero",
    tipo: "armadura",
    subtipo: "ligera",
    slot: "guantes",
    categoriaArmadura: "ligera",
    descripcion: "Protegen las manos sin perder tacto.",
    rareza: "comun",
    precio: 220,
    defensaBase: 1,
    defensaPorMejora: 0.25,
  },
  {
    id: "collar_cobre",
    vendibleEnArmeria: false,
    nombre: "Collar de cobre",
    tipo: "accesorio",
    slot: "collar",
    descripcion: "Un collar sencillo con una pequeña pieza de cobre.",
    rareza: "poco_comun",
    precio: 350,
    hpMaximoBase: 4,
  },
  {
    id: "anillo_resistencia",
    vendibleEnArmeria: false,
    nombre: "Anillo de resistencia",
    tipo: "accesorio",
    slot: "anillo",
    descripcion: "Un anillo que ofrece algo de protección.",
    rareza: "poco_comun",
    precio: 500,
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
  objeto: Pick<DefinicionObjeto, "id" | "tipo" | "slot">
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

  if (objeto.tipo === "armadura") {
    // Las armaduras se organizan primero por ranura de equipo.
    const carpetaPorRanura: Record<string, string> = {
      casco: "casco",
      armadura: "armadura",
      pantalones: "pantalones",
      botas: "botas",
      guantes: "guantes",
    };
    const carpeta = objeto.slot ? carpetaPorRanura[objeto.slot] : "armadura";
    if (!carpeta) return null;
    return `/sprites/items/armors/${carpeta}/${objeto.id}.png`;
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

export interface CosteRecursosForja {
  madera: number;
  piedra: number;
  metal: number;
}

const MULTIPLICADOR_RECURSOS_RAREZA: Record<DefinicionObjeto["rareza"], number> = {
  basico: 1,
  comun: 1,
  poco_comun: 2,
  raro: 3,
  epico: 4,
  legendario: 5,
};

/**
 * Coste material de la siguiente mejora. La receta depende del tipo de pieza y,
 * para armas, de su subtipo. La rareza aumenta el consumo y a partir de +3 el
 * coste vuelve a escalar cada tres niveles de mejora.
 */
export function calcularCosteRecursosMejora(
  objeto: Pick<DefinicionObjeto, "id" | "tipo" | "subtipo" | "categoriaArmadura" | "rareza">,
  nivelMejora: number
): CosteRecursosForja {
  const cero: CosteRecursosForja = { madera: 0, piedra: 0, metal: 0 };
  if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") return cero;

  let receta: CosteRecursosForja;
  if (objeto.tipo === "arma") {
    const subtipo = (objeto.subtipo ?? "").toLowerCase();
    if (objeto.id === "espada_madera") {
      receta = { madera: 1, piedra: 0, metal: 0 };
    } else if (subtipo === "arco") {
      receta = { madera: 3, piedra: 0, metal: 1 };
    } else if (subtipo === "hacha") {
      receta = { madera: 1, piedra: 0, metal: 1 };
    } else if (subtipo === "baston" || subtipo === "libro") {
      receta = { madera: 2, piedra: 0, metal: 1 };
    } else if (subtipo === "lanza" || subtipo === "maza") {
      receta = { madera: 1, piedra: 0, metal: 2 };
    } else if (subtipo === "daga" || subtipo === "puños") {
      receta = { madera: 0, piedra: 0, metal: 1 };
    } else if (subtipo === "espada") {
      receta = { madera: 0, piedra: 0, metal: 2 };
    } else {
      receta = { madera: 1, piedra: 0, metal: 1 };
    }
  } else if (objeto.subtipo === "escudo") {
    // Aunque use una afinidad de mano secundaria, el escudo de madera
    // conserva una receta centrada en madera y no en armadura corporal.
    receta = { madera: 2, piedra: 0, metal: 0 };
  } else if (objeto.categoriaArmadura === "pesada") {
    receta = { madera: 0, piedra: 1, metal: 2 };
  } else if (objeto.categoriaArmadura === "media") {
    receta = { madera: 1, piedra: 0, metal: 1 };
  } else if (objeto.categoriaArmadura === "ligera") {
    receta = { madera: 2, piedra: 0, metal: 0 };
  } else {
    receta = { madera: 1, piedra: 0, metal: 1 };
  }

  const nivelSeguro = Number.isFinite(nivelMejora) ? Math.max(0, Math.floor(nivelMejora)) : 0;
  const multiplicadorRareza = MULTIPLICADOR_RECURSOS_RAREZA[objeto.rareza];
  const multiplicadorNivel = 1 + Math.floor(nivelSeguro / 3);

  return {
    madera: receta.madera * multiplicadorRareza * multiplicadorNivel,
    piedra: receta.piedra * multiplicadorRareza * multiplicadorNivel,
    metal: receta.metal * multiplicadorRareza * multiplicadorNivel,
  };
}

const MULTIPLICADOR_ORO_RAREZA: Record<DefinicionObjeto["rareza"], number> = {
  basico: 1, comun: 1.25, poco_comun: 1.7, raro: 2.3, epico: 3.2, legendario: 4.5,
};
const COSTE_BASE_MEJORA: Record<"arma" | "armadura", number> = { arma: 60, armadura: 50 };
const MULTIPLICADOR_CATEGORIA_ARMADURA: Record<"ligera" | "media" | "pesada", number> = {
  ligera: 0.9, media: 1, pesada: 1.2,
};

/** El coste de mejora no hereda anomalías del precio de compra del catálogo. */
export function calcularCosteMejoraObjeto(
  objeto: Pick<DefinicionObjeto, "tipo" | "rareza" | "categoriaArmadura" | "subtipo">,
  nivelMejora: number
): number {
  if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") return 0;
  const nivelSeguro = Number.isFinite(nivelMejora) ? Math.max(0, Math.floor(nivelMejora)) : 0;
  const costeBase = COSTE_BASE_MEJORA[objeto.tipo];
  const rareza = MULTIPLICADOR_ORO_RAREZA[objeto.rareza];
  const categoria = objeto.tipo === "arma"
    ? 1.2
    : objeto.subtipo === "escudo"
      ? MULTIPLICADOR_CATEGORIA_ARMADURA.ligera
      : MULTIPLICADOR_CATEGORIA_ARMADURA[objeto.categoriaArmadura ?? "media"];
  return Math.max(1, Math.ceil(costeBase * categoria * rareza * Math.pow(nivelSeguro + 1, 1.25)));
}
