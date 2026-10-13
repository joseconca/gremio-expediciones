import { calculateVillageBounds, VILLAGE_TILE_SIZE } from "../../../shared/village";
import type { CollisionMapConfig } from "../../world/CollisionMap";

export function createVillageCollision(buildingCount: number): CollisionMapConfig {
  const bounds = calculateVillageBounds(buildingCount);
  const width = bounds.width / VILLAGE_TILE_SIZE;
  const height = bounds.height / VILLAGE_TILE_SIZE;
  return { width, height, tileSize: VILLAGE_TILE_SIZE, originX: bounds.minX, originY: bounds.minY,
    tiles: Array.from({ length: height }, () => Array(width).fill(0)) };
}