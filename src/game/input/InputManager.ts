import type { Direction, InputState } from "./InputState";
import { KeyboardInput } from "./KeyboardInput";
import { TouchInput } from "./TouchInput";

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
    return (
      this.keyboard.isHeld(direction) ||
      this.touch.isHeld(direction)
    );
  }

  getState(): InputState {
    return {
      up: this.isDirectionHeld("up"),
      down: this.isDirectionHeld("down"),
      left: this.isDirectionHeld("left"),
      right: this.isDirectionHeld("right"),

      actionA: false,
      actionB: false,
    };
  }
}