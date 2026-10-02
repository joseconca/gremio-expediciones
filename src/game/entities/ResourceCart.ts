import { GameObject, type GameObjectConfig } from "./GameObject";

export class ResourceCart extends GameObject {
  constructor(config: GameObjectConfig) {
    super(config);
  }

  override render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#34251b";
    ctx.fillRect(-24, -25, 48, 23);
    ctx.fillStyle = "#986336";
    ctx.fillRect(-21, -22, 42, 16);
    ctx.fillStyle = "#5e3b24";
    ctx.fillRect(-25, -27, 50, 5);
    ctx.fillRect(-18, -34, 14, 10);
    ctx.fillRect(2, -37, 16, 13);
    ctx.fillStyle = "#372820";
    ctx.fillRect(-18, -3, 8, 8);
    ctx.fillRect(10, -3, 8, 8);
    ctx.fillStyle = "#c49a57";
    ctx.fillRect(-15, 0, 2, 2);
    ctx.fillRect(13, 0, 2, 2);
  }
}