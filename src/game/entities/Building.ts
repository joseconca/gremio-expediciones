import { GameObject, GameObjectConfig } from "./GameObject";
import { RenderLayer } from "../rendering/RenderLayer";

export interface BuildingConfig extends GameObjectConfig {
  width: number;
  height: number;
}

export class Building extends GameObject {
  readonly width: number;
  readonly height: number;

  constructor(config: BuildingConfig) {
    super(config);

    this.width = config.width;
    this.height = config.height;
  }

  override renderLayer(
    layer: RenderLayer,
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    switch (layer) {
      case RenderLayer.BACK:
        this.renderBack(ctx, screenX, screenY);
        break;

      case RenderLayer.FRONT:
        this.renderFront(ctx, screenX, screenY);
        break;
    }
  }

  override render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    this.renderBody(ctx, screenX, screenY);
  }

  protected renderBack(
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Capa trasera
  }

  protected renderBody(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.fillStyle = "#8b5a3c";

    ctx.fillRect(screenX, screenY, this.width, this.height);
  }

  protected renderFront(
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Capa frontal
  }
}
