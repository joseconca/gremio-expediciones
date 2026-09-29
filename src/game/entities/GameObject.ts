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

  getSortY(): number {
    if (!this.collider) {
      return this.y;
    }

    const bounds = this.collider.getBounds(this.x, this.y);

    return bounds.y + bounds.height;
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
