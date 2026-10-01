import { GameObject, type GameObjectConfig } from "./GameObject";
import type { Interactable } from "./Interactable";

export interface WorldBaseMarkerConfig extends GameObjectConfig {
  name: string;
  onEnter?: () => void;
}

export class WorldBaseMarker extends GameObject implements Interactable {
  private readonly name: string;
  private readonly onEnter?: () => void;
  private readonly icon = new Image();

  constructor(config: WorldBaseMarkerConfig) {
    super(config);
    this.name = config.name;
    this.onEnter = config.onEnter;
    this.icon.src = "/sprites/buildings/camp.png";
  }

  canInteractWith(x: number, y: number): boolean {
    if (!this.onEnter) return false;
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy <= 56 * 56;
  }

  interact(): void {
    this.onEnter?.();
  }

  override isCollidable(): boolean {
    return false;
  }

  override render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    if (this.icon.complete && this.icon.naturalWidth > 0) {
      ctx.drawImage(this.icon, Math.round(screenX - 18), Math.round(screenY - 28), 36, 25);
    } else {
      ctx.fillStyle = this.onEnter ? "#f59e0b" : "#94a3b8";
      ctx.fillRect(Math.round(screenX - 8), Math.round(screenY - 20), 16, 16);
    }

    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = this.onEnter ? "#fde68a" : "#f8fafc";
    ctx.fillText(this.name, Math.round(screenX), Math.round(screenY + 1));
    if (this.onEnter) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText("A · Entrar", Math.round(screenX), Math.round(screenY + 11));
    }
  }
}
