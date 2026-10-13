import type { BuildingDefinition } from "./BuildingDefinition";
import { RenderLayer } from "../../rendering/RenderLayer";
import { genericDoor2Definition } from "../doors/genericDoor2";

export const tavernDefinition: BuildingDefinition = {
  id: "tavern",
  name: "Taberna",
  sprite: {
    src: "/sprites/buildings/tavern/taberna.png",
    frameWidth: 128,
    frameHeight: 128,
  },
  width: 128,
  height: 128,
  entrance: {
    door: { definition: genericDoor2Definition, offsetX: 81, offsetY: 0 },
    trigger: { offsetX: 56, offsetY: -24, width: 48, height: 12 },
    interior: { sceneId: "tavern-interior", entranceSpawnId: "tavern-entrance", exitSpawnId: "tavern-exit" },
    exit: { offsetX: 70, offsetY: -48 },
  },
  colliders: [
    { width: 40, height: 4, offsetX: 16, offsetY: -4 },
    { width: 6, height: 4, offsetX: 106, offsetY: -4 },
    { width: 2, height: 24, offsetX: 16, offsetY: -28 },
    { width: 2, height: 24, offsetX: 110, offsetY: -28 },
        { width: 94, height: 4, offsetX: 18, offsetY: -28 },

  ],
  parts: [
    {
        id: "background",
        layer: RenderLayer.BACK,
        frameY: 0,
        offsetX: 0,
        offsetY: -128,
        sortYOffset: -128,
      },
    {
      id: "facade",
      layer: RenderLayer.WORLD,
      frameY: 1,
      offsetX: 0,
      offsetY: -128,
      sortYOffset: 0,
    },
  ],
};
