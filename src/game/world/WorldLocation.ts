export interface GeographicLocation {
  lat: number;
  lng: number;
}

export interface WorldBaseLocation extends GeographicLocation {
  id: string;
  name: string;
}

export interface WorldPoint {
  x: number;
  y: number;
}

const MAP_SIZE_TILES = 256;
const TILE_SIZE = 32;
const WEB_MERCATOR_TILE_SIZE = 256;
const MAX_MERCATOR_LATITUDE = 85.05112878;
const MAP_CENTER = (MAP_SIZE_TILES * TILE_SIZE) / 2;

export const WORLD_MAP_SIZE_TILES = MAP_SIZE_TILES;
export const WORLD_MAP_SIZE_PIXELS = MAP_SIZE_TILES * TILE_SIZE;
export const WORLD_MAP_ZOOM = 16;

export function geographicToMapPixels(
  location: GeographicLocation,
  zoom = WORLD_MAP_ZOOM
): WorldPoint {
  const safeLatitude = Math.max(
    -MAX_MERCATOR_LATITUDE,
    Math.min(MAX_MERCATOR_LATITUDE, location.lat)
  );
  const scale = WEB_MERCATOR_TILE_SIZE * 2 ** zoom;
  const latitudeRadians = safeLatitude * (Math.PI / 180);
  const sinLatitude = Math.sin(latitudeRadians);

  return {
    x: ((location.lng + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale,
  };
}

/** Converts lat/lng differences around the selected base to local 2D world units. */
export function geographicToWorldPoint(
  location: GeographicLocation,
  origin: GeographicLocation
): WorldPoint {
  const locationPixels = geographicToMapPixels(location);
  const originPixels = geographicToMapPixels(origin);

  return {
    x: MAP_CENTER + locationPixels.x - originPixels.x,
    y: MAP_CENTER + locationPixels.y - originPixels.y,
  };
}

export function isInsideWorldMap(point: WorldPoint): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < WORLD_MAP_SIZE_PIXELS &&
    point.y < WORLD_MAP_SIZE_PIXELS
  );
}
