import type { GameObject } from "../entities/GameObject";
import type { Camera } from "./Camera";
import { TileMap } from "./TileMap";

export interface WorldConfig {
  width: number;
  height: number;
  tileMap: TileMap;
}

export class World {
  readonly width: number;
  readonly height: number;

  readonly tileMap: TileMap;

  private objects: GameObject[] = [];

  constructor(config: WorldConfig) {
    this.width = config.width;
    this.height = config.height;

    this.tileMap = config.tileMap;
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
      this.clampObjectPosition(object);
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    this.tileMap.render(ctx, camera.x, camera.y, camera.width, camera.height);

    for (const object of this.objects) {
      const screenPosition = camera.worldToScreen(object.x, object.y);

      object.render(ctx, screenPosition.x, screenPosition.y);
    }
  }

  clampObjectPosition(object: GameObject): void {
    object.x = Math.max(0, Math.min(object.x, this.width - 32));

    object.y = Math.max(0, Math.min(object.y, this.height - 64));
  }
}
