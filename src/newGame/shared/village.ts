/** World-space village layout constants shared by rendering and checkpoint validation. */
export const VILLAGE_TILE_SIZE = 32;
export const VILLAGE_ROW_CENTER_X = 496;
export const VILLAGE_GROUND_Y = 704;
export const VILLAGE_BUILDING_SPACING = 224;
export const VILLAGE_BUILDING_WIDTH = 128;
export const VILLAGE_MARGIN = 96;
// Occupancy geometry of the local character, independent of its visual origin.
export const LOCAL_PLAYER_FOOTPRINT = { offsetX: 8, offsetY: 50, width: 12, height: 6 };

export interface VillageBounds {
  minX: number; minY: number; maxX: number; maxY: number;
  width: number; height: number;
}

/** Preserve absolute checkpoints: grow bounds around existing world coordinates. */
export function calculateVillageBounds(buildingCount: number): VillageBounds {
  const count = Math.max(1, Math.floor(buildingCount));
  const halfRowWidth = ((count - 1) * VILLAGE_BUILDING_SPACING + VILLAGE_BUILDING_WIDTH) / 2;
  const outerGroundY = VILLAGE_GROUND_Y + Math.floor((count - 1) / 2) * VILLAGE_TILE_SIZE;
  // Include the resource cart and campfire; their footprints stay in the village.
  const minX = Math.floor((Math.min(VILLAGE_ROW_CENTER_X - halfRowWidth, 296) - VILLAGE_MARGIN) / VILLAGE_TILE_SIZE) * VILLAGE_TILE_SIZE;
  const maxX = Math.ceil((Math.max(VILLAGE_ROW_CENTER_X + halfRowWidth, 624) + VILLAGE_MARGIN) / VILLAGE_TILE_SIZE) * VILLAGE_TILE_SIZE;
  const minY = VILLAGE_GROUND_Y - 128 - VILLAGE_MARGIN;
  // Keep the south arrival/player collider and gate at groundY + 192 clear.
  const maxY = Math.ceil(Math.max(outerGroundY + 224, 928) / VILLAGE_TILE_SIZE) * VILLAGE_TILE_SIZE;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}