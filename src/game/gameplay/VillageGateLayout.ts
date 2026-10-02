import type { VillageBuildingPlacement } from "./VillageProgression";
import type { WorldPoint } from "../world/WorldLocation";

export type CardinalDirection = "north" | "south" | "east" | "west";

export interface VillageExteriorGate extends WorldPoint {
  direction: CardinalDirection;
}

const BUILDING_FOOTPRINT = 128;
export interface VillageGateLayoutConfig {
  centerX: number;
  horizontalClearance: number;
  verticalClearance: number;
  edgeMargin: number;
  directions: readonly CardinalDirection[];
}

function clampBaseX(x: number, baseMapWidth: number, edgeMargin: number, originX: number): number {
  return Math.max(
    originX + edgeMargin,
    Math.min(originX + baseMapWidth - edgeMargin, x)
  );
}

/** Place exterior gates just beyond the current building footprint. */
export function calculateVillageExteriorGates(
  placements: VillageBuildingPlacement[],
  config: VillageGateLayoutConfig,
  baseMapWidth: number,
  originX = 0
): VillageExteriorGate[] {
  if (placements.length === 0) return [];

  const townHall = placements.find((placement) => placement.type === "town-hall");
  const centerX = townHall
    ? townHall.x + BUILDING_FOOTPRINT / 2
    : config.centerX;
  const minX = Math.min(...placements.map((placement) => placement.x));
  const maxX = Math.max(
    ...placements.map((placement) => placement.x + BUILDING_FOOTPRINT)
  );
  const minGroundY = Math.min(...placements.map((placement) => placement.y));
  const maxGroundY = Math.max(...placements.map((placement) => placement.y));

  const positions: Record<CardinalDirection, VillageExteriorGate> = {
    north: {
      direction: "north",
      x: centerX,
      y: minGroundY - config.verticalClearance,
    },
    south: {
      direction: "south",
      x: centerX,
      y: maxGroundY + config.verticalClearance,
    },
    east: {
      direction: "east",
      x: clampBaseX(
        maxX + config.horizontalClearance,
        baseMapWidth,
        config.edgeMargin,
        originX
      ),
      y: (minGroundY + maxGroundY) / 2,
    },
    west: {
      direction: "west",
      x: clampBaseX(
        minX - config.horizontalClearance,
        baseMapWidth,
        config.edgeMargin,
        originX
      ),
      y: (minGroundY + maxGroundY) / 2,
    },
  };

  return config.directions.map((direction) => positions[direction]);
}
