import type { RenderLayer } from "./RenderLayer";

export interface RenderPart {
  layer: RenderLayer;

  offsetX: number;
  offsetY: number;

  sortYOffset: number;

  render: (
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ) => void;
}
