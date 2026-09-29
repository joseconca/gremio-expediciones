import type { Direction } from "./InputState";

export class KeyboardInput {
  private heldDirections = new Set<Direction>();

  private readonly keyMap: Record<string, Direction> = {
    ArrowUp: "up",
    KeyW: "up",

    ArrowDown: "down",
    KeyS: "down",

    ArrowLeft: "left",
    KeyA: "left",

    ArrowRight: "right",
    KeyD: "right",
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const direction = this.keyMap[event.code];

    if (!direction) return;

    this.heldDirections.add(direction);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const direction = this.keyMap[event.code];

    if (!direction) return;

    this.heldDirections.delete(direction);
  };

  init(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);

    this.heldDirections.clear();
  }

  isHeld(direction: Direction): boolean {
    return this.heldDirections.has(direction);
  }
}