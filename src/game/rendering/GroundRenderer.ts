import { SpriteSheet } from "./SpriteSheet";
import { GroundProjection, type GroundReference } from "./GroundProjection";

import type { TileMap, TileLayer } from "../world/TileMap";

import type { Camera } from "../world/Camera";

export class GroundRenderer {
  private readonly tileMap: TileMap;
  private readonly projection: GroundProjection;
  private readonly tileset: SpriteSheet;

  /**
   * Subdivisiones verticales de cada tile.
   *
   * Más subdivisiones = perspectiva más suave.
   */
  private readonly subdivisions = 8;

  constructor(tileMap: TileMap, projection: GroundProjection) {
    this.tileMap = tileMap;
    this.projection = projection;

    this.tileset = new SpriteSheet({
      src: tileMap.tileset.src,
      frameWidth: tileMap.tileset.tileWidth,
      frameHeight: tileMap.tileset.tileHeight,
    });
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    reference: GroundReference
  ): void {
    if (!this.tileset.isLoaded()) {
      return;
    }

    ctx.imageSmoothingEnabled = false;

    const layers = this.tileMap.getGroundLayers();

    for (const layer of layers) {
      this.renderLayer(ctx, camera, reference, layer);
    }
  }

  private renderLayer(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    reference: GroundReference,
    layer: TileLayer
  ): void {
    const tileSize = this.tileMap.tileSize;

    /*
     * Renderizamos un margen amplio alrededor
     * de la zona de cámara.
     *
     * Esto es deliberado porque la perspectiva
     * hace que la zona visible no corresponda
     * exactamente al rectángulo de cámara.
     */
    const startY = Math.max(0, Math.floor(camera.y / tileSize) - 40);

    const endY = Math.min(
      this.tileMap.height - 1,
      Math.ceil((camera.y + camera.height) / tileSize) + 40
    );

    const startX = Math.max(0, Math.floor(camera.x / tileSize) - 40);

    const endX = Math.min(
      this.tileMap.width - 1,
      Math.ceil((camera.x + camera.width) / tileSize) + 40
    );

    /*
     * Lejos → cerca.
     */
    for (let tileY = startY; tileY <= endY; tileY++) {
      this.renderRow(ctx, camera, reference, layer, tileY, startX, endX);
    }
  }

  private renderRow(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    reference: GroundReference,
    layer: TileLayer,
    tileY: number,
    startX: number,
    endX: number
  ): void {
    const row = layer.tiles[tileY];

    if (!row) {
      return;
    }

    const tileSize = this.tileMap.tileSize;

    const worldY = tileY * tileSize;

    const sliceHeight = tileSize / this.subdivisions;

    /*
     * Cada tile se divide en bandas.
     */
    for (let slice = 0; slice < this.subdivisions; slice++) {
      const worldSliceY = worldY + slice * sliceHeight;

      const top = this.projection.project(
        reference.worldX,
        worldSliceY,
        reference,
        camera.width,
        camera.height
      );

      const bottom = this.projection.project(
        reference.worldX,
        worldSliceY + sliceHeight,
        reference,
        camera.width,
        camera.height
      );

      const destinationHeight = bottom.y - top.y;

      if (destinationHeight <= 0 || top.y > camera.height || bottom.y < 0) {
        continue;
      }

      for (let tileX = startX; tileX <= endX; tileX++) {
        const tileId = row[tileX];

        if (tileId === undefined || tileId < 0) {
          continue;
        }

        this.renderTileSlice(
          ctx,
          camera,
          reference,
          tileX,
          tileId,
          slice,
          sliceHeight,
          top,
          destinationHeight
        );
      }
    }
  }

  private renderTileSlice(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    reference: GroundReference,
    tileX: number,
    tileId: number,
    slice: number,
    sliceHeight: number,
    projectedTop: {
      x: number;
      y: number;
      scale: number;
    },
    destinationHeight: number
  ): void {
    const columns = this.tileset.getColumns();

    if (columns <= 0) {
      return;
    }

    const frameX = tileId % columns;

    const frameY = Math.floor(tileId / columns);

    const frame = this.tileset.getFrame(frameX, frameY);

    const tileSize = this.tileMap.tileSize;

    const worldX = tileX * tileSize;

    /*
     * X respecto al mismo punto de referencia
     * utilizado para toda la proyección.
     */
    const relativeX = worldX - reference.worldX;

    const screenX = reference.screenX + relativeX * projectedTop.scale;

    const destinationWidth = tileSize * projectedTop.scale;

    const sourceY = frame.sy + slice * sliceHeight;

    ctx.drawImage(
      this.tileset.image,

      frame.sx,
      sourceY,
      frame.sw,
      sliceHeight,

      Math.round(screenX),
      projectedTop.y,
      Math.ceil(destinationWidth),
      destinationHeight + 1
    );
  }
}
