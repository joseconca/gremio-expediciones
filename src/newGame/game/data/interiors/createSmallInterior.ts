import type { TileMapConfig } from "../../world/TileMap";
import type { CollisionMapConfig } from "../../world/CollisionMap";

interface InteriorTileset {
  src: string;
  tileWidth: number;
  tileHeight: number;
}

export function createSmallInterior(tileset: InteriorTileset): {
  map: TileMapConfig;
  collision: CollisionMapConfig;
} {
  const width = 5;
  const height = 5;
  const exitX = 2;
  const groundTiles = Array.from({ length: height }, () =>
    Array(width).fill(0)
  );
  const wallTiles = Array.from({ length: height }, () => Array(width).fill(-1));

  wallTiles[0][0] = 16;
  wallTiles[0][width - 1] = 17;
  for (let x = 1; x < width - 1; x++) wallTiles[0][x] = 8;

  for (let y = 1; y < height - 1; y++) {
    wallTiles[y][0] = 10;
    wallTiles[y][width - 1] = 11;
  }

  wallTiles[height - 1][0] = 18;
  wallTiles[height - 1][width - 1] = 19;
  for (let x = 1; x < width - 1; x++) {
    wallTiles[height - 1][x] = x === exitX ? 40 : 9;
  }

  const collision: CollisionMapConfig = {
    width,
    height,
    tileSize: 32,
    tiles: Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        const isWall =
          y === 0 ||
          x === 0 ||
          x === width - 1 ||
          (y === height - 1 && x !== exitX);
        return isWall ? 1 : 0;
      })
    ),
  };

  const map: TileMapConfig = {
    width,
    height,
    tileSize: 32,
    tileset,
    layers: [
      {
        name: "ground",
        tiles: groundTiles,
        renderMode: "ground",
        projection: { angle: 30 },
      },
      {
        name: "walls",
        tiles: wallTiles,
        renderMode: "ground",
        projection: { angle: 30 },
      },
    ],
  };

  return { map, collision };
}
