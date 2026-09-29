export interface GameObjectConfig {
  x: number;
  y: number;
}

export class GameObject {
  x: number;
  y: number;

  constructor(config: GameObjectConfig) {
    this.x = config.x;
    this.y = config.y;
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
