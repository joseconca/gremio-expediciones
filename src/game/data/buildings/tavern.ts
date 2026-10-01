import type { BuildingDefinition } from "./BuildingDefinition";
import { RenderLayer } from "../../rendering/RenderLayer";

export const tavernDefinition: BuildingDefinition = {
  id: "tavern",
  name: "Taberna",
  sprite: {
    src: "/sprites/buildings/taberna.png",
    frameWidth: 128,
    frameHeight: 64,
  },
  width: 128,
  height: 64,
  colliders: [
    { width: 96, height: 4, offsetX: 16, offsetY: -4 },
    { width: 2, height: 24, offsetX: 16, offsetY: -28 },
    { width: 2, height: 24, offsetX: 110, offsetY: -28 },
  ],
  parts: [
    {
      id: "building",
      layer: RenderLayer.WORLD,
      frameY: 0,
      offsetX: 0,
      offsetY: -64,
      sortYOffset: 0,
    },
  ],
};
