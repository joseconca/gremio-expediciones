import { townHallInteriorTileset } from "./townHallInteriorTileset";

const WIDTH = 10;
const HEIGHT = 10;

const TILES = {
  floor: 0,

  wallTop: 8,
  wallBottom: 9,
  wallLeft: 10,
  wallRight: 11,

  cornerTopLeft: 16,
  cornerTopRight: 17,
  cornerBottomLeft: 18,
  cornerBottomRight: 19,

  exitDown: 40,
};

const groundTiles = Array.from({ length: HEIGHT }, () =>
  Array(WIDTH).fill(TILES.floor)
);

const wallTiles = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(-1));

// ─────────────────────────────────────────────
// Pared superior
// ─────────────────────────────────────────────

wallTiles[0][0] = TILES.cornerTopLeft;
wallTiles[0][WIDTH - 1] = TILES.cornerTopRight;

for (let x = 1; x < WIDTH - 1; x++) {
  wallTiles[0][x] = TILES.wallTop;
}

// ─────────────────────────────────────────────
// Pared izquierda / derecha
// ─────────────────────────────────────────────

for (let y = 1; y < HEIGHT - 1; y++) {
  wallTiles[y][0] = TILES.wallLeft;
  wallTiles[y][WIDTH - 1] = TILES.wallRight;
}

// ─────────────────────────────────────────────
// Pared inferior
// ─────────────────────────────────────────────

wallTiles[HEIGHT - 1][0] = TILES.cornerBottomLeft;

wallTiles[HEIGHT - 1][WIDTH - 1] = TILES.cornerBottomRight;

const exitX = 5;

for (let x = 1; x < WIDTH - 1; x++) {
  if (x === exitX) {
    wallTiles[HEIGHT - 1][x] = TILES.exitDown;

    continue;
  }

  wallTiles[HEIGHT - 1][x] = TILES.wallBottom;
}

export const townHallInteriorMap = {
  width: WIDTH,
  height: HEIGHT,
  tileSize: 32,

  tileset: townHallInteriorTileset,

  layers: [
    {
      name: "ground",
      tiles: groundTiles,
      renderMode: "ground" as const,
      projection: {
        angle: 30,
      },
    },

    {
      name: "walls",
      tiles: wallTiles,
      renderMode: "ground" as const,
      projection: { angle: 30 },
    },
  ],
};
