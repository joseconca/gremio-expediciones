import type { GeographicLocation, WorldPosition } from "./world";

const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;
const WEB_MERCATOR_SCALE = 256 * 2 ** 16;
const WORLD_ORIGIN = 4096;

function mercatorY(latitude: number): number {
  const bounded = Math.max(-WEB_MERCATOR_MAX_LATITUDE, Math.min(WEB_MERCATOR_MAX_LATITUDE, latitude));
  const radians = bounded * Math.PI / 180;
  const sine = Math.sin(radians);
  return (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * WEB_MERCATOR_SCALE;
}

/** Convert a saved exterior-world position back into geographic coordinates. */
export function worldPositionToGeographic(position: WorldPosition, origin: GeographicLocation): GeographicLocation {
  const x = ((position.x - WORLD_ORIGIN + WEB_MERCATOR_SCALE / 2) % WEB_MERCATOR_SCALE + WEB_MERCATOR_SCALE) % WEB_MERCATOR_SCALE - WEB_MERCATOR_SCALE / 2;
  const longitude = ((origin.lng + x / WEB_MERCATOR_SCALE * 360 + 540) % 360) - 180;
  const projectedY = mercatorY(origin.lat) + position.y - WORLD_ORIGIN;
  const normalizedY = Math.PI * (1 - 2 * projectedY / WEB_MERCATOR_SCALE);
  const latitude = Math.atan(Math.sinh(normalizedY)) * 180 / Math.PI;
  return { lat: Math.max(-WEB_MERCATOR_MAX_LATITUDE, Math.min(WEB_MERCATOR_MAX_LATITUDE, latitude)), lng: longitude };
}