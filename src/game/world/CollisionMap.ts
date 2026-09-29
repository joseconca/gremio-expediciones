export interface CollisionMapConfig {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
}

export class CollisionMap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;

  private tiles: number[][];

  constructor(config: CollisionMapConfig) {
    this.width = config.width;
    this.height = config.height;
    this.tileSize = config.tileSize;

    this.tiles = config.tiles;
  }

  isBlockedTile(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
      return true;
    }

    return this.tiles[tileY][tileX] === 1;
  }

  isBlockedRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    const left = Math.floor(x / this.tileSize);

    const right = Math.floor((x + width - 1) / this.tileSize);

    const top = Math.floor(y / this.tileSize);

    const bottom = Math.floor((y + height - 1) / this.tileSize);

    for (let tileY = top; tileY <= bottom; tileY++) {
      for (let tileX = left; tileX <= right; tileX++) {
        if (this.isBlockedTile(tileX, tileY)) {
          return true;
        }
      }
    }

    return false;
  }
}
