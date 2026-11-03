import { leerEnemigosEnCombate } from "@/lib/expediciones/combate/enemigos-combate";
import type { EstadoParty, ResultadoCombatePanelParty } from "./tipos";

/**
 * Construye el informe visible a partir del estado recibido.
 * Sin I/O ni mutaciones: preserva datos confirmados si un sondeo posterior
 * trae un resultado parcial de la misma expedición.
 */
export function obtenerResultadoInformeParty(
  estado: EstadoParty,
  actual: ResultadoCombatePanelParty | null,
): ResultadoCombatePanelParty | null {
  const expedicion = estado.expedicionActiva;
  const combate = expedicion?.combate;
  if (expedicion && combate && (combate.fase === "victoria" || combate.fase === "derrota" || combate.fase === "huida")) {
    const logCombate = Array.isArray(combate.log)
      ? combate.log.filter((linea): linea is string => typeof linea === "string")
      : [];
    const enemigosDerrotados = leerEnemigosEnCombate(combate.enemigos)
      .filter((enemigo) => enemigo.hp <= 0)
      .map((enemigo) => enemigo.nombre);
    if (enemigosDerrotados.length === 0 && combate.fase === "victoria") enemigosDerrotados.push(combate.enemigoNombre);
    const duracionSegundos = Math.max(0, Math.round((new Date(expedicion.fechaLlegada).getTime() - new Date(expedicion.fechaSalida).getTime()) * 2 / 1000));
    const resultadoNuevo: ResultadoCombatePanelParty = {
      expedicionPartyId: expedicion.id,
      fase: combate.fase,
      recompensas: combate.fase === "victoria" || combate.fase === "derrota" ? combate.recompensasResultado ?? null : null,
      tipo: expedicion.tipo,
      nombre: expedicion.nombre,
      dificultad: expedicion.dificultad,
      modoDificultad: expedicion.modoDificultad,
      duracionSegundos,
      enemigosDerrotados,
      logCombate,
    };
    if (actual?.expedicionPartyId !== expedicion.id) return resultadoNuevo;
    return {
      ...actual,
      ...resultadoNuevo,
      recompensas: actual.recompensas ?? resultadoNuevo.recompensas,
      logCombate: actual.logCombate?.length ? actual.logCombate : logCombate,
    };
  }
  if (expedicion) return actual?.expedicionPartyId === expedicion.id ? actual : null;
  if (estado.ultimoResultadoExpedicion && estado.party) {
    const resultadoPersistido = estado.ultimoResultadoExpedicion;
    const mismoResultado = actual?.expedicionPartyId === resultadoPersistido.expedicionPartyId;
    return {
      expedicionPartyId: resultadoPersistido.expedicionPartyId,
      fase: resultadoPersistido.fase,
      recompensas: (mismoResultado ? actual.recompensas : null) ?? resultadoPersistido.recompensas,
      tipo: resultadoPersistido.tipo,
      nombre: resultadoPersistido.nombre,
      dificultad: resultadoPersistido.dificultad,
      modoDificultad: resultadoPersistido.modoDificultad,
      duracionSegundos: resultadoPersistido.duracionSegundos,
      enemigosDerrotados: resultadoPersistido.enemigosDerrotados ?? (mismoResultado ? actual.enemigosDerrotados : []),
      logCombate: (mismoResultado ? actual.logCombate : null)?.length ? actual!.logCombate : resultadoPersistido.logCombate ?? [],
    };
  }
  return null;
}
