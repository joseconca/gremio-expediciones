import biblioteca from "@/lib/generated/sprites-hd.json";

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
  timings: Record<SexoSpriteHd, Record<AccionHeroeHd, number[]>>;
  items: Record<string, EquipoSpriteHd>;
  compositions: Record<string, Record<SexoSpriteHd, Partial<Record<AccionHeroeHd, ContactoEquipoHd[]>>>>;
};
export const esClaseHeroeHd = (id: string) => BIBLIOTECA_SPRITES_HD.classes.includes(id);
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
