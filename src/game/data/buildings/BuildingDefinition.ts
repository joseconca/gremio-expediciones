import type { RenderLayer } from "../../rendering/RenderLayer";
import type { ColliderConfig } from "../../entities/Collider";
import type { DoorDefinition } from "../doors/DoorDefinition";

export interface BuildingEntranceDefinition {
  door?: { definition: DoorDefinition; offsetX: number; offsetY: number };
  /** World-space collider relative to the building's ground origin, behind door. */
  trigger: { offsetX: number; offsetY: number; width: number; height: number };
  interior: { sceneId: string; entranceSpawnId: string; exitSpawnId: string };
  exit: { offsetX: number; offsetY: number };
}

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
  entrance?: BuildingEntranceDefinition;

  parts: BuildingPartDefinition[];
}
