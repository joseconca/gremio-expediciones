import type { GameObject } from "../entities/GameObject";
import type { Camera } from "./Camera";

export interface WorldConfig {
  width: number;
  height: number;
}

export class World {
  readonly width: number;
  readonly height: number;

  private objects: GameObject[] = [];

  constructor(config: WorldConfig) {
    this.width = config.width;
    this.height = config.height;
  }

  addObject(object: GameObject): void {
    this.objects.push(object);
  }

  removeObject(object: GameObject): void {
    this.objects = this.objects.filter(
      (currentObject) => currentObject !== object
    );
  }

  update(deltaTime: number): void {
    for (const object of this.objects) {
      object.update(deltaTime);
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    for (const object of this.objects) {
      const screenPosition = camera.worldToScreen(object.x, object.y);

      object.render(ctx, screenPosition.x, screenPosition.y);
    }
  }
}
