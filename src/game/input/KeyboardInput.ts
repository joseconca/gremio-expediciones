import type { Direction, InputAction } from "./InputState";

export class KeyboardInput {
  private heldKeys = new Set<string>();
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
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
    if (event.code === "F3") {
      if (!this.debugToggleHeld) {
        this.debugToggleHeld = true;
        this.debugTogglePressed = true;
      }
      return;
    }

    const direction = this.keyMap[event.code];

    if (direction) {
      event.preventDefault();
      this.heldKeys.add(event.code);
      return;
    }

    const action = this.actionKeyMap[event.code];
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    if (!action) return;
    event.preventDefault();
    if (event.repeat || this.heldKeys.has(event.code)) return;

    this.heldKeys.add(event.code);
    this.pressedActions.add(action);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === "F3") {
      this.debugToggleHeld = false;
      return;
    }

    this.heldKeys.delete(event.code);
  };

  private clear = (): void => {
    this.heldKeys.clear();
    this.pressedActions.clear();
    this.debugToggleHeld = false;
    this.debugTogglePressed = false;
  };

  private handleVisibility = (): void => {
    if (document.hidden) this.clear();
  };

  init(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.clear();
  }

  isHeld(direction: Direction): boolean {
    for (const code of this.heldKeys) {
      if (this.keyMap[code] === direction) return true;
    }
    return false;
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