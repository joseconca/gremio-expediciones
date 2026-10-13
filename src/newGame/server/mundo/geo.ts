import { calcularDistanciaKm } from "@/lib/utils";

const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  return calcularDistanciaKm(a.lat, a.lng, b.lat, b.lng) * 1000;
}

/** Rectangular prefilter so distance checks never scan every base. */
export function boundingBox(
  center: { lat: number; lng: number },
  meters: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  // Use the same sphere as the final distance test; an undersized prefilter
  // previously missed bases just below 200 m along the north/south axis.
  const angularRadius = meters / EARTH_RADIUS_METERS;
  const latDelta = angularRadius * 180 / Math.PI;
  const cosLat = Math.cos((center.lat * Math.PI) / 180);
  const lngDelta = Math.asin(Math.min(1, Math.sin(angularRadius) / cosLat)) * 180 / Math.PI;
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/** SQL-compatible longitude filter, including bases across the date line. */
export function longitudeFilter(box: { minLng: number; maxLng: number }) {
  if (box.minLng < -180) {
    return { OR: [{ lng: { gte: box.minLng + 360 } }, { lng: { lte: box.maxLng } }] };
  }
  if (box.maxLng > 180) {
    return { OR: [{ lng: { gte: box.minLng } }, { lng: { lte: box.maxLng - 360 } }] };
  }
  return { lng: { gte: box.minLng, lte: box.maxLng } };
}
