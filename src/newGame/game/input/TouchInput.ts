import type { Direction, InputAction } from "./InputState";

export type TouchAction = InputAction;

export class TouchInput {
  private heldDirections = new Set<Direction>();
  private pressedActions = new Set<TouchAction>();

  private clear = (): void => {
    this.heldDirections.clear();
    this.pressedActions.clear();
  };

  private handleVisibility = (): void => {
    if (document.hidden) this.clear();
  };

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
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  destroy(): void {
    document.removeEventListener("VirtualDPad", this.handleDirectionEvent);

    document.removeEventListener("VirtualAction", this.handleActionEvent);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.clear();
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
