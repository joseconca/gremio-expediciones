import type { AccionAnimadaCombate } from "../combate";
import { calcularDefensaTactica } from "./estados-combate";

/**
 * Reglas de los ataques básicos del jugador y de los enemigos.
 * Se mantiene el orden original de llamadas a Math.random y la mitigación de
 * daño; también lo reutiliza la resolución de habilidades.
 */
export const d20 = () => Math.floor(Math.random() * 20) + 1;

export function calcularProbabilidadImpacto(precision = 75, evasionObjetivo = 0): number {
  const precisionSegura = Number.isFinite(precision) ? Math.max(1, Math.min(100, precision)) : 75;
  const evasionSegura = Number.isFinite(evasionObjetivo) ? Math.max(0, Math.min(0.6, evasionObjetivo)) : 0;
  return Math.max(0.1, Math.min(0.99, 0.95 + (precisionSegura - 75) * 0.005 - evasionSegura * 0.5));
}

export function falloPorPrecision(actor: "jugador" | "enemigo", nombre: string): AccionAnimadaCombate {
  return {
    actor,
    tipo: "fallo",
    animacion: "ofensiva",
    dano: 0,
    critico: false,
    texto: actor === "jugador"
      ? "🎯 Fallas el ataque contra " + nombre + "; el objetivo esquiva o evita el golpe."
      : "🌀 " + nombre + " falla su ataque por falta de precisión.",
  };
}

const K_DEFENSA = 100;

/**
 * Fórmula única de mitigación para ataques básicos, habilidades y daño progresivo.
 * La defensa reduce el daño de forma decreciente, manteniendo al menos 1 punto.
 */
export function calcularDanoMitigado(danoBase: number, defensa: number): number {
  const danoBaseSeguro = Number.isFinite(danoBase) ? Math.max(0, danoBase) : 0;
  const defensaSegura = Number.isFinite(defensa) ? Math.max(0, defensa) : 0;
  const dano = (danoBaseSeguro * K_DEFENSA) / (defensaSegura + K_DEFENSA);

  return Math.max(1, Math.floor(dano));
}

export function resolverAtaqueJugador(combate: {
  efectosEnemigo?: import("../../tiposJuego").EstadoEfectoHabilidad[];
  jugadorAtaque: number;
  jugadorAtaqueMagico?: number;
  usarMejorAtaqueMagico?: boolean;
  jugadorNivel: number;
  jugadorProbCritico: number;
  jugadorDanoCritico: number;
  enemigoDefensa: number;
  enemigoDefensaMagica?: number;
  enemigoNombre: string;
  jugadorPrecision?: number;
  enemigoEvasion?: number;
}): AccionAnimadaCombate {
  const dado = d20();

  if (dado === 1) {
    return {
      actor: "jugador",
      tipo: "fallo",
      animacion: "ofensiva",
      dano: 0,
      critico: false,
      texto: `🤡 Pifia. Fallas tu ataque contra ${combate.enemigoNombre}.`,
    };
  }

  if (dado !== 20 && Math.random() > calcularProbabilidadImpacto(combate.jugadorPrecision, combate.enemigoEvasion)) {
    return falloPorPrecision("jugador", combate.enemigoNombre);
  }

  const variacion = 0.8 + Math.random() * 0.4;

  const ataqueMagico = combate.jugadorAtaqueMagico ?? 0;
  const usarAtaqueMagico =
    combate.usarMejorAtaqueMagico === true && ataqueMagico > combate.jugadorAtaque;
  const ataqueEfectivo = usarAtaqueMagico ? ataqueMagico : combate.jugadorAtaque;
  const defensaEfectiva = usarAtaqueMagico
    ? (combate.enemigoDefensaMagica ?? combate.enemigoDefensa)
    : combate.enemigoDefensa;
  const danoBase =
    Math.floor(ataqueEfectivo * variacion) + combate.jugadorNivel;

  const esCritico = Math.random() < combate.jugadorProbCritico || dado === 20;

  const danoAntesCritico = calcularDanoMitigado(danoBase, calcularDefensaTactica(defensaEfectiva,combate.efectosEnemigo??[]));

  const dano = esCritico
    ? Math.max(1, Math.floor(danoAntesCritico * combate.jugadorDanoCritico))
    : danoAntesCritico;

  return {
    actor: "jugador",
    tipo: "ataque",
    animacion: esCritico ? "ofensiva_potenciada" : "ofensiva",
    dano,
    critico: esCritico,
    texto: esCritico
      ? `💥 ¡Golpe crítico! Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`
      : `⚔️ Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`,
  };
}

export function resolverAtaqueEnemigo(combate: {
  efectosJugador?: import("../../tiposJuego").EstadoEfectoHabilidad[];
  enemigoAtaque: number;
  enemigoAtaqueMagico?: number;
  usarMejorAtaqueMagico?: boolean;
  enemigoProbCritico?: number;
  enemigoDanoCritico?: number;
  jugadorDefensa: number;
  jugadorDefensaMagica?: number;
  enemigoNombre: string;
  enemigoPrecision?: number;
  jugadorEvasion?: number;
}): AccionAnimadaCombate {
  const dado = d20();

  if (dado === 1) {
    return {
      actor: "enemigo",
      dano: 0,
      tipo: "fallo",
      animacion: "ofensiva",
      critico: false,
      texto: `🤡 ${combate.enemigoNombre} falla su ataque.`,
    };
  }

  if (dado !== 20 && Math.random() > calcularProbabilidadImpacto(combate.enemigoPrecision, combate.jugadorEvasion)) {
    return falloPorPrecision("enemigo", combate.enemigoNombre);
  }

  const variacion = 0.8 + Math.random() * 0.4;

  const ataqueMagico = combate.enemigoAtaqueMagico ?? 0;
  const usarAtaqueMagico =
    combate.usarMejorAtaqueMagico === true && ataqueMagico > combate.enemigoAtaque;
  const ataqueEfectivo = usarAtaqueMagico ? ataqueMagico : combate.enemigoAtaque;
  const defensaEfectiva = usarAtaqueMagico
    ? (combate.jugadorDefensaMagica ?? combate.jugadorDefensa)
    : combate.jugadorDefensa;
  const danoBase = Math.floor(ataqueEfectivo * variacion) + 1;

  const probCritico = combate.enemigoProbCritico ?? 0.1;
  const danoCritico = combate.enemigoDanoCritico ?? 1.5;

  const esCritico = Math.random() < probCritico || dado === 20;

  const danoAntesCritico = calcularDanoMitigado(danoBase, calcularDefensaTactica(defensaEfectiva,combate.efectosJugador??[]));

  const dano = esCritico
    ? Math.max(1, Math.floor(danoAntesCritico * danoCritico))
    : danoAntesCritico;

  return {
    actor: "enemigo",
    dano,
    tipo: "ataque",
    animacion: esCritico ? "ofensiva_potenciada" : "ofensiva",
    critico: esCritico,
    texto: esCritico
      ? `💥 ¡Golpe crítico! ${combate.enemigoNombre} inflige ${dano} de daño.`
      : `🩸 ${combate.enemigoNombre} golpea y causa ${dano} de daño.`,
  };
}
