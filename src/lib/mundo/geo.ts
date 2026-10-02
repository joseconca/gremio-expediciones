import { calcularDistanciaKm } from "@/lib/utils";

const METERS_PER_DEGREE_LATITUDE = 111_320;

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
  const latDelta = meters / METERS_PER_DEGREE_LATITUDE;
  const cosLat = Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01);
  const lngDelta = latDelta / cosLat;
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
