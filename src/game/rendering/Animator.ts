import { SpriteSheet } from "./SpriteSheet";

export interface AnimationConfig {
  frames: Array<{
    x: number;
    y: number;
  }>;
  frameDuration: number;
  loop?: boolean;
}

export class Animator {
  private spriteSheet: SpriteSheet;
  private animations: Record<string, AnimationConfig>;

  private currentAnimation = "";
  private currentFrame = 0;
  private elapsed = 0;

  constructor(
    spriteSheet: SpriteSheet,
    animations: Record<string, AnimationConfig>
  ) {
    this.spriteSheet = spriteSheet;
    this.animations = animations;
  }

  play(animationName: string): void {
    if (this.currentAnimation === animationName) {
      return;
    }

    if (!this.animations[animationName]) {
      throw new Error(
        `Animación no encontrada: ${animationName}`
      );
    }

    this.currentAnimation = animationName;
    this.currentFrame = 0;
    this.elapsed = 0;
  }

  update(deltaTime: number): void {
    if (!this.currentAnimation) {
      return;
    }

    const animation = this.animations[this.currentAnimation];

    this.elapsed += deltaTime;

    if (this.elapsed < animation.frameDuration) {
      return;
    }

    this.elapsed -= animation.frameDuration;
    this.currentFrame++;

    if (this.currentFrame >= animation.frames.length) {
      if (animation.loop === false) {
        this.currentFrame = animation.frames.length - 1;
      } else {
        this.currentFrame = 0;
      }
    }
  }

  getCurrentFrame() {
    if (!this.currentAnimation) {
      return null;
    }

    const animation = this.animations[this.currentAnimation];
    const frame = animation.frames[this.currentFrame];

    return this.spriteSheet.getFrame(
      frame.x,
      frame.y
    );
  }

  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    const frame = this.getCurrentFrame();

    if (!frame || !this.spriteSheet.isLoaded()) {
      return;
    }

    ctx.drawImage(
      this.spriteSheet.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      Math.round(x),
      Math.round(y),
      frame.sw,
      frame.sh
    );
  }
}