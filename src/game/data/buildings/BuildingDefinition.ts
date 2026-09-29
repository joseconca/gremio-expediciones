import type { RenderLayer } from "../../rendering/RenderLayer";

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

  parts: BuildingPartDefinition[];
}
