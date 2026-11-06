import type { EstadoEfectoHabilidad } from "../../tiposJuego";
import { registrarMitigacion, type ImpactoProtegido } from "./protecciones-rasgos";

export const DANZAS = {
  danzaespadas_tactica: "victoria",
  danzaespadas_ataque: "viento",
  danzaespadas_tecnica_adicional: "resguardo",
  danzaespadas_avanzada: "gran_compas",
} as const;

export type Danza = typeof DANZAS[keyof typeof DANZAS];

export function identificarDanza(id: string | undefined): Danza | undefined {
  if (id && Object.hasOwn(DANZAS, id)) return DANZAS[id as keyof typeof DANZAS];
}

export function esDanzaActiva(efecto: EstadoEfectoHabilidad) {
  return efecto.tipo === "danza" && efecto.familia !== "gran_compas" && efecto.turnosRestantes > 0;
}

export function factorDanza(efecto: EstadoEfectoHabilidad, efectos: readonly EstadoEfectoHabilidad[]) {
  return efectos.some(otro => otro.tipo === "danza" && otro.familia === "gran_compas" &&
    otro.creadorId === efecto.creadorId && otro.turnosRestantes > 0) ? 2 : 1;
}

export function potenciaDanza(efectos: readonly EstadoEfectoHabilidad[], familia: Danza): number {
  const danza = efectos.find(efecto => esDanzaActiva(efecto) && efecto.familia === familia);
  return danza ? danza.valor * factorDanza(danza, efectos) : 0;
}

export function esquivaConDanza(efectos: readonly EstadoEfectoHabilidad[]) {
  const viento = efectos.find(efecto => esDanzaActiva(efecto) && efecto.familia === "viento");
  return viento ? 0.1 * factorDanza(viento, efectos) : 0;
}

export function velocidadConDanza(velocidad: number, efectos: readonly EstadoEfectoHabilidad[]): number {
  return velocidad * (1 + potenciaDanza(efectos, "viento"));
}

export function mitigarDanoDanza(dano: number, efectos: readonly EstadoEfectoHabilidad[]) {
  return dano - Math.floor(dano * potenciaDanza(efectos, "resguardo"));
}

export function protegerConDanza(
  golpe: { dano: number; texto: string; proteccion?: ImpactoProtegido }, efectos: EstadoEfectoHabilidad[],
) {
  const danza = efectos.find(efecto => esDanzaActiva(efecto) && efecto.familia === "resguardo");
  if (!danza || golpe.dano <= 0) return;
  const restante = mitigarDanoDanza(golpe.dano, efectos);
  const factor = factorDanza(danza, efectos);
  const escudo = danza.escudoDanza ?? 0;
  const absorbido = Math.min(restante, Math.floor(escudo * factor));
  registrarMitigacion(golpe, golpe.dano - restante + absorbido);
  danza.escudoDanza = Math.max(0, escudo - absorbido / factor);
  golpe.dano = restante - absorbido;
  golpe.texto += " Danza del resguardo protege al objetivo.";
}

export function aplicarDanza(
  efectos: EstadoEfectoHabilidad[], danza: Danza, habilidadId: string, creadorId: string, valor: number, hpMaximo: number,
) {
  const granCompas = danza === "gran_compas";
  const turnos = granCompas ? 2 : 3;
  const vigentes = efectos.filter(efecto => {
    if (danza === "victoria" && efecto.habilidadId === "Impulso de la danza" && efecto.creadorId === creadorId) return false;
    return efecto.tipo !== "danza" || efecto.familia !== danza || granCompas && efecto.creadorId !== creadorId;
  });
  efectos.splice(0, efectos.length, ...vigentes, {
    tipo: "danza", familia: danza, habilidadId, creadorId, valor, turnosRestantes: turnos, duracionTurnos: turnos,
    ...(danza === "resguardo" ? { escudoDanza: Math.floor(hpMaximo * 0.2) } : {}),
  });
}
