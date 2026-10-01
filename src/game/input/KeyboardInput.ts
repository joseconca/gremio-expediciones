import type { Direction, InputAction } from "./InputState";

export class KeyboardInput {
  private heldDirections = new Set<Direction>();
  private heldActions = new Set<InputAction>();
  private pressedActions = new Set<InputAction>();
  private debugToggleHeld = false;
  private debugTogglePressed = false;

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

  private readonly actionKeyMap: Record<string, InputAction> = {
    Space: "actionA",
    Enter: "actionA",
    Escape: "actionB",
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "F3") {
      if (!this.debugToggleHeld) {
        this.debugToggleHeld = true;
        this.debugTogglePressed = true;
      }
      return;
    }

    const direction = this.keyMap[event.code];

    if (direction) {
      this.heldDirections.add(direction);
      return;
    }

    const action = this.actionKeyMap[event.code];
    if (!action || this.heldActions.has(action)) return;

    this.heldActions.add(action);
    this.pressedActions.add(action);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === "F3") {
      this.debugToggleHeld = false;
      return;
    }

    const direction = this.keyMap[event.code];

    if (direction) {
      this.heldDirections.delete(direction);
      return;
    }

    const action = this.actionKeyMap[event.code];
    if (action) this.heldActions.delete(action);
  };

  init(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);

    this.heldDirections.clear();
    this.heldActions.clear();
    this.pressedActions.clear();
    this.debugToggleHeld = false;
    this.debugTogglePressed = false;
  }

  isHeld(direction: Direction): boolean {
    return this.heldDirections.has(direction);
  }

  isActionPressed(action: InputAction): boolean {
    return this.pressedActions.has(action);
  }

  clearPressedActions(): void {
    this.pressedActions.clear();
    this.debugTogglePressed = false;
  }

  wasDebugTogglePressed(): boolean {
    return this.debugTogglePressed;
  }
}