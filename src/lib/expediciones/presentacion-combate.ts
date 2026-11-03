import type { DefinicionHabilidad, PresentacionVisualCombate } from "@/lib/tiposJuego";
import { normalizarSubtipoArma } from "./combate/ataque-basico-arma";

/** Presentación visual del ataque básico; no decide el daño ni la defensa empleada. */
export function obtenerPresentacionAtaqueBasico(
  subtipoArma: string | null | undefined,
): PresentacionVisualCombate | undefined {
  const subtipo = normalizarSubtipoArma(subtipoArma);
  if (subtipo === "arco") {
    return {
      modo: "proyectil",
      proyectil: "flecha",
      elemento: "fisico",
      impacto: "golpe",
    };
  }
  if (subtipo === "baston" || subtipo === "libro") {
    return {
      modo: "proyectil",
      proyectil: "esfera_arcana",
      elemento: "arcano",
      impacto: "destello",
    };
  }
  return undefined;
}

/** Presentación de respaldo cuando una habilidad no define un proyectil explícito. */
export function obtenerPresentacionProyectilHabilidad(
  habilidad: DefinicionHabilidad,
): PresentacionVisualCombate | undefined {
  if (habilidad.efecto !== "dano") return undefined;

  const referencia = `${habilidad.id} ${habilidad.nombre} ${habilidad.claseId ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // Los ataques físicos de alcance sin sprite explícito deben disparar flecha.
  if (habilidad.tipoDano !== "magico" && /(flecha|disparo|tiro|saeta|ballesta)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "flecha", elemento: "fisico", impacto: "golpe" };
  }
  if (habilidad.tipoDano !== "magico") return undefined;
  if (/(bola_fuego|fuego|llama|quemadura)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "bola_fuego", elemento: "fuego", impacto: "explosion" };
  }
  if (/(hielo|escarcha|frio)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "esquirla_hielo", elemento: "hielo", impacto: "escarcha" };
  }
  if (/(rayo|electri|tormenta)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "rayo", elemento: "rayo", impacto: "destello" };
  }
  if (/(natur|raices|semilla|zarzas|druida)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "semilla_natural", elemento: "naturaleza", impacto: "onda" };
  }
  if (/(sagrad|acolito|sacerdote|oraculo|hierofante|paladin|cruzado)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "energia_sagrada", elemento: "sagrado", impacto: "sagrado" };
  }
  if (/(sombra|funebre|maldit|drenaje|necrom|nigrom|demon|brujo|abismo|pacto|infernal)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "orbe_sombra", elemento: "sombras", impacto: "destello" };
  }

  return { modo: "proyectil", proyectil: "esfera_arcana", elemento: "arcano", impacto: "destello" };
}

