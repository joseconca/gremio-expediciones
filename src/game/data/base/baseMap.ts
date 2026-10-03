import { baseTileset } from "./baseTileset";
import type { TileMapConfig, TileLayer } from "../../world/TileMap";
import {
  calculateVillageBounds,
  VILLAGE_TILE_SIZE,
} from "../../../shared/village";

// Gate clearance belongs to map content, independent of dynamic tile dimensions.
export const villageGateConfig = {
  centerX: 496,
  horizontalClearance: 64,
  verticalClearance: 192,
  edgeMargin: 48,
  directions: ["north", "south", "east", "west"] as const,
};

/**
 * Tile ID for the exterior-exit marker (column 0, row 6 in generic-tileset.png).
 * The tileset is 256 px wide with 32-px tiles → 8 columns.
 * tileId = col + row * columns = 0 + 6 * 8 = 48.
 */
const GATE_TILE_ID = 40;

export function createVillageMap(buildingCount: number): TileMapConfig {
  const bounds = calculateVillageBounds(buildingCount);
  const width = bounds.width / VILLAGE_TILE_SIZE;
  const height = bounds.height / VILLAGE_TILE_SIZE;
  return {
    width,
    height,
    tileSize: VILLAGE_TILE_SIZE,
    originX: bounds.minX,
    originY: bounds.minY,
    tileset: baseTileset,
    layers: [
      {
        name: "ground",
        tiles: Array.from({ length: height }, () => Array(width).fill(0)),
        renderMode: "ground",
        projection: { angle: 30 },
      },
    ],
  };
}

/**
 * Paints the exit marker tile (GATE_TILE_ID) on the "ground" layer at each gate
 * position. Call this after every resize() so the markers follow dynamic bounds.
 *
 * @param map    The TileMapConfig produced by createVillageMap / resize.
 * @param gates  World-space gate positions (x, y).
 */
export function placeGateTiles(
  map: TileMapConfig,
  gates: ReadonlyArray<{ x: number; y: number }>
): void {
  const groundLayer = map.layers.find((l): l is TileLayer => l.name === "ground");
  if (!groundLayer) return;

  const originX = map.originX ?? 0;
  const originY = map.originY ?? 0;
  const tileSize = map.tileSize;

  for (const gate of gates) {
    const col = Math.floor((gate.x - originX) / tileSize);
    const row = Math.floor((gate.y - originY) / tileSize);
    if (row >= 0 && row < map.height && col >= 0 && col < map.width) {
      groundLayer.tiles[row][col] = GATE_TILE_ID;
    }
  }
}

