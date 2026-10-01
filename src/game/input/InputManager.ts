import type { Direction, InputAction, InputState } from "./InputState";

import { KeyboardInput } from "./KeyboardInput";

import { TouchInput } from "./TouchInput";

export class InputManager {
  private keyboard: KeyboardInput;
  private touch: TouchInput;
  private previousDirections = new Set<Direction>();

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
  }

  isDirectionHeld(direction: Direction): boolean {
    return this.keyboard.isHeld(direction) || this.touch.isHeld(direction);
  }

  wasDirectionPressed(direction: Direction): boolean {
    return this.isDirectionHeld(direction) && !this.previousDirections.has(direction);
  }

  isActionPressed(action: InputAction): boolean {
    return (
      this.keyboard.isActionPressed(action) || this.touch.isPressed(action)
    );
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
