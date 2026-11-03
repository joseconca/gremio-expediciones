import type { AccionCombatePartyUI } from "@/components/combate/tipos";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import type { EstadoParty, ResultadoRecompensasParty } from "./tipos";

/** Peticiones HTTP de la pantalla de party. La UI conserva sondeo, turnos y estados locales. */
export async function consultarEstadoParty(): Promise<EstadoParty> {
  const respuesta = await fetch("/api/party", { cache: "no-store" });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo consultar la party.");
  return datos as EstadoParty;
}

/** Envía traslados, llegadas, regreso y acciones del tablón. */
export async function enviarAccionParty(
  url: string,
  id?: string,
  campoId = "trasladoId",
): Promise<void> {
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(id ? { [campoId]: id } : {}),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || "No se pudo completar la operación.");
  }
}

/** Conserva la serialización legacy usada por el modal, incluidos los objetivos JSON. */
export function prepararPayloadAccionCombateParty(
  expedicionPartyId: string,
  tipo: AccionCombatePartyUI,
  id?: string,
) {
  let payloadHabilidad: { habilidadId: string; objetivoId?: string; enemigoObjetivoId?: string } | null = null;
  let objetivoEnemigoElegido: string | undefined;
  if (id && (tipo === "usar_habilidad" || tipo === "atacar")) {
    try {
      const parseado: unknown = JSON.parse(id);
      if (parseado && typeof parseado === "object" && !Array.isArray(parseado)) {
        const objeto = parseado as Record<string, unknown>;
        if (tipo === "usar_habilidad" && typeof objeto.habilidadId === "string") {
          payloadHabilidad = {
            habilidadId: objeto.habilidadId,
            ...(typeof objeto.objetivoId === "string" ? { objetivoId: objeto.objetivoId } : {}),
            ...(typeof objeto.enemigoObjetivoId === "string" ? { enemigoObjetivoId: objeto.enemigoObjetivoId } : {}),
          };
        }
        if (typeof objeto.enemigoObjetivoId === "string") objetivoEnemigoElegido = objeto.enemigoObjetivoId;
      } else if (tipo === "usar_habilidad") {
        payloadHabilidad = { habilidadId: id };
      }
    } catch {
      if (tipo === "usar_habilidad") payloadHabilidad = { habilidadId: id };
    }
  }
  return {
    expedicionPartyId,
    accion: tipo,
    ...(tipo === "usar_habilidad" && payloadHabilidad ? payloadHabilidad : {}),
    ...(tipo === "atacar" && objetivoEnemigoElegido ? { enemigoObjetivoId: objetivoEnemigoElegido } : {}),
    ...(tipo === "usar_objeto" && id ? { objetoInventarioId: id } : {}),
    ...(tipo === "cambiar_posicion" && id ? { posicion: id } : {}),
  };
}

export interface RespuestaAccionCombateParty {
  fase?: string;
  recompensas?: ResultadoRecompensasParty | null;
  accion?: AccionAnimadaCombate;
  error?: string;
}

/** Envía una acción, dejando la coordinación del estado al componente. */
export async function enviarAccionCombateParty(
  expedicionPartyId: string,
  tipo: AccionCombatePartyUI,
  id?: string,
): Promise<RespuestaAccionCombateParty> {
  const respuesta = await fetch("/api/expediciones/party/combate/accion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prepararPayloadAccionCombateParty(expedicionPartyId, tipo, id)),
  });
  const datos = (await respuesta.json().catch(() => ({}))) as RespuestaAccionCombateParty;
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo ejecutar la acción.");
  return datos;
}

/**
 * Frecuencia del sondeo: prioriza combates y visitas que están a punto de llegar.
 * El reloj de la interfaz sigue actualizándose aparte cada segundo.
 */
export function intervaloConsultaParty(estado: EstadoParty | null, ahora: number): number {
  if (estado?.expedicionActiva?.fase === "combatiendo") return 3000;
  if (estado?.expedicionActiva || (estado?.trasladosPropios.length ?? 0) > 0) return 5000;
  if ((estado?.visitasEntrantes ?? []).some((traslado) =>
    !traslado.haLlegadoEnServidor &&
    new Date(traslado.fechaLlegada).getTime() - ahora <= 15_000
  )) return 2000;
  if ((estado?.visitasEntrantes.length ?? 0) > 0) return 5000;
  if (estado?.party) return 15000;
  return 30000;
}

/** Resuelve un turno enemigo sin gestionar aquí la pausa visual ni el sondeo. */
export async function enviarTurnoEnemigoParty(
  expedicionPartyId: string,
): Promise<RespuestaAccionCombateParty> {
  const respuestaTurno = await fetch("/api/expediciones/party/combate/turno-enemigo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expedicionPartyId }),
  });
  const datosTurno = (await respuestaTurno.json().catch(() => ({}))) as RespuestaAccionCombateParty;
  if (!respuestaTurno.ok) throw new Error(datosTurno.error || "No se pudo resolver el turno del enemigo.");
  return datosTurno;
}
