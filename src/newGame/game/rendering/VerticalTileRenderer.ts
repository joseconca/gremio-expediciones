import { SpriteSheet } from "./SpriteSheet";
import type { GroundProjection, GroundReference } from "./GroundProjection";
import type { TileMap, TileLayer } from "../world/TileMap";
import type { Camera } from "../world/Camera";

export class VerticalTileRenderer {
  private readonly tileMap: TileMap;
  private readonly projection: GroundProjection;
  private readonly spriteSheet: SpriteSheet | null;
  private readonly tilesetConfig: NonNullable<TileMap["tileset"]> | null;

  constructor(tileMap: TileMap, projection: GroundProjection) {
    this.tileMap = tileMap;
    this.projection = projection;

    const hasVerticalLayers = tileMap.getVerticalLayers().length > 0;
    if (hasVerticalLayers && !tileMap.tileset) {
      throw new Error("Las capas verticales necesitan un tileset.");
    }
    this.tilesetConfig = hasVerticalLayers ? tileMap.tileset ?? null : null;
    this.spriteSheet = this.tilesetConfig
      ? new SpriteSheet({
          src: this.tilesetConfig.src,
          frameWidth: this.tilesetConfig.tileWidth,
          frameHeight: this.tilesetConfig.tileHeight,
        })
      : null;
  }

  render(
    ctx: CanvasRenderingContext2D,
    _camera: Camera,
    reference: GroundReference
  ): void {
    if (!this.spriteSheet?.isLoaded()) {
      return;
    }

    const layers = this.tileMap.getVerticalLayers();

    for (const layer of layers) {
      this.renderLayer(ctx, layer, reference);
    }
  }

  private renderLayer(
    ctx: CanvasRenderingContext2D,
    layer: TileLayer,
    reference: GroundReference
  ): void {
    const spriteSheet = this.spriteSheet;
    const tilesetConfig = this.tilesetConfig;
    if (!spriteSheet || !tilesetConfig) return;

    const columns = spriteSheet.getColumns();

    if (columns <= 0) {
      return;
    }

    for (let y = 0; y < this.tileMap.height; y++) {
      const row = layer.tiles[y];

      if (!row) {
        continue;
      }

      for (let x = 0; x < this.tileMap.width; x++) {
        const tileId = row[x];

        if (tileId === undefined || tileId < 0) {
          continue;
        }

        this.renderTile(ctx, x, y, tileId, columns, reference);
      }
    }
  }

  private renderTile(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    tileId: number,
    columns: number,
    reference: GroundReference
  ): void {
    const tileSize = this.tileMap.tileSize;

    const spriteSheet = this.spriteSheet;
    const tilesetConfig = this.tilesetConfig;
    if (!spriteSheet || !tilesetConfig) return;

    const sourceX = (tileId % columns) * tilesetConfig.tileWidth;

    const sourceY =
      Math.floor(tileId / columns) * tilesetConfig.tileHeight;

    /*
     * El punto de apoyo de una pared es el centro de su
     * borde inferior en coordenadas de mundo.
     */
    const worldX = this.tileMap.originX + tileX * tileSize + tileSize / 2;

    const worldY = this.tileMap.originY + (tileY + 1) * tileSize;

    const projected = this.projection.project(
      worldX,
      worldY,
      reference,
      ctx.canvas.width,
      ctx.canvas.height
    );

    const scale = projected.scale;

    const destinationWidth = tilesetConfig.tileWidth * scale;

    const destinationHeight = tilesetConfig.tileHeight * scale;

    /*
     * La base proyectada es el centro inferior de la pared.
     * Por eso desplazamos la mitad del ancho hacia la izquierda.
     */
    const destinationX = projected.x - destinationWidth / 2;

    const destinationY = projected.y - destinationHeight;

    ctx.drawImage(
      spriteSheet.image,

      sourceX,
      sourceY,
      tilesetConfig.tileWidth,
      tilesetConfig.tileHeight,

      Math.round(destinationX),
      Math.round(destinationY),
      Math.round(destinationWidth),
      Math.round(destinationHeight)
    );
  }
}
