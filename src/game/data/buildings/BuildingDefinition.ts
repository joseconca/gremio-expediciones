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

/** A static point light emitted by a building feature (window, lantern, etc.).
 *  offsetX/Y are relative to the building's ground anchor (x, y). */
export interface PointLightDefinition {
  offsetX: number;
  offsetY: number;
  radius: number;
  intensity: number;
  /** "r, g, b" components. */
  color: string;
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
  /** Point lights emitted at dusk/night (windows, lanterns). */
  pointLights?: PointLightDefinition[];

  parts: BuildingPartDefinition[];
}
