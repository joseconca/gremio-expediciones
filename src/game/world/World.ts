import type { GameObject } from "../entities/GameObject";
import type { Camera } from "./Camera";
import { TileMap } from "./TileMap";
import { CollisionMap } from "./CollisionMap";

export interface WorldConfig {
  width: number;
  height: number;
  tileMap: TileMap;
  collisionMap: CollisionMap;
}

export class World {
  readonly width: number;
  readonly height: number;

  readonly tileMap: TileMap;
  readonly collisionMap: CollisionMap;

  private objects: GameObject[] = [];

  constructor(config: WorldConfig) {
    this.width = config.width;
    this.height = config.height;

    this.tileMap = config.tileMap;
    this.collisionMap = config.collisionMap;
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
    this.tileMap.render(ctx, camera.x, camera.y, camera.width, camera.height);

    for (const object of this.objects) {
      const screenPosition = camera.worldToScreen(object.x, object.y);

      object.render(ctx, screenPosition.x, screenPosition.y);
    }
  }
}
