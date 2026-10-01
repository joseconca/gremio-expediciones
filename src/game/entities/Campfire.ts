import { Animator } from "../rendering/Animator";
import { SpriteSheet } from "../rendering/SpriteSheet";
import type { AnimationConfig } from "../rendering/Animator";
import { RenderLayer } from "../rendering/RenderLayer";
import type { RenderPart } from "../rendering/RenderPart";
import { GameObject, type GameObjectConfig } from "./GameObject";

const campfireAnimation: Record<string, AnimationConfig> = {
  burning: {
    frames: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
    frameDuration: 0.18,
  },
};

export class Campfire extends GameObject {
  private readonly spriteSheet: SpriteSheet;
  private readonly animator: Animator;

  constructor(config: GameObjectConfig) {
    super(config);

    this.spriteSheet = new SpriteSheet({
      src: "/sprites/sheets/generic/hoguera0.png",
      frameWidth: 64,
      frameHeight: 64,
    });
    this.animator = new Animator(this.spriteSheet, campfireAnimation);
    this.animator.play("burning");
  }

  override update(deltaTime: number): void {
    this.animator.update(deltaTime);
  }

  override getRenderParts(): RenderPart[] {
    return [
      {
        layer: RenderLayer.WORLD,
        offsetX: 0,
        offsetY: 0,
        sortYOffset: 16,
        render: (ctx, screenX, screenY) => {
          this.renderLogs(ctx, screenX, screenY);
        },
      },
      {
        layer: RenderLayer.WORLD,
        offsetX: 0,
        offsetY: -16,
        sortYOffset: 32,
        render: (ctx, screenX, screenY) => {
          this.animator.draw(ctx, screenX, screenY);
        },
      },
    ];
  }

  private renderLogs(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    if (!this.spriteSheet.isLoaded()) return;

    const fireFrame = this.animator.getCurrentFrame();
    if (!fireFrame) return;

    ctx.drawImage(
      this.spriteSheet.image,
      fireFrame.sx,
      this.spriteSheet.frameHeight,
      this.spriteSheet.frameWidth,
      this.spriteSheet.frameHeight,
      Math.round(screenX),
      Math.round(screenY),
      this.spriteSheet.frameWidth,
      this.spriteSheet.frameHeight
    );
  }
}
