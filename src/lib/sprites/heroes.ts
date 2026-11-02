import biblioteca from "@/lib/generated/sprites-hd.json";
import { CLASES, obtenerAncestrosClase } from "../progresion/clases";
import { CLASES_NUEVAS } from "../catalogos/clases";

export type AccionHeroeHd = "idle" | "walk" | "hurt" | "use_consumable" | "dodge" | "block_shield" |
  "attack_sword" | "attack_axe" | "attack_spear" | "attack_dagger" | "attack_bow" |
  "attack_staff" | "attack_mace" | "attack_book" | "attack_gloves";
export type SexoSpriteHd = "m" | "f";
export interface ContactoEquipoHd {
  depth: string;
  contacts: number[][];
  restoreHands: boolean;
  handMaskRadius: number;
}
export interface EquipoSpriteHd {
  family: string;
  hands: number;
  composition: string;
  actions: string[];
  frames: Record<SexoSpriteHd, Partial<Record<AccionHeroeHd, { source: number[]; offset: number[] }[]>>>;
}
export const BIBLIOTECA_SPRITES_HD = biblioteca as {
  version: string; classes: string[]; actions: AccionHeroeHd[];
  availableSexes?: Record<string, SexoSpriteHd[]>;
  availablePortraits?: Record<string, SexoSpriteHd[]>;
  timings: Record<SexoSpriteHd, Record<AccionHeroeHd, number[]>>;
  items: Record<string, EquipoSpriteHd>;
  compositions: Record<string, Record<SexoSpriteHd, Partial<Record<AccionHeroeHd, ContactoEquipoHd[]>>>>;
};
/** La pertenencia al catalogo no garantiza que ambos sexos esten publicados. */
export const esClaseHeroeHd = (id: string, sexo?: SexoSpriteHd) =>
  BIBLIOTECA_SPRITES_HD.classes.includes(id)
  && (!sexo || BIBLIOTECA_SPRITES_HD.availableSexes?.[id]?.includes(sexo) === true);
export const esRetratoHeroeHd = (id: string, sexo: SexoSpriteHd) =>
  esClaseHeroeHd(id, sexo) && BIBLIOTECA_SPRITES_HD.availablePortraits?.[id]?.includes(sexo) === true;
export const obtenerEquipoSpriteHd = (id?: string | null) => id ? BIBLIOTECA_SPRITES_HD.items[id] : undefined;
const ATAQUES_FAMILIA: Record<string, AccionHeroeHd> = {
  sword: "attack_sword", axe: "attack_axe", spear: "attack_spear", dagger: "attack_dagger",
  bow: "attack_bow", staff: "attack_staff", mace: "attack_mace", book: "attack_book", gloves: "attack_gloves",
};
export function resolverAccionHeroeHd({ impactado, esquivando, animando, animacion, accionExplicita, armaId, escudoId }: {
  impactado?: boolean; esquivando?: boolean; animando?: boolean; animacion?: string | null;
  accionExplicita?: "use_consumable" | null; armaId?: string | null; escudoId?: string | null;
}): AccionHeroeHd {
  if (impactado) return "hurt";
  if (esquivando) return "dodge";
  if (!animando) return "idle";
  if (accionExplicita === "use_consumable") return accionExplicita;
  if (animacion === "defensiva" || animacion === "escudo") {
    return obtenerEquipoSpriteHd(escudoId)?.family === "shield" ? "block_shield" : "idle";
  }
  const arma = obtenerEquipoSpriteHd(armaId);
  return ATAQUES_FAMILIA[arma?.family ?? ""] ?? "attack_gloves";
}
/** A single frame index drives body, equipment, fingers and shadow. */
export function obtenerFotogramaHeroeHd(accion: AccionHeroeHd, sexo: SexoSpriteHd, transcurrido: number, reducido = false): number {
  if (reducido) return accion.startsWith("attack_") || accion === "use_consumable" ? 2 : 0;
  const originales = BIBLIOTECA_SPRITES_HD.timings[sexo][accion];
  const total = originales.reduce((a, b) => a + b, 0);
  const duracion = accion === "idle" ? 1200 : accion === "walk" ? 600 : accion === "hurt" ? 360 : total;
  const tiempo = Math.max(0, transcurrido);
  let fase = (accion === "idle" || accion === "walk" ? tiempo % duracion : Math.min(tiempo, duracion - 0.01)) * total / duracion;
  for (let n = 0; n < 3; n++) { if (fase < originales[n]) return n; fase -= originales[n]; }
  return 3;
}
export function obtenerCapasHeroeHd(accion: AccionHeroeHd, armaId?: string | null, escudoId?: string | null): string[] {
  if (accion === "use_consumable") return ["pocion"];
  const arma = obtenerEquipoSpriteHd(armaId);
  const capas: string[] = [];
  if (armaId && arma?.actions.includes(accion)) capas.push(armaId);
  if (escudoId && arma?.hands !== 2 && obtenerEquipoSpriteHd(escudoId)?.family === "shield" &&
      obtenerEquipoSpriteHd(escudoId)?.actions.includes(accion)) capas.push(escudoId);
  return capas;
}

export function propsSpriteHeroeHd(estado: {
  actorImpactado: string | null; actorEsquivando: string | null; actorSpriteAnimando: string | null;
  objetivosMultiplesImpactados: string[]; animacionActual: string | null; accionSpriteActual: "use_consumable" | null;
  inicioAccionSprite: number; inicioImpactoSprite: number;
}, id: string, armaId?: string | null, escudoId?: string | null) {
  const impactado = estado.actorImpactado === id || estado.objetivosMultiplesImpactados.includes(id);
  const esquivando = estado.actorEsquivando === id;
  return { armaId, escudoId,
    accion: resolverAccionHeroeHd({ impactado, esquivando, animando: estado.actorSpriteAnimando === id,
      animacion: estado.animacionActual, accionExplicita: estado.accionSpriteActual, armaId, escudoId }),
    inicioAnimacion: impactado || esquivando ? estado.inicioImpactoSprite : estado.inicioAccionSprite,
  };
}


