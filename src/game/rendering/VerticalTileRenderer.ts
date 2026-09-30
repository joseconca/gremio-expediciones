import { SpriteSheet } from "./SpriteSheet";
import type { GroundProjection, GroundReference } from "./GroundProjection";
import type { TileMap, TileLayer } from "../world/TileMap";
import type { Camera } from "../world/Camera";

export class VerticalTileRenderer {
  private readonly tileMap: TileMap;
  private readonly projection: GroundProjection;
  private readonly spriteSheet: SpriteSheet;

  constructor(tileMap: TileMap, projection: GroundProjection) {
    this.tileMap = tileMap;
    this.projection = projection;

    this.spriteSheet = new SpriteSheet({
      src: tileMap.tileset.src,
      frameWidth: tileMap.tileset.tileWidth,
      frameHeight: tileMap.tileset.tileHeight,
    });
  }

  render(
    ctx: CanvasRenderingContext2D,
    _camera: Camera,
    reference: GroundReference
  ): void {
    if (!this.spriteSheet.isLoaded()) {
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
    const columns = this.spriteSheet.getColumns();

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

    const sourceX = (tileId % columns) * this.tileMap.tileset.tileWidth;

    const sourceY =
      Math.floor(tileId / columns) * this.tileMap.tileset.tileHeight;

    /*
     * El punto de apoyo de una pared es el centro de su
     * borde inferior en coordenadas de mundo.
     */
    const worldX = tileX * tileSize + tileSize / 2;

    const worldY = (tileY + 1) * tileSize;

    const projected = this.projection.project(
      worldX,
      worldY,
      reference,
      ctx.canvas.width,
      ctx.canvas.height
    );

    const scale = projected.scale;

    const destinationWidth = this.tileMap.tileset.tileWidth * scale;

    const destinationHeight = this.tileMap.tileset.tileHeight * scale;

    /*
     * La base proyectada es el centro inferior de la pared.
     * Por eso desplazamos la mitad del ancho hacia la izquierda.
     */
    const destinationX = projected.x - destinationWidth / 2;

    const destinationY = projected.y - destinationHeight;

    ctx.drawImage(
      this.spriteSheet.image,

      sourceX,
      sourceY,
      this.tileMap.tileset.tileWidth,
      this.tileMap.tileset.tileHeight,

      Math.round(destinationX),
      Math.round(destinationY),
      Math.round(destinationWidth),
      Math.round(destinationHeight)
    );
  }
}
