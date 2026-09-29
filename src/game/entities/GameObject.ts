import { Collider } from "./Collider";
import { RenderLayer } from "../rendering/RenderLayer";
import type { RenderPart } from "../rendering/RenderPart";

export interface GameObjectConfig {
  x: number;
  y: number;
  colliders?: Collider[];
}

export class GameObject {
  x: number;
  y: number;

  readonly colliders: Collider[];

  constructor(config: GameObjectConfig) {
    this.x = config.x;
    this.y = config.y;

    this.colliders = config.colliders ?? [];
  }

  update(_deltaTime: number): void {
    // Comportamiento base
  }

  getSortY(): number {
    if (this.colliders.length === 0) {
      return this.y;
    }

    return Math.max(
      ...this.colliders.map((collider) => {
        const bounds = collider.getBounds(this.x, this.y);

        return bounds.y + bounds.height;
      })
    );
  }

  getRenderParts(): RenderPart[] {
    return [
      {
        layer: RenderLayer.WORLD,
        offsetX: 0,
        offsetY: 0,
        sortYOffset: this.getSortY() - this.y,

        render: (ctx, screenX, screenY) => {
          this.render(ctx, screenX, screenY);
        },
      },
    ];
  }

  render(
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Renderizado base
  }
}