// Identidad visual, spritesheets y compatibilidad con personajes antiguos.
const CLASES_LEGACY_POR_NOMBRE: Record<string, string> = {
  Novato: "novato",
  Guerrero: "guerrero",
  Explorador: "explorador",
  Comerciante: "comerciante",
};

export type SexoPersonaje = "chico" | "chica";

/**
 * Resuelve el directorio visual sin modificar la clase almacenada en el personaje.
 * La profesión activa prevalece; las etiquetas antiguas siguen teniendo fallback.
 */
export function obtenerIdClaseParaSprite(
  clase?: string | null,
  profesionActivaId?: string | null,
): string {
  const claseLegacy = clase ? CLASES_LEGACY_POR_NOMBRE[clase] : undefined;
  // Los personajes antiguos conservan su avatar original mientras sigan en Novato.
  if (claseLegacy && (!profesionActivaId || profesionActivaId === "novato")) {
    return claseLegacy;
  }
  if (profesionActivaId && Object.prototype.hasOwnProperty.call(CLASES, profesionActivaId)) {
    return profesionActivaId;
  }
  if (clase && Object.prototype.hasOwnProperty.call(CLASES, clase)) {
    return clase;
  }
  if (claseLegacy) {
    return claseLegacy;
  }
  return "novato";
}

export function obtenerNombreClaseHeroe(
  clase?: string | null,
  profesionActivaId?: string | null,
): string {
  const idClase = obtenerIdClaseParaSprite(clase, profesionActivaId);
  return CLASES[idClase]?.nombre ?? (idClase === "guerrero" ? "Guerrero" : "Comerciante");
}

/** Las clases sin arte propio usan un antecesor existente hasta incorporar sus sprites. */
export function obtenerIdVisualClase(id: string, sexo?: "m" | "f"): string {
  if (sexo && esClaseHeroeHd(id, sexo)) return id;
  if (!CLASES_NUEVAS[id] || id === "comerciante") return id;
  return obtenerAncestrosClase(id).find((padre) => !CLASES_NUEVAS[padre]) ?? "novato";
}

/** Devuelve el sprite masculino/femenino de la profesión activa del personaje. */
export function obtenerSpriteHeroe(
  clase?: string | null,
  sexo?: string | null,
  profesionActivaId?: string | null,
): string {
  const sufijoSexo = sexo === "chica" ? "f" : "m";
  const idOriginal = obtenerIdClaseParaSprite(clase, profesionActivaId);
  const idClase = obtenerIdVisualClase(idOriginal);
  if (esRetratoHeroeHd(idOriginal, sufijoSexo)) return `/sprites/hd-v1/heroes/${idOriginal}/${sufijoSexo}-portrait.png`;
  return `/sprites/heroes/${idClase}/${idClase}-${sufijoSexo}.png`;
}

/**
 * Contrato de filas de los spritesheets de combate.
 * Cada fila contiene cuatro fotogramas: HD 128 × 256; fallback 64 × 128 px.
 */
export const FILAS_ANIMACION_SPRITESHEET_HEROE = [
  { id: "idle", nombre: "Idle", fila: 0 },
  { id: "walk", nombre: "Caminar", fila: 1 },
  { id: "hurt", nombre: "Recibir daño", fila: 2 },
  { id: "use_consumable", nombre: "Usar consumible", fila: 3 },
  { id: "dodge", nombre: "Esquivar", fila: 4 },
  { id: "block_shield", nombre: "Bloquear con escudo", fila: 5 },
  { id: "attack_sword", nombre: "Ataque con espada", fila: 6 },
  { id: "attack_axe", nombre: "Ataque con hacha", fila: 7 },
  { id: "attack_spear", nombre: "Ataque con lanza", fila: 8 },
  { id: "attack_dagger", nombre: "Ataque con daga", fila: 9 },
  { id: "attack_bow", nombre: "Ataque con arco", fila: 10 },
  { id: "attack_staff", nombre: "Ataque con bastón", fila: 11 },
  { id: "attack_mace", nombre: "Ataque con maza", fila: 12 },
  { id: "attack_book", nombre: "Ataque con libro", fila: 13 },
  { id: "attack_gloves", nombre: "Ataque con guantes", fila: 14 },
] as const;

/** Ruta a la hoja animada; los retratos estáticos siguen usando obtenerSpriteHeroe. */
export function obtenerRutaSpritesheetHeroe(
  clase?: string | null,
  sexo?: string | null,
  profesionActivaId?: string | null,
): string {
  const sufijoSexo = sexo === "chica" ? "f" : "m";
  const idClase = obtenerIdVisualClase(obtenerIdClaseParaSprite(clase, profesionActivaId), sufijoSexo);
  if (esClaseHeroeHd(idClase, sufijoSexo)) return `/sprites/hd-v1/heroes/${idClase}/${sufijoSexo}-sheet.png`;
  return `/sprites/heroes/${idClase}/${idClase}-${sufijoSexo}-sheet.png`;
}

/** Logo reutilizable de clase para miniaturas, nombres de grupo y listados. */
export function obtenerLogoClaseHeroe(
  clase?: string | null,
  profesionActivaId?: string | null,
): string {
  const idClase = obtenerIdVisualClase(obtenerIdClaseParaSprite(clase, profesionActivaId));
  return `/sprites/heroes/${idClase}/${idClase}-logo.svg`;
}
