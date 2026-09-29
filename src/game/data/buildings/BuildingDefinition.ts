import type { RenderLayer } from "../../rendering/RenderLayer";

export interface BuildingPartDefinition {
  id: string;

  layer: RenderLayer;

  offsetX: number;
  offsetY: number;

  sortYOffset: number;
}

export interface BuildingDefinition {
  id: string;

  name: string;

  width: number;
  height: number;

  parts: BuildingPartDefinition[];
}