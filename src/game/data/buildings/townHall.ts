import { RenderLayer } from "../../rendering/RenderLayer";
import type { BuildingDefinition } from "./BuildingDefinition";

export const townHallDefinition: BuildingDefinition = {
  id: "town-hall",

  name: "Ayuntamiento",

  width: 96,
  height: 96,

  parts: [
    {
      id: "back",

      layer: RenderLayer.BACK,

      offsetX: 0,
      offsetY: -24,

      sortYOffset: -24,
    },

    {
      id: "body",

      layer: RenderLayer.WORLD,

      offsetX: 0,
      offsetY: 0,

      sortYOffset: 96,
    },

    {
      id: "front",

      layer: RenderLayer.WORLD,

      offsetX: 0,
      offsetY: 0,

      sortYOffset: 72,
    },
  ],
};
