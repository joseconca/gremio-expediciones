import { GameObject, type GameObjectConfig } from "./GameObject";
import { Animator, type AnimationConfig } from "../rendering/Animator";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { RenderLayer } from "../rendering/RenderLayer";
import type { RenderPart } from "../rendering/RenderPart";
import type { ShadowCaster, ShadowFootprint, ShadowSprite } from "../lighting/ShadowCaster";
import type { Direction } from "../input/InputState";

export const RETURN_CART_ANIMATIONS: Record<string, AnimationConfig> = {};
for (const [index, direction] of (["right", "up", "left", "down"] as const).entries()) {
  RETURN_CART_ANIMATIONS[`idle-${direction}`] = { frames: [{ x: 0, y: index * 2 }], frameDuration: 1 };
  RETURN_CART_ANIMATIONS[`move-${direction}`] = {
    frames: [0, 1, 2].map((x) => ({ x, y: index * 2 + 1 })), frameDuration: 0.16,
  };
}

/** Non-collidable transport visual. Position and arrival belong to MobilityManager. */
export class ReturnCart extends GameObject implements ShadowCaster {
  private readonly sheet = new SpriteSheet({ src: "/sprites/sheets/carts/carro0.png", frameWidth: 128, frameHeight: 128 });
  private readonly animator = new Animator(this.sheet, RETURN_CART_ANIMATIONS);
  private readonly parts: RenderPart[];
  constructor(config: GameObjectConfig) {
    super(config);
    this.parts = [{ layer: RenderLayer.WORLD, offsetX: -64, offsetY: -128, sortYOffset: 0,
      render: (ctx, x, y) => {
        if (this.sheet.isLoaded()) this.animator.draw(ctx, x, y);
        else {
          // Clearly visible placeholder until the requested sheet is supplied.
          ctx.fillStyle = "#8c582d"; ctx.fillRect(x + 32, y + 88, 64, 24);
          ctx.fillStyle = "#25201b"; ctx.fillRect(x + 36, y + 108, 12, 12); ctx.fillRect(x + 80, y + 108, 12, 12);
          ctx.fillStyle = "#e8c784"; ctx.fillRect(x + 40, y + 78, 48, 10);
        }
      } }];
    this.animator.play("idle-down");
  }
  setTravelDirection(dx: number, dy: number, moving: boolean): void {
    const direction: Direction = Math.abs(dx) >= Math.abs(dy) ? dx >= 0 ? "right" : "left" : dy >= 0 ? "down" : "up";
    this.animator.play(`${moving ? "move" : "idle"}-${direction}`);
  }
  override update(dt: number): void { this.animator.update(dt); }
  override getRenderParts(): RenderPart[] { return this.parts; }
  override isCollidable(): boolean { return false; }
  getShadowFootprint(): ShadowFootprint { return { x: this.x, y: this.y, radiusX: 30, radiusY: 8, height: 90, shape: "ellipse" }; }
  getShadowSprite(): ShadowSprite | null { return this.animator.getShadowSprite(); }
}