import type { Direction } from "./InputState";

export class TouchInput {
  private heldDirections = new Set<Direction>();

  private handleEvent = (event: Event): void => {
    const customEvent = event as CustomEvent<{
      dir: Direction;
      action: "add" | "remove";
    }>;

    const { dir, action } = customEvent.detail;

    if (action === "add") {
      this.heldDirections.add(dir);
    }

    if (action === "remove") {
      this.heldDirections.delete(dir);
    }
  };

  init(): void {
    document.addEventListener("VirtualDPad", this.handleEvent);
  }

  destroy(): void {
    document.removeEventListener("VirtualDPad", this.handleEvent);

    this.heldDirections.clear();
  }

  isHeld(direction: Direction): boolean {
    return this.heldDirections.has(direction);
  }
}