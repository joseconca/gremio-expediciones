import type { Direction, InputAction, InputState } from "./InputState";

import { KeyboardInput } from "./KeyboardInput";

import { TouchInput } from "./TouchInput";

export class InputManager {
  private keyboard: KeyboardInput;
  private touch: TouchInput;
  private previousDirections = new Set<Direction>();
  private blocked = false;
  private readonly blockers = new Set<string>();

  setBlocker(reason: string, blocked: boolean): void {
    if (blocked) this.blockers.add(reason);
    else this.blockers.delete(reason);
  }

  setBlocked(blocked: boolean): void {
    this.blocked = blocked;
  }

  isBlocked(): boolean {
    return this.blocked || this.blockers.size > 0;
  }

  constructor() {
    this.keyboard = new KeyboardInput();
    this.touch = new TouchInput();
  }

  init(): void {
    this.keyboard.init();
    this.touch.init();
  }

  destroy(): void {
    this.keyboard.destroy();
    this.touch.destroy();
    this.previousDirections.clear();
    this.blockers.clear();
    this.blocked = false;
  }

  isDirectionHeld(direction: Direction): boolean {
    return !this.isBlocked() && (this.keyboard.isHeld(direction) || this.touch.isHeld(direction));
  }

  wasDirectionPressed(direction: Direction): boolean {
    return this.isDirectionHeld(direction) && !this.previousDirections.has(direction);
  }

  isActionPressed(action: InputAction): boolean {
    return !this.isBlocked() && this.isRawActionPressed(action);
  }

  isRawActionPressed(action: InputAction): boolean {
    return (
      this.keyboard.isActionPressed(action) || this.touch.isPressed(action)
    );
  }

  wasDebugTogglePressed(): boolean {
    return this.keyboard.wasDebugTogglePressed();
  }

  getState(): InputState {
    return {
      up: this.isDirectionHeld("up"),
      down: this.isDirectionHeld("down"),
      left: this.isDirectionHeld("left"),
      right: this.isDirectionHeld("right"),

      actionA: this.isActionPressed("actionA"),
      actionB: this.isActionPressed("actionB"),
    };
  }

  endFrame(): void {
    this.touch.clearPressedActions();
    this.keyboard.clearPressedActions();
    this.previousDirections.clear();

    for (const direction of ["up", "down", "left", "right"] as const) {
      if (this.isDirectionHeld(direction)) {
        this.previousDirections.add(direction);
      }
    }
  }
}
