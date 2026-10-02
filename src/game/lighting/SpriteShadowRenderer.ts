import type { GroundProjection, GroundReference } from "../rendering/GroundProjection";
import type { ShadowFootprint, ShadowSprite } from "./ShadowCaster";

const SHADOW_SLICES = 16;

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
    const mask = this.getMask(sprite);
    if (!mask) return;
    const project = (x: number, y: number) => {
      const point = shadowSpriteGroundPoint(sprite, footprint, sweep, x, y);
      return projection.project(point.x, point.y, reference, ctx.canvas.width, ctx.canvas.height);
    };
    const sliceHeight = sprite.height / SHADOW_SLICES;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let slice = 0; slice < SHADOW_SLICES; slice++) {
      const sourceY = slice * sliceHeight;
      const topLeft = project(0, sourceY);
      const topRight = project(sprite.width, sourceY);
      const bottomLeft = project(0, sourceY + sliceHeight);
      const bottomRight = project(sprite.width, sourceY + sliceHeight);
      if (
        Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) < 0 ||
        Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) > ctx.canvas.width ||
        Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) < 0 ||
        Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) > ctx.canvas.height
      ) continue;
      ctx.save();
      // Narrow affine strips approximate perspective without changing GroundProjection.
      ctx.transform(
        (topRight.x - topLeft.x) / sprite.width,
        (topRight.y - topLeft.y) / sprite.width,
        (bottomLeft.x - topLeft.x) / sliceHeight,
        (bottomLeft.y - topLeft.y) / sliceHeight,
        topLeft.x, topLeft.y
      );
      ctx.drawImage(mask, 0, sourceY, sprite.width, sliceHeight, 0, 0, sprite.width, sliceHeight);
      ctx.restore();
    }
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