import { GameObject, GameObjectConfig } from "./GameObject";
import type { Interactable } from "./Interactable";
import type { DoorDefinition } from "../data/doors/DoorDefinition";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";
import { doorAnimations } from "../data/doorAnimations";
import { Collider } from "./Collider";

export type DoorState = "closed" | "opening" | "open" | "closing";

export interface DoorConfig extends GameObjectConfig {
  definition: DoorDefinition;
}

export class Door extends GameObject implements Interactable {
  state: DoorState = "closed";

  readonly definition: DoorDefinition;

  private readonly spriteSheet: SpriteSheet;
  private readonly animator: Animator;

  constructor(config: DoorConfig) {
    super({
      ...config,
      colliders: [new Collider(config.definition.collider)],
    });

    this.definition = config.definition;

    this.spriteSheet = new SpriteSheet({
      src: config.definition.sprite.src,
      frameWidth: config.definition.sprite.frameWidth,
      frameHeight: config.definition.sprite.frameHeight,
    });

    this.animator = new Animator(this.spriteSheet, doorAnimations);

    this.animator.play("closed");
  }

  canInteractWith(x: number, y: number): boolean {
    const interactionX = this.x + this.definition.interaction.offsetX;

    const interactionY = this.y + this.definition.interaction.offsetY;

    const dx = x - interactionX;
    const dy = y - interactionY;

    const radius = this.definition.interaction.radius;

    return dx * dx + dy * dy <= radius * radius;
  }

  interact(): void {
    if (this.state === "closed") {
      this.open();
      return;
    }

    if (this.state === "open") {
      this.close();
    }
  }

  open(): void {
    if (this.state !== "closed") {
      return;
    }

    this.state = "opening";
    this.animator.play("opening");
  }

  close(): void {
    if (this.state !== "open") {
      return;
    }

    this.state = "closing";
    this.animator.play("closing");
  }

  override update(deltaTime: number): void {
    this.animator.update(deltaTime);

    const frame = this.animator.getCurrentFrame();

    if (!frame) {
      return;
    }

    if (this.state === "opening" && frame.sx === 3 * frame.sw) {
      this.state = "open";
    }

    if (this.state === "closing" && frame.sx === 0) {
      this.state = "closed";
    }
  }

  override render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    this.animator.draw(
      ctx,
      Math.round(screenX - this.spriteSheet.frameWidth / 2),
      Math.round(screenY - this.spriteSheet.frameHeight)
    );
  }

  override isCollidable(): boolean {
    return this.state !== "open";
  }

  isOpen(): boolean {
    return this.state === "open";
  }
}
