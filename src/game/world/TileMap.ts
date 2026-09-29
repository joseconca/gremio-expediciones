export interface TileMapConfig {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;

  private tiles: number[][];

  constructor(config: TileMapConfig) {
    this.width = config.width;
    this.height = config.height;
    this.tileSize = config.tileSize;
    this.tiles = config.tiles;
  }

  getTile(x: number, y: number): number {
    if (
      x < 0 ||
      y < 0 ||
      x >= this.width ||
      y >= this.height
    ) {
      return -1;
    }

    return this.tiles[y][x];
  }

  isInsideWorld(x: number, y: number): boolean {
    return (
      x >= 0 &&
      y >= 0 &&
      x < this.width * this.tileSize &&
      y < this.height * this.tileSize
    );
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const startX = Math.max(
      0,
      Math.floor(cameraX / this.tileSize)
    );

    const startY = Math.max(
      0,
      Math.floor(cameraY / this.tileSize)
    );

    const endX = Math.min(
      this.width,
      Math.ceil(
        (cameraX + canvasWidth) / this.tileSize
      )
    );

    const endY = Math.min(
      this.height,
      Math.ceil(
        (cameraY + canvasHeight) / this.tileSize
      )
    );

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.getTile(x, y);

        const screenX =
          x * this.tileSize - cameraX;

        const screenY =
          y * this.tileSize - cameraY;

        this.renderTile(
          ctx,
          tile,
          screenX,
          screenY
        );
      }
    }
  }

  private renderTile(
    ctx: CanvasRenderingContext2D,
    tile: number,
    x: number,
    y: number
  ): void {
    if (tile === 0) {
      ctx.fillStyle = "#263b2a";
    } else {
      ctx.fillStyle = "#334d38";
    }

    ctx.fillRect(
      x,
      y,
      this.tileSize,
      this.tileSize
    );
  }
}