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
