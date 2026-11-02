import type { DefinicionObjeto, TipoArmadura } from "./tiposJuego";
import { OBJETOS } from "./catalogos/objetos";
export { OBJETOS } from "./catalogos/objetos";
import type { ModificadoresEstadisticas } from "./progresion/estadisticas-personaje";

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
  // Estos accesorios todavía no tienen miniatura propia; el equipo físico sí.
  const objetosSinSprite = new Set([
    "collar_cobre",
    "anillo_resistencia",
  ]);
  if (objetosSinSprite.has(objeto.id)) return null;

  // Las variantes de poción reutilizan el asset real disponible en el catálogo.
  if (objeto.tipo === "consumible") {
    return objeto.id.startsWith("pocion") ? "/sprites/items/consumables/pocion.png" : null;
  }

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
      mano_secundaria: "escudos",
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

/** Icono alternativo cuando el objeto todavía no tiene un sprite dedicado. */
export function obtenerIconoObjeto(
  objeto: Pick<DefinicionObjeto, "id" | "tipo">
): string {
  if (objeto.tipo === "consumible") {
    if (objeto.id === "ceniza_fenix") return "🔥";
    if (objeto.id === "elixir_guerrero") return "⚗️";
    if (objeto.id.includes("mana")) return "💧";
    if (objeto.id.includes("energia")) return "⚡";
    return "🧪";
  }
  return "🎒";
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
