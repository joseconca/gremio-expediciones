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

  isCollidable(): boolean {
    return true;
  }

  canTriggerSceneTransition(): boolean {
    return false;
  }

  getGroundAnchor(): { x: number; y: number } {
    if (this.colliders.length === 0) {
      return {
        x: this.x,
        y: this.y,
      };
    }

    let maxBottom = -Infinity;

    for (const collider of this.colliders) {
      const bounds = collider.getBounds(this.x, this.y);
      const bottom = bounds.y + bounds.height;

      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    }

    const bottomColliders = this.colliders.filter((collider) => {
      const bounds = collider.getBounds(this.x, this.y);
      const bottom = bounds.y + bounds.height;

      return Math.abs(bottom - maxBottom) < 0.001;
    });

    let minX = Infinity;
    let maxX = -Infinity;

    for (const collider of bottomColliders) {
      const bounds = collider.getBounds(this.x, this.y);

      minX = Math.min(minX, bounds.x);
      maxX = Math.max(maxX, bounds.x + bounds.width);
    }

    return {
      x: (minX + maxX) / 2,
      y: maxBottom,
    };
  }

  render(
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Renderizado base
  }
}
