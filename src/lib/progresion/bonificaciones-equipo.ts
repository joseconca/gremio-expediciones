import type { EquipoPersonaje, ObjetoInventario } from "../tiposJuego";
import type { ModificadoresEstadisticas } from "./modificadores-estadisticas";
import { sumarModificadores } from "./modificadores-estadisticas";
import { calcularEstadisticasObjeto, obtenerSubtipoArmadura } from "../objetos";
import { calcularBonificacionesDominioEquipo } from "./clases";

import type { BonificacionesDerivadasRpg } from "./estadisticas";

export interface ModificadoresEquipoParaRpg {
  hpMaximo?: number;
  ataque?: number;
  defensa?: number;
  velocidad?: number;
  probCritico?: number;
  danoCritico?: number;
  ataqueMagico?: number;
  defensaMagica?: number;
  precision?: number;
  evasion?: number;
  energiaMaxima?: number;
  manaMaximo?: number;
  regeneracionVidaPorTurno?: number;
  regeneracionEnergiaPorTurno?: number;
  regeneracionManaPorTurno?: number;
}

function valorSeguro(
  modificadores: ModificadoresEquipoParaRpg,
  clave: keyof ModificadoresEquipoParaRpg
): number {
  const valor = modificadores[clave];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

/**
 * Adapta las estadísticas del equipo (nombres heredados) a las claves que
 * utiliza el cálculo RPG nuevo. Así el equipo modifica también los máximos
 * y la regeneración de recursos en los turnos de combate.
 */
export function mapearBonificacionesEquipoRpg(
  equipo: ModificadoresEquipoParaRpg
): BonificacionesDerivadasRpg {
  return {
    hpMaximo: valorSeguro(equipo, "hpMaximo"),
    ataqueFisico: valorSeguro(equipo, "ataque"),
    ataqueMagico: valorSeguro(equipo, "ataqueMagico"),
    defensaFisica: valorSeguro(equipo, "defensa"),
    defensaMagica: valorSeguro(equipo, "defensaMagica"),
    velocidad: valorSeguro(equipo, "velocidad"),
    probCritico: valorSeguro(equipo, "probCritico"),
    danoCritico: valorSeguro(equipo, "danoCritico"),
    precision: valorSeguro(equipo, "precision"),
    evasion: valorSeguro(equipo, "evasion"),
    energiaMaxima: valorSeguro(equipo, "energiaMaxima"),
    manaMaximo: valorSeguro(equipo, "manaMaximo"),
    regeneracionVidaPorTurno: valorSeguro(equipo, "regeneracionVidaPorTurno"),
    regeneracionEnergiaPorTurno: valorSeguro(equipo, "regeneracionEnergiaPorTurno"),
    regeneracionManaPorTurno: valorSeguro(equipo, "regeneracionManaPorTurno"),
  };
}

/**
 * Calcula las estadísticas de una pieza y aplica dominio de armas/armaduras.
 * Las joyas son objetos de tipo "accesorio", por lo que quedan fuera de la
 * penalización de armadura aunque aporten defensa.
 */
function calcularEstadisticasPiezaEquipamiento(
  pieza: ObjetoInventario,
  claseId?: string | null
): ModificadoresEstadisticas {
  const estadisticas = calcularEstadisticasObjeto(
    pieza.objeto,
    pieza.nivelMejora,
    pieza.bonificaciones
  );
  if (!claseId) return estadisticas;

  if (pieza.objeto.tipo === "arma") {
    // Un arma sin subtipo explícito se considera no dominada para que no
    // pueda eludir la penalización del 25 %.
    const tipoArma = pieza.objeto.subtipo ?? "__sin_tipo__";
    const dominio = calcularBonificacionesDominioEquipo(
      claseId,
      tipoArma
    );
    estadisticas.ataque *= dominio.multiplicadorAtaqueArma;
    if (typeof estadisticas.ataqueMagico === "number") {
      estadisticas.ataqueMagico *= dominio.multiplicadorAtaqueArma;
    }
  } else if (pieza.objeto.tipo === "armadura" && pieza.objeto.slot === "mano_secundaria") {
    // El escudo se domina como un tipo de equipamiento de mano, no como
    // armadura ligera/media/pesada. Las piezas legacy sin subtipo se tratan como escudos.
    const tipoEscudo = pieza.objeto.subtipo ?? "escudo";
    const dominio = calcularBonificacionesDominioEquipo(
      claseId,
      tipoEscudo
    );
    estadisticas.defensa *= dominio.multiplicadorAtaqueArma;
    if (typeof estadisticas.defensaMagica === "number") {
      estadisticas.defensaMagica *= dominio.multiplicadorAtaqueArma;
    }
  } else if (pieza.objeto.tipo === "armadura") {
    // Una armadura sin subtipo conocido se trata como no dominada, nunca como
    // una pieza que evita por accidente la penalización.
    const subtipo = obtenerSubtipoArmadura(pieza.objeto) ?? "__sin_subtipo__";
    const dominio = calcularBonificacionesDominioEquipo(
      claseId,
      undefined,
      subtipo
    );
    estadisticas.defensa *= dominio.multiplicadorDefensaArmadura;
    if (typeof estadisticas.defensaMagica === "number") {
      estadisticas.defensaMagica *= dominio.multiplicadorDefensaArmadura;
    }
  }

  return estadisticas;
}

/** Aplica dominios en todas las ranuras; las joyas no se consideran armadura. */
export function calcularModificadoresEquipo(
  equipo: EquipoPersonaje,
  claseId?: string | null
): ModificadoresEstadisticas {
  const piezas: Array<ObjetoInventario | null> = [
    equipo.arma,
    equipo.manoSecundaria,
    equipo.casco,
    equipo.armadura,
    equipo.pantalones,
    equipo.botas,
    equipo.guantes,
    equipo.accesorio,
    equipo.anillo1,
    equipo.anillo2,
  ];

  return sumarModificadores(
    ...piezas
      .filter((pieza): pieza is ObjetoInventario => pieza !== null)
      .map((pieza) => {
        const stats = calcularEstadisticasPiezaEquipamiento(pieza, claseId);
        return { ...stats, regeneracionEnergiaPorTurno: (stats.regeneracionEnergiaPorTurno ?? 0) + (stats.energiaMaxima ?? 0) * 0.2 };
      })
  );
}
