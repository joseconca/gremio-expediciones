import { GameObject, type GameObjectConfig } from "./GameObject";
import { Collider } from "./Collider";
import type { Interactable } from "./Interactable";
import { SpriteSheet } from "../rendering/SpriteSheet";
import type { RenderPart } from "../rendering/RenderPart";
import { RenderLayer } from "../rendering/RenderLayer";
import type { ShadowCaster, ShadowFootprint, ShadowSprite } from "../lighting/ShadowCaster";

export const MISSION_BOARD_POSITION = { x: 560 - 9 * 32, y: 800 + 0 * 32 };

export class MissionBoard extends GameObject implements Interactable, ShadowCaster {
  private readonly sheet = new SpriteSheet({ src: "/sprites/tablonMisiones.png", frameWidth: 128, frameHeight: 64 });
  private readonly parts: RenderPart[];
  private readonly shadow: ShadowSprite;
  constructor(config: GameObjectConfig & { onInteract: () => void }) {
    super({ ...config, colliders: [new Collider({ width: 64, height: 8, offsetX: 64+32, offsetY: -8 })] });
    this.onInteract = config.onInteract;
    this.parts = [{ layer: RenderLayer.WORLD, offsetX: 0, offsetY: -64, sortYOffset: 0,
      render: (ctx, x, y) => { if (this.sheet.isLoaded()) ctx.drawImage(this.sheet.image, x, y, 128, 64); } }];
    this.shadow = { image: this.sheet.image, width: 128, height: 64, anchorX: 0, anchorY: 64,
      parts: [{ sx: 0, sy: 0, sw: 128, sh: 64, x: 0, y: 0, width: 128, height: 64 }] };
  }
  private readonly onInteract: () => void;
  canInteractWith(x: number, y: number): boolean { return Math.hypot(x - (this.x + 64), y - (this.y - 48)) <= 68; }
  interact(): void { this.onInteract(); }
  override getRenderParts(): RenderPart[] { return this.parts; }
  override getGroundAnchor() { return { x: this.x + 64, y: this.y }; }
  getShadowFootprint(): ShadowFootprint { return { x: this.x + 64, y: this.y, radiusX: 45, radiusY: 5, height: 60, shape: "box" }; }
  getShadowSprite(): ShadowSprite | null { return this.sheet.isLoaded() ? this.shadow : null; }
}