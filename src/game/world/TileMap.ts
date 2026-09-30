import { SpriteSheet } from "../rendering/SpriteSheet";

export interface TileLayer {
  name: string;
  tiles: number[][];
}

export interface TileMapConfig {
  width: number;
  height: number;
  tileSize: number;
  tileset?: {
    src: string;
    tileWidth: number;
    tileHeight: number;
  };
  layers: TileLayer[];
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;

  private readonly layers: TileLayer[];
  private readonly tileset?: SpriteSheet;

  constructor(config: TileMapConfig) {
    this.width = config.width;
    this.height = config.height;
    this.tileSize = config.tileSize;
    this.layers = config.layers;

    if (config.tileset) {
      this.tileset = new SpriteSheet({
        src: config.tileset.src,
        frameWidth: config.tileset.tileWidth,
        frameHeight: config.tileset.tileHeight,
      });
    }
  }

  getTile(x: number, y: number, layerName?: string): number {
    if (
      x < 0 ||
      y < 0 ||
      x >= this.width ||
      y >= this.height
    ) {
      return -1;
    }

    const layer = layerName
      ? this.layers.find((layer) => layer.name === layerName)
      : this.layers[0];

    if (!layer) {
      return -1;
    }

    return layer.tiles[y][x];
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
      Math.ceil((cameraX + canvasWidth) / this.tileSize)
    );

    const endY = Math.min(
      this.height,
      Math.ceil((cameraY + canvasHeight) / this.tileSize)
    );

    // Las capas se dibujan en orden:
    // suelo -> paredes -> detalles -> ...
    for (const layer of this.layers) {
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const tile = layer.tiles[y][x];

          if (tile < 0) {
            continue;
          }

          const screenX = x * this.tileSize - cameraX;
          const screenY = y * this.tileSize - cameraY;

          this.renderTile(
            ctx,
            tile,
            screenX,
            screenY
          );
        }
      }
    }
  }

  private renderTile(
    ctx: CanvasRenderingContext2D,
    tile: number,
    x: number,
    y: number
  ): void {
    if (!this.tileset) {
      ctx.fillStyle =
        tile === 0 ? "#263b2a" : "#334d38";

      ctx.fillRect(
        x,
        y,
        this.tileSize,
        this.tileSize
      );

      return;
    }

    const image = this.tileset.image;

    if (!image.complete || image.naturalWidth === 0) {
      return;
    }

    const columns = Math.floor(
      image.naturalWidth / this.tileset.frameWidth
    );

    if (columns <= 0) {
      return;
    }

    const frameX = tile % columns;
    const frameY = Math.floor(tile / columns);

    const frame = this.tileset.getFrame(
      frameX,
      frameY
    );

    ctx.drawImage(
      image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x,
      y,
      this.tileSize,
      this.tileSize
    );
  }
}