import type { EstadoParty } from "./tipos";

type TrasladoParty = EstadoParty["trasladosPropios"][number];

export interface AccionAutomaticaTraslado {
  clave: string;
  ruta: "/api/party/transfer/llegar" | "/api/party/transfer/completar-regreso";
}

/**
 * El panel solo confirma traslados propios al alcanzar la hora prevista.
 * La API valida la fecha definitiva; este cálculo no modifica el traslado.
 * La clave conserva el estado para permitir un siguiente paso al regresar.
 */
export function obtenerAccionAutomaticaTraslado(
  traslado: TrasladoParty,
  ahora: number,
): AccionAutomaticaTraslado | null {
  if (new Date(traslado.fechaLlegada).getTime() > ahora) return null;
  const ruta =
    traslado.estado === "en_viaje"
      ? "/api/party/transfer/llegar"
      : traslado.estado === "regresando"
        ? "/api/party/transfer/completar-regreso"
        : null;
  if (!ruta) return null;
  return { clave: `${traslado.id}:${traslado.estado}`, ruta };
}

export type TipoPasoExpedicionParty = "llegar" | "iniciar-combate" | "regreso";

export interface PasoExpedicionParty {
  tipo: TipoPasoExpedicionParty;
  clave: string;
  ruta: "/api/expediciones/party/llegar" | "/api/expediciones/party/combate/iniciar" | "/api/expediciones/party/regreso";
  expedicionId: string;
}

/**
 * Decide si corresponde ejecutar una transición automática de la expedición.
 * El inicio del combate no espera al reloj: los otros dos pasos sí respetan
 * la hora de llegada. El estado y las peticiones siguen controlados por el panel.
 */
export function obtenerPasoExpedicionParty(
  expedicion: EstadoParty["expedicionActiva"],
  ahora?: number,
): PasoExpedicionParty | null {
  if (!expedicion) return null;

  if (expedicion.fase === "lista_para_combate" && !expedicion.combate) {
    return {
      tipo: "iniciar-combate",
      clave: `expedicion-party:${expedicion.id}:iniciar-combate`,
      ruta: "/api/expediciones/party/combate/iniciar",
      expedicionId: expedicion.id,
    };
  }

  // Sin referencia temporal no podemos confirmar llegada ni regreso.
  if (ahora === undefined || new Date(expedicion.fechaLlegada).getTime() > ahora) return null;

  if (expedicion.fase === "en_viaje") {
    return {
      tipo: "llegar",
      clave: `expedicion-party:${expedicion.id}:llegar`,
      ruta: "/api/expediciones/party/llegar",
      expedicionId: expedicion.id,
    };
  }
  if (expedicion.fase === "regresando") {
    return {
      tipo: "regreso",
      clave: `expedicion-party:${expedicion.id}:regreso`,
      ruta: "/api/expediciones/party/regreso",
      expedicionId: expedicion.id,
    };
  }
  return null;
}

/**
 * Solo solicita turno enemigo cuando el combate está activo y le toca actuar.
 * La clave incluye la versión para distinguir turnos sucesivos.
 */
export function obtenerTurnoEnemigoPendiente(
  expedicion: EstadoParty["expedicionActiva"],
): { clave: string; expedicionId: string } | null {
  const combate = expedicion?.combate;
  if (!expedicion || expedicion.fase !== "combatiendo" || !combate ||
      combate.fase !== "activo" || combate.faseTurno !== "enemigo") return null;
  return {
    clave: `combate-party:${combate.id}:v${combate.version}:enemigo`,
    expedicionId: expedicion.id,
  };
}
