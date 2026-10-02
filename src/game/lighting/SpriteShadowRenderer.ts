import type { GroundProjection, GroundReference, ProjectedPoint } from "../rendering/GroundProjection";
import type { ShadowFootprint, ShadowSprite } from "./ShadowCaster";

const SHADOW_GRID_ROWS = 8;
const MAX_SHADOW_GRID_COLUMNS = 8;

/** Maps sprite height away from its ground anchor, opposite the sun. */
export function shadowSpriteGroundPoint(
  sprite: Pick<ShadowSprite, "anchorX" | "anchorY">,
  footprint: ShadowFootprint,
  sweep: { x: number; y: number },
  sourceX: number,
  sourceY: number
): { x: number; y: number } {
  const length = Math.hypot(sweep.x, sweep.y);
  const sideX = length > 0 ? -sweep.y / length : 1;
  const sideY = length > 0 ? sweep.x / length : 0;
  const lateral = sourceX - sprite.anchorX;
  const heightRatio = (sprite.anchorY - sourceY) / Math.max(1, sprite.anchorY);
  return {
    x: footprint.x + lateral * sideX + heightRatio * sweep.x,
    y: footprint.y + lateral * sideY + heightRatio * sweep.y,
  };
}

/** Alpha masks are cached per stable sprite/frame; no readback of scene or OSM pixels. */
export class SpriteShadowRenderer {
  private readonly masks = new WeakMap<ShadowSprite, HTMLCanvasElement>();

  render(
    ctx: CanvasRenderingContext2D,
    sprite: ShadowSprite,
    footprint: ShadowFootprint,
    sweep: { x: number; y: number },
    projection: GroundProjection,
    reference: GroundReference
  ): void {
    const project = (x: number, y: number) => {
      const point = shadowSpriteGroundPoint(sprite, footprint, sweep, x, y);
      return projection.project(point.x, point.y, reference, ctx.canvas.width, ctx.canvas.height);
    };
    const corners = [project(0, 0), project(sprite.width, 0), project(0, sprite.height), project(sprite.width, sprite.height)];
    if (
      corners.every((point) => point.x < 0) || corners.every((point) => point.x > ctx.canvas.width) ||
      corners.every((point) => point.y < 0) || corners.every((point) => point.y > ctx.canvas.height)
    ) return;
    const mask = this.getMask(sprite);
    if (!mask) return;
    const columns = Math.min(MAX_SHADOW_GRID_COLUMNS, Math.max(2, Math.ceil(sprite.width / 16)));
    const cellWidth = sprite.width / columns;
    const cellHeight = sprite.height / SHADOW_GRID_ROWS;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    let topRow = Array.from({ length: columns + 1 }, (_, column) => project(column * cellWidth, 0));
    for (let row = 0; row < SHADOW_GRID_ROWS; row++) {
      const sourceY = row * cellHeight;
      const bottomRow = Array.from({ length: columns + 1 }, (_, column) => project(column * cellWidth, sourceY + cellHeight));
      for (let column = 0; column < columns; column++) {
        const sourceX = column * cellWidth;
        const tl = topRow[column];
        const tr = topRow[column + 1];
        const bl = bottomRow[column];
        const br = bottomRow[column + 1];
        // Both axes can vary in depth (especially east/west shadows). Two
        // triangles use all four projected corners, not a sheared rectangle.
        this.drawTriangle(ctx, mask, sourceX, sourceY, cellWidth, cellHeight, [tl, tr, bl], tl, tr.x - tl.x, tr.y - tl.y, bl.x - tl.x, bl.y - tl.y);
        this.drawTriangle(ctx, mask, sourceX, sourceY, cellWidth, cellHeight, [tr, br, bl],
          { x: tr.x + bl.x - br.x, y: tr.y + bl.y - br.y }, br.x - bl.x, br.y - bl.y, br.x - tr.x, br.y - tr.y);
      }
      topRow = bottomRow;
    }
    ctx.restore();
  }

  private drawTriangle(
    ctx: CanvasRenderingContext2D, mask: HTMLCanvasElement,
    sourceX: number, sourceY: number, width: number, height: number,
    points: readonly ProjectedPoint[], origin: { x: number; y: number },
    dxX: number, dxY: number, dyX: number, dyY: number
  ): void {
    ctx.save();
    ctx.beginPath();
    const centerX = (points[0].x + points[1].x + points[2].x) / 3;
    const centerY = (points[0].y + points[1].y + points[2].y) / 3;
    for (let index = 0; index < points.length; index++) {
      const point = points[index];
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const length = Math.max(1, Math.hypot(dx, dy));
      // Subpixel overlap hides antialiased clip seams; opacity is applied later.
      const x = point.x + dx / length * 0.35;
      const y = point.y + dy / length * 0.35;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();
    ctx.transform(dxX / width, dxY / width, dyX / height, dyY / height, origin.x, origin.y);
    ctx.drawImage(mask, sourceX, sourceY, width, height, 0, 0, width, height);
    ctx.restore();
  }

  private getMask(sprite: ShadowSprite): HTMLCanvasElement | null {
    const cached = this.masks.get(sprite);
    if (cached) return cached;
    if (!sprite.image.complete || sprite.image.naturalWidth === 0) return null;
    const mask = document.createElement("canvas");
    mask.width = sprite.width;
    mask.height = sprite.height;
    const ctx = mask.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    for (const part of sprite.parts) {
      ctx.drawImage(sprite.image, part.sx, part.sy, part.sw, part.sh, part.x, part.y, part.width, part.height);
    }
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, mask.width, mask.height);
    ctx.globalCompositeOperation = "source-over";
    this.masks.set(sprite, mask);
    return mask;
  }
}