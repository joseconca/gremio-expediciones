export const baseCollision = {
  width: 30,
  height: 45,
  tileSize: 32,

  tiles: Array.from({ length: 45 }, () => Array(30).fill(0)),
};

//pared provisional
for (let y = 10; y < 20; y++) {
  baseCollision.tiles[y][15] = 1;
}
