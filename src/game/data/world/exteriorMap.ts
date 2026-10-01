import { WORLD_MAP_SIZE_TILES } from "../../world/WorldLocation";

export const exteriorMap = {
  width: WORLD_MAP_SIZE_TILES,
  height: WORLD_MAP_SIZE_TILES,
  tileSize: 32,
  // Ground is supplied by RealWorldGroundRenderer; this map only defines dimensions.
  layers: [],
};

export const exteriorCollision = {
  width: WORLD_MAP_SIZE_TILES,
  height: WORLD_MAP_SIZE_TILES,
  tileSize: 32,
  tiles: Array.from({ length: WORLD_MAP_SIZE_TILES }, (_, y) =>
    Array.from({ length: WORLD_MAP_SIZE_TILES }, (_, x) =>
      x === 0 ||
      y === 0 ||
      x === WORLD_MAP_SIZE_TILES - 1 ||
      y === WORLD_MAP_SIZE_TILES - 1
        ? 1
        : 0
    )
  ),
};

