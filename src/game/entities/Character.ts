import { GameObject, GameObjectConfig } from "./GameObject";
import type { Direction } from "../input/InputState";
import type { Animator } from "../rendering/Animator";
import type { CharacterAttributes } from "./Characters/CharacterAttributes";
import type { ShadowCaster, ShadowFootprint, ShadowSprite } from "../lighting/ShadowCaster";

export interface CharacterConfig extends GameObjectConfig {
  speed?: number;
  direction?: Direction;
  animator?: Animator;
  attributes?: CharacterAttributes;
}

export class Character extends GameObject implements ShadowCaster {
  speed: number;
  direction: Direction;
  attributes: CharacterAttributes;

  protected animator?: Animator;

  constructor(config: CharacterConfig) {
    super(config);

    this.speed = config.speed ?? 60;
    this.direction = config.direction ?? "down";
    this.animator = config.animator;
    this.attributes = config.attributes ?? {
      currentHealth: 100,
      maxHealth: 100,
      physicalDefense: 5,
      physicalAttack: 8,
      criticalChance: 0.05,
      criticalDamage: 1.5,
      speed: 5,
      evasionChance: 0.05,
      magicDefense: 3,
      magicAttack: 3,
    };
  }

  move(deltaX: number, deltaY: number): void {
    this.x += deltaX;
    this.y += deltaY;
  }

  getNextPosition(
    deltaX: number,
    deltaY: number
  ): {
    x: number;
    y: number;
  } {
    return {
      x: this.x + deltaX,
      y: this.y + deltaY,
    };
  }

  getShadowFootprint(): ShadowFootprint | null {
    const feet = this.getGroundAnchor();
    return {
      x: feet.x,
      y: feet.y,
      radiusX: 9,
      radiusY: 4,
      height: 44,
      shape: "ellipse",
    };
  }

  override update(deltaTime: number): void {
    this.animator?.update(deltaTime);
  }

  getShadowSprite(): ShadowSprite | null {
    return this.animator?.getShadowSprite() ?? null;
  }

  override render(
    ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    this.animator?.draw(ctx, -16, -64);
  }
}
