export const PARTY_MAX_MIEMBROS = 3;

export const ESTADOS_TRASLADO_ACTIVOS = [
  "en_viaje",
  "pendiente",
  "regresando",
] as const;

export interface CoordenadasBase {
  lat: number;
  lng: number;
}

export function leerCoordenadasBase(valor: unknown): CoordenadasBase | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;

  const registro = valor as Record<string, unknown>;
  const lat = registro.lat;
  const lng = registro.lng;

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

/**
 * Conserva la regla de viaje actual del juego: la duración es la mitad del
 * tiempo estimado a la velocidad indicada, con una duración mínima de 30 s.
 * Los traslados entre bases no consultan el proveedor meteorológico.
 */
export function calcularFechaLlegadaTraslado(
  distanciaKm: number,
  fechaSalida: Date = new Date(),
  velocidadKmh = 6,
): Date {
  if (!Number.isFinite(distanciaKm) || distanciaKm < 0) {
    throw new RangeError("La distancia del traslado debe ser un número no negativo.");
  }
  if (!Number.isFinite(velocidadKmh) || velocidadKmh <= 0) {
    throw new RangeError("La velocidad del traslado debe ser mayor que cero.");
  }
  if (!(fechaSalida instanceof Date) || !Number.isFinite(fechaSalida.getTime())) {
    throw new RangeError("La fecha de salida del traslado no es válida.");
  }

  const horas = Math.max(1 / 60, distanciaKm / velocidadKmh);
  return new Date(fechaSalida.getTime() + (horas * 60 * 60 * 1000) / 2);
}

export function puedeAceptarMiembro(miembrosActuales: number): boolean {
  return (
    Number.isInteger(miembrosActuales) &&
    miembrosActuales >= 1 &&
    miembrosActuales < PARTY_MAX_MIEMBROS
  );
}

/**
 * Un anfitrión sin party puede aceptar la primera visita y convertirse en líder.
 * Si ya pertenece a una party, solo el líder puede gestionar las incorporaciones.
 */
export function puedeGestionarVisitas(tieneParty: boolean, esLider: boolean): boolean {
  return !tieneParty || esLider;
}

export function esTrasladoActivo(estado: string): boolean {
  return (ESTADOS_TRASLADO_ACTIVOS as readonly string[]).includes(estado);
}

export function obtenerEstadoFinalTraslado(decision: string | null): string {
  return decision === "rechazada" ? "rechazada" : "completada";
}
