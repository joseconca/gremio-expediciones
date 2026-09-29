import type { Direction, InputState } from "./InputState";

import { KeyboardInput } from "./KeyboardInput";

import { TouchInput, type TouchAction } from "./TouchInput";

export class InputManager {
  private keyboard: KeyboardInput;
  private touch: TouchInput;

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
  }

  isDirectionHeld(direction: Direction): boolean {
    return this.keyboard.isHeld(direction) || this.touch.isHeld(direction);
  }

  isActionPressed(action: TouchAction): boolean {
    return this.touch.isPressed(action);
  }

  getState(): InputState {
    return {
      up: this.isDirectionHeld("up"),
      down: this.isDirectionHeld("down"),
      left: this.isDirectionHeld("left"),
      right: this.isDirectionHeld("right"),

      actionA: this.touch.isPressed("actionA"),
      actionB: this.touch.isPressed("actionB"),
    };
  }

  endFrame(): void {
    this.touch.clearPressedActions();
  }
}
