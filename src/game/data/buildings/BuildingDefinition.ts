import type { RenderLayer } from "../../rendering/RenderLayer";
import type { ColliderConfig } from "../../entities/Collider";

export interface BuildingPartDefinition {
  id: string;

  layer: RenderLayer;

  frameY: number;

  offsetX: number;
  offsetY: number;

  sortYOffset: number;
}

export interface BuildingDefinition {
  id: string;
  name: string;

  sprite: {
    src: string;
    frameWidth: number;
    frameHeight: number;
  };

  width: number;
  height: number;
  colliders?: ColliderConfig[];

  parts: BuildingPartDefinition[];
}
