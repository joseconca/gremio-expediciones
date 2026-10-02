import { baseTileset } from "./baseTileset";
import type { TileMapConfig } from "../../world/TileMap";
import { calculateVillageBounds, VILLAGE_TILE_SIZE } from "../../../shared/village";

// Gate clearance belongs to map content, independent of dynamic tile dimensions.
export const villageGateConfig = {
    centerX: 496,
    horizontalClearance: 64,
    verticalClearance: 192,
    edgeMargin: 48,
    directions: ["north", "south", "east", "west"] as const,
};

export function createVillageMap(buildingCount: number): TileMapConfig {
  const bounds = calculateVillageBounds(buildingCount);
  const width = bounds.width / VILLAGE_TILE_SIZE;
  const height = bounds.height / VILLAGE_TILE_SIZE;
  return {
    width, height, tileSize: VILLAGE_TILE_SIZE,
    originX: bounds.minX, originY: bounds.minY,
    tileset: baseTileset,
    layers: [{ name: "ground", tiles: Array.from({ length: height }, () => Array(width).fill(0)),
      renderMode: "ground", projection: { angle: 30 } }],
  };
}
