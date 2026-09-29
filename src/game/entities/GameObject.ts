import { Collider } from "./Collider";

export interface GameObjectConfig {
  x: number;
  y: number;
  collider?: Collider;
}

export class GameObject {
  x: number;
  y: number;
  collider?: Collider;

  constructor(config: GameObjectConfig) {
    this.x = config.x;
    this.y = config.y;

    this.collider = config.collider; 
  }

  update(_deltaTime: number): void {
    // Comportamiento base
  }

  render(
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Renderizado base
  }
}
