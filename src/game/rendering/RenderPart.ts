import { RenderLayer } from "./RenderLayer";

export interface RenderPart {
  layer: RenderLayer;

  /**
   * Posición respecto al origen del GameObject.
   */
  offsetX: number;
  offsetY: number;

  /**
   * Profundidad respecto al eje Y del GameObject.
   *
   * El RenderSystem calculará:
   * worldY + sortYOffset
   */
  sortYOffset: number;

  render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void;
}