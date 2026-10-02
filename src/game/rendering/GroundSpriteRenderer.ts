import type { GroundProjection, GroundReference } from "./GroundProjection";

export interface GroundSpriteFrame {
  sx: number;
  sy: number;
  width: number;
  height: number;
}

/** Draws a sprite frame as a perspective-projected patch of ground. */
export class GroundSpriteRenderer {
  private static readonly SUBDIVISIONS = 16;

  static render(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    frame: GroundSpriteFrame,
    worldX: number,
    worldY: number,
    projection: GroundProjection,
    reference: GroundReference,
    worldWidth = frame.width,
    worldHeight = frame.height
  ): void {
    const sourceSliceHeight = frame.height / this.SUBDIVISIONS;
    const worldSliceHeight = worldHeight / this.SUBDIVISIONS;
    ctx.imageSmoothingEnabled = false;

    for (let slice = 0; slice < this.SUBDIVISIONS; slice++) {
      const sliceWorldY = worldY + slice * worldSliceHeight;
      const top = projection.project(
        worldX,
        sliceWorldY,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      );
      const bottom = projection.project(
        worldX,
        sliceWorldY + worldSliceHeight,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      );
      const destinationHeight = bottom.y - top.y;

      if (destinationHeight <= 0 || top.y > ctx.canvas.height || bottom.y < 0) {
        continue;
      }

      ctx.drawImage(
        image,
        frame.sx,
        frame.sy + slice * sourceSliceHeight,
        frame.width,
        sourceSliceHeight,
        Math.round(top.x),
        top.y,
        Math.ceil(worldWidth * top.scale),
        destinationHeight + 1
      );
    }
  }
}
