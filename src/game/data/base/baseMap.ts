import { baseTileset } from "./baseTileset";

export const baseMap = {
  width: 30,
  height: 45,
  tileSize: 32,

  tileset: baseTileset,

  layers: [
    {
      name: "ground",
      tiles: Array.from(
        { length: 45 },
        () => Array(30).fill(0)
      ),
    },
  ],
};