import { Character, CharacterConfig } from "../Character";
import type { InputManager } from "../../input/InputManager";
import type { MovementSystem } from "../../systems/MovementSystem";

export interface PlayerConfig extends CharacterConfig {
  input: InputManager;
  movement: MovementSystem;
}

export class Player extends Character {
  private input: InputManager;
  private movement: MovementSystem;
  private inputEnabled = true;

  constructor(config: PlayerConfig) {
    super(config);

    this.input = config.input;
    this.movement = config.movement;
  }

  override canTriggerSceneTransition(): boolean {
    return true;
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  override update(deltaTime: number): void {
    let dx = 0;
    let dy = 0;

    if (this.inputEnabled && this.input.isDirectionHeld("up")) {
      dy -= 1;
      this.direction = "up";
    }

    if (this.inputEnabled && this.input.isDirectionHeld("down")) {
      dy += 1;
      this.direction = "down";
    }

    if (this.inputEnabled && this.input.isDirectionHeld("left")) {
      dx -= 1;
      this.direction = "left";
    }

    if (this.inputEnabled && this.input.isDirectionHeld("right")) {
      dx += 1;
      this.direction = "right";
    }

    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      const length = Math.sqrt(dx * dx + dy * dy);

      dx /= length;
      dy /= length;

      this.movement.move(
        this,
        dx * this.speed * deltaTime,
        dy * this.speed * deltaTime
      );

      this.animator?.play(`walk-${this.direction}`);
    } else {
      this.animator?.play(`idle-${this.direction}`);
    }

    super.update(deltaTime);
  }
}
