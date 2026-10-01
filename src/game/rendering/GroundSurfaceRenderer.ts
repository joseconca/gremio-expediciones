import type { Camera } from "../world/Camera";
import type { GroundProjection, GroundReference } from "./GroundProjection";

export interface GroundSurfaceRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    reference: GroundReference,
    projection: GroundProjection
  ): void;
}
