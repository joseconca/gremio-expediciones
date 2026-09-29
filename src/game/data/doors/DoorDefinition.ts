import type { ColliderConfig } from "../../entities/Collider";

export interface DoorDefinition {
  id: string;
  name: string;

  sprite: {
    src: string;
    frameWidth: number;
    frameHeight: number;
  };

  interaction: {
    offsetX: number;
    offsetY: number;
    radius: number;
  };

  collider: ColliderConfig;
}
