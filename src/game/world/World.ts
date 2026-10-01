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

interface DebugArea {
  x: number;
  y: number;
  width: number;
  height: number;
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

  renderDebug(
    ctx: CanvasRenderingContext2D,
    groundReference: GroundReference,
    teleporters: GameObject[] = []
  ): void {
    for (let tileY = 0; tileY < this.collisionMap.height; tileY++) {
      for (let tileX = 0; tileX < this.collisionMap.width; tileX++) {
        if (!this.collisionMap.isBlockedTile(tileX, tileY)) continue;

        this.drawDebugArea(
          ctx,
          {
            x: tileX * this.collisionMap.tileSize,
            y: tileY * this.collisionMap.tileSize,
            width: this.collisionMap.tileSize,
            height: this.collisionMap.tileSize,
          },
          groundReference,
          "rgba(249, 115, 22, 0.2)",
          "#fb923c"
        );
      }
    }

    for (const object of this.objects) {
      if (!object.isCollidable()) continue;

      for (const collider of object.colliders) {
        this.drawDebugArea(
          ctx,
          {
            x: object.x + collider.offsetX,
            y: object.y + collider.offsetY,
            width: collider.width,
            height: collider.height,
          },
          groundReference,
          "rgba(239, 68, 68, 0.24)",
          "#ef4444"
        );
      }
    }

    for (const teleporter of teleporters) {
      for (const collider of teleporter.colliders) {
        this.drawDebugArea(
          ctx,
          {
            x: teleporter.x + collider.offsetX,
            y: teleporter.y + collider.offsetY,
            width: collider.width,
            height: collider.height,
          },
          groundReference,
          "rgba(34, 211, 238, 0.3)",
          "#22d3ee",
          "TP"
        );
      }
    }

    ctx.save();
    ctx.font = "bold 10px monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText("DEBUG · F3", 6, 6);
    ctx.fillStyle = "#ef4444";
    ctx.fillText("COLLISION", 6, 20);
    ctx.fillStyle = "#fb923c";
    ctx.fillText("MAP BLOCK", 6, 34);
    ctx.fillStyle = "#22d3ee";
    ctx.fillText("TELEPORTER", 6, 48);
    ctx.restore();
  }

  private drawDebugArea(
    ctx: CanvasRenderingContext2D,
    area: DebugArea,
    reference: GroundReference,
    fillColor: string,
    strokeColor: string,
    label?: string
  ): void {
    const corners = [
      this.groundProjection.project(
        area.x,
        area.y,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      ),
      this.groundProjection.project(
        area.x + area.width,
        area.y,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      ),
      this.groundProjection.project(
        area.x + area.width,
        area.y + area.height,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      ),
      this.groundProjection.project(
        area.x,
        area.y + area.height,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      ),
    ];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let index = 1; index < corners.length; index++) {
      ctx.lineTo(corners[index].x, corners[index].y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (label) {
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = strokeColor;
      ctx.textBaseline = "bottom";
      ctx.fillText(label, corners[0].x, corners[0].y);
    }

    ctx.restore();
  }
}
