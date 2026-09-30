import type { GameObject } from "../entities/GameObject";
import type { Camera } from "./Camera";
import { TileMap } from "./TileMap";
import { CollisionMap } from "./CollisionMap";
import { RenderSystem } from "../systems/RenderSystem";
import { GroundRenderer } from "../rendering/GroundRenderer";
import { VerticalTileRenderer } from "../rendering/VerticalTileRenderer";
import {
  GroundProjection,
  type GroundReference,
} from "../rendering/GroundProjection";

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

  private readonly groundRenderer: GroundRenderer;
  private readonly verticalTileRenderer: VerticalTileRenderer;
  private readonly renderSystem: RenderSystem;
  private readonly groundProjection: GroundProjection;

  private objects: GameObject[] = [];

  constructor(config: WorldConfig) {
    this.width = config.width;
    this.height = config.height;
    this.tileMap = config.tileMap;
    this.collisionMap = config.collisionMap;

    this.groundProjection = new GroundProjection({
      horizonScreenRatio: -0.8,
      groundFocusRatio: 0.72,
      cameraDepth: 320,
      focalLength: 320,
    });
    this.groundRenderer = new GroundRenderer(
      this.tileMap,
      this.groundProjection
    );

    this.verticalTileRenderer = new VerticalTileRenderer(
      this.tileMap,
      this.groundProjection
    );

    this.renderSystem = new RenderSystem();
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

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    groundReference: GroundReference
  ): void {
    this.groundRenderer.render(ctx, camera, groundReference);

    this.verticalTileRenderer.render(ctx, camera, groundReference);

    this.renderSystem.render(
      ctx,
      camera,
      this.objects,
      this.groundProjection,
      groundReference
    );
  }
}
