import { baseTileset } from "./baseTileset";

export const baseMap = {
  width: 30,
  height: 45,
  tileSize: 32,

  // Exit anchors belong to this map; VillageGateLayout offsets them around buildings.
  exteriorGates: {
    centerX: 496,
    horizontalClearance: 128,
    verticalClearance: 192,
    edgeMargin: 48,
    directions: ["north", "south", "east", "west"] as const,
  },

  tileset: baseTileset,

  layers: [
    {
      name: "ground",
      tiles: Array.from({ length: 45 }, () => Array(30).fill(0)),
      renderMode: "ground" as const,
      projection: {
        angle: 30,
      },
    },
  ],
};
