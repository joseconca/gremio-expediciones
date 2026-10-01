import type { Direction, InputAction } from "./InputState";

export type TouchAction = InputAction;

export class TouchInput {
  private heldDirections = new Set<Direction>();
  private pressedActions = new Set<TouchAction>();

  private handleDirectionEvent = (event: Event): void => {
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

  private handleActionEvent = (event: Event): void => {
    const customEvent = event as CustomEvent<{
      action: TouchAction;
    }>;

    this.pressedActions.add(customEvent.detail.action);
  };

  init(): void {
    document.addEventListener("VirtualDPad", this.handleDirectionEvent);

    document.addEventListener("VirtualAction", this.handleActionEvent);
  }

  destroy(): void {
    document.removeEventListener("VirtualDPad", this.handleDirectionEvent);

    document.removeEventListener("VirtualAction", this.handleActionEvent);

    this.heldDirections.clear();
    this.pressedActions.clear();
  }

  isHeld(direction: Direction): boolean {
    return this.heldDirections.has(direction);
  }

  isPressed(action: TouchAction): boolean {
    return this.pressedActions.has(action);
  }

  clearPressedActions(): void {
    this.pressedActions.clear();
  }
}
