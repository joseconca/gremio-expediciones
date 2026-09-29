import { GameObject, GameObjectConfig } from "./GameObject";
import type { Direction } from "../input/InputState";
import type { Animator } from "../rendering/Animator";

export interface CharacterConfig extends GameObjectConfig {
  speed?: number;
  direction?: Direction;
  animator?: Animator;
}

export class Character extends GameObject {
  speed: number;
  direction: Direction;

  protected animator?: Animator;

  constructor(config: CharacterConfig) {
    super(config);

    this.speed = config.speed ?? 60;
    this.direction = config.direction ?? "down";
    this.animator = config.animator;
  }

  move(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
  }

  override update(deltaTime: number): void {
    this.animator?.update(deltaTime);
  }

  override render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    this.animator?.draw(ctx, screenX, screenY);
  }
}
