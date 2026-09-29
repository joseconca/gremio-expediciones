import { GameObject, GameObjectConfig } from "./GameObject";
import type { Interactable } from "./Interactable";

export type DoorState = "closed" | "opening" | "open" | "closing";

export interface DoorConfig extends GameObjectConfig {
  interactionRadius: number;
}

export class Door extends GameObject implements Interactable {
  state: DoorState = "closed";

  readonly interactionRadius: number;

  constructor(config: DoorConfig) {
    super(config);

    this.interactionRadius = config.interactionRadius;
  }

  canInteractWith(x: number, y: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;

    return dx * dx + dy * dy <= this.interactionRadius * this.interactionRadius;
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
  }

  close(): void {
    if (this.state !== "open") {
      return;
    }

    this.state = "closing";
  }

  override update(_deltaTime: number): void {
    if (this.state === "opening") {
      this.state = "open";
      return;
    }

    if (this.state === "closing") {
      this.state = "closed";
    }
  }

  override render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.fillStyle =
      this.state === "open" ? "rgba(0, 255, 0, 0.8)" : "rgba(139, 69, 19, 0.9)";

    ctx.fillRect(Math.round(screenX - 8), Math.round(screenY - 16), 16, 16);
  }

  isOpen(): boolean {
    return this.state === "open";
  }
}
