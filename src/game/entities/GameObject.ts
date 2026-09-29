import { Collider } from "./Collider";
import { RenderLayer } from "../rendering/RenderLayer";

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

  getSortY(): number {
    if (!this.collider) {
      return this.y;
    }

    const bounds = this.collider.getBounds(this.x, this.y);

    return bounds.y + bounds.height;
  }

  getRenderLayer(): RenderLayer {
    return RenderLayer.WORLD;
  }

  render(
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Renderizado base
  }

  renderLayer(
    _layer: RenderLayer,
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Renderizado específico de una capa
  }
}
