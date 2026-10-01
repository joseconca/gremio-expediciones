import type { GroundProjection, GroundReference } from "./GroundProjection";

export interface GroundRenderable {
  renderOnGround(
    ctx: CanvasRenderingContext2D,
    projection: GroundProjection,
    reference: GroundReference
  ): void;
}
