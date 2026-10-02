export interface CollisionMapConfig {
  width: number;
  height: number;
  originX?: number;
  originY?: number;
  tileSize: number;
  tiles: number[][];
}

export class CollisionMap {
  width: number;
  height: number;
  originX: number;
  originY: number;
  readonly tileSize: number;

  private tiles: number[][];

  constructor(config: CollisionMapConfig) {
    this.width = config.width;
    this.height = config.height;
    this.originX = config.originX ?? 0;
    this.originY = config.originY ?? 0;
    this.tileSize = config.tileSize;

    this.tiles = config.tiles;
  }

  resize(config: CollisionMapConfig): void {
    this.width = config.width;
    this.height = config.height;
    this.originX = config.originX ?? 0;
    this.originY = config.originY ?? 0;
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
    const localX = x - this.originX;
    const localY = y - this.originY;
    const left = Math.floor(localX / this.tileSize);

    const right = Math.floor((localX + width - 1) / this.tileSize);

    const top = Math.floor(localY / this.tileSize);

    const bottom = Math.floor((localY + height - 1) / this.tileSize);

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
