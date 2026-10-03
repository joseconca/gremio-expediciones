import { GameObject, type GameObjectConfig } from "./GameObject";
import { SpriteSheet } from "../rendering/SpriteSheet";

export interface PropConfig extends GameObjectConfig {
  spriteSrc: string;
  width: number;
  height: number;
  frameX?: number;
  frameY?: number;
}

export class Prop extends GameObject {
  private readonly spriteSheet: SpriteSheet;
  private readonly width: number;
  private readonly height: number;
  private readonly frameX: number;
  private readonly frameY: number;

  constructor(config: PropConfig) {
    super(config);
    this.width = config.width;
    this.height = config.height;
    this.frameX = config.frameX ?? 0;
    this.frameY = config.frameY ?? 0;

    this.spriteSheet = new SpriteSheet({
      src: config.spriteSrc,
      frameWidth: this.width,
      frameHeight: this.height,
    });
  }

  override render(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    if (!this.spriteSheet.isLoaded()) return;

    const frame = this.spriteSheet.getFrame(this.frameX, this.frameY);

    ctx.drawImage(
      this.spriteSheet.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      Math.round(screenX),
      Math.round(screenY),
      frame.sw,
      frame.sh
    );
  }
}

