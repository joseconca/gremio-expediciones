import {
  Building,
  BuildingConfig,
} from "./Building";

export class TownHall extends Building {
  constructor(config: BuildingConfig) {
    super(config);
  }

  protected override renderBack(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.fillStyle = "#5c4033";

    ctx.fillRect(
      screenX + 8,
      screenY - 24,
      this.width - 16,
      24
    );
  }

  protected override renderBody(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.fillStyle = "#c69c6d";

    ctx.fillRect(
      screenX,
      screenY,
      this.width,
      this.height
    );
  }

  protected override renderFront(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.fillStyle = "#654321";

    ctx.fillRect(
      screenX + this.width / 2 - 8,
      screenY + this.height - 24,
      16,
      24
    );
  }
}