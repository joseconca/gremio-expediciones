import { RenderLayer } from "../../rendering/RenderLayer";
import type { BuildingDefinition } from "./BuildingDefinition";

export const townHallDefinition: BuildingDefinition = {
  id: "town-hall",
  name: "Ayuntamiento",

  sprite: {
    src: "/sprites/buildings/town-hall.png",
    frameWidth: 128,
    frameHeight: 64,
  },

  width: 128,
  height: 64,

  parts: [
    {
      id: "back",

      layer: RenderLayer.BACK,

      frameY: 0,

      offsetX: 0,
      offsetY: -64,

      sortYOffset: -64,
    },

    {
      id: "body",

      layer: RenderLayer.WORLD,

      frameY: 1,

      offsetX: 0,
      offsetY: -64,

      sortYOffset: 0,
    },

    {
      id: "front",

      layer: RenderLayer.WORLD,

      frameY: 2,

      offsetX: 0,
      offsetY: -64,

      sortYOffset: 0,
    },
  ],
};
